/**
 * ComfyUI API service
 */
const comfyuiApi = {
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
   * @param {string} controlAfterGenerate - Control after generate mode
   * @param {string} comfyUrl - Custom ComfyUI URL
   * @returns {Promise<void>}
   */
  async loadInComfyUI(file, modifySeeds = false, controlAfterGenerate = 'increment', comfyUrl = null) {
    try {
      console.log('Loading workflow in ComfyUI for file:', file.name);

      const workflowData = await this.getWorkflowFromImage(file);

      if (!workflowData) {
        throw new Error('No workflow found in image metadata');
      }

      if (modifySeeds) {
        this.modifyWorkflowSeeds(workflowData);
      }
      
      // Always set control_after_generate to the selected value
      this.modifyControlAfterGenerate(workflowData, controlAfterGenerate);

      const targetUrl = comfyUrl || this.getComfyUIUrl();
      console.log('Opening ComfyUI at:', targetUrl);

      const baseFilename = file.name.replace(/\.[^/.]+$/, '');
      const workflowFilename = `workflow_${baseFilename}.json`;

      const existingDownloads = this.getExistingWorkflows();
      if (!existingDownloads.includes(workflowFilename)) {
        await this.downloadWorkflow(workflowData, workflowFilename);
        this.saveWorkflowRecord(workflowFilename);
      } else {
        console.log('Workflow already downloaded:', workflowFilename);
      }

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

    if (this.isMobile()) {
      this.downloadForMobile(workflowJson, filename);
    } else {
      this.downloadForDesktop(workflowJson, filename);
    }
  },

  /**
   * Mobile-compatible download
   */
  downloadForMobile(content, filename) {
    try {
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const dataUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(content);
      const newWindow = window.open(dataUrl, '_blank');

      if (!newWindow) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';

        document.body.appendChild(link);

        if (link.click) {
          link.click();
        } else {
          const event = new MouseEvent('click');
          link.dispatchEvent(event);
        }

        document.body.removeChild(link);
      }

      setTimeout(() => URL.revokeObjectURL(url), 1000);

    } catch (error) {
      console.error('Mobile download failed:', error);
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
        console.log('Opening ComfyUI on mobile device:', url);

        const newWindow = window.open(url, '_blank', 'noopener,noreferrer');

        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
          window.open(url, '_blank');
        }

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
        console.log('Opening ComfyUI on desktop:', url);
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Error opening ComfyUI tab:', error);
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
   * @param {string} controlAfterGenerate - Control after generate mode
   * @param {string} comfyUrl - Custom ComfyUI URL
   * @returns {Promise<void>}
   */
  async queueInComfyUI(file, modifySeeds = false, controlAfterGenerate = 'increment', comfyUrl = null) {
    try {
      console.log('Queueing workflow in ComfyUI for file:', file.name);
      console.log('Settings:', { modifySeeds, controlAfterGenerate });

      // Get the workflow from the image
      const workflowData = await this.getWorkflowFromImage(file);
      
      if (!workflowData) {
        throw new Error('No workflow found in image metadata');
      }

      // Modify the workflow based on settings
      if (modifySeeds) {
        this.modifyWorkflowSeeds(workflowData);
      }
      
      // Always set control_after_generate to the selected value
      this.modifyControlAfterGenerate(workflowData, controlAfterGenerate);

      const response = await fetch(`${window.appConfig.getApiUrl()}/api/queue-workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          workflow: workflowData, // Send the modified workflow
          modifySeeds: modifySeeds,
          controlAfterGenerate: controlAfterGenerate,
          comfyUrl: comfyUrl
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to queue workflow');
      }

      const result = await response.json();
      console.log('Workflow queued successfully:', result);

      // Let's skip this until we can actually load the workflow.
      // this.openComfyUITab(result.comfyUrl);

      return result;
    } catch (error) {
      console.error('Error queueing workflow:', error);
      throw error;
    }
  },

  /**
   * Modify seed values in workflow with random numbers
   * @param {Object} workflow - Workflow object to modify
   */
  modifyWorkflowSeeds(workflow) {
    if (!workflow || typeof workflow !== 'object') return;

    console.log('Modifying seeds in workflow...');
    let seedCount = 0;

    const generateRandomSeed = () => {
      // Use a conservative range: 1 to 2147483647 (2^31 - 1)
      // This is well within ComfyUI's limits and commonly used for seeds
      return Math.floor(Math.random() * 2147483647) + 1;
    };

    const modifySeeds = (obj) => {
      if (typeof obj !== 'object' || obj === null) return;

      for (const key in obj) {
        if (key === 'seed' && typeof obj[key] === 'number') {
          const oldSeed = obj[key];
          obj[key] = generateRandomSeed();
          console.log(`Modified seed: ${oldSeed} -> ${obj[key]}`);
          seedCount++;
        } else if (key === 'inputs' && typeof obj[key] === 'object') {
          modifySeeds(obj[key]);
        } else if (typeof obj[key] === 'object') {
          modifySeeds(obj[key]);
        }
      }
    };

    modifySeeds(workflow);
    console.log(`Total seeds modified: ${seedCount}`);
  },

  /**
   * Modify control_after_generate values in workflow
   * @param {Object} workflow - Workflow object to modify
   * @param {string} controlMode - Control mode: 'increment', 'randomize', 'decrement', 'fixed'
   */
  modifyControlAfterGenerate(workflow, controlMode = 'increment') {
    if (!workflow || typeof workflow !== 'object') return;

    console.log(`Modifying control_after_generate values to: ${controlMode}`);
    let controlCount = 0;

    const modifyControls = (obj, path = '') => {
      if (typeof obj !== 'object' || obj === null) return;

      for (const key in obj) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (key === 'control_after_generate') {
          const oldControl = obj[key];
          obj[key] = controlMode;
          console.log(`Modified control_after_generate at ${currentPath}: ${oldControl} -> ${obj[key]}`);
          controlCount++;
        } else if (key === 'inputs' && typeof obj[key] === 'object') {
          modifyControls(obj[key], currentPath);
        } else if (typeof obj[key] === 'object') {
          modifyControls(obj[key], currentPath);
        }
      }
    };

    modifyControls(workflow);
    console.log(`Total control_after_generate values modified: ${controlCount}`);
    
    if (controlCount === 0) {
      console.warn('No control_after_generate fields found in workflow');
    }
  }
};

window.comfyuiApi = comfyuiApi;
