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
    if (!workflowData) return { seeds: [], prompts: [], textFields: [], models: [], dropdowns: [], numbers: [], toggles: [] };

    try {
      // Extract different field types
      const seeds = await window.comfyUIBentoML.schemaService.identifySeedFields(workflowData);
      const allTextFields = await window.comfyUIBentoML.schemaService.identifyTextFields(workflowData);
      const parameters = window.comfyUIBentoML.extractors.parameterExtractor.extractParameters(workflowData);

      // Separate prompts from regular text fields
      const prompts = allTextFields.filter(field => field.isPrompt);
      const textFields = allTextFields.filter(field => !field.isPrompt);

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
      const dropdowns = allDropdowns.filter(field => !models.some(m => m.nodeId === field.nodeId && m.fieldName === field.fieldName));

      const result = {
        seeds: seeds,
        prompts: prompts,
        textFields: textFields,
        models: models,
        dropdowns: dropdowns,
        numbers: numbers,
        toggles: toggles
      };
      
      return result;
    } catch (error) {
      console.error('Error in field extraction:', error);
      return { seeds: [], prompts: [], textFields: [], models: [], dropdowns: [], numbers: [], toggles: [] };
    }
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
      'denoise': 'Denoise',
      'ckpt_name': 'Checkpoint',
      'lora_name': 'LoRA',
      'vae_name': 'VAE',
      'unet_name': 'UNet Model',
      'clip_name': 'CLIP Model',
      'model_name': 'Model',
      'width': 'Width',
      'height': 'Height',
      'batch_size': 'Batch Size'
    };
    
    // Use the actual field name from the field object
    const fieldName = field.fieldName || field.inputName || 'Unknown Field';
    return displayNames[fieldName] || fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
};