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
   * Extract text fields from GUI format node with universal but accurate detection
   */
  extractFromGUINode(node) {
    const textFields = [];
    if (!node.widgets_values) return textFields;

    // Universal approach - check ANY node type (no hardcoding)
    // But be accurate about what constitutes actual text content
    for (let i = 0; i < node.widgets_values.length; i++) {
      const value = node.widgets_values[i];
      if (this.isActualTextContent(value)) {
        textFields.push({
          nodeId: node.id,
          nodeType: node.type,
          fieldName: this.inferFieldName(node, i),
          currentValue: value,
          isPrompt: this.isPromptValue(node, value),
          source: 'gui',
          detectionMethod: 'universal'
        });
      }
    }

    return textFields;
  },

  /**
   * Legacy hardcoded extraction for fallback
   */
  extractFromGUINodeLegacy(node) {
    const textFields = [];

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

      case 'PrimitiveStringMultiline':
        if (node.widgets_values[0]) {
          textFields.push({
            nodeId: node.id,
            nodeType: node.type,
            fieldName: 'text',
            currentValue: node.widgets_values[0],
            isPrompt: this.isPromptValue(node, node.widgets_values[0]),
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
   * Generic pattern-based text value detection
   */
  isTextValue(node, widgetIndex, value) {
    // Must be string
    if (typeof value !== 'string') return false;
    
    // Skip empty strings
    if (value.length === 0) return false;
    
    // Skip pure numbers, booleans as strings, very short values
    if (/^\d+$/.test(value) || /^(true|false)$/i.test(value) || value.length < 3) {
      return false;
    }
    
    // Skip common non-text values
    if (/^(increment|decrement|randomize|fixed)$/i.test(value)) {
      return false;
    }
    
    // Semantic clues from node type and title
    const nodeTypeLower = node.type.toLowerCase();
    const titleLower = (node.title || '').toLowerCase();
    
    // Strong indicators - these override length requirements
    if (nodeTypeLower.includes('text') || titleLower.includes('text')) {
      return true;
    }
    
    if (nodeTypeLower.includes('prompt') || titleLower.includes('prompt')) {
      return true;
    }
    
    if (nodeTypeLower.includes('string') || nodeTypeLower.includes('multiline')) {
      return true;
    }
    
    if (nodeTypeLower.includes('encode') && value.length > 5) {
      return true;
    }
    
    // Only consider longer strings as text to avoid false positives
    if (value.length > 15) {
      return true;
    }
    
    return false;
  },

  /**
   * Check if node type commonly contains text fields
   */
  isLikelyTextNode(nodeType) {
    const textNodeTypes = [
      'CLIPTextEncode',
      'PrimitiveStringMultiline', 
      'easy seed',
      'String',
      'Text',
      'StringConstant',
      'MultilineString',
      'JWStringMultiline',
      'ImpactWildcardEncode'
    ];
    
    const nodeTypeLower = nodeType.toLowerCase();
    return textNodeTypes.some(type => 
      nodeTypeLower.includes(type.toLowerCase()) ||
      nodeTypeLower.includes('text') ||
      nodeTypeLower.includes('prompt') ||
      nodeTypeLower.includes('string')
    );
  },

  /**
   * Accurate check for actual text content (not config values, paths, etc.)
   */
  isActualTextContent(value) {
    // Must be string
    if (typeof value !== 'string') return false;
    
    // Must have reasonable length
    if (value.length < 3) return false;
    
    // Skip pure numbers
    if (/^\d+$/.test(value)) return false;
    
    // Skip boolean values
    if (/^(true|false)$/i.test(value)) return false;
    
    // Skip common control values
    if (/^(increment|decrement|randomize|fixed|enabled|disabled)$/i.test(value)) {
      return false;
    }
    
    // Skip file paths and model names
    if (value.includes('/') || value.includes('\\') || value.endsWith('.safetensors') || value.endsWith('.ckpt')) {
      return false;
    }
    
    // Must contain some alphabetic characters (not just symbols/numbers)
    if (!/[a-zA-Z]/.test(value)) return false;
    
    // Accept if it looks like actual text content
    return true;
  },

  /**
   * Infer field name from node context
   */
  inferFieldName(node, widgetIndex) {
    const titleLower = (node.title || '').toLowerCase();
    
    if (titleLower.includes('negative')) return 'negative_prompt';
    if (titleLower.includes('positive')) return 'positive_prompt';
    if (titleLower.includes('prompt')) return 'prompt';
    
    return 'text';
  },

  /**
   * Determine if text value is prompt-related
   */
  isPromptValue(node, value) {
    const nodeTypeLower = node.type.toLowerCase();
    const titleLower = (node.title || '').toLowerCase();
    
    return (
      nodeTypeLower.includes('prompt') ||
      titleLower.includes('prompt') ||
      nodeTypeLower.includes('encode') ||
      value.length > 20 // Long text likely prompts
    );
  },

  /**
   * Check if node type handles text (legacy hardcoded detection)
   */
  isTextNode(nodeType) {
    const textNodeTypes = [
      'CLIPTextEncode',
      'ImpactWildcardEncode', 
      'JWStringMultiline',
      'PrimitiveStringMultiline',
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