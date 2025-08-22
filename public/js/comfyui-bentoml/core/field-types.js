/**
 * Field Type Definitions and Validation
 * Centralized field type system for consistent handling
 */

window.comfyUIBentoML = window.comfyUIBentoML || {};
window.comfyUIBentoML.core = window.comfyUIBentoML.core || {};

window.comfyUIBentoML.core.fieldTypes = {
  /**
   * Field category definitions
   */
  CATEGORIES: {
    SEEDS: 'seeds',
    PROMPTS: 'prompts', 
    TEXT_FIELDS: 'textFields',
    MODELS: 'models',
    DROPDOWNS: 'dropdowns',
    NUMBERS: 'numbers',
    TOGGLES: 'toggles'
  },

  /**
   * Field type definitions
   */
  TYPES: {
    SEED: { category: 'seeds', uiType: 'number', validation: 'integer' },
    PROMPT: { category: 'prompts', uiType: 'textarea', validation: 'text' },
    TEXT: { category: 'textFields', uiType: 'text', validation: 'text' },
    MODEL_DROPDOWN: { category: 'models', uiType: 'dropdown', validation: 'options' },
    COMBO_DROPDOWN: { category: 'dropdowns', uiType: 'dropdown', validation: 'options' },
    FILESYSTEM_DROPDOWN: { category: 'dropdowns', uiType: 'dropdown', validation: 'options' },
    NUMBER: { category: 'numbers', uiType: 'number', validation: 'number' },
    BOOLEAN: { category: 'toggles', uiType: 'checkbox', validation: 'boolean' }
  },

  /**
   * Display name mappings for common fields
   */
  DISPLAY_NAMES: {
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
  },

  /**
   * Get display name for a field
   */
  getDisplayName(field) {
    const fieldName = field.fieldName || field.inputName || 'Unknown Field';
    return this.DISPLAY_NAMES[fieldName] || 
           fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  },

  /**
   * Validate field value based on type
   */
  validateValue(fieldType, value) {
    if (!fieldType || !fieldType.validation) return { valid: true };

    switch (fieldType.validation) {
      case 'integer':
        const intValue = parseInt(value);
        return {
          valid: !isNaN(intValue) && intValue >= 0,
          normalizedValue: intValue,
          error: isNaN(intValue) ? 'Must be a valid integer' : 
                 intValue < 0 ? 'Must be non-negative' : null
        };

      case 'number':
        const numValue = parseFloat(value);
        return {
          valid: !isNaN(numValue),
          normalizedValue: numValue,
          error: isNaN(numValue) ? 'Must be a valid number' : null
        };

      case 'boolean':
        const boolValue = typeof value === 'boolean' ? value : 
                         value === 'true' || value === true;
        return {
          valid: true,
          normalizedValue: boolValue
        };

      case 'text':
        return {
          valid: typeof value === 'string',
          normalizedValue: String(value),
          error: typeof value !== 'string' ? 'Must be text' : null
        };

      case 'options':
        // For dropdowns, validation depends on loaded options
        return {
          valid: true,
          normalizedValue: value,
          warning: 'Options validation requires loaded dropdown data'
        };

      default:
        return { valid: true, normalizedValue: value };
    }
  },

  /**
   * Get category for a field based on its type and properties
   */
  getCategoryForField(field) {
    // Seeds
    if (field.fieldName === 'seed' || field.fieldName === 'noise_seed') {
      return this.CATEGORIES.SEEDS;
    }

    // Prompts (from text fields)
    if (field.isPrompt) {
      return this.CATEGORIES.PROMPTS;
    }

    // Text fields (non-prompt text)
    if (field.fieldType === 'text' || field.fieldType === 'textarea') {
      return this.CATEGORIES.TEXT_FIELDS;
    }

    // Parameters by type
    if (field.fieldType && typeof field.fieldType === 'object') {
      switch (field.fieldType.type) {
        case 'dropdown':
          // Check if it's a model field
          const modelFieldNames = ['ckpt_name', 'lora_name', 'vae_name', 'unet_name', 'clip_name', 'model_name'];
          if (modelFieldNames.includes(field.fieldName) || 
              field.fieldName.toLowerCase().includes('model') ||
              field.fieldName.toLowerCase().includes('checkpoint') ||
              field.fieldName.toLowerCase().includes('lora')) {
            return this.CATEGORIES.MODELS;
          }
          return this.CATEGORIES.DROPDOWNS;

        case 'number':
          return this.CATEGORIES.NUMBERS;

        case 'boolean':
          return this.CATEGORIES.TOGGLES;
      }
    }

    // Fallback based on value type
    if (typeof field.currentValue === 'number') {
      return this.CATEGORIES.NUMBERS;
    }
    if (typeof field.currentValue === 'boolean') {
      return this.CATEGORIES.TOGGLES;
    }

    // Default to dropdowns for unknown string fields
    return this.CATEGORIES.DROPDOWNS;
  },

  /**
   * Format field value for display
   */
  formatValueForDisplay(field) {
    if (!field.currentValue) return '';
    
    const value = field.currentValue.toString();
    
    // Truncate long text values
    if (value.length > 100) {
      return value.substring(0, 100) + '...';
    }
    
    return value;
  },

  /**
   * Generate field summary statistics
   */
  generateSummary(fields) {
    return {
      totalSeeds: fields.seeds?.length || 0,
      totalPrompts: fields.prompts?.length || 0,
      totalTextFields: fields.textFields?.length || 0,
      totalModels: fields.models?.length || 0,
      totalDropdowns: fields.dropdowns?.length || 0,
      totalNumbers: fields.numbers?.length || 0,
      totalToggles: fields.toggles?.length || 0,
      uniqueNodeTypes: this.getUniqueNodeTypes(fields)
    };
  },

  /**
   * Get unique node types from all fields
   */
  getUniqueNodeTypes(fields) {
    const allFields = [
      ...(fields.seeds || []),
      ...(fields.prompts || []),
      ...(fields.textFields || []),
      ...(fields.models || []),
      ...(fields.dropdowns || []),
      ...(fields.numbers || []),
      ...(fields.toggles || [])
    ];
    
    return [...new Set(allFields.map(f => f.nodeType))];
  }
};