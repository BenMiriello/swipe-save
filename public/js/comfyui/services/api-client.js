/**
 * ComfyUI API Client Service
 * Handles all ComfyUI API interactions
 */

window.comfyUIServices = window.comfyUIServices || {};

window.comfyUIServices.apiClient = {
  /**
   * Queue workflow in ComfyUI
   */
  async queueWorkflow(file, modifySeeds = false, controlAfterGenerate = 'increment', comfyUrl = null) {
    try {
      const response = await fetch(`${window.appConfig.getApiUrl()}/api/queue-workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
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
      
      // Simple success logging
      console.log(`ComfyUI: Queued workflow with ${modifySeeds ? 'new seed' : 'original seed'}, control: ${controlAfterGenerate}`);
      
      return result;
    } catch (error) {
      console.log(`ComfyUI: Failed to queue workflow - ${error.message}`);
      throw error;
    }
  },

  /**
   * Load workflow in ComfyUI (placeholder for future implementation)
   */
  async loadWorkflow(file, modifySeeds = false, controlAfterGenerate = 'increment', comfyUrl = null) {
    try {
      const workflowData = await this.getWorkflowFromImage(file);
      
      if (!workflowData) {
        throw new Error('No workflow found in image metadata');
      }

      if (modifySeeds) {
        this.modifyWorkflowSeeds(workflowData);
      }
      
      this.modifyControlAfterGenerate(workflowData, controlAfterGenerate);

      const targetUrl = comfyUrl || this.getDefaultComfyUIUrl();
      
      // For now, just open ComfyUI - actual loading to be implemented
      this.openComfyUITab(targetUrl);
      
      return { success: true, comfyUrl: targetUrl };
    } catch (error) {
      console.error('Error loading workflow:', error);
      throw error;
    }
  },

  /**
   * Get workflow from image metadata
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
   * Modify seed values in workflow
   */
  modifyWorkflowSeeds(workflow) {
    if (!workflow || typeof workflow !== 'object') return;

    const generateRandomSeed = () => {
      return Math.floor(Math.random() * 2147483647) + 1;
    };

    const modifySeeds = (obj) => {
      if (typeof obj !== 'object' || obj === null) return;

      for (const key in obj) {
        if (key === 'seed' && typeof obj[key] === 'number') {
          obj[key] = generateRandomSeed();
        } else if (typeof obj[key] === 'object') {
          modifySeeds(obj[key]);
        }
      }
    };

    modifySeeds(workflow);
  },

  /**
   * Modify control_after_generate values in workflow
   */
  modifyControlAfterGenerate(workflow, controlMode = 'increment') {
    if (!workflow || typeof workflow !== 'object') return;

    const modifyControls = (obj) => {
      if (typeof obj !== 'object' || obj === null) return;

      for (const key in obj) {
        if (key === 'control_after_generate') {
          obj[key] = controlMode;
        } else if (typeof obj[key] === 'object') {
          modifyControls(obj[key]);
        }
      }
    };

    modifyControls(workflow);
  },

  /**
   * Get default ComfyUI URL
   */
  getDefaultComfyUIUrl() {
    const currentUrl = new URL(window.location.href);
    return `${currentUrl.protocol}//${currentUrl.hostname}:8188`;
  },

  /**
   * Open ComfyUI in new tab
   */
  openComfyUITab(url) {
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error opening ComfyUI tab:', error);
      // Fallback: copy URL to clipboard
      this.copyUrlToClipboard(url);
    }
  },

  /**
   * Copy URL to clipboard as fallback
   */
  copyUrlToClipboard(url) {
    try {
      navigator.clipboard.writeText(url).then(() => {
        alert(`ComfyUI URL copied to clipboard:\n${url}`);
      }).catch(() => {
        alert(`Please manually open ComfyUI at:\n${url}`);
      });
    } catch (error) {
      alert(`Please manually open ComfyUI at:\n${url}`);
    }
  }
};
