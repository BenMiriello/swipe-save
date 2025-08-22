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
          source: 'gui'
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
      if (this.isParameterInput(inputName, value)) {
        parameters.push({
          nodeId: nodeId,
          nodeType: node.class_type,
          fieldName: inputName,
          currentValue: value,
          source: 'api'
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
    
    // Skip seeds (handled separately)
    if (inputName === 'seed') return false;
    
    // Skip long text (handled by text field detector)
    if (typeof value === 'string' && (value.length > 50 || value.includes('\n'))) return false;
    
    // Skip prompt-like field names (handled by text field detector)
    if (typeof value === 'string') {
      const promptPatterns = ['prompt', 'text', 'description', 'positive', 'negative'];
      if (promptPatterns.some(pattern => inputName.toLowerCase().includes(pattern))) {
        return false;
      }
    }
    
    // Include numeric/boolean config parameters and short strings
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