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
   * Get BentoML service schema with caching
   */
  async getSchema() {
    const now = Date.now();
    
    // Return cached schema if fresh
    if (this.cachedSchema && (now - this.lastSchemaFetch) < this.schemaTimeout) {
      return this.cachedSchema;
    }

    try {
      const schema = await window.comfyUIBentoML.client.getServiceSchema();
      
      if (schema) {
        this.cachedSchema = schema;
        this.lastSchemaFetch = now;
        console.log('BentoML schema updated from service');
      }
      
      return schema;
    } catch (error) {
      console.warn('Failed to fetch BentoML schema:', error.message);
      return this.cachedSchema; // Return cached version if available
    }
  },

  /**
   * Identify text fields using BentoML schema
   * Replaces complex hardcoded widget mapping
   */
  async identifyTextFields(workflowData) {
    const schema = await this.getSchema();
    const textFields = [];

    if (!schema || !workflowData) {
      console.warn('Schema or workflow data unavailable, falling back to basic detection');
      return this.fallbackTextFieldDetection(workflowData);
    }

    try {
      // Schema-driven field detection
      if (schema.input_schema && schema.input_schema.properties) {
        for (const [fieldPath, fieldDef] of Object.entries(schema.input_schema.properties)) {
          if (this.isTextFieldType(fieldDef)) {
            const fieldValue = this.getValueByPath(workflowData, fieldPath);
            
            textFields.push({
              path: fieldPath,
              name: fieldDef.title || fieldPath,
              type: fieldDef.type,
              currentValue: fieldValue || '',
              isPromptLike: this.isPromptField(fieldDef, fieldPath),
              description: fieldDef.description,
              schemaSource: true
            });
          }
        }
      }

      console.log(`BentoML schema identified ${textFields.length} text fields`);
      return textFields;

    } catch (error) {
      console.error('Schema-based field detection failed:', error);
      return this.fallbackTextFieldDetection(workflowData);
    }
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