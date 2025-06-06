/**
 * Workflow Analysis Utilities
 * Foundation for future text field detection and workflow parsing
 */

window.comfyUIServices = window.comfyUIServices || {};

window.comfyUIServices.workflowAnalyzer = {
  /**
   * Analyze workflow structure
   * @param {Object} workflow - ComfyUI workflow object
   * @returns {Object} Analysis results
   */
  analyzeWorkflow(workflow) {
    if (!workflow || typeof workflow !== 'object') {
      return {
        nodes: [],
        connections: {},
        textFields: [],
        hasValidStructure: false
      };
    }

    const nodes = this.extractNodes(workflow);
    const connections = this.extractConnections(workflow);
    const textFields = this.identifyTextFields(workflow);

    return {
      nodes,
      connections,
      textFields,
      hasValidStructure: nodes.length > 0
    };
  },

  /**
   * Extract node information from workflow
   * @param {Object} workflow - ComfyUI workflow object
   * @returns {Array} Array of node objects
   */
  extractNodes(workflow) {
    const nodes = [];

    for (const [nodeId, node] of Object.entries(workflow)) {
      if (node && typeof node === 'object' && node.class_type) {
        nodes.push({
          id: nodeId,
          type: node.class_type,
          inputs: node.inputs || {},
          meta: node._meta || {}
        });
      }
    }

    return nodes;
  },

  /**
   * Extract connection information from workflow
   * @param {Object} workflow - ComfyUI workflow object
   * @returns {Object} Connection mapping
   */
  extractConnections(workflow) {
    const connections = {};

    for (const [nodeId, node] of Object.entries(workflow)) {
      if (!node || !node.inputs) continue;

      connections[nodeId] = {};

      for (const [inputName, inputValue] of Object.entries(node.inputs)) {
        if (Array.isArray(inputValue) && inputValue.length === 2) {
          // This is a connection: [sourceNodeId, outputIndex]
          connections[nodeId][inputName] = {
            sourceNode: inputValue[0],
            outputIndex: inputValue[1]
          };
        }
      }
    }

    return connections;
  },

  /**
   * Identify potential text fields in workflow (foundation for future feature)
   * @param {Object} workflow - ComfyUI workflow object
   * @returns {Array} Array of text field objects
   */
  identifyTextFields(workflow) {
    const textFields = [];

    for (const [nodeId, node] of Object.entries(workflow)) {
      if (!node || !node.inputs) continue;

      for (const [inputName, inputValue] of Object.entries(node.inputs)) {
        if (this.isTextFieldCandidate(node, inputName, inputValue)) {
          textFields.push({
            nodeId,
            nodeType: node.class_type,
            fieldName: inputName,
            currentValue: inputValue,
            isPromptLike: this.isPromptLikeField(node, inputName, inputValue)
          });
        }
      }
    }

    return textFields;
  },

  /**
   * Check if a field is a text field candidate
   * @param {Object} node - Node object
   * @param {string} inputName - Input field name
   * @param {*} inputValue - Input field value
   * @returns {boolean} True if this could be a text field
   */
  isTextFieldCandidate(node, inputName, inputValue) {
    // Skip non-string values and connections
    if (typeof inputValue !== 'string' || Array.isArray(inputValue)) {
      return false;
    }

    // Skip very short values that are likely technical parameters
    if (inputValue.length < 3) {
      return false;
    }

    // Skip obvious configuration fields
    if (this.isConfigurationField(inputName, inputValue)) {
      return false;
    }

    return true;
  },

  /**
   * Check if a field is a configuration field (paths, model names, etc.)
   * @param {string} inputName - Input field name
   * @param {string} inputValue - Input field value
   * @returns {boolean} True if this is likely a configuration field
   */
  isConfigurationField(inputName, inputValue) {
    const lowerName = inputName.toLowerCase();
    const lowerValue = inputValue.toLowerCase();

    // Skip file paths
    if (inputValue.includes('/') || inputValue.includes('\\') || inputValue.includes('.')) {
      // But allow certain extensions that might be in prompts
      const promptAllowedExtensions = ['.jpg', '.png', '.jpeg'];
      if (!promptAllowedExtensions.some(ext => lowerValue.includes(ext))) {
        return true;
      }
    }

    // Skip model files
    if (lowerValue.endsWith('.safetensors') || lowerValue.endsWith('.ckpt') || 
        lowerValue.endsWith('.pt') || lowerValue.endsWith('.bin')) {
      return true;
    }

    // Skip technical field names
    const configFieldNames = [
      'model', 'checkpoint', 'lora', 'sampler', 'scheduler', 'cfg', 'steps', 
      'width', 'height', 'batch', 'seed', 'denoise', 'control_after_generate',
      'filename', 'path', 'url', 'method', 'mode', 'format', 'quality'
    ];
    
    if (configFieldNames.some(name => lowerName.includes(name))) {
      return true;
    }

    // Skip boolean-like values
    if (['true', 'false', 'yes', 'no', 'enable', 'disable'].includes(lowerValue)) {
      return true;
    }

    // Skip numeric strings
    if (/^\d+(\.\d+)?$/.test(inputValue.trim())) {
      return true;
    }

    // Skip short technical identifiers
    if (inputValue.length <= 10 && /^[a-z_]+$/.test(lowerValue)) {
      return true;
    }

    return false;
  },

  /**
   * Check if a field appears to be prompt-related (simplified MVP version)
   * @param {Object} node - Node object
   * @param {string} inputName - Input field name
   * @param {string} inputValue - Input field value
   * @returns {boolean} True if this appears to be a prompt field
   */
  isPromptLikeField(node, inputName, inputValue) {
    // Check field name patterns - primary detection method
    const promptFieldNames = ['text', 'prompt', 'positive', 'negative', 'description', 'string'];
    if (promptFieldNames.some(name => inputName.toLowerCase().includes(name))) {
      return true;
    }

    // Check node type patterns - secondary detection method
    const promptNodeTypes = [
      'CLIPTextEncode', 'TextInput', 'StringConstant', 'String', 
      'Text', 'Prompt', 'Wildcard', 'MultilineString'
    ];
    if (promptNodeTypes.some(type => node.class_type.includes(type))) {
      return true;
    }

    // Skip natural language patterns for MVP - too complex and can have false positives
    // Future: implement this for better detection
    // if (this.hasNaturalLanguageCharacteristics(inputValue)) {
    //   return true;
    // }

    return false;
  },

  /**
   * Check if text has natural language characteristics (future feature)
   * Currently disabled for MVP to avoid false positives
   * @param {string} text - Text to analyze
   * @returns {boolean} True if text appears to be natural language
   */
  hasNaturalLanguageCharacteristics(text) {
    // Future implementation: Check for common prompt keywords
    // const promptKeywords = [
    //   'masterpiece', 'high quality', 'detailed', 'realistic', 'portrait',
    //   'landscape', 'beautiful', 'art', 'style', 'painting', 'photo'
    // ];
    
    // Future implementation: Check for sentence-like structure
    // const words = text.split(/\s+/);
    // if (words.length > 3 && text.includes(' ')) {
    //   return true;
    // }
    
    // For MVP: Return false to rely on field names and node types only
    return false;
  },

  /**
   * Order nodes for editing (foundation for future feature)
   * @param {Array} nodes - Array of node objects
   * @param {Object} connections - Connection mapping
   * @returns {Array} Ordered array of nodes
   */
  orderNodesForEditing(nodes, connections) {
    // Simple ordering by node ID for now
    // Future implementation will use topological sorting based on connections
    return nodes.sort((a, b) => {
      const aNum = parseInt(a.id);
      const bNum = parseInt(b.id);
      return aNum - bNum;
    });
  },

  /**
   * Get workflow format (API vs GUI)
   * @param {Object} workflow - ComfyUI workflow object
   * @returns {string} 'api' or 'gui' or 'unknown'
   */
  getWorkflowFormat(workflow) {
    if (!workflow || typeof workflow !== 'object') {
      return 'unknown';
    }

    // Check if keys are numeric (API format)
    const keys = Object.keys(workflow);
    const hasNumericKeys = keys.some(key => /^\d+$/.test(key));
    
    if (hasNumericKeys) {
      // Verify it has class_type properties
      const firstNode = workflow[keys.find(key => /^\d+$/.test(key))];
      if (firstNode && firstNode.class_type) {
        return 'api';
      }
    }

    // Check for GUI format characteristics
    if (workflow.nodes && Array.isArray(workflow.nodes)) {
      return 'gui';
    }

    return 'unknown';
  }
};
