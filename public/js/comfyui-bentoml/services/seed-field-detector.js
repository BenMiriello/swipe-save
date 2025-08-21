/**
 * Seed Field Detector Module
 * Identifies seed parameters in workflow data using BentoML schema
 */
const SeedFieldDetector = {
  /**
   * Identify seed parameters using BentoML schema
   */
  async identifySeedFields(workflowData) {
    if (!workflowData) return [];
    
    // Use direct workflow parsing (no BentoML dependency)
    return this.fallbackSeedDetection(workflowData);
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