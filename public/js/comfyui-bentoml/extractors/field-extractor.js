/**
 * Field Extractor Service - Main Coordinator
 * Now delegates to unified field detection system
 */

window.comfyUIBentoML = window.comfyUIBentoML || {};

window.comfyUIBentoML.fieldExtractor = {
  /**
   * Extract all editable fields from a workflow using unified detection system
   */
  async extractFields(workflowData) {
    // Delegate to new unified field detector
    if (window.comfyUIBentoML.core && window.comfyUIBentoML.core.fieldDetector) {
      return await window.comfyUIBentoML.core.fieldDetector.extractFields(workflowData);
    }
    
    // Fallback to empty result if new system not loaded
    console.warn('Unified field detector not available, returning empty result');
    return { seeds: [], prompts: [], textFields: [], models: [], dropdowns: [], numbers: [], toggles: [] };
  },


  /**
   * Generate summary of extracted fields
   */
  summarizeFields(fields) {
    return {
      totalSeeds: fields.seeds.length,
      totalPrompts: fields.prompts.length,
      totalTextFields: fields.textFields.length,
      totalModels: fields.models.length,
      totalDropdowns: fields.dropdowns.length,
      totalNumbers: fields.numbers.length,
      totalToggles: fields.toggles.length,
      uniqueNodeTypes: [...new Set([
        ...fields.seeds.map(f => f.nodeType),
        ...fields.prompts.map(f => f.nodeType),
        ...fields.textFields.map(f => f.nodeType),
        ...fields.models.map(f => f.nodeType),
        ...fields.dropdowns.map(f => f.nodeType),
        ...fields.numbers.map(f => f.nodeType),
        ...fields.toggles.map(f => f.nodeType)
      ])]
    };
  },

  /**
   * Format field value for display
   */
  formatFieldValue(field) {
    if (!field.currentValue) return '';
    
    const value = field.currentValue.toString();
    
    // Truncate long text values
    if (value.length > 100) {
      return value.substring(0, 100) + '...';
    }
    
    return value;
  },

  /**
   * Get field display name
   */
  getFieldDisplayName(field) {
    // Delegate to unified field types system
    if (window.comfyUIBentoML.core && window.comfyUIBentoML.core.fieldTypes) {
      return window.comfyUIBentoML.core.fieldTypes.getDisplayName(field);
    }
    
    // Fallback to basic formatting
    const fieldName = field.fieldName || field.inputName || 'Unknown Field';
    return fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
};