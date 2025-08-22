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
    
    // Check if it's GUI format (has nodes array) or API format (object with node IDs)
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
    if (!node.widgets_values || !Array.isArray(node.widgets_values)) return textFields;

    node.widgets_values.forEach((value, index) => {
      if (typeof value === 'string' && value.length > 2) {
        // Generate field name for widget
        const fieldName = `widget_${index}`;
        
        if (this.shouldIncludeTextField(fieldName, value)) {
          const isPrompt = this.isPromptField(fieldName, value);
          
          textFields.push({
            path: `nodes.${node.id}.widgets_values.${index}`,
            value: value,
            currentValue: value,
            inputName: fieldName,
            fieldName: fieldName,
            nodeId: node.id,
            nodeType: node.type || 'Unknown',
            isPrompt: isPrompt,
            fieldType: isPrompt ? 'textarea' : 'text'
          });
        }
      }
    });

    return textFields;
  },

  /**
   * Extract text fields from API format node
   */
  extractFromAPINode(nodeId, node) {
    const textFields = [];
    if (!node.inputs) return textFields;

    for (const [inputName, value] of Object.entries(node.inputs)) {
      if (typeof value === 'string' && value.length > 2) {
        if (this.shouldIncludeTextField(inputName, value)) {
          const isPrompt = this.isPromptField(inputName, value);
          
          textFields.push({
            path: `${nodeId}.inputs.${inputName}`,
            value: value,
            currentValue: value,
            inputName: inputName,
            fieldName: inputName,
            nodeId: nodeId,
            nodeType: node.class_type || 'Unknown',
            isPrompt: isPrompt,
            fieldType: isPrompt ? 'textarea' : 'text'
          });
        }
      }
    }

    return textFields;
  },

  /**
   * Check if a text field should be included
   */
  shouldIncludeTextField(fieldName, value) {
    // Check if it's a configuration value
    const isConfig = window.comfyUIBentoML?.SchemaUtils?.isConfigurationValue ? 
                    window.comfyUIBentoML.SchemaUtils.isConfigurationValue(fieldName, value) : false;
    
    // Skip known parameter fields (handled by parameter extractor)
    const knownParams = ['sampler_name', 'scheduler', 'format', 'pix_fmt', 'operation', 'ckpt_name', 'vae_name', 'lora_name', 'unet_name', 'clip_name', 'model_name', 'filename_prefix'];
    const isKnownParam = knownParams.includes(fieldName);
    
    // Skip metadata fields that shouldn't be editable
    const metadataFields = ['title', 'class_type', '_meta'];
    const isMetadata = metadataFields.includes(fieldName);
    
    // Skip image files (handled as filesystem dropdowns by parameter extractor)
    const isImageFile = this.looksLikeImageFile(value);
    
    return !isConfig && !isKnownParam && !isMetadata && !isImageFile;
  },

  /**
   * Check if a field is a prompt field
   */
  isPromptField(fieldName, value) {
    // Only actual prompt fields should be prompts - be very specific
    const isActualPrompt = fieldName.toLowerCase().includes('prompt') || 
                          fieldName.toLowerCase().includes('positive') || 
                          fieldName.toLowerCase().includes('negative') ||
                          fieldName.toLowerCase().includes('text');
    
    // Prompt fields should be prompts regardless of length if they contain prompt keywords
    // But non-prompt fields need significant content to be prompts
    return isActualPrompt || (value.length > 50 && value.includes(' '));
  }
};

window.comfyUIBentoML = window.comfyUIBentoML || {};
window.comfyUIBentoML.TextFieldDetector = TextFieldDetector;