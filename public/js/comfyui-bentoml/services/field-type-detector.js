/**
 * Field Type Detector Module
 * Determines field types and UI components from BentoML schema definitions
 */
const FieldTypeDetector = {
  // Node-specific field mappings for common ComfyUI nodes
  NODE_SPECIFIC_MAPPINGS: {
    'CLIPTextEncode': {
      'text': { type: 'textarea', fieldName: 'text' }
    },
    'CheckpointLoaderSimple': {
      'ckpt_name': { type: 'filesystem_dropdown', path: 'checkpoints', fieldName: 'ckpt_name' }
    },
    'VAELoader': {
      'vae_name': { type: 'filesystem_dropdown', path: 'vae', fieldName: 'vae_name' }
    },
    'LoraLoader': {
      'lora_name': { type: 'filesystem_dropdown', path: 'loras', fieldName: 'lora_name' }
    }
  },

  // Filesystem dropdown fields
  FILESYSTEM_DROPDOWN_FIELDS: {
    'ckpt_name': { path: 'checkpoints' },
    'vae_name': { path: 'vae' },
    'lora_name': { path: 'loras' },
    'sampler_name': { path: 'samplers' },
    'scheduler': { path: 'schedulers' }
  },

  // Boolean field patterns
  BOOLEAN_FIELD_PATTERNS: [
    'enable', 'disable', 'use', 'apply', 'add_noise', 'return_with_leftover_noise'
  ],

  /**
   * Enhanced field type inference for BentoML schema
   */
  inferTypeFromBentoMLSchema(fieldDef, fieldName, nodeType) {
    // Check node-specific mappings first
    if (nodeType && fieldName && this.NODE_SPECIFIC_MAPPINGS[nodeType] && this.NODE_SPECIFIC_MAPPINGS[nodeType][fieldName]) {
      return this.NODE_SPECIFIC_MAPPINGS[nodeType][fieldName];
    }

    // Check for boolean fields
    if (fieldName && this.isBooleanField(fieldName, fieldDef)) {
      return { type: 'boolean', fieldName };
    }

    // Check for filesystem dropdown fields
    if (fieldName && this.FILESYSTEM_DROPDOWN_FIELDS[fieldName]) {
      return { 
        type: 'filesystem_dropdown', 
        path: this.FILESYSTEM_DROPDOWN_FIELDS[fieldName].path,
        fieldName 
      };
    }

    // Process BentoML schema-specific field definitions
    if (fieldDef) {
      // Check for explicit UI type in schema
      if (fieldDef.ui_type) {
        return { type: fieldDef.ui_type, fieldName };
      }

      // Check for enum/choices
      if (fieldDef.enum && Array.isArray(fieldDef.enum)) {
        return { 
          type: 'dropdown', 
          options: fieldDef.enum, 
          fieldName 
        };
      }

      // Check for string with format
      if (fieldDef.type === 'string') {
        if (fieldDef.format === 'textarea' || fieldDef.format === 'prompt') {
          return { type: 'textarea', fieldName };
        }
        return { type: 'text', fieldName };
      }

      // Check for numeric types
      if (fieldDef.type === 'number' || fieldDef.type === 'integer') {
        const result = { type: 'number', fieldName };
        
        // Add constraints if available
        if (fieldDef.minimum !== undefined) result.min = fieldDef.minimum;
        if (fieldDef.maximum !== undefined) result.max = fieldDef.maximum;
        if (fieldDef.step !== undefined) result.step = fieldDef.step;
        
        return result;
      }

      // Check for boolean type
      if (fieldDef.type === 'boolean') {
        return { type: 'boolean', fieldName };
      }

      // Check for array type
      if (fieldDef.type === 'array') {
        return { type: 'array', fieldName, items: fieldDef.items };
      }
    }

    // Default fallback
    return { type: 'text', fieldName };
  },

  /**
   * Check if a field should be treated as boolean
   */
  isBooleanField(fieldName, fieldDef) {
    if (!fieldName) return false;
    
    // Check explicit boolean type
    if (fieldDef && fieldDef.type === 'boolean') return true;
    
    // Check field name patterns
    for (const pattern of this.BOOLEAN_FIELD_PATTERNS) {
      if (fieldName.includes(pattern) || fieldName === pattern) {
        return true;
      }
    }

    // Check for true/false enum
    if (fieldDef && fieldDef.enum && Array.isArray(fieldDef.enum) && fieldDef.enum.length === 2) {
      const hasTrue = fieldDef.enum.includes(true) || fieldDef.enum.includes('true');
      const hasFalse = fieldDef.enum.includes(false) || fieldDef.enum.includes('false');
      if (hasTrue && hasFalse) return true;
    }

    return false;
  }
};

window.comfyUIBentoML = window.comfyUIBentoML || {};
window.comfyUIBentoML.FieldTypeDetector = FieldTypeDetector;