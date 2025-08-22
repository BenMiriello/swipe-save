/**
 * Schema Provider Service
 * Consolidated BentoML schema integration with caching and utilities
 */

window.comfyUIBentoML = window.comfyUIBentoML || {};
window.comfyUIBentoML.services = window.comfyUIBentoML.services || {};

window.comfyUIBentoML.services.schemaProvider = {
  // Cache management
  cachedSchema: null,
  lastSchemaFetch: 0,
  schemaTimeout: 300000, // 5 minutes

  /**
   * Get BentoML schema with caching
   */
  async getSchema() {
    const now = Date.now();
    
    // Return cached schema if fresh
    if (this.cachedSchema && (now - this.lastSchemaFetch) < this.schemaTimeout) {
      return this.cachedSchema;
    }

    try {
      // Get schema from BentoML service
      const schema = await window.comfyUIBentoML.client.getServiceSchema();
      
      if (schema) {
        this.cachedSchema = schema;
        this.lastSchemaFetch = now;
        return schema;
      } else {
        throw new Error('BentoML service returned empty schema');
      }
    } catch (error) {
      console.error('Failed to fetch BentoML schema:', error.message);
      throw error;
    }
  },

  /**
   * Clear cached schema
   */
  clearCache() {
    this.cachedSchema = null;
    this.lastSchemaFetch = 0;
  },

  /**
   * Identify seed fields using schema
   */
  async identifySeedFields(workflowData) {
    try {
      const schema = await this.getSchema();
      return this.extractSeedsFromSchema(workflowData, schema);
    } catch (error) {
      console.warn('Schema unavailable for seed detection, using fallback');
      return window.comfyUIBentoML.core.fieldDetector.detectSeedsDirectly(workflowData);
    }
  },

  /**
   * Identify text fields using schema
   */
  async identifyTextFields(workflowData) {
    try {
      const schema = await this.getSchema();
      return this.extractTextFieldsFromSchema(workflowData, schema);
    } catch (error) {
      console.warn('Schema unavailable for text field detection, using fallback');
      return window.comfyUIBentoML.core.fieldDetector.detectTextFieldsDirectly(workflowData);
    }
  },

  /**
   * Extract seed fields from schema
   */
  extractSeedsFromSchema(workflowData, schema) {
    const seedFields = [];
    
    if (!schema || !schema.properties) {
      return seedFields;
    }

    // Look for seed-related fields in schema
    for (const [fieldPath, fieldDef] of Object.entries(schema.properties)) {
      if (this.isSeedField(fieldPath, fieldDef)) {
        const value = this.getValueByPath(workflowData, fieldPath);
        if (typeof value === 'number') {
          const pathParts = fieldPath.split('.');
          const fieldName = pathParts[pathParts.length - 1];
          
          seedFields.push({
            path: fieldPath,
            value: value,
            currentValue: value,
            inputName: fieldName,
            fieldName: fieldName,
            nodeId: this.extractNodeId(fieldPath),
            nodeType: this.extractNodeType(fieldPath, workflowData),
            fieldType: 'number'
          });
        }
      }
    }

    return seedFields;
  },

  /**
   * Extract text fields from schema
   */
  extractTextFieldsFromSchema(workflowData, schema) {
    const textFields = [];
    
    if (!schema || !schema.properties) {
      return textFields;
    }

    // Look for text-related fields in schema
    for (const [fieldPath, fieldDef] of Object.entries(schema.properties)) {
      if (this.isTextField(fieldPath, fieldDef)) {
        const value = this.getValueByPath(workflowData, fieldPath);
        if (typeof value === 'string' && value.length > 2) {
          const pathParts = fieldPath.split('.');
          const fieldName = pathParts[pathParts.length - 1];
          const isPrompt = this.isPromptField(fieldName, value);
          
          textFields.push({
            path: fieldPath,
            value: value,
            currentValue: value,
            inputName: fieldName,
            fieldName: fieldName,
            nodeId: this.extractNodeId(fieldPath),
            nodeType: this.extractNodeType(fieldPath, workflowData),
            isPrompt: isPrompt,
            fieldType: isPrompt ? 'textarea' : 'text'
          });
        }
      }
    }

    return textFields;
  },

  /**
   * Check if field is a seed field
   */
  isSeedField(fieldPath, fieldDef) {
    const fieldName = fieldPath.split('.').pop();
    return fieldName === 'seed' || fieldName === 'noise_seed';
  },

  /**
   * Check if field is a text field
   */
  isTextField(fieldPath, fieldDef) {
    // Check schema type
    if (fieldDef.type === 'string') {
      const fieldName = fieldPath.split('.').pop();
      // Skip metadata and known non-text fields
      const metadataFields = ['title', 'class_type', '_meta'];
      return !metadataFields.includes(fieldName);
    }
    return false;
  },

  /**
   * Check if text field is a prompt
   */
  isPromptField(fieldName, value) {
    const isActualPrompt = fieldName.toLowerCase().includes('prompt') || 
                          fieldName.toLowerCase().includes('positive') || 
                          fieldName.toLowerCase().includes('negative');
    
    return isActualPrompt || (typeof value === 'string' && value.length > 50 && value.includes(' '));
  },

  /**
   * Extract node ID from field path
   */
  extractNodeId(fieldPath) {
    const pathParts = fieldPath.split('.');
    return pathParts[0] || 'unknown';
  },

  /**
   * Extract node type from workflow data
   */
  extractNodeType(fieldPath, workflowData) {
    const nodeId = this.extractNodeId(fieldPath);
    
    // Try API format first
    if (workflowData[nodeId] && workflowData[nodeId].class_type) {
      return workflowData[nodeId].class_type;
    }
    
    // Try GUI format
    if (workflowData.nodes && Array.isArray(workflowData.nodes)) {
      const node = workflowData.nodes.find(n => n.id == nodeId);
      if (node && node.type) {
        return node.type;
      }
    }
    
    return 'Unknown';
  },

  /**
   * Utility: Get value from workflow data by path
   */
  getValueByPath(obj, path) {
    return path.split('.').reduce((current, key) => current && current[key], obj);
  },

  /**
   * Utility: Set value in workflow data by path
   */
  setValueByPath(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let current = obj;
    
    for (const key of keys) {
      if (!current[key]) current[key] = {};
      current = current[key];
    }
    
    current[lastKey] = value;
  },

  /**
   * Utility: Check if value is a configuration parameter
   */
  isConfigurationValue(fieldName, value) {
    // Common configuration patterns
    const configPatterns = [
      /^(width|height|batch_size)$/,
      /^(steps|cfg|denoise)$/,
      /^(sampler_name|scheduler)$/,
      /format$/
    ];

    return configPatterns.some(pattern => pattern.test(fieldName));
  },

  /**
   * Utility: Check if field name indicates a file path
   */
  isFilePathField(fieldName) {
    return fieldName.includes('path') || 
           fieldName.includes('file') || 
           fieldName.includes('filename') ||
           fieldName.endsWith('_name');
  },

  /**
   * Utility: Extract field name from path
   */
  getFieldNameFromPath(path) {
    return path.split('.').pop();
  },

  /**
   * Utility: Build field path
   */
  buildFieldPath(nodeId, inputName) {
    return `${nodeId}.inputs.${inputName}`;
  }
};