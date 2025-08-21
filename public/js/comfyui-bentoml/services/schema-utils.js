/**
 * Schema Utilities Module
 * Path operations and helper functions for schema processing
 */
const SchemaUtils = {
  /**
   * Get value from workflow data by path (supports nested objects)
   */
  getValueByPath(obj, path) {
    return path.split('.').reduce((current, key) => current && current[key], obj);
  },

  /**
   * Set value in workflow data by path
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
   * Check if value is likely a configuration parameter
   */
  isConfigurationValue(key, value) {
    const configPatterns = ['width', 'height', 'steps', 'cfg', 'sampler', 'scheduler'];
    return configPatterns.some(pattern => key.toLowerCase().includes(pattern)) || 
           (typeof value === 'string' && value.length < 10 && /^[a-zA-Z0-9_-]+$/.test(value));
  },

  /**
   * Check if field name suggests prompt-like content
   */
  isPromptLikeName(name) {
    const promptPatterns = ['prompt', 'text', 'description', 'positive', 'negative'];
    return promptPatterns.some(pattern => name.toLowerCase().includes(pattern));
  },

  /**
   * Check if field is prompt-related
   */
  isPromptInput(inputName) {
    return this.isPromptLikeName(inputName);
  },

  /**
   * Check if field definition represents a text field
   */
  isTextFieldType(fieldDef) {
    if (!fieldDef) return false;
    
    // Check for string type
    if (fieldDef.type === 'string') return true;
    
    // Check for text formats
    if (fieldDef.format && ['text', 'textarea', 'prompt'].includes(fieldDef.format)) {
      return true;
    }
    
    // Check for description containing text-related keywords
    if (fieldDef.description) {
      const textKeywords = ['text', 'prompt', 'description', 'content'];
      return textKeywords.some(keyword => 
        fieldDef.description.toLowerCase().includes(keyword)
      );
    }
    
    return false;
  },

  /**
   * Check if field is prompt-related
   */
  isPromptField(fieldDef, fieldPath) {
    if (!fieldDef) return false;
    
    // Check field path/name
    if (fieldPath && this.isPromptLikeName(fieldPath)) return true;
    
    // Check field title or description
    if (fieldDef.title && this.isPromptLikeName(fieldDef.title)) return true;
    if (fieldDef.description && this.isPromptLikeName(fieldDef.description)) return true;
    
    return false;
  },

  /**
   * Check if field definition represents a seed field
   */
  isSeedFieldType(fieldDef, fieldPath) {
    if (!fieldDef) return false;
    
    // Must be numeric
    if (fieldDef.type !== 'integer' && fieldDef.type !== 'number') return false;
    
    // Check if field path contains 'seed'
    if (fieldPath && fieldPath.toLowerCase().includes('seed')) return true;
    
    // Check field title or description
    if (fieldDef.title && fieldDef.title.toLowerCase().includes('seed')) return true;
    if (fieldDef.description && fieldDef.description.toLowerCase().includes('seed')) return true;
    
    return false;
  }
};

window.comfyUIBentoML = window.comfyUIBentoML || {};
window.comfyUIBentoML.SchemaUtils = SchemaUtils;