/**
 * Storage Service for ComfyUI Module
 * Handles localStorage operations
 */

window.comfyUIServices = window.comfyUIServices || {};

window.comfyUIServices.storage = {
  /**
   * Load ComfyUI destinations
   */
  loadDestinations() {
    try {
      const saved = JSON.parse(localStorage.getItem('comfyui-destinations') || '[]');
      if (saved.length === 0) {
        const defaultUrl = this.getDefaultComfyUIUrl();
        saved.push(defaultUrl);
        this.saveDestinations(saved);
      }
      return saved;
    } catch (error) {
      console.error('Error loading destinations:', error);
      const defaultUrl = this.getDefaultComfyUIUrl();
      return [defaultUrl];
    }
  },

  /**
   * Save ComfyUI destinations
   */
  saveDestinations(destinations) { 
    try {
      localStorage.setItem('comfyui-destinations', JSON.stringify(destinations));
    } catch (error) {
      console.error('Error saving destinations:', error);
    }
  },

  /**
   * Load workflow settings
   */
  loadWorkflowSettings() {
    try {
      const settings = JSON.parse(localStorage.getItem('comfyui-workflow-settings') || '{}');
      
      // Migrate old modifySeeds setting to new seedMode
      if (settings.modifySeeds !== undefined && settings.seedMode === undefined) {
        settings.seedMode = settings.modifySeeds ? 'randomize' : 'original';
        delete settings.modifySeeds;
      }
      
      return {
        quantity: 1,
        seedMode: 'randomize',
        controlAfterGenerate: 'increment',
        ...settings
      };
    } catch (error) {
      console.error('Error loading workflow settings:', error);
      return {
        quantity: 1,
        seedMode: 'randomize',
        controlAfterGenerate: 'increment'
      };
    }
  },

  /**
   * Save workflow settings
   */
  saveWorkflowSettings(settings) {
    try {
      localStorage.setItem('comfyui-workflow-settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving workflow settings:', error);
    }
  },

  /**
   * Get default ComfyUI URL
   */
  getDefaultComfyUIUrl() {
    const currentUrl = new URL(window.location.href);
    return `${currentUrl.protocol}//${currentUrl.hostname}:8188`;
  }
};
