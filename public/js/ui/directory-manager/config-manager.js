/**
 * Directory Manager Configuration
 * Handles loading, saving, and managing directory configuration
 */
const DirectoryConfigManager = {
  config: null,

  /**
   * Load configuration from API
   */
  async loadConfig() {
    try {
      this.config = await window.directoryApi.getConfig();
      
      // Ensure config has all required sections
      if (!this.config.sources) this.config.sources = { directories: [], groups: [] };
      if (!this.config.destination) this.config.destination = { current: null };
      if (!this.config.preferences) {
        this.config.preferences = { isFirstRun: true };
      } else if (this.config.preferences.isFirstRun === undefined) {
        // Only set isFirstRun if it's not already defined
        this.config.preferences.isFirstRun = true;
      }
      
    } catch (error) {
      console.error('Failed to load directory config:', error);
      this.config = this.getDefaultConfig();
    }
  },

  /**
   * Get default configuration structure
   */
  getDefaultConfig() {
    return {
      sources: { directories: [], groups: [] },
      destination: { current: null },
      preferences: { isFirstRun: true }
    };
  },

  /**
   * Mark first run as complete
   */
  async markFirstRunComplete() {
    try {
      this.config.preferences.isFirstRun = false;
      await window.directoryApi.updateConfig(this.config);
      console.log('First run marked as complete');
    } catch (error) {
      console.error('Failed to mark first run complete:', error);
    }
  },

  /**
   * Save current configuration
   */
  async saveConfig() {
    try {
      await window.directoryApi.updateConfig(this.config);
      console.log('Configuration saved successfully');
    } catch (error) {
      console.error('Failed to save configuration:', error);
      throw error;
    }
  }
};

// Export for global access
window.DirectoryConfigManager = DirectoryConfigManager;