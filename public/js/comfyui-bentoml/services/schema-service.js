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
    const response = await fetch('/api/comfyui/object_info');
    if (!response.ok) {
      throw new Error(`ComfyUI object_info failed: ${response.status}`);
    }
    
    const objectInfo = await response.json();
    
    // Store for later use in field inference
    this.comfyUIObjectInfo = objectInfo;
    
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

  // Static dropdown option mappings
  STATIC_DROPDOWN_OPTIONS: {
    sampler_name: [
      'euler', 'euler_cfg_pp', 'euler_ancestral', 'euler_ancestral_cfg_pp',
      'heun', 'heunpp2', 'dpm_2', 'dpm_2_ancestral', 'lms', 'dpm_fast',
      'dpm_adaptive', 'dpmpp_2s_ancestral', 'dpmpp_2s_ancestral_cfg_pp',
      'dpmpp_sde', 'dpmpp_sde_gpu', 'dpmpp_2m', 'dpmpp_2m_cfg_pp',
      'dpmpp_2m_sde', 'dpmpp_2m_sde_gpu', 'dpmpp_3m_sde', 'dpmpp_3m_sde_gpu',
      'ddpm', 'lcm', 'ipndm', 'ipndm_v', 'deis', 'res_multistep',
      'res_multistep_cfg_pp', 'res_multistep_ancestral', 'res_multistep_ancestral_cfg_pp',
      'gradient_estimation', 'ddim', 'uni_pc', 'uni_pc_bh2'
    ],
    scheduler: [
      'normal', 'karras', 'exponential', 'sgm_uniform', 'simple',
      'ddim_uniform', 'beta', 'linear_quadratic', 'kl_optimal',
      'AYS SD1', 'AYS SDXL', 'AYS SVD'
    ],
    clip_skip: [-1, -2, -3, -4, -5, -6, -7, -8, -9, -10, -11, -12],
    stop_at_clip_layer: [-1, -2, -3, -4, -5, -6, -7, -8, -9, -10, -11, -12],
    
    // Boolean fields - common true/false options
    add_noise: ['enable', 'disable'],
    return_with_leftover_noise: ['enable', 'disable'],
    force_offload: ['enable', 'disable'],
    fp8: ['enable', 'disable'],
    tiled: [true, false],
    use_tiled_vae: [true, false],
    fast: [true, false],
    
    // Upscaling model types
    upscale_method: ['nearest-exact', 'bilinear', 'area', 'bicubic', 'lanczos'],
    
    // Image format options (default - will be overridden by node-specific detection)
    format: ['PNG', 'JPEG', 'WEBP'],
    
    // Video format options  
    video_format: ['mp4', 'webm', 'avi', 'mov', 'mkv', 'wmv', 'flv', 'gif'],
    
    // Audio format options
    audio_format: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'],
    
    // Common dimensions (powers of 2)
    width: [512, 576, 640, 704, 768, 832, 896, 960, 1024, 1152, 1280, 1408, 1536],
    height: [512, 576, 640, 704, 768, 832, 896, 960, 1024, 1152, 1280, 1408, 1536],
    
    // Batch sizes
    batch_size: [1, 2, 4, 8, 16, 32],
    
    // Frame rates for video
    frame_rate: [8, 12, 15, 24, 25, 30, 48, 60],
    
    // Loop counts for video
    loop_count: [0, 1, 2, 3, 4, 5, 10, -1], // -1 for infinite
    
    // Seed controls
    control_after_generate: ['fixed', 'increment', 'decrement', 'randomize'],
    
    // Interpolation methods
    interpolation: ['linear', 'cubic', 'lanczos'],
    
    // Color spaces
    color_space: ['sRGB', 'Adobe RGB', 'ProPhoto RGB'],
    
    // Resize methods
    resize_method: ['lanczos', 'bicubic', 'bilinear', 'nearest']
  },

  // Boolean field detection patterns
  BOOLEAN_FIELD_PATTERNS: [
    'add_noise', 'return_with_leftover_noise', 'force_offload', 'fp8',
    'tiled', 'use_tiled_vae', 'fast', 'enable', 'disable', 'toggle',
    'use_', 'is_', 'has_', 'can_', 'should_', 'preview_method'
  ],

  // Node-specific field mappings (override generic field names based on node type)  
  NODE_SPECIFIC_MAPPINGS: {
    'VHS_VideoCombine': {
      'format': ['image/gif', 'image/webp', 'video/webm', 'video/mp4', 'video/h264-mp4', 'video/h265-mp4']
    },
    'VHS_LoadVideo': {
      'format': ['mp4', 'webm', 'avi', 'mov', 'mkv', 'wmv', 'flv', 'gif']
    },
    'VideoHelperSuite': {
      'format': ['image/gif', 'image/webp', 'video/webm', 'video/mp4']
    },
    'Save Image': {
      'format': ['PNG', 'JPEG', 'WEBP', 'BMP', 'TIFF']
    },
    'SaveImage': {
      'format': ['PNG', 'JPEG', 'WEBP', 'BMP', 'TIFF']  
    },
    'LoadImage': {
      'format': ['PNG', 'JPEG', 'WEBP', 'BMP', 'TIFF', 'GIF']
    }
  },

  // Filesystem-based dropdown field mappings
  FILESYSTEM_DROPDOWN_FIELDS: {
    ckpt_name: 'checkpoints',
    model_name: 'checkpoints',
    vae_name: 'vae',
    lora_name: 'loras',
    control_net_name: 'controlnet',
    controlnet_name: 'controlnet'
  },

  /**
   * Enhanced field type inference with dropdown support
   */
  inferTypeFromComfyInput(inputDef, fieldName, nodeType) {
    // Check if inputDef is a ComfyUI COMBO (dropdown) first - this should be highest priority
    if (Array.isArray(inputDef) && inputDef.length > 0 && Array.isArray(inputDef[0])) {
      return {
        type: 'dropdown',
        subtype: 'combo',
        options: inputDef[0], // Use the actual ComfyUI options
        fieldName: fieldName,
        nodeType: nodeType
      };
    }
    
    // If we have ComfyUI object_info, try to get options from there
    if (this.comfyUIObjectInfo && nodeType && fieldName) {
      const nodeInfo = this.comfyUIObjectInfo[nodeType];
      if (nodeInfo && nodeInfo.input && nodeInfo.input.required && nodeInfo.input.required[fieldName]) {
        const fieldDef = nodeInfo.input.required[fieldName];
        if (Array.isArray(fieldDef) && fieldDef.length > 0 && Array.isArray(fieldDef[0])) {
          return {
            type: 'dropdown',
            subtype: 'combo_from_objectinfo',
            options: fieldDef[0], // Use the real ComfyUI options
            fieldName: fieldName,
            nodeType: nodeType
          };
        }
      }
    }
    
    // Node-specific mappings (fallback for when ComfyUI data isn't available)
    if (nodeType && fieldName && this.NODE_SPECIFIC_MAPPINGS[nodeType] && this.NODE_SPECIFIC_MAPPINGS[nodeType][fieldName]) {
      return {
        type: 'dropdown',
        subtype: 'node_specific',
        options: this.NODE_SPECIFIC_MAPPINGS[nodeType][fieldName],
        fieldName: fieldName,
        nodeType: nodeType
      };
    }
    
    // Removed static dropdown detection - use only ComfyUI's actual data
    
    // Boolean field pattern detection
    if (fieldName && this.isBooleanField(fieldName, inputDef)) {
      return {
        type: 'dropdown',
        subtype: 'boolean',
        options: [true, false],
        fieldName: fieldName
      };
    }
    
    // Filesystem dropdown detection  
    if (fieldName && this.FILESYSTEM_DROPDOWN_FIELDS[fieldName]) {
      return {
        type: 'dropdown',
        subtype: 'filesystem', 
        modelType: this.FILESYSTEM_DROPDOWN_FIELDS[fieldName],
        fieldName: fieldName,
        options: [], // Will be populated when loaded
        loaded: false
      };
    }
    
    // ComfyUI COMBO format detection
    if (Array.isArray(inputDef)) {
      // New COMBO format: ["COMBO", {"options": [...]}]
      if (inputDef[0] === "COMBO" && inputDef[1]?.options) {
        return {
          type: 'dropdown',
          subtype: 'combo',
          options: inputDef[1].options,
          fieldName: fieldName
        };
      }
      
      // Old array format: [["option1", "option2"]]
      const firstElement = inputDef[0];
      if (Array.isArray(firstElement)) {
        return {
          type: 'dropdown', 
          subtype: 'array',
          options: firstElement,
          fieldName: fieldName
        };
      }
      
      // Simple array format: ["option1", "option2"]
      if (typeof firstElement === 'string' && inputDef.length > 1) {
        return {
          type: 'dropdown',
          subtype: 'simple_array', 
          options: inputDef,
          fieldName: fieldName
        };
      }
      
      // Type detection fallbacks
      if (typeof firstElement === 'string') return { type: 'text', fieldName };
      if (typeof firstElement === 'number') return { type: 'number', fieldName };
    }
    
    return { type: 'text', fieldName }; // Default fallback
  },

  /**
   * Check if a field should be treated as boolean
   */
  isBooleanField(fieldName, inputDef) {
    if (!fieldName) return false;
    
    // Check if field name matches boolean patterns
    for (const pattern of this.BOOLEAN_FIELD_PATTERNS) {
      if (fieldName.includes(pattern) || fieldName === pattern) {
        return true;
      }
    }
    
    // Check if input definition suggests boolean (two-element array with true/false)
    if (Array.isArray(inputDef) && inputDef.length === 2) {
      const hasTrue = inputDef.includes(true) || inputDef.includes('true') || inputDef.includes('enable');
      const hasFalse = inputDef.includes(false) || inputDef.includes('false') || inputDef.includes('disable');
      if (hasTrue && hasFalse) return true;
    }
    
    return false;
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