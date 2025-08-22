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
    if (!workflowData) return { seeds: [], prompts: [], textFields: [], parameters: [] };

    // Extract different field types
    const seeds = await window.comfyUIBentoML.schemaService.identifySeedFields(workflowData);
    const allTextFields = await window.comfyUIBentoML.schemaService.identifyTextFields(workflowData);
    const parameters = window.comfyUIBentoML.extractors.parameterExtractor.extractParameters(workflowData);

    // Separate prompts from regular text fields
    const prompts = allTextFields.filter(field => field.isPrompt);
    const textFields = allTextFields.filter(field => !field.isPrompt);

    return {
      seeds: seeds,
      prompts: prompts,
      textFields: textFields,
      parameters: parameters
    };
  },


  /**
   * Generate summary of extracted fields
   */
  summarizeFields(fields) {
    return {
      totalSeeds: fields.seeds.length,
      totalPrompts: fields.prompts.length,
      totalTextFields: fields.textFields.length,
      totalParameters: fields.parameters.length,
      uniqueNodeTypes: [...new Set([
        ...fields.seeds.map(f => f.nodeType),
        ...fields.prompts.map(f => f.nodeType),
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