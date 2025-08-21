/**
 * Seed Field Detector Module
 * Identifies seed parameters in workflow data using BentoML schema
 */
const SeedFieldDetector = {
  /**
   * Identify seed parameters using BentoML schema
   */
  async identifySeedFields(workflowData) {
    const seedFields = [];
    
    try {
      const schema = await window.comfyUIBentoML.SchemaCache.getSchema();
      
      if (!schema || !workflowData) {
        console.warn('Schema or workflow data not available for seed detection');
        return this.fallbackSeedDetection(workflowData);
      }

      // Check for explicit seed parameters in schema
      if (schema.seed_parameters && Array.isArray(schema.seed_parameters)) {
        for (const seedPath of schema.seed_parameters) {
          const seedValue = window.comfyUIBentoML.SchemaUtils.getValueByPath(workflowData, seedPath);
          
          if (typeof seedValue === 'number') {
            seedFields.push({
              path: seedPath,
              value: seedValue
            });
          }
        }
      }

      // Check input schema for seed-type fields
      if (schema.input_schema && schema.input_schema.properties) {
        for (const [fieldPath, fieldDef] of Object.entries(schema.input_schema.properties)) {
          if (window.comfyUIBentoML.SchemaUtils.isSeedFieldType(fieldDef, fieldPath)) {
            const seedValue = window.comfyUIBentoML.SchemaUtils.getValueByPath(workflowData, fieldPath);
            
            if (typeof seedValue === 'number') {
              seedFields.push({
                path: fieldPath,
                value: seedValue,
                fieldDef: fieldDef
              });
            }
          }
        }
      }

      // If no seeds found via schema, try fallback
      if (seedFields.length === 0) {
        return this.fallbackSeedDetection(workflowData);
      }
      
      return seedFields;
    } catch (error) {
      console.error('Error in seed field detection:', error);
      return this.fallbackSeedDetection(workflowData);
    }
  },

  /**
   * Fallback seed detection (when schema unavailable)
   */
  fallbackSeedDetection(workflowData) {
    const seedFields = [];
    
    const searchForSeeds = (obj, currentPath = '') => {
      if (typeof obj !== 'object' || obj === null) return;
      
      for (const [key, value] of Object.entries(obj)) {
        const fullPath = currentPath ? `${currentPath}.${key}` : key;
        
        if (key === 'seed' && typeof value === 'number') {
          seedFields.push({
            path: fullPath,
            value: value
          });
        } else if (typeof value === 'object') {
          searchForSeeds(value, fullPath);
        }
      }
    };

    searchForSeeds(workflowData);
    return seedFields;
  }
};

window.comfyUIBentoML = window.comfyUIBentoML || {};
window.comfyUIBentoML.SeedFieldDetector = SeedFieldDetector;