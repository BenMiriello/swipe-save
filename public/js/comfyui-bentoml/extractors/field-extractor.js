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

    // Load ComfyUI object_info to get real dropdown options
    try {
      await window.comfyUIBentoML.schemaService.getComfyUIObjectInfo();
      console.log('Loaded ComfyUI object_info for field type detection');
    } catch (error) {
      console.warn('Failed to load ComfyUI object_info:', error);
      // Continue without it - will fall back to other detection methods
    }

    // Use improved pattern-based extractors that understand workflow structure
    const seeds = window.comfyUIBentoML.extractors.seedExtractor.extractSeeds(workflowData);
    const textFields = window.comfyUIBentoML.extractors.textExtractor.extractTextFields(workflowData);
    const parameters = window.comfyUIBentoML.extractors.parameterExtractor.extractParameters(workflowData);

    // Enhance all fields with type detection
    const enhancedSeeds = await this.enhanceFieldsWithTypes(seeds);
    const enhancedTextFields = await this.enhanceFieldsWithTypes(textFields);  
    const enhancedParameters = await this.enhanceFieldsWithTypes(parameters);

    return {
      seeds: enhancedSeeds,
      textFields: enhancedTextFields,
      parameters: enhancedParameters
    };
  },

  /**
   * Enhance fields with type detection for UI rendering
   */
  async enhanceFieldsWithTypes(fields) {
    if (!fields || !Array.isArray(fields)) return fields;
    
    return fields.map(field => {
      // Use schema service to detect field type
      const fieldType = window.comfyUIBentoML.schemaService.inferTypeFromComfyInput(
        null, // inputDef - not available here
        field.fieldName,
        field.nodeType
      );
      
      return {
        ...field,
        fieldType: fieldType
      };
    });
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