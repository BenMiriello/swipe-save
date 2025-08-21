/**
 * BentoML Schema Service
 * Orchestrates schema-driven field detection using modular components
 * BentoML-only implementation (ComfyUI fallback removed)
 */

window.comfyUIBentoML = window.comfyUIBentoML || {};

window.comfyUIBentoML.schemaService = {
  /**
   * Get schema with caching (BentoML only)
   */
  async getSchema() {
    return window.comfyUIBentoML.SchemaCache.getSchema();
  },

  /**
   * Enhanced field type inference using BentoML schema
   */
  inferTypeFromBentoMLSchema(fieldDef, fieldName, nodeType) {
    return window.comfyUIBentoML.FieldTypeDetector.inferTypeFromBentoMLSchema(fieldDef, fieldName, nodeType);
  },

  /**
   * Check if a field should be treated as boolean
   */
  isBooleanField(fieldName, fieldDef) {
    return window.comfyUIBentoML.FieldTypeDetector.isBooleanField(fieldName, fieldDef);
  },

  /**
   * Identify text fields using BentoML schema
   */
  async identifyTextFields(workflowData) {
    return window.comfyUIBentoML.TextFieldDetector.identifyTextFields(workflowData);
  },

  /**
   * Check if field definition represents a text field
   */
  isTextFieldType(fieldDef) {
    return window.comfyUIBentoML.SchemaUtils.isTextFieldType(fieldDef);
  },

  /**
   * Check if field is prompt-related
   */
  isPromptField(fieldDef, fieldPath) {
    return window.comfyUIBentoML.SchemaUtils.isPromptField(fieldDef, fieldPath);
  },

  /**
   * Check if input is prompt-related
   */
  isPromptInput(inputName) {
    return window.comfyUIBentoML.SchemaUtils.isPromptInput(inputName);
  },

  /**
   * Identify seed parameters using BentoML schema
   */
  async identifySeedFields(workflowData) {
    return window.comfyUIBentoML.SeedFieldDetector.identifySeedFields(workflowData);
  },

  /**
   * Check if field definition represents a seed field
   */
  isSeedFieldType(fieldDef, fieldPath) {
    return window.comfyUIBentoML.SchemaUtils.isSeedFieldType(fieldDef, fieldPath);
  },

  /**
   * Get value from workflow data by path (supports nested objects)
   */
  getValueByPath(obj, path) {
    return window.comfyUIBentoML.SchemaUtils.getValueByPath(obj, path);
  },

  /**
   * Set value in workflow data by path
   */
  setValueByPath(obj, path, value) {
    return window.comfyUIBentoML.SchemaUtils.setValueByPath(obj, path, value);
  },

  /**
   * Clear cached schema (for testing)
   */
  clearCache() {
    window.comfyUIBentoML.SchemaCache.clearCache();
  }
};