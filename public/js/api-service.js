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
      const response = await fetch(`${window.appConfig.getApiUrl()}/api/files`);
      if (!response.ok) {
        throw new Error(`Failed to fetch media files: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching media files:', error);
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
    
    const imageUrl = `${window.appConfig.getApiUrl()}${file.path}`;
    
    // Create a temporary link element
    const downloadLink = document.createElement('a');
    downloadLink.href = imageUrl;
    downloadLink.download = filename || file.name; 
    
    // Append to the body, click and remove
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  },

  /**
   * Open file in a new tab/window
   * @param {Object} file - File object with path property
   */
  openFileInNewView(file) {
    if (!file) return;
    
    const fileUrl = `${window.appConfig.getApiUrl()}${file.path}`;
    window.open(fileUrl, '_blank');
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