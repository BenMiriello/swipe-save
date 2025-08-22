/**
 * Parameter Extractor Service
 * Focused extraction of other workflow parameters (steps, cfg, etc.)
 */

window.comfyUIBentoML = window.comfyUIBentoML || {};
window.comfyUIBentoML.extractors = window.comfyUIBentoML.extractors || {};

window.comfyUIBentoML.extractors.parameterExtractor = {
  /**
   * Extract parameter fields from workflow
   */
  extractParameters(workflowData) {
    const parameters = [];

    if (workflowData.nodes && Array.isArray(workflowData.nodes)) {
      // GUI format
      for (const node of workflowData.nodes) {
        const params = this.extractFromGUINode(node);
        parameters.push(...params);
      }
    } else {
      // API format
      for (const [nodeId, node] of Object.entries(workflowData)) {
        if (node && typeof node === 'object' && node.class_type) {
          const params = this.extractFromAPINode(nodeId, node);
          parameters.push(...params);
        }
      }
    }

    return parameters;
  },

  /**
   * Extract parameters from GUI format node
   */
  extractFromGUINode(node) {
    const parameters = [];
    if (!node.widgets_values || !Array.isArray(node.widgets_values)) return parameters;

    const mapping = this.getParameterMapping(node.type);
    if (!mapping) return parameters;

    for (const [index, fieldName] of Object.entries(mapping)) {
      const idx = parseInt(index);
      if (node.widgets_values[idx] !== undefined) {
        parameters.push({
          nodeId: node.id,
          nodeType: node.type,
          fieldName: fieldName,
          currentValue: node.widgets_values[idx],
          source: 'gui',
          fieldType: this.getFieldType(fieldName, node.widgets_values[idx], node.type)
        });
      }
    }

    return parameters;
  },

  /**
   * Extract parameters from API format node
   */
  extractFromAPINode(nodeId, node) {
    const parameters = [];
    if (!node.inputs) return parameters;

    for (const [inputName, value] of Object.entries(node.inputs)) {
      // Debug lora nodes specifically
      if (node.class_type && node.class_type.toLowerCase().includes('lora')) {
        console.log('Lora node field:', {
          nodeType: node.class_type,
          inputName,
          value,
          isParam: this.isParameterInput(inputName, value)
        });
      }
      
      if (this.isParameterInput(inputName, value)) {
        const fieldType = this.getFieldType(inputName, value, node.class_type);
        
        // Debug format fields specifically
        if (inputName === 'format') {
          console.log('Format field detected:', {
            inputName,
            value,
            fieldType,
            nodeType: node.class_type
          });
          console.log('fieldType details:', JSON.stringify(fieldType, null, 2));
        }
        
        parameters.push({
          nodeId: nodeId,
          nodeType: node.class_type,
          fieldName: inputName,
          currentValue: value,
          source: 'api',
          fieldType: fieldType
        });
      }
    }

    return parameters;
  },

  /**
   * Get parameter mapping for node type
   */
  getParameterMapping(nodeType) {
    const mappings = {
      'KSampler': {
        2: 'steps',
        3: 'cfg',
        4: 'sampler_name',
        5: 'scheduler',
        6: 'denoise'
      },
      'KSamplerAdvanced': {
        3: 'steps',
        4: 'cfg',
        5: 'sampler_name',
        6: 'scheduler'
      },
      'CheckpointLoaderSimple': {
        0: 'ckpt_name'
      },
      'VAELoader': {
        0: 'vae_name'
      },
      'LoraLoader': {
        0: 'lora_name'
      },
      'EmptyLatentImage': {
        0: 'width',
        1: 'height',
        2: 'batch_size'
      },
      'Int Literal': {
        0: 'int'
      },
      'Cfg Literal': {
        0: 'float'
      },
      'VHS_VideoCombine': {
        0: 'frame_rate',
        1: 'loop_count',
        2: 'filename_prefix',
        3: 'format',
        4: 'pix_fmt',
        5: 'crf',
        6: 'save_metadata'
      },
      'ModelSamplingSD3': {
        0: 'shift'
      },
      'easy mathInt': {
        0: 'a',
        1: 'b',
        2: 'operation'
      },
      'LoraLoaderModelOnly': {
        0: 'lora_name',
        1: 'strength_model'
      },
      'UnetLoaderGGUF': {
        0: 'unet_name'
      },
      'VAELoader': {
        0: 'vae_name'
      },
      'CLIPLoader': {
        0: 'clip_name',
        1: 'type',
        2: 'device'
      },
      'UpscaleModelLoader': {
        0: 'model_name'
      },
      'ImageResizeKJ': {
        0: 'width',
        1: 'height',
        2: 'upscale_method',
        3: 'keep_proportion',
        4: 'divisible_by',
        5: 'crop'
      }
    };

    return mappings[nodeType];
  },

  /**
   * Check if API input is a parameter
   */
  isParameterInput(inputName, value) {
    // Skip connection arrays (node connections)
    if (Array.isArray(value)) return false;
    
    // Skip metadata fields that shouldn't be editable
    const metadataFields = ['title', 'class_type', '_meta'];
    if (metadataFields.includes(inputName)) return false;
    
    // Skip seeds (handled separately)
    if (inputName === 'seed') return false;
    
    // Skip multiline text only (single line long text is fine)
    if (typeof value === 'string' && value.includes('\n')) {
      return false;
    }
    
    // Skip prompt-like field names (handled by text field detector)
    if (typeof value === 'string') {
      const promptPatterns = ['prompt', 'text', 'description', 'positive', 'negative'];
      if (promptPatterns.some(pattern => inputName.toLowerCase().includes(pattern))) {
        return false;
      }
      
      // Include known parameter/config fields and model/file fields for strings
      const knownParams = ['sampler_name', 'scheduler', 'format', 'pix_fmt', 'operation', 'ckpt_name', 'vae_name', 'lora_name', 'unet_name', 'clip_name', 'model_name', 'filename_prefix'];
      const isKnownParam = knownParams.includes(inputName);
      
      // For strings, only include known params OR if it looks like a model/file field
      const modelFieldPatterns = ['_name', 'model', 'checkpoint', 'lora', 'vae', 'unet', 'clip'];
      const looksLikeModelField = modelFieldPatterns.some(pattern => inputName.toLowerCase().includes(pattern));
      
      if (!isKnownParam && !looksLikeModelField) {
        return false;
      }
    }
    
    // Include numeric/boolean config parameters and known string parameters
    return typeof value === 'number' || typeof value === 'boolean' || 
           (typeof value === 'string' && value.length <= 50);
  },

  /**
   * Get parameter display name
   */
  getDisplayName(fieldName) {
    const displayNames = {
      'steps': 'Steps',
      'cfg': 'CFG Scale',
      'denoise': 'Denoise',
      'width': 'Width',
      'height': 'Height',
      'batch_size': 'Batch Size',
      'sampler_name': 'Sampler',
      'scheduler': 'Scheduler',
      'strength': 'Strength',
      'scale': 'Scale',
      'value': 'Value',
      'int': 'Integer Value',
      'float': 'Float Value',
      'frame_rate': 'Frame Rate',
      'loop_count': 'Loop Count',
      'filename_prefix': 'Filename Prefix',
      'format': 'Video Format',
      'pix_fmt': 'Pixel Format',
      'crf': 'Quality (CRF)',
      'save_metadata': 'Save Metadata',
      'shift': 'Shift Value',
      'a': 'Value A',
      'b': 'Value B',
      'operation': 'Math Operation',
      'lora_name': 'LoRA Name',
      'strength_model': 'Model Strength',
      'unet_name': 'UNet Model',
      'vae_name': 'VAE Model',
      'clip_name': 'CLIP Model',
      'type': 'Type',
      'device': 'Device',
      'model_name': 'Model Name',
      'upscale_method': 'Upscale Method',
      'keep_proportion': 'Keep Proportion',
      'divisible_by': 'Divisible By',
      'crop': 'Crop Method'
    };
    
    return displayNames[fieldName] || fieldName;
  },

  /**
   * Get field type (determines input widget type)
   */
  getFieldType(fieldName, value, nodeType) {
    // Get real dropdown options from ComfyUI object_info if available
    if (window.comfyUIObjectInfo && nodeType && fieldName) {
      const nodeInfo = window.comfyUIObjectInfo[nodeType];
      if (nodeInfo && nodeInfo.input && nodeInfo.input.required && nodeInfo.input.required[fieldName]) {
        const fieldDef = nodeInfo.input.required[fieldName];
        
        // ComfyUI COMBO format: [["option1", "option2"]] 
        if (Array.isArray(fieldDef) && fieldDef.length > 0 && Array.isArray(fieldDef[0])) {
          return {
            type: 'dropdown',
            subtype: 'combo',
            options: fieldDef[0], // Real ComfyUI options
            fieldName
          };
        }
        
        // New COMBO format: ["COMBO", {"options": [...]}]
        if (fieldDef[0] === "COMBO" && fieldDef[1]?.options) {
          return {
            type: 'dropdown',
            subtype: 'combo',
            options: fieldDef[1].options, // Real ComfyUI options
            fieldName
          };
        }
      }
    }

    // Check filesystem dropdown fields
    if (window.comfyUIBentoML?.FieldTypeDetector?.FILESYSTEM_DROPDOWN_FIELDS?.[fieldName]) {
      return {
        type: 'dropdown',
        subtype: 'filesystem',
        modelType: window.comfyUIBentoML.FieldTypeDetector.FILESYSTEM_DROPDOWN_FIELDS[fieldName].path,
        options: [],
        loaded: false,
        fieldName
      };
    }

    // For non-dropdown fields, determine basic type
    if (typeof value === 'number') {
      return { type: 'number' };
    }
    
    if (typeof value === 'boolean') {
      return { type: 'boolean' };
    }

    // Default to text input
    return { type: 'text' };
  },

  /**
   * Get parameter category
   */
  getCategory(fieldName) {
    const categories = {
      'steps': 'sampling',
      'cfg': 'sampling',
      'denoise': 'sampling',
      'sampler_name': 'sampling',
      'scheduler': 'sampling',
      'width': 'dimensions',
      'height': 'dimensions',
      'batch_size': 'dimensions',
      'strength': 'control',
      'scale': 'control'
    };
    
    return categories[fieldName] || 'other';
  }
};