/**
 * Field Extractor Service - Main Coordinator
 * Coordinates focused extractors for different field types
 */

window.comfyUIBentoML = window.comfyUIBentoML || {};

window.comfyUIBentoML.fieldExtractor = {
  /**
   * Extract all editable fields from a workflow using improved pattern detection
   */
  async extractFields(workflowData) {
    if (!workflowData) return { seeds: [], textFields: [], parameters: [] };

    // Use improved pattern-based extractors that understand workflow structure
    const seeds = window.comfyUIBentoML.extractors.seedExtractor.extractSeeds(workflowData);
    const textFields = window.comfyUIBentoML.extractors.textExtractor.extractTextFields(workflowData);
    const parameters = window.comfyUIBentoML.extractors.parameterExtractor.extractParameters(workflowData);

    console.log(`Field extractor found: ${seeds.length} seeds, ${textFields.length} text fields, ${parameters.length} parameters`);

    return {
      seeds,
      textFields,
      parameters
    };
  },

  /**
   * Generate summary of extracted fields
   */
  summarizeFields(fields) {
    return {
      totalSeeds: fields.seeds.length,
      totalTextFields: fields.textFields.length,
      totalParameters: fields.parameters.length,
      promptFields: fields.textFields.filter(f => f.isPrompt).length,
      nonPromptFields: fields.textFields.filter(f => !f.isPrompt).length,
      uniqueNodeTypes: [...new Set([
        ...fields.seeds.map(f => f.nodeType),
        ...fields.textFields.map(f => f.nodeType),
        ...fields.parameters.map(f => f.nodeType)
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
    const displayNames = {
      'wildcard_text': 'Wildcard Text',
      'populated_text': 'Populated Text',
      'text': 'Text',
      'seed': 'Seed',
      'noise_seed': 'Noise Seed',
      'steps': 'Steps',
      'cfg': 'CFG Scale',
      'sampler_name': 'Sampler',
      'scheduler': 'Scheduler',
      'denoise': 'Denoise'
    };
    
    return displayNames[field.fieldName] || field.fieldName;
  }
};