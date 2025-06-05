/**
 * Configuration API service
 */
const configApi = {
  /**
   * Get current configuration
   * @returns {Promise<Object>} Configuration object
   */
  async getConfig() {
    try {
      const response = await fetch(`${window.appConfig.getApiUrl()}/api/config`);

      if (!response.ok) {
        throw new Error('Failed to get configuration');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting config:', error);
      throw error;
    }
  },

  /**
   * Update configuration
   * @param {Object} config - Configuration to update
   * @returns {Promise<Object>} Updated configuration
   */
  async updateConfig(config) {
    try {
      const response = await fetch(`${window.appConfig.getApiUrl()}/api/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update configuration');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating config:', error);
      throw error;
    }
  },

  /**
   * Browse directories
   * @param {string} dir - Directory path to browse
   * @returns {Promise<Object>} Directory listing
   */
  async browseDirectory(dir) {
    try {
      const response = await fetch(`${window.appConfig.getApiUrl()}/api/browse?dir=${encodeURIComponent(dir)}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to browse directory');
      }

      return await response.json();
    } catch (error) {
      console.error('Error browsing directory:', error);
      throw error;
    }
  }
};

window.configApi = configApi;
