/**
 * File operations API service
 */
const fileApi = {
  /**
   * Fetch all media files from server
   * @returns {Promise<Array>} Media files array
   */
  async fetchMediaFiles() {
    try {
      // Get sort parameters from sort manager
      const sortParams = window.sortManager ? window.sortManager.getSortParams() : { sortBy: 'date', order: 'desc' };
      const queryParams = new URLSearchParams({
        sortBy: sortParams.sortBy,
        order: sortParams.order,
        limit: '500' // Default limit
      });

      const response = await fetch(`${window.appConfig.getApiUrl()}/api/files?${queryParams.toString()}`, {
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

      // Add custom filename and copy setting if set
      const requestData = { 
        filename,
        action,
        ...(customFilename && { customFilename }),
        ...(window.copyApi && { saveCopiesWhenSorting: window.copyApi.getSaveCopiesWhenSorting() })
      };

      const response = await fetch(`${window.appConfig.getApiUrl()}/api/files/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      console.log('FRONTEND API: Action response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.log('FRONTEND API: Action error response:', errorData);
        throw new Error(errorData.error || 'Action failed');
      }

      const result = await response.json();
      console.log('FRONTEND API: Action success response:', result);
      return result;
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
    console.log('FRONTEND API: undoLastAction called');
    try {
      console.log('FRONTEND API: Making fetch request to /api/undo');
      const response = await fetch(`${window.appConfig.getApiUrl()}/api/undo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('FRONTEND API: Response status:', response.status);
      
      if (!response.ok) {
        const result = await response.json();
        console.log('FRONTEND API: Error response:', result);
        throw new Error(result.error || 'Undo failed');
      }

      const result = await response.json();
      console.log('FRONTEND API: Success response:', result);
      return result;
    } catch (error) {
      console.error('Error performing undo:', error);
      throw error;
    }
  }
};

window.fileApi = fileApi;
