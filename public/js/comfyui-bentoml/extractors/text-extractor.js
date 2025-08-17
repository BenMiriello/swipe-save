/**
 * Text Extractor Service
 * Focused extraction of text input fields from workflows
 */

window.comfyUIBentoML = window.comfyUIBentoML || {};
window.comfyUIBentoML.extractors = window.comfyUIBentoML.extractors || {};

window.comfyUIBentoML.extractors.textExtractor = {
  /**
   * Extract all text fields from workflow
   */
  extractTextFields(workflowData) {
    const textFields = [];

    if (workflowData.nodes && Array.isArray(workflowData.nodes)) {
      // GUI format
      for (const node of workflowData.nodes) {
        const fields = this.extractFromGUINode(node);
        textFields.push(...fields);
      }
    } else {
      // API format
      for (const [nodeId, node] of Object.entries(workflowData)) {
        if (node && typeof node === 'object' && node.class_type) {
          const fields = this.extractFromAPINode(nodeId, node);
          textFields.push(...fields);
        }
      }
    }

    return textFields;
  },

  /**
   * Extract text fields from GUI format node
   */
  extractFromGUINode(node) {
    const textFields = [];
    if (!this.isTextNode(node.type) || !node.widgets_values) return textFields;

    switch (node.type) {
      case 'CLIPTextEncode':
        if (node.widgets_values[0] && typeof node.widgets_values[0] === 'string') {
          textFields.push({
            nodeId: node.id,
            nodeType: node.type,
            fieldName: 'text',
            currentValue: node.widgets_values[0],
            isPrompt: true,
            source: 'gui'
          });
        }
        break;

      case 'ImpactWildcardEncode':
        if (node.widgets_values[0]) {
          textFields.push({
            nodeId: node.id,
            nodeType: node.type,
            fieldName: 'wildcard_text',
            currentValue: node.widgets_values[0],
            isPrompt: true,
            source: 'gui'
          });
        }
        if (node.widgets_values[1]) {
          textFields.push({
            nodeId: node.id,
            nodeType: node.type,
            fieldName: 'populated_text',
            currentValue: node.widgets_values[1],
            isPrompt: true,
            source: 'gui'
          });
        }
        break;

      case 'JWStringMultiline':
        if (node.widgets_values[0]) {
          textFields.push({
            nodeId: node.id,
            nodeType: node.type,
            fieldName: 'text',
            currentValue: node.widgets_values[0],
            isPrompt: false,
            source: 'gui'
          });
        }
        break;
    }

    return textFields;
  },

  /**
   * Extract text fields from API format node
   */
  extractFromAPINode(nodeId, node) {
    const textFields = [];
    if (!node.inputs) return textFields;

    for (const [inputName, value] of Object.entries(node.inputs)) {
      if (this.isTextInput(inputName, value)) {
        textFields.push({
          nodeId: nodeId,
          nodeType: node.class_type,
          fieldName: inputName,
          currentValue: value,
          isPrompt: this.isPromptInput(inputName),
          source: 'api'
        });
      }
    }

    return textFields;
  },

  /**
   * Check if node type handles text
   */
  isTextNode(nodeType) {
    const textNodeTypes = [
      'CLIPTextEncode',
      'ImpactWildcardEncode',
      'JWStringMultiline',
      'String',
      'Text',
      'StringConstant',
      'MultilineString'
    ];
    return textNodeTypes.some(type => nodeType.includes(type));
  },

  /**
   * Check if API input is text
   */
  isTextInput(inputName, value) {
    if (typeof value !== 'string') return false;
    if (value.length < 3) return false; // Skip very short values
    
    const textInputNames = ['text', 'prompt', 'positive', 'negative', 'description'];
    return textInputNames.some(name => inputName.toLowerCase().includes(name));
  },

  /**
   * Check if input is prompt-related
   */
  isPromptInput(inputName) {
    const promptInputs = ['text', 'prompt', 'positive', 'negative'];
    return promptInputs.some(name => inputName.toLowerCase().includes(name));
  },

  /**
   * Format text value for display
   */
  formatForDisplay(text, maxLength = 100) {
    if (!text) return '';
    
    const textStr = text.toString();
    if (textStr.length <= maxLength) return textStr;
    
    return textStr.substring(0, maxLength) + '...';
  },

  /**
   * Get field display name
   */
  getDisplayName(fieldName) {
    const displayNames = {
      'wildcard_text': 'Wildcard Text',
      'populated_text': 'Populated Text',
      'text': 'Text',
      'prompt': 'Prompt',
      'positive': 'Positive Prompt',
      'negative': 'Negative Prompt'
    };
    
    return displayNames[fieldName] || fieldName;
  }
};