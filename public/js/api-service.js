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
   * Load workflow in ComfyUI interface
   * @param {Object} file - Current file object
   * @param {boolean} modifySeeds - Whether to modify seed values
   * @param {string} comfyUrl - Custom ComfyUI URL
   * @returns {Promise<void>}
   */
  async loadInComfyUI(file, modifySeeds = false, comfyUrl = null) {
    try {
      console.log('Loading workflow in ComfyUI for file:', file.name);
      
      // Get workflow data from the current image
      const workflowData = await this.getWorkflowFromImage(file);
      
      if (!workflowData) {
        throw new Error('No workflow found in image metadata');
      }
      
      // Modify seeds if requested
      if (modifySeeds) {
        this.modifyWorkflowSeeds(workflowData);
      }
      
      // Get ComfyUI URL
      const targetUrl = comfyUrl || this.getComfyUIUrl();
      console.log('Opening ComfyUI at:', targetUrl);
      
      // Create workflow filename
      const baseFilename = file.name.replace(/\.[^/.]+$/, '');
      const workflowFilename = `workflow_${baseFilename}.json`;
      
      // Check if we've already downloaded this workflow
      const existingDownloads = this.getExistingWorkflows();
      if (!existingDownloads.includes(workflowFilename)) {
        // Download the workflow
        await this.downloadWorkflow(workflowData, workflowFilename);
        this.saveWorkflowRecord(workflowFilename);
      } else {
        console.log('Workflow already downloaded:', workflowFilename);
      }
      
      // Open ComfyUI tab
      this.openComfyUITab(targetUrl);
      
    } catch (error) {
      console.error('Error loading workflow in ComfyUI:', error);
      throw error;
    }
  },
  
  /**
   * Download workflow with proper folder structure
   */
  async downloadWorkflow(workflowData, filename) {
    const workflowJson = JSON.stringify(workflowData, null, 2);
    
    // Try multiple download methods for compatibility
    if (this.isMobile()) {
      // Mobile-friendly download
      this.downloadForMobile(workflowJson, filename);
    } else {
      // Desktop download with folder structure
      this.downloadForDesktop(workflowJson, filename);
    }
  },
  
  /**
   * Mobile-compatible download
   */
  downloadForMobile(content, filename) {
    try {
      // Create blob URL
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Try multiple methods
      // Method 1: Direct window.open (works on some mobile browsers)
      const dataUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(content);
      const newWindow = window.open(dataUrl, '_blank');
      
      if (!newWindow) {
        // Method 2: Create temporary link
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        
        // Force click
        if (link.click) {
          link.click();
        } else {
          // Fallback for older browsers
          const event = new MouseEvent('click');
          link.dispatchEvent(event);
        }
        
        document.body.removeChild(link);
      }
      
      // Clean up
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      
    } catch (error) {
      console.error('Mobile download failed:', error);
      // Fallback: copy to clipboard
      this.copyToClipboard(content, filename);
    }
  },
  
  /**
   * Desktop download with folder structure
   */
  downloadForDesktop(content, filename) {
    try {
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      // Note: browsers may ignore folder structure in download attribute
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Desktop download failed:', error);
      throw error;
    }
  },
  
  /**
   * Fallback: copy to clipboard
   */
  copyToClipboard(content, filename) {
    try {
      navigator.clipboard.writeText(content).then(() => {
        alert(`Download failed. Workflow JSON copied to clipboard.\n\nFilename: ${filename}\n\nPaste into a text file and save as .json`);
      }).catch(() => {
        // Final fallback: show in alert
        alert(`Download failed. Please copy this workflow manually:\n\n${content.substring(0, 500)}...`);
      });
    } catch (error) {
      console.error('Clipboard fallback failed:', error);
    }
  },
  
  /**
   * Detect mobile device
   */
  isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  },
  
  /**
   * Open ComfyUI tab with mobile-friendly approach
   * @param {string} url - ComfyUI URL to open
   */
  openComfyUITab(url) {
    try {
      if (this.isMobile()) {
        // Mobile approach - try multiple methods
        console.log('Opening ComfyUI on mobile device:', url);
        
        // Method 1: Direct window.open with target
        const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
        
        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
          // Method 2: Try without window features
          window.open(url, '_blank');
        }
        
        // Method 3: Fallback - create temporary link and click
        setTimeout(() => {
          const link = document.createElement('a');
          link.href = url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.style.display = 'none';
          
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }, 100);
        
      } else {
        // Desktop approach
        console.log('Opening ComfyUI on desktop:', url);
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Error opening ComfyUI tab:', error);
      // Final fallback - copy URL to clipboard
      this.copyUrlToClipboard(url);
    }
  },
  
  /**
   * Copy URL to clipboard as fallback
   */
  copyUrlToClipboard(url) {
    try {
      navigator.clipboard.writeText(url).then(() => {
        alert(`ComfyUI URL copied to clipboard:\n${url}\n\nPaste it in your browser to access ComfyUI.`);
      }).catch(() => {
        // Final fallback
        alert(`Please manually open ComfyUI at:\n${url}`);
      });
    } catch (error) {
      alert(`Please manually open ComfyUI at:\n${url}`);
    }
  },
  
  /**
   * Get existing workflow downloads
   */
  getExistingWorkflows() {
    try {
      return JSON.parse(localStorage.getItem('downloaded-workflows') || '[]');
    } catch {
      return [];
    }
  },
  
  /**
   * Save workflow download record
   */
  saveWorkflowRecord(filename) {
    try {
      const existing = this.getExistingWorkflows();
      if (!existing.includes(filename)) {
        existing.push(filename);
        localStorage.setItem('downloaded-workflows', JSON.stringify(existing));
      }
    } catch (error) {
      console.error('Error saving workflow record:', error);
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
   * Queue workflow in ComfyUI via API
   * @param {Object} file - Current file object
   * @param {boolean} modifySeeds - Whether to modify seed values
   * @param {string} comfyUrl - Custom ComfyUI URL
   * @returns {Promise<void>}
   */
  async queueInComfyUI(file, modifySeeds = false, comfyUrl = null) {
    try {
      console.log('Queueing workflow in ComfyUI for file:', file.name);
      
      const response = await fetch(`${window.appConfig.getApiUrl()}/api/queue-workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          modifySeeds: modifySeeds,
          comfyUrl: comfyUrl
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to queue workflow');
      }
      
      const result = await response.json();
      console.log('Workflow queued successfully:', result);
      
      // Open ComfyUI to show progress
      this.openComfyUITab(result.comfyUrl);
      
      return result;
    } catch (error) {
      console.error('Error queueing workflow:', error);
      throw error;
    }
  },
  
  /**
   * Modify seed values in workflow by appending zero
   * @param {Object} workflow - Workflow object to modify
   */
  modifyWorkflowSeeds(workflow) {
    if (!workflow || typeof workflow !== 'object') return;
    
    console.log('Modifying seeds in workflow...');
    let seedCount = 0;
    
    const modifySeeds = (obj) => {
      if (typeof obj !== 'object' || obj === null) return;
      
      for (const key in obj) {
        if (key === 'seed' && typeof obj[key] === 'number') {
          const oldSeed = obj[key];
          obj[key] = parseInt(obj[key].toString() + '0');
          console.log(`Modified seed: ${oldSeed} -> ${obj[key]}`);
          seedCount++;
        } else if (key === 'inputs' && typeof obj[key] === 'object') {
          // Check inputs object specifically for KSampler nodes
          modifySeeds(obj[key]);
        } else if (typeof obj[key] === 'object') {
          modifySeeds(obj[key]);
        }
      }
    };
    
    modifySeeds(workflow);
    console.log(`Total seeds modified: ${seedCount}`);
  }
};

// Export as a global variable
window.apiService = apiService;