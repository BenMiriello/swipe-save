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
      'EmptyLatentImage': {
        0: 'width',
        1: 'height',
        2: 'batch_size'
      },
      'Int Literal': {
        0: 'value'
      },
      'Cfg Literal': {
        0: 'value'
      }
    };

    return mappings[nodeType];
  },

  /**
   * Check if API input is a parameter
   */
  isParameterInput(inputName, value) {
    // Skip connection arrays and text values
    if (Array.isArray(value) || typeof value === 'string') return false;
    
    const parameterNames = [
      'steps', 'cfg', 'denoise', 'width', 'height', 'batch_size',
      'sampler_name', 'scheduler', 'strength', 'scale'
    ];
    
    return parameterNames.includes(inputName);
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
      'value': 'Value'
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