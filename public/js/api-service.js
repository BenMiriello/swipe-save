/**
 * Main API service coordinator - delegates to specialized modules
 * Maintains backward compatibility with existing code
 */
const apiService = {
  // File operations - delegate to fileApi
  async fetchMediaFiles() {
    return window.fileApi.fetchMediaFiles();
  },

  downloadFile(file, filename) {
    return window.fileApi.downloadFile(file, filename);
  },

  openFileInNewView(file) {
    return window.fileApi.openFileInNewView(file);
  },

  async performAction(filename, action, customFilename = null) {
    return window.fileApi.performAction(filename, action, customFilename);
  },

  async undoLastAction() {
    return window.fileApi.undoLastAction();
  },

  // Configuration operations - delegate to configApi
  async getConfig() {
    return window.configApi.getConfig();
  },

  async updateConfig(config) {
    return window.configApi.updateConfig(config);
  },

  async browseDirectory(dir) {
    return window.configApi.browseDirectory(dir);
  }
};

// Export as a global variable
window.apiService = apiService;
