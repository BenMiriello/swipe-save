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
  },

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
  },
  
  /**
   * Get ComfyUI URL based on current hostname
   * @returns {string} ComfyUI URL
   */
  getComfyUIUrl() {
    const currentUrl = new URL(window.location.href);
    return `${currentUrl.protocol}//${currentUrl.hostname}:8188`;
  },
  
  /**
   * Load workflow in ComfyUI
   * @param {Object} file - Current file object
   * @param {boolean} modifySeeds - Whether to modify seed values
   * @returns {Promise<void>}
   */
  async loadInComfyUI(file, modifySeeds = false) {
    try {
      // Get workflow data from the current image
      const workflowData = await this.getWorkflowFromImage(file);
      
      if (!workflowData) {
        throw new Error('No workflow found in image metadata');
      }
      
      // Modify seeds if requested
      if (modifySeeds) {
        this.modifyWorkflowSeeds(workflowData);
      }
      
      // Send to ComfyUI using correct endpoint and format
      const comfyUIUrl = this.getComfyUIUrl();
      const clientId = this.generateClientId();
      
      const response = await fetch(`${comfyUIUrl}/prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: workflowData,
          client_id: clientId
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to load workflow in ComfyUI: ${errorText}`);
      }
      
      // Open ComfyUI in new tab
      window.open(comfyUIUrl, '_blank');
    } catch (error) {
      console.error('Error loading workflow in ComfyUI:', error);
      throw error;
    }
  },
  
  /**
   * Generate a unique client ID for ComfyUI
   * @returns {string} Client ID
   */
  generateClientId() {
    return 'swipe-save-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  },
  
  /**
   * Extract workflow from image metadata
   * @param {Object} file - File object
   * @returns {Promise<Object|null>} Workflow data or null
   */
  async getWorkflowFromImage(file) {
    try {
      const response = await fetch(`${window.appConfig.getApiUrl()}/api/workflow/${encodeURIComponent(file.name)}`);
      
      if (!response.ok) {
        throw new Error('Failed to get workflow from image');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting workflow from image:', error);
      return null;
    }
  },
  
  /**
   * Modify seed values in workflow by appending zero
   * @param {Object} workflow - Workflow object to modify
   */
  modifyWorkflowSeeds(workflow) {
    if (!workflow || typeof workflow !== 'object') return;
    
    // Recursively search for seed values and modify them
    const modifySeeds = (obj) => {
      if (typeof obj !== 'object' || obj === null) return;
      
      for (const key in obj) {
        if (key === 'seed' && typeof obj[key] === 'number') {
          // Append zero to seed value
          obj[key] = parseInt(obj[key].toString() + '0');
        } else if (typeof obj[key] === 'object') {
          modifySeeds(obj[key]);
        }
      }
    };
    
    modifySeeds(workflow);
  }
};

// Export as a global variable
window.apiService = apiService;