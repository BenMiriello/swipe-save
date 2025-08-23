/**
 * Unified Field Detector
 * Consolidates all field extraction logic from multiple extractors
 */

window.comfyUIBentoML = window.comfyUIBentoML || {};
window.comfyUIBentoML.core = window.comfyUIBentoML.core || {};

window.comfyUIBentoML.core.fieldDetector = {
  /**
   * Extract all editable fields from workflow data
   */
  async extractFields(workflowData) {
    if (!workflowData) return { seeds: [], prompts: [], textFields: [], models: [], dropdowns: [], numbers: [], toggles: [] };

    try {
      // Extract all field types in parallel for efficiency
      const [seeds, textFields, parameters] = await Promise.all([
        this.extractSeeds(workflowData),
        this.extractTextFields(workflowData),
        this.extractParameters(workflowData)
      ]);

      // Separate prompts from regular text fields
      const prompts = textFields.filter(field => field.isPrompt);
      const regularTextFields = textFields.filter(field => !field.isPrompt);

      // Categorize parameters by UI type
      const allDropdowns = parameters.filter(field => field.fieldType && field.fieldType.type === 'dropdown');
      const numbers = parameters.filter(field => field.fieldType && field.fieldType.type === 'number');
      const toggles = parameters.filter(field => field.fieldType && field.fieldType.type === 'boolean');

      // Separate model fields from other dropdowns
      const modelFieldNames = ['ckpt_name', 'lora_name', 'vae_name', 'unet_name', 'clip_name', 'model_name'];
      const models = allDropdowns.filter(field => 
        modelFieldNames.includes(field.fieldName) || 
        field.fieldName.toLowerCase().includes('model') ||
        field.fieldName.toLowerCase().includes('checkpoint') ||
        field.fieldName.toLowerCase().includes('lora')
      );

      // Separate media/image fields from other dropdowns  
      const media = allDropdowns.filter(field =>
        (field.nodeType === 'LoadImage' && field.fieldName === 'image') ||
        (field.fieldType && field.fieldType.category === 'image') ||
        field.fieldName.toLowerCase().includes('image')
      );

      const dropdowns = allDropdowns.filter(field => 
        !models.some(m => m.nodeId === field.nodeId && m.fieldName === field.fieldName) &&
        !media.some(m => m.nodeId === field.nodeId && m.fieldName === field.fieldName)
      );

      console.log('Field extraction results:', {
        seeds: seeds.length,
        prompts: prompts.length,
        textFields: regularTextFields.length,
        models: models.length,
        media: media.length,
        dropdowns: dropdowns.length,
        numbers: numbers.length,
        toggles: toggles.length
      });

      return {
        seeds,
        prompts,
        textFields: regularTextFields,
        models,
        media,
        dropdowns,
        numbers,
        toggles
      };
    } catch (error) {
      console.error('Error in field extraction:', error);
      return { seeds: [], prompts: [], textFields: [], models: [], media: [], dropdowns: [], numbers: [], toggles: [] };
    }
  },

  /**
   * Extract seed fields (seed, noise_seed)
   */
  async extractSeeds(workflowData) {
    // Try schema service first, fallback to direct detection
    try {
      if (window.comfyUIBentoML?.services?.schemaProvider?.identifySeedFields) {
        return await window.comfyUIBentoML.services.schemaProvider.identifySeedFields(workflowData);
      }
    } catch (error) {
      console.warn('Schema service unavailable for seeds, using fallback');
    }

    return this.detectSeedsDirectly(workflowData);
  },

  /**
   * Extract text fields (prompts and other text)
   */
  async extractTextFields(workflowData) {
    // Try schema service first, fallback to direct detection
    try {
      if (window.comfyUIBentoML?.services?.schemaProvider?.identifyTextFields) {
        return await window.comfyUIBentoML.services.schemaProvider.identifyTextFields(workflowData);
      }
    } catch (error) {
      console.warn('Schema service unavailable for text fields, using fallback');
    }

    return this.detectTextFieldsDirectly(workflowData);
  },

  /**
   * Extract parameter fields (dropdowns, numbers, booleans)
   */
  extractParameters(workflowData) {
    const parameters = [];

    if (workflowData.nodes && Array.isArray(workflowData.nodes)) {
      // GUI format
      for (const node of workflowData.nodes) {
        const params = this.extractParametersFromGUINode(node);
        parameters.push(...params);
      }
    } else {
      // API format
      for (const [nodeId, node] of Object.entries(workflowData)) {
        if (node && typeof node === 'object' && node.class_type) {
          const params = this.extractParametersFromAPINode(nodeId, node);
          parameters.push(...params);
        }
      }
    }

    return parameters;
  },

  /**
   * Direct seed detection (fallback)
   */
  detectSeedsDirectly(workflowData) {
    const seedFields = [];
    
    const searchForSeeds = (obj, currentPath = '', nodeInfo = null) => {
      if (typeof obj !== 'object' || obj === null) return;
      
      for (const [key, value] of Object.entries(obj)) {
        const fullPath = currentPath ? `${currentPath}.${key}` : key;
        
        if ((key === 'seed' || key === 'noise_seed') && typeof value === 'number') {
          const pathParts = fullPath.split('.');
          const nodeId = pathParts[0] || 'unknown';
          
          let nodeType = 'Unknown';
          if (nodeInfo) {
            nodeType = nodeInfo.class_type || nodeInfo.type || 'Unknown';
          } else if (workflowData[nodeId] && workflowData[nodeId].class_type) {
            nodeType = workflowData[nodeId].class_type;
          }
          
          seedFields.push({
            path: fullPath,
            value: value,
            currentValue: value,
            inputName: key,
            fieldName: key,
            nodeId: nodeId,
            nodeType: nodeType,
            fieldType: 'number'
          });
        } else if (typeof value === 'object') {
          const currentNodeInfo = (key.match(/^\d+$/) && value.class_type) ? value : nodeInfo;
          searchForSeeds(value, fullPath, currentNodeInfo);
        }
      }
    };

    searchForSeeds(workflowData);
    return seedFields;
  },

  /**
   * Direct text field detection (fallback)
   */
  detectTextFieldsDirectly(workflowData) {
    const textFields = [];
    
    const searchForText = (obj, currentPath = '', nodeInfo = null) => {
      if (typeof obj !== 'object' || obj === null) return;
      
      for (const [key, value] of Object.entries(obj)) {
        const fullPath = currentPath ? `${currentPath}.${key}` : key;
        
        if (typeof value === 'string' && value.length > 2) {
          // Skip metadata and known non-text fields
          const metadataFields = ['title', 'class_type', '_meta'];
          const isMetadata = metadataFields.includes(key);
          
          // Skip image files (handled as filesystem dropdowns)
          const isImageFile = this.looksLikeImageFile(value);
          
          if (!isMetadata && !isImageFile) {
            const isActualPrompt = key.toLowerCase().includes('prompt') || 
                                  key.toLowerCase().includes('positive') || 
                                  key.toLowerCase().includes('negative');
            
            const isPrompt = isActualPrompt || (value.length > 50 && value.includes(' '));
            
            const pathParts = fullPath.split('.');
            const nodeId = pathParts[0] || 'unknown';
            
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
          const currentNodeInfo = (key.match(/^\d+$/) && value.class_type) ? value : nodeInfo;
          searchForText(value, fullPath, currentNodeInfo);
        }
      }
    };

    searchForText(workflowData);
    return textFields;
  },

  /**
   * Extract parameters from GUI format node
   */
  extractParametersFromGUINode(node) {
    const parameters = [];
    if (!node.widgets_values || !Array.isArray(node.widgets_values)) return parameters;

    node.widgets_values.forEach((value, index) => {
      if (this.shouldIncludeAsParameter(value, index)) {
        const fieldType = this.getFieldType(node.type, `widget_${index}`, value);
        
        parameters.push({
          path: `nodes.${node.id}.widgets_values.${index}`,
          value: value,
          currentValue: value,
          inputName: `widget_${index}`,
          fieldName: `widget_${index}`,
          nodeId: node.id,
          nodeType: node.type || 'Unknown',
          fieldType: fieldType
        });
      }
    });

    return parameters;
  },

  /**
   * Extract parameters from API format node
   */
  extractParametersFromAPINode(nodeId, node) {
    const parameters = [];
    if (!node.inputs) return parameters;

    for (const [inputName, value] of Object.entries(node.inputs)) {
      if (this.shouldIncludeAsParameter(value, inputName)) {
        const fieldType = this.getFieldType(node.class_type, inputName, value);
        
        parameters.push({
          path: `${nodeId}.inputs.${inputName}`,
          value: value,
          currentValue: value,
          inputName: inputName,
          fieldName: inputName,
          nodeId: nodeId,
          nodeType: node.class_type || 'Unknown',
          fieldType: fieldType
        });
      }
    }

    return parameters;
  },

  /**
   * Determine if value should be included as a parameter
   */
  shouldIncludeAsParameter(value, fieldName) {
    // Include numbers, booleans, and certain strings
    if (typeof value === 'number' || typeof value === 'boolean') return true;
    
    // Include string values that could be dropdowns
    if (typeof value === 'string') {
      // Skip very long strings (likely prompts)
      if (value.length > 100) return false;
      
      // Skip empty or very short strings
      if (value.length < 1) return false;
      
      return true;
    }
    
    return false;
  },

  /**
   * Determine field type for UI rendering
   */
  getFieldType(nodeType, fieldName, value) {
    // Specific LoadImage node detection
    if (nodeType === 'LoadImage' && fieldName === 'image') {
      return {
        type: 'dropdown',
        subtype: 'filesystem',
        category: 'image',
        fieldName
      };
    }

    // Check ComfyUI object_info for real dropdown options
    if (window.comfyUIObjectInfo && nodeType && fieldName) {
      const nodeInfo = window.comfyUIObjectInfo[nodeType];
      if (nodeInfo && nodeInfo.input && nodeInfo.input.required && nodeInfo.input.required[fieldName]) {
        const fieldDef = nodeInfo.input.required[fieldName];
        if (Array.isArray(fieldDef) && fieldDef.length > 0 && Array.isArray(fieldDef[0])) {
          return {
            type: 'dropdown',
            subtype: 'combo',
            options: fieldDef[0],
            fieldName
          };
        }
      }
    }

    // Filesystem dropdowns for model files
    if (typeof value === 'string' && this.looksLikeModelFile(value)) {
      return {
        type: 'dropdown',
        subtype: 'filesystem',
        fieldName
      };
    }

    // Image file dropdowns
    if (typeof value === 'string' && this.looksLikeImageFile(value)) {
      return {
        type: 'dropdown',
        subtype: 'filesystem',
        category: 'image',
        fieldName
      };
    }

    // Type detection based on value
    if (typeof value === 'boolean') {
      return { type: 'boolean', fieldName };
    }
    
    if (typeof value === 'number') {
      return { type: 'number', fieldName };
    }
    
    // Default to dropdown for strings (may have options loaded later)
    return { type: 'dropdown', subtype: 'unknown', fieldName };
  },

  /**
   * Check if value looks like a model file
   */
  looksLikeModelFile(value) {
    if (typeof value !== 'string') return false;
    const lowerValue = value.toLowerCase();
    const modelExtensions = ['.safetensors', '.ckpt', '.pt', '.pth', '.bin'];
    return modelExtensions.some(ext => lowerValue.endsWith(ext));
  },

  /**
   * Check if value looks like an image file
   */
  looksLikeImageFile(value) {
    if (typeof value !== 'string') return false;
    const lowerValue = value.toLowerCase();
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif'];
    return imageExtensions.some(ext => lowerValue.endsWith(ext));
  }
};