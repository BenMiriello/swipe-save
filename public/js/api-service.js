/**
 * Service for handling API communications
 */
const apiService = {
  /**
   * Fetch all media files from server
   * @returns {Promise<Array>} Media files array
   */
  async fetchMediaFiles() {
    try {
      const response = await fetch(`${window.appConfig.getApiUrl()}/api/files`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch media files: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Add original filesystem path (not just browser URL) to each file
      // This is for display purposes in the UI
      data.forEach(file => {
        if (file.name) {
          file.originalPath = file.name; // Store the original filename as the path
        }
      });
      
      return data;
    } catch (error) {
      console.error('Error fetching media files:', error);
      throw error;
    }
  },
  
  /**
   * Fetch current path settings from server
   * @returns {Promise<Object>} Path settings
   */
  async fetchPaths() {
    try {
      const response = await fetch(`${window.appConfig.getApiUrl()}/api/config/paths`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch path settings: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching path settings:', error);
      throw error;
    }
  },
  
  /**
   * Update path settings on server
   * @param {string} fromPath - New FROM path
   * @param {string} toPath - New TO path
   * @returns {Promise<Object>} Updated path settings
   */
  async updatePaths(fromPath, toPath) {
    try {
      const requestData = {};
      
      if (fromPath) {
        requestData.fromPath = fromPath;
      }
      
      if (toPath) {
        requestData.toPath = toPath;
      }
      
      const response = await fetch(`${window.appConfig.getApiUrl()}/api/config/paths`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update path settings: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating path settings:', error);
      throw error;
    }
  },

  /**
   * Download the specified media file
   * @param {Object} file - File object with path property
   * @param {string} filename - Custom filename or original filename
   */
  downloadFile(file, filename) {
    if (!file) return;
    
    try {
      const imageUrl = `${window.appConfig.getApiUrl()}${file.path}`;
      
      // Create a temporary link element
      const downloadLink = document.createElement('a');
      downloadLink.href = imageUrl;
      downloadLink.download = filename || file.name; 
      
      // Append to the body, click and remove
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Failed to download file: ' + error.message);
    }
  },

  /**
   * Open file in a new tab/window
   * @param {Object} file - File object with path property
   */
  openFileInNewView(file) {
    if (!file) return;
    
    try {
      const fileUrl = `${window.appConfig.getApiUrl()}${file.path}`;
      window.open(fileUrl, '_blank');
    } catch (error) {
      console.error('Error opening file in new view:', error);
    }
  },

  /**
   * Perform specified action on a file
   * @param {string} filename - File name
   * @param {string} action - Action to perform
   * @param {string} customFilename - Optional custom filename
   * @returns {Promise<Object>} Action result
   */
  async performAction(filename, action, customFilename = null) {
    try {
      // Verify file still exists before taking action
      const allFiles = await this.fetchMediaFiles();
      const fileExists = allFiles.some(file => file.name === filename);
      
      if (!fileExists) {
        console.warn(`File ${filename} no longer exists or is not in the current directory`);
        throw new Error(`File ${filename} not found. It may have been moved or deleted.`);
      }
      
      // Add custom filename if set
      const requestData = { 
        filename,
        action,
        ...(customFilename && { customFilename })
      };
      
      const response = await fetch(`${window.appConfig.getApiUrl()}/api/files/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Action failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error performing action:', error);
      throw error;
    }
  },

  /**
   * Undo the last action
   * @returns {Promise<Object>} Undo result with the undone action
   */
  async undoLastAction() {
    try {
      const response = await fetch(`${window.appConfig.getApiUrl()}/api/undo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Undo failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error performing undo:', error);
      throw error;
    }
  }
};

// Export as a global variable
window.apiService = apiService;