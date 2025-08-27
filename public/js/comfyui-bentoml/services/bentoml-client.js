/**
 * BentoML Client Service
 * Direct workflow submission without GUI↔API conversion
 */

window.comfyUIBentoML = window.comfyUIBentoML || {};

window.comfyUIBentoML.client = {
  // Configuration
  config: {
    useServerProxy: true,  // Route through Express server initially
    debugMode: false
  },


  /**
   * Initialize BentoML client
   */
  async init() {
    try {
      
      // Check service health
      const health = await this.healthCheck();
      
      if (this.config.debugMode) {
        console.log('BentoML Client initialized:', {
          serviceHealthy: health.healthy
        });
      }
      
      return health.healthy;
    } catch (error) {
      console.warn('BentoML client initialization failed:', error.message);
      return false;
    }
  },

  /**
   * Queue workflow via BentoML (Phase 1: Direct submission)
   * Eliminates complex GUI-API conversion
   */
  async queueWorkflow(file, options = {}) {
    const {
      seedMode = 'original',
      modifySeeds = false, // Keep for backward compatibility
      controlAfterGenerate = 'increment',
      quantity = 1
    } = options;
    
    // Handle backward compatibility: convert modifySeeds to seedMode
    const actualSeedMode = seedMode !== 'original' ? seedMode : (modifySeeds ? 'randomize' : 'original');


    try {
      const response = await fetch(`${window.appConfig.getApiUrl()}/api/bentoml/queue-workflow`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Client-ID': this.generateClientId()
        },
        body: JSON.stringify({
          filename: file.name,
          seedMode: actualSeedMode,
          modifySeeds: actualSeedMode !== 'original', // For backward compatibility
          controlAfterGenerate,
          quantity
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle service unavailable - suggest fallback
        if (response.status === 503) {
          throw new Error(`BentoML unavailable: ${errorData.error}. ${errorData.fallback || 'Use legacy workflow submission.'}`);
        }
        
        throw new Error(errorData.error || 'BentoML workflow submission failed');
      }

      const result = await response.json();
      
      // Success logging
      const message = `BentoML: Queued workflow ${quantity > 1 ? `${quantity} times` : ''} with ${actualSeedMode} seeds, control: ${controlAfterGenerate}`;
      console.log(message);
      
      return {
        success: true,
        method: 'bentoml',
        workflowId: result.workflowId,
        submissionCount: result.submissionCount,
        message,
        result
      };

    } catch (error) {
      console.error(`BentoML: Failed to queue workflow - ${error.message}`);
      throw error;
    }
  },

  /**
   * Queue workflow with pre-edited workflow data via BentoML
   */
  async queueWorkflowWithEdits(file, modifiedWorkflow, options = {}) {
    const {
      seedMode = 'original',
      modifySeeds = false,
      controlAfterGenerate = 'increment',
      quantity = 1
    } = options;
    
    const actualSeedMode = seedMode !== 'original' ? seedMode : (modifySeeds ? 'randomize' : 'original');


    try {
      const response = await fetch(`${window.appConfig.getApiUrl()}/api/bentoml/queue-workflow-with-edits`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Client-ID': this.generateClientId()
        },
        body: JSON.stringify({
          filename: file.name,
          workflow: modifiedWorkflow,
          seedMode: actualSeedMode,
          modifySeeds: actualSeedMode !== 'original',
          controlAfterGenerate,
          quantity
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        if (response.status === 503) {
          throw new Error(`BentoML unavailable: ${errorData.error}. ${errorData.fallback || 'Use legacy workflow submission.'}`);
        }
        
        throw new Error(errorData.error || 'BentoML edited workflow submission failed');
      }

      const result = await response.json();
      
      const message = `BentoML edited: Queued workflow ${quantity > 1 ? `${quantity} times` : ''} with ${actualSeedMode} seeds, control: ${controlAfterGenerate}`;
      console.log(message);
      
      return {
        success: true,
        method: 'bentoml-edited',
        results: result.results,
        quantity: result.quantity,
        message,
        result
      };

    } catch (error) {
      console.error(`BentoML edited: Failed to queue workflow - ${error.message}`);
      throw error;
    }
  },

  /**
   * Get workflow status from BentoML
   */
  async getWorkflowStatus(workflowId) {
    try {
      const response = await fetch(`${window.appConfig.getApiUrl()}/api/bentoml/status/${workflowId}`);
      
      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('BentoML: Failed to get status:', error);
      throw error;
    }
  },

  /**
   * Cancel workflow in BentoML queue
   */
  async cancelWorkflow(workflowId) {
    try {
      const response = await fetch(`${window.appConfig.getApiUrl()}/api/bentoml/cancel/${workflowId}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`Cancel failed: ${response.status}`);
      }
      
      const result = await response.json();
      console.log(`BentoML: Cancelled workflow ${workflowId}`);
      
      return result;
    } catch (error) {
      console.error('BentoML: Failed to cancel workflow:', error);
      throw error;
    }
  },

  /**
   * Health check for BentoML service
   */
  async healthCheck() {
    try {
      const response = await fetch(`${window.appConfig.getApiUrl()}/api/bentoml/health`);
      
      if (!response.ok) {
        return { healthy: false, error: `HTTP ${response.status}` };
      }
      
      return await response.json();
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  },

  /**
   * Get BentoML service schema for field detection
   */
  async getServiceSchema() {
    try {
      const response = await fetch(`${window.appConfig.getApiUrl()}/api/bentoml/schema`);
      
      if (!response.ok) {
        return null;
      }
      
      return await response.json();
    } catch (error) {
      console.warn('Failed to fetch BentoML schema:', error.message);
      return null;
    }
  },


  /**
   * Generate unique client ID
   */
  generateClientId() {
    return 'swipe-save-bentoml-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  },

  /**
   * Get client configuration and status
   */
  getStatus() {
    return {
      config: this.config,
      timestamp: new Date().toISOString()
    };
  }
};

// Auto-initialize when loaded
document.addEventListener('DOMContentLoaded', () => {
  window.comfyUIBentoML.client.init().catch(error => {
    console.warn('BentoML client auto-initialization failed:', error.message);
  });
});