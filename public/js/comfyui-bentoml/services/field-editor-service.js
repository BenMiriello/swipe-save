/**
 * Field Editor Service
 * Pure business logic for field operations, separated from UI concerns
 */

window.comfyUIBentoML = window.comfyUIBentoML || {};
window.comfyUIBentoML.services = window.comfyUIBentoML.services || {};

window.comfyUIBentoML.services.fieldEditorService = {
  // Cache for ComfyUI object info
  comfyUIObjectInfo: null,
  
  /**
   * Initialize service and load ComfyUI object info
   */
  async init() {
    await this.loadComfyUIObjectInfo();
  },

  /**
   * Load ComfyUI object_info for real dropdown options
   */
  async loadComfyUIObjectInfo() {
    try {
      const response = await fetch('/api/comfyui/object_info');
      if (response.ok) {
        const objectInfo = await response.json();
        this.comfyUIObjectInfo = objectInfo;
        window.comfyUIObjectInfo = objectInfo; // Maintain backward compatibility
        console.log('ComfyUI object_info loaded:', Object.keys(objectInfo).length, 'nodes');
        return objectInfo;
      } else {
        console.warn('Failed to load ComfyUI object_info:', response.status);
        return null;
      }
    } catch (error) {
      console.error('Error loading ComfyUI object_info:', error);
      return null;
    }
  },

  /**
   * Load and extract fields from workflow file
   */
  async loadFields(file) {
    if (!file) {
      throw new Error('No file provided');
    }

    try {
      // Get workflow data from API
      const response = await fetch(`/api/workflow/${encodeURIComponent(file.name)}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch workflow: ${response.status}`);
      }
      
      const workflowData = await response.json();
      
      // Extract fields using unified field detector
      const extractedFields = await window.comfyUIBentoML.core.fieldDetector.extractFields(workflowData);
      
      // Map field structure to UI expectations (dropdowns → options)
      const fields = {
        ...extractedFields,
        options: extractedFields.dropdowns || []
      };
      
      const summary = this.summarizeFields(fields);
      
      return { fields, summary, workflowData };
    } catch (error) {
      console.error('Error loading fields:', error);
      throw error;
    }
  },

  /**
   * Generate field summary statistics
   */
  summarizeFields(fields) {
    return {
      totalSeeds: fields.seeds?.length || 0,
      totalPrompts: fields.prompts?.length || 0,
      totalTextFields: fields.textFields?.length || 0,
      totalModels: fields.models?.length || 0,
      totalDropdowns: fields.dropdowns?.length || 0,
      totalNumbers: fields.numbers?.length || 0,
      totalToggles: fields.toggles?.length || 0,
      totalMedia: fields.media?.length || 0,
      totalFields: (fields.seeds?.length || 0) + 
                   (fields.prompts?.length || 0) + 
                   (fields.textFields?.length || 0) + 
                   (fields.models?.length || 0) + 
                   (fields.media?.length || 0) + 
                   (fields.dropdowns?.length || 0) + 
                   (fields.numbers?.length || 0) + 
                   (fields.toggles?.length || 0)
    };
  },

  /**
   * Load dropdown options for filesystem-based dropdowns
   */
  async loadDropdownOptions(field) {
    if (!field.fieldType || field.fieldType.subtype !== 'filesystem') {
      return null;
    }

    const fieldType = field.fieldType;
    if (!fieldType.modelType || fieldType.loaded) {
      return fieldType.options || [];
    }

    try {
      console.log(`Loading ${fieldType.modelType} options for ${field.fieldName}`);
      
      const response = await fetch(`/api/comfyui/models/${fieldType.modelType}`);
      if (response.ok) {
        const data = await response.json();
        const options = data.files.map(file => file.name);
        
        // Mark as loaded and cache options
        fieldType.options = options;
        fieldType.loaded = true;
        
        console.log(`Loaded ${options.length} ${fieldType.modelType} options`);
        return options;
      } else {
        console.warn(`Failed to load ${fieldType.modelType} options:`, response.status);
        return [];
      }
    } catch (error) {
      console.error(`Error loading ${fieldType.modelType} options:`, error);
      return [];
    }
  },

  /**
   * Get available options for a field
   */
  async getFieldOptions(field) {
    if (!field.fieldType) return [];

    const fieldType = field.fieldType;
    
    // For combo fields, return static options
    if (fieldType.options && Array.isArray(fieldType.options) && fieldType.options.length > 0) {
      return fieldType.options;
    }
    
    // For filesystem fields, load dynamically
    if (fieldType.subtype === 'filesystem') {
      return await this.loadDropdownOptions(field);
    }
    
    return [];
  },

  /**
   * Convert and validate field value based on type
   */
  convertFieldValue(field, value) {
    if (!field.fieldType) return value;

    switch (field.fieldType.type) {
      case 'boolean':
        return value === true || value === 'true';
      case 'number':
        const numValue = parseFloat(value);
        return isNaN(numValue) ? field.currentValue : numValue;
      default:
        return String(value);
    }
  },

  /**
   * Generate random seed value
   */
  generateRandomSeed() {
    return Math.floor(Math.random() * 2147483647) + 1;
  },

  /**
   * Randomize seed field value
   */
  randomizeSeed(seedField) {
    const newSeed = this.generateRandomSeed();
    seedField.currentValue = newSeed;
    seedField.isModified = true;
    return newSeed;
  },

  /**
   * Randomize all seed fields
   */
  randomizeAllSeeds(seeds) {
    const changes = [];
    for (const seedField of seeds) {
      const oldValue = seedField.currentValue;
      const newValue = this.randomizeSeed(seedField);
      changes.push({ field: seedField, oldValue, newValue });
    }
    return changes;
  },

  /**
   * Store field edit in Alpine store for persistence
   */
  storeFieldEdit(field) {
    if (!window.Alpine) return false;

    const store = Alpine.store('comfyWorkflow');
    if (!store) return false;

    // Initialize fieldEdits object if needed
    if (!store.fieldEdits) {
      store.fieldEdits = {};
    }

    // Store the edit with composite key
    const editKey = `${field.nodeId}-${field.fieldName}`;
    store.fieldEdits[editKey] = {
      nodeId: field.nodeId.toString(),
      fieldName: field.fieldName,
      value: field.currentValue,
      nodeType: field.nodeType
    };

    console.log('Stored field edit:', editKey, field.currentValue);
    return true;
  },

  /**
   * Get stored field edits from Alpine store
   */
  getStoredEdits() {
    if (!window.Alpine) return {};
    
    const store = Alpine.store('comfyWorkflow');
    return store?.fieldEdits || {};
  },

  /**
   * Clear all stored field edits
   */
  clearStoredEdits() {
    if (!window.Alpine) return;
    
    const store = Alpine.store('comfyWorkflow');
    if (store) {
      store.fieldEdits = {};
    }
  },

  /**
   * Apply stored edits to field collection
   */
  applyStoredEdits(fields) {
    const storedEdits = this.getStoredEdits();
    const appliedCount = { total: 0, successful: 0 };

    // Apply edits to all field categories
    for (const category of Object.keys(fields)) {
      if (!Array.isArray(fields[category])) continue;

      for (const field of fields[category]) {
        const editKey = `${field.nodeId}-${field.fieldName}`;
        if (storedEdits[editKey]) {
          appliedCount.total++;
          try {
            field.currentValue = storedEdits[editKey].value;
            field.isModified = true;
            appliedCount.successful++;
          } catch (error) {
            console.warn('Failed to apply edit:', editKey, error);
          }
        }
      }
    }

    console.log(`Applied ${appliedCount.successful}/${appliedCount.total} stored edits`);
    return appliedCount;
  }
};