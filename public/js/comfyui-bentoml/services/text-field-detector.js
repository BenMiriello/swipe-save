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
    return window.comfyUIBentoML.services.schemaProvider.isTextField(inputName, nodeSchema) ||
           window.comfyUIBentoML.services.schemaProvider.isPromptField(inputName, '');
  },

  /**
   * Check if value looks like an image file
   */
  looksLikeImageFile(value) {
    if (typeof value !== 'string') return false;
    
    // Check for common image file extensions
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.svg'];
    const lowerValue = value.toLowerCase();
    
    // Check if the string ends with an image extension
    return imageExtensions.some(ext => lowerValue.endsWith(ext));
  },

  /**
   * Fallback text field detection (when schema unavailable)
   */
  fallbackTextFieldDetection(workflowData) {
    const textFields = [];
    
    const searchForText = (obj, currentPath = '', nodeInfo = null) => {
      if (typeof obj !== 'object' || obj === null) return;
      
      for (const [key, value] of Object.entries(obj)) {
        const fullPath = currentPath ? `${currentPath}.${key}` : key;
        
        if (typeof value === 'string' && value.length > 2) {
          // Check if it's a configuration value
          const isConfig = window.comfyUIBentoML?.SchemaUtils?.isConfigurationValue ? 
                          window.comfyUIBentoML.services.schemaProvider.isConfigurationValue(key, value) : false;
          
          // Skip metadata fields that shouldn't be editable
          const metadataFields = ['title', 'class_type', '_meta'];
          const isMetadata = metadataFields.includes(key);
          
          // Skip image files (handled as filesystem dropdowns by parameter extractor)
          const isImageFile = this.looksLikeImageFile(value);
          
          if (!isConfig && !isMetadata && !isImageFile) {
            // Only actual prompt fields should be prompts - be very specific
            const isActualPrompt = key.toLowerCase().includes('prompt') || 
                                  key.toLowerCase().includes('positive') || 
                                  key.toLowerCase().includes('negative');
            
            // Prompt fields should be prompts regardless of length if they contain prompt keywords
            // But non-prompt fields need significant content to be prompts
            const isPrompt = isActualPrompt || (value.length > 50 && value.includes(' '));
            
            // Extract nodeId from path if it follows ComfyUI format
            const pathParts = fullPath.split('.');
            const nodeId = pathParts[0] || 'unknown';
            
            // Use nodeInfo if available, otherwise extract from workflow structure
            let nodeType = 'Unknown';
            if (nodeInfo) {
              nodeType = nodeInfo.class_type || nodeInfo.type || 'Unknown';
            } else if (workflowData[nodeId] && workflowData[nodeId].class_type) {
              nodeType = workflowData[nodeId].class_type;
            }
            
            textFields.push({
              path: fullPath,
              value: value,
              currentValue: value,
              inputName: key,
              fieldName: key,
              nodeId: nodeId,
              nodeType: nodeType,
              isPrompt: isPrompt,
              fieldType: isPrompt ? 'textarea' : 'text'
            });
          }
        } else if (typeof value === 'object') {
          // Pass node info if we're at a node level
          const currentNodeInfo = (key.match(/^\d+$/) && value.class_type) ? value : nodeInfo;
          searchForText(value, fullPath, currentNodeInfo);
        }
      }
    };

    searchForText(workflowData);
    return textFields;
  }
};

window.comfyUIBentoML = window.comfyUIBentoML || {};
window.comfyUIBentoML.TextFieldDetector = TextFieldDetector;