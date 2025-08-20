/**
 * BentoML Schema Service
 * Phase 2: Schema-driven field detection and seed modification
 */

window.comfyUIBentoML = window.comfyUIBentoML || {};

window.comfyUIBentoML.schemaService = {
  // Cached schema data
  cachedSchema: null,
  lastSchemaFetch: 0,
  schemaTimeout: 300000, // 5 minutes

  /**
   * Get schema with caching - try BentoML first, fallback to ComfyUI
   */
  async getSchema() {
    const now = Date.now();
    
    // Return cached schema if fresh
    if (this.cachedSchema && (now - this.lastSchemaFetch) < this.schemaTimeout) {
      return this.cachedSchema;
    }

    try {
      // Try BentoML schema first
      const schema = await window.comfyUIBentoML.client.getServiceSchema();
      
      if (schema) {
        this.cachedSchema = schema;
        this.lastSchemaFetch = now;
        console.log('BentoML schema updated from service');
        return schema;
      }
    } catch (error) {
      console.warn('BentoML schema unavailable, trying ComfyUI object_info:', error.message);
    }

    try {
      // Fallback to ComfyUI object_info endpoint
      const comfySchema = await this.getComfyUIObjectInfo();
      if (comfySchema) {
        this.cachedSchema = comfySchema;
        this.lastSchemaFetch = now;
        console.log('Using ComfyUI object_info as schema source');
        return comfySchema;
      }
    } catch (error) {
      console.warn('ComfyUI object_info also failed:', error.message);
    }

    return this.cachedSchema; // Return cached version if available
  },

  /**
   * Get ComfyUI object_info and convert to schema format
   */
  async getComfyUIObjectInfo() {
    const response = await fetch('/object_info');
    if (!response.ok) {
      throw new Error(`ComfyUI object_info failed: ${response.status}`);
    }
    
    const objectInfo = await response.json();
    
    // Convert ComfyUI object_info to schema-like format
    return this.convertObjectInfoToSchema(objectInfo);
  },

  /**
   * Convert ComfyUI object_info to our schema format
   */
  convertObjectInfoToSchema(objectInfo) {
    const properties = {};
    
    // Extract input definitions from node types
    for (const [nodeType, nodeInfo] of Object.entries(objectInfo)) {
      if (nodeInfo.input && nodeInfo.input.required) {
        for (const [inputName, inputDef] of Object.entries(nodeInfo.input.required)) {
          const fieldPath = `${nodeType}.${inputName}`;
          
          // Convert ComfyUI input definition to schema property
          properties[fieldPath] = {
            type: this.inferTypeFromComfyInput(inputDef),
            title: inputName,
            description: `${nodeType} - ${inputName}`,
            nodeType: nodeType,
            comfyUISource: true
          };
        }
      }
    }
    
    return {
      input_schema: { properties },
      source: 'comfyui_object_info',
      node_types: Object.keys(objectInfo)
    };
  },

  /**
   * Infer field type from ComfyUI input definition
   */
  inferTypeFromComfyInput(inputDef) {
    if (Array.isArray(inputDef)) {
      const firstElement = inputDef[0];
      if (typeof firstElement === 'string') return 'string';
      if (typeof firstElement === 'number') return 'number';
      if (Array.isArray(firstElement)) return 'string'; // Enum/choices
    }
    return 'string'; // Default
  },

  /**
   * Identify text fields using schema to check actual workflow nodes
   */
  async identifyTextFields(workflowData) {
    const schema = await this.getSchema();
    const textFields = [];

    if (!schema || !workflowData) {
      console.warn('Schema or workflow data unavailable, falling back to basic detection');
      return this.fallbackTextFieldDetection(workflowData);
    }

    try {
      // Check if we have GUI format (nodes array) or API format (object with nodeIds)
      if (workflowData.nodes && Array.isArray(workflowData.nodes)) {
        // GUI format
        for (const node of workflowData.nodes) {
          const nodeFields = this.extractTextFieldsFromGUINode(node, schema);
          textFields.push(...nodeFields);
        }
      } else {
        // API format  
        for (const [nodeId, node] of Object.entries(workflowData)) {
          if (node && typeof node === 'object' && node.class_type) {
            const nodeFields = this.extractTextFieldsFromAPINode(nodeId, node, schema);
            textFields.push(...nodeFields);
          }
        }
      }

      console.log(`Schema identified ${textFields.length} text fields from actual workflow nodes`);
      return textFields;

    } catch (error) {
      console.error('Schema-based field detection failed:', error);
      return this.fallbackTextFieldDetection(workflowData);
    }
  },

  /**
   * Extract text fields from GUI format node using schema
   */
  extractTextFieldsFromGUINode(node, schema) {
    const textFields = [];
    
    if (!node.widgets_values || !schema.input_schema) return textFields;

    // Get schema definition for this node type
    const nodeSchema = this.getNodeSchemaDefinition(node.type, schema);
    if (!nodeSchema) return textFields;

    // Check each widget value against schema
    node.widgets_values.forEach((value, index) => {
      if (typeof value === 'string' && value.length > 0) {
        const inputName = this.getInputNameForWidgetIndex(node.type, index, nodeSchema);
        if (inputName && this.isTextInput(inputName, nodeSchema)) {
          textFields.push({
            nodeId: node.id,
            nodeType: node.type,
            fieldName: inputName,
            currentValue: value,
            isPrompt: this.isPromptInput(inputName),
            source: 'gui',
            detectionMethod: 'schema'
          });
        }
      }
    });

    return textFields;
  },

  /**
   * Extract text fields from API format node using schema
   */
  extractTextFieldsFromAPINode(nodeId, node, schema) {
    const textFields = [];
    
    if (!node.inputs || !schema.input_schema) return textFields;

    // Get schema definition for this node type
    const nodeSchema = this.getNodeSchemaDefinition(node.class_type, schema);
    if (!nodeSchema) return textFields;

    // Check each input against schema
    for (const [inputName, value] of Object.entries(node.inputs)) {
      if (typeof value === 'string' && value.length > 0 && this.isTextInput(inputName, nodeSchema)) {
        textFields.push({
          nodeId: nodeId,
          nodeType: node.class_type,
          fieldName: inputName,
          currentValue: value,
          isPrompt: this.isPromptInput(inputName),
          source: 'api',
          detectionMethod: 'schema'
        });
      }
    }

    return textFields;
  },

  /**
   * Get schema definition for a specific node type
   */
  getNodeSchemaDefinition(nodeType, schema) {
    if (schema.source === 'comfyui_object_info') {
      // Schema converted from ComfyUI object_info
      return schema.input_schema.properties[nodeType] || null;
    }
    // TODO: Handle BentoML schema format
    return null;
  },

  /**
   * Get input name for widget index (simplified - would need ComfyUI node info)
   */
  getInputNameForWidgetIndex(nodeType, widgetIndex, nodeSchema) {
    // For now, return generic name - would need actual widget mapping
    return `input_${widgetIndex}`;
  },

  /**
   * Check if input is text-related using schema
   */
  isTextInput(inputName, nodeSchema) {
    const textNames = ['text', 'prompt', 'positive', 'negative', 'string', 'description'];
    return textNames.some(name => inputName.toLowerCase().includes(name));
  },

  /**
   * Check if input is prompt-related
   */
  isPromptInput(inputName) {
    const promptNames = ['prompt', 'positive', 'negative', 'conditioning'];
    return promptNames.some(name => inputName.toLowerCase().includes(name));
  },

  /**
   * Identify seed parameters using schema
   * More reliable than recursive search
   */
  async identifySeedFields(workflowData) {
    const schema = await this.getSchema();
    const seedFields = [];

    if (!schema || !workflowData) {
      return this.fallbackSeedDetection(workflowData);
    }

    try {
      // Schema defines seed parameters explicitly
      if (schema.seed_parameters && Array.isArray(schema.seed_parameters)) {
        for (const seedPath of schema.seed_parameters) {
          const seedValue = this.getValueByPath(workflowData, seedPath);
          
          if (typeof seedValue === 'number') {
            seedFields.push({
              path: seedPath,
              currentValue: seedValue,
              schemaSource: true
            });
          }
        }
      }

      // Fallback: Look for fields with 'seed' in schema
      if (schema.input_schema && schema.input_schema.properties) {
        for (const [fieldPath, fieldDef] of Object.entries(schema.input_schema.properties)) {
          if (this.isSeedFieldType(fieldDef, fieldPath)) {
            const seedValue = this.getValueByPath(workflowData, fieldPath);
            
            if (typeof seedValue === 'number') {
              seedFields.push({
                path: fieldPath,
                currentValue: seedValue,
                schemaSource: true
              });
            }
          }
        }
      }

      console.log(`BentoML schema identified ${seedFields.length} seed fields`);
      return seedFields;

    } catch (error) {
      console.error('Schema-based seed detection failed:', error);
      return this.fallbackSeedDetection(workflowData);
    }
  },

  /**
   * Check if field definition represents a text field
   */
  isTextFieldType(fieldDef) {
    if (!fieldDef) return false;

    // Check type
    if (fieldDef.type === 'string') return true;

    // Check format hints
    if (fieldDef.format && ['text', 'textarea', 'prompt'].includes(fieldDef.format)) {
      return true;
    }

    // Check title/description for text indicators
    const textIndicators = ['text', 'prompt', 'description', 'content', 'message'];
    const title = (fieldDef.title || '').toLowerCase();
    const desc = (fieldDef.description || '').toLowerCase();

    return textIndicators.some(indicator => 
      title.includes(indicator) || desc.includes(indicator)
    );
  },

  /**
   * Check if field is prompt-related
   */
  isPromptField(fieldDef, fieldPath) {
    const promptIndicators = ['prompt', 'positive', 'negative', 'conditioning'];
    const title = (fieldDef.title || '').toLowerCase();
    const path = fieldPath.toLowerCase();

    return promptIndicators.some(indicator => 
      title.includes(indicator) || path.includes(indicator)
    );
  },

  /**
   * Check if field definition represents a seed field
   */
  isSeedFieldType(fieldDef, fieldPath) {
    if (!fieldDef) return false;

    // Check type
    if (fieldDef.type !== 'integer' && fieldDef.type !== 'number') return false;

    // Check field name/path
    const seedIndicators = ['seed', 'random_seed', 'noise_seed'];
    const title = (fieldDef.title || '').toLowerCase();
    const path = fieldPath.toLowerCase();

    return seedIndicators.some(indicator => 
      title.includes(indicator) || path.includes(indicator)
    );
  },

  /**
   * Get value from workflow data by path (supports nested objects)
   */
  getValueByPath(obj, path) {
    try {
      return path.split('.').reduce((current, key) => current?.[key], obj);
    } catch (error) {
      return undefined;
    }
  },

  /**
   * Set value in workflow data by path
   */
  setValueByPath(obj, path, value) {
    try {
      const keys = path.split('.');
      const lastKey = keys.pop();
      const target = keys.reduce((current, key) => {
        if (!current[key]) current[key] = {};
        return current[key];
      }, obj);
      target[lastKey] = value;
      return true;
    } catch (error) {
      console.error('Failed to set value by path:', error);
      return false;
    }
  },

  /**
   * Fallback text field detection (when schema unavailable)
   */
  fallbackTextFieldDetection(workflowData) {
    const textFields = [];
    
    // Basic recursive search for string values
    const searchForText = (obj, path = '') => {
      if (typeof obj !== 'object' || obj === null) return;

      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (typeof value === 'string' && value.length > 2) {
          // Skip obvious non-text fields
          if (!this.isConfigurationValue(key, value)) {
            textFields.push({
              path: currentPath,
              name: key,
              currentValue: value,
              isPromptLike: this.isPromptLikeName(key),
              schemaSource: false
            });
          }
        } else if (typeof value === 'object') {
          searchForText(value, currentPath);
        }
      }
    };

    searchForText(workflowData);
    console.log(`Fallback detection found ${textFields.length} text fields`);
    return textFields;
  },

  /**
   * Fallback seed detection (when schema unavailable)
   */
  fallbackSeedDetection(workflowData) {
    const seedFields = [];
    
    const searchForSeeds = (obj, path = '') => {
      if (typeof obj !== 'object' || obj === null) return;

      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (key === 'seed' && typeof value === 'number') {
          seedFields.push({
            path: currentPath,
            currentValue: value,
            schemaSource: false
          });
        } else if (typeof value === 'object') {
          searchForSeeds(value, currentPath);
        }
      }
    };

    searchForSeeds(workflowData);
    console.log(`Fallback detection found ${seedFields.length} seed fields`);
    return seedFields;
  },

  /**
   * Check if value is likely a configuration parameter
   */
  isConfigurationValue(key, value) {
    const configKeys = ['model', 'checkpoint', 'sampler', 'scheduler', 'method'];
    const lowerKey = key.toLowerCase();
    
    return configKeys.some(config => lowerKey.includes(config)) ||
           value.includes('/') || value.includes('\\') ||
           value.endsWith('.safetensors') || value.endsWith('.ckpt');
  },

  /**
   * Check if field name suggests prompt-like content
   */
  isPromptLikeName(name) {
    const promptNames = ['text', 'prompt', 'positive', 'negative', 'description'];
    const lowerName = name.toLowerCase();
    
    return promptNames.some(prompt => lowerName.includes(prompt));
  },

  /**
   * Clear cached schema (for testing)
   */
  clearCache() {
    this.cachedSchema = null;
    this.lastSchemaFetch = 0;
    console.log('BentoML schema cache cleared');
  }
};