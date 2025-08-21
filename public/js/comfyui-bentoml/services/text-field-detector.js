/**
 * Text Field Detector Module
 * Identifies text and prompt fields in workflow data using BentoML schema
 */
const TextFieldDetector = {
  /**
   * Identify text fields using BentoML schema
   */
  async identifyTextFields(workflowData) {
    if (!workflowData) return [];
    
    // Use direct workflow parsing (no BentoML dependency)
    return this.fallbackTextFieldDetection(workflowData);
  },

  /**
   * Extract text fields from GUI format node using BentoML schema
   */
  extractTextFieldsFromGUINode(node, schema) {
    const textFields = [];
    if (!node.widgets_values || !schema.input_schema) return textFields;

    const nodeSchema = this.getNodeSchemaDefinition(node.type, schema);
    if (!nodeSchema) return textFields;

    node.widgets_values.forEach((value, index) => {
      if (typeof value === 'string' && value.length > 0) {
        const inputName = this.getInputNameForWidgetIndex(node.type, index, nodeSchema);
        if (inputName && this.isTextInput(inputName, nodeSchema)) {
          textFields.push({
            path: `nodes.${node.id}.widgets_values.${index}`,
            value: value,
            nodeType: node.type,
            inputName: inputName
          });
        }
      }
    });

    return textFields;
  },

  /**
   * Extract text fields from API format node using BentoML schema
   */
  extractTextFieldsFromAPINode(nodeId, node, schema) {
    const textFields = [];
    if (!node.inputs || !schema.input_schema) return textFields;

    const nodeSchema = this.getNodeSchemaDefinition(node.class_type, schema);
    if (!nodeSchema) return textFields;

    for (const [inputName, value] of Object.entries(node.inputs)) {
      if (typeof value === 'string' && value.length > 0 && this.isTextInput(inputName, nodeSchema)) {
        textFields.push({
          path: `${nodeId}.inputs.${inputName}`,
          value: value,
          nodeType: node.class_type,
          inputName: inputName
        });
      }
    }

    return textFields;
  },

  /**
   * Get schema definition for a specific node type
   */
  getNodeSchemaDefinition(nodeType, schema) {
    if (schema.input_schema && schema.input_schema.properties) {
      return schema.input_schema.properties[nodeType];
    }
    return null;
  },

  /**
   * Get input name for widget index (simplified - would need node info)
   */
  getInputNameForWidgetIndex(nodeType, widgetIndex, nodeSchema) {
    // This would need actual node definition mapping
    return `widget_${widgetIndex}`;
  },

  /**
   * Check if input is text-related using BentoML schema
   */
  isTextInput(inputName, nodeSchema) {
    return window.comfyUIBentoML.SchemaUtils.isTextFieldType(nodeSchema) || 
           window.comfyUIBentoML.SchemaUtils.isPromptInput(inputName);
  },

  /**
   * Fallback text field detection (when schema unavailable)
   */
  fallbackTextFieldDetection(workflowData) {
    const textFields = [];
    
    const searchForText = (obj, currentPath = '') => {
      if (typeof obj !== 'object' || obj === null) return;
      
      for (const [key, value] of Object.entries(obj)) {
        const fullPath = currentPath ? `${currentPath}.${key}` : key;
        
        if (typeof value === 'string' && value.length > 2) {
          // Skip configuration values
          if (!window.comfyUIBentoML.SchemaUtils.isConfigurationValue(key, value)) {
            const isPrompt = window.comfyUIBentoML.SchemaUtils.isPromptLikeName(key) || 
                            value.length > 50 || // Long text likely to be prompt
                            value.includes('\n'); // Multi-line text
            textFields.push({
              path: fullPath,
              value: value,
              inputName: key,
              isPrompt: isPrompt,
              fieldType: isPrompt ? 'textarea' : 'text'
            });
          }
        } else if (typeof value === 'object') {
          searchForText(value, fullPath);
        }
      }
    };

    searchForText(workflowData);
    return textFields;
  }
};

window.comfyUIBentoML = window.comfyUIBentoML || {};
window.comfyUIBentoML.TextFieldDetector = TextFieldDetector;