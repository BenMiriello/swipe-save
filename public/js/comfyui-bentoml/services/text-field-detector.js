/**
 * Text Field Detector Module
 * Identifies text and prompt fields in workflow data using BentoML schema
 */
const TextFieldDetector = {
  /**
   * Identify text fields using BentoML schema
   */
  async identifyTextFields(workflowData) {
    const textFields = [];
    
    try {
      const schema = await window.comfyUIBentoML.SchemaCache.getSchema();
      
      if (!schema || !workflowData) {
        console.warn('Schema or workflow data not available for text field detection');
        return this.fallbackTextFieldDetection(workflowData);
      }

      // Process based on workflow format
      if (workflowData.nodes && Array.isArray(workflowData.nodes)) {
        // GUI format workflow
        for (const node of workflowData.nodes) {
          textFields.push(...this.extractTextFieldsFromGUINode(node, schema));
        }
      } else {
        // API format workflow
        for (const [nodeId, node] of Object.entries(workflowData)) {
          if (node && typeof node === 'object' && node.class_type) {
            textFields.push(...this.extractTextFieldsFromAPINode(nodeId, node, schema));
          }
        }
      }
      
      return textFields;
    } catch (error) {
      console.error('Error in text field detection:', error);
      return this.fallbackTextFieldDetection(workflowData);
    }
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
            textFields.push({
              path: fullPath,
              value: value,
              inputName: key
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