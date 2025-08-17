/**
 * BentoML ComfyUI Integration - Main Entry Point
 * Coordinates all BentoML services and adapters
 */

window.comfyUIBentoML = window.comfyUIBentoML || {};

window.comfyUIBentoML.main = {
  initialized: false,
  initPromise: null,

  /**
   * Initialize all BentoML services
   */
  async init() {
    if (this.initialized) {
      return true;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._performInit();
    return this.initPromise;
  },

  async _performInit() {
    try {
      console.log('Initializing BentoML ComfyUI integration...');

      // Initialize core client
      const clientReady = await window.comfyUIBentoML.client.init();
      
      if (!clientReady) {
        console.warn('BentoML client not ready, running in limited mode');
      }

      // Initialize schema service (depends on client)
      if (window.comfyUIBentoML.schemaService) {
        try {
          await window.comfyUIBentoML.schemaService.getSchema();
        } catch (error) {
          console.warn('Schema service initialization failed:', error.message);
        }
      }

      // Initialize UI adapter (depends on Alpine.js)
      if (window.comfyUIBentoML.uiAdapter) {
        try {
          await window.comfyUIBentoML.uiAdapter.init();
        } catch (error) {
          console.warn('UI adapter initialization failed:', error.message);
        }
      }

      this.initialized = true;
      console.log('BentoML integration initialized successfully');
      
      // Dispatch ready event
      document.dispatchEvent(new CustomEvent('bentoml:ready', {
        detail: { 
          clientReady, 
          timestamp: new Date().toISOString() 
        }
      }));

      return true;

    } catch (error) {
      console.error('BentoML integration initialization failed:', error);
      this.initialized = false;
      this.initPromise = null;
      return false;
    }
  },

  /**
   * Get overall system status
   */
  async getStatus() {
    if (!this.initialized) {
      return { initialized: false, error: 'Not initialized' };
    }

    try {
      const [clientStatus, health, uiStatus] = await Promise.all([
        window.comfyUIBentoML.client.getStatus(),
        window.comfyUIBentoML.client.healthCheck(),
        window.comfyUIBentoML.uiAdapter?.getStatus() || { enabled: false }
      ]);

      return {
        initialized: true,
        client: clientStatus,
        service: health,
        ui: uiStatus,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        initialized: true,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  },

  /**
   * Quick test of BentoML functionality
   */
  async test() {
    try {
      console.log('Testing BentoML integration...');

      // Test 1: Health check
      const health = await window.comfyUIBentoML.client.healthCheck();
      console.log('Health check:', health.healthy ? 'PASS' : 'FAIL');

      // Test 2: Feature flags
      await window.comfyUIBentoML.client.syncFeatureFlags();
      console.log('Feature flags:', window.comfyUIBentoML.client.featureFlags);

      // Test 3: Schema fetch
      if (window.comfyUIBentoML.schemaService) {
        const schema = await window.comfyUIBentoML.schemaService.getSchema();
        console.log('Schema available:', Boolean(schema));
      }

      // Test 4: UI adapter status
      if (window.comfyUIBentoML.uiAdapter) {
        const uiStatus = window.comfyUIBentoML.uiAdapter.getStatus();
        console.log('UI adapter enabled:', uiStatus.enabled);
      }

      console.log('BentoML integration test completed');
      return true;

    } catch (error) {
      console.error('BentoML integration test failed:', error);
      return false;
    }
  },

  /**
   * Development helper: Enable BentoML for testing
   */
  async enableForTesting() {
    try {
      console.log('Enabling BentoML for testing...');

      // Enable submission feature
      const result = await window.comfyUIBentoML.client.setFeatureFlag('USE_BENTOML_SUBMISSION', true);
      
      if (result && result.success) {
        console.log('BentoML submission enabled');
        
        // Re-initialize UI adapter to pick up changes
        if (window.comfyUIBentoML.uiAdapter) {
          await window.comfyUIBentoML.uiAdapter.init();
        }
        
        return true;
      } else {
        console.error('Failed to enable BentoML submission');
        return false;
      }

    } catch (error) {
      console.error('Failed to enable BentoML for testing:', error);
      return false;
    }
  },

  /**
   * Development helper: Disable BentoML
   */
  async disable() {
    try {
      const result = await window.comfyUIBentoML.client.setFeatureFlag('USE_BENTOML_SUBMISSION', false);
      
      if (result && result.success) {
        console.log('BentoML submission disabled');
        return true;
      }
      
      return false;

    } catch (error) {
      console.error('Failed to disable BentoML:', error);
      return false;
    }
  }
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Small delay to ensure all dependencies are loaded
  setTimeout(() => {
    window.comfyUIBentoML.main.init().catch(error => {
      console.warn('BentoML auto-initialization failed:', error.message);
    });
  }, 500);
});

// Expose global convenience methods for testing
window.bentoMLTest = () => window.comfyUIBentoML.main.test();
window.bentoMLStatus = () => window.comfyUIBentoML.main.getStatus();
window.bentoMLEnable = () => window.comfyUIBentoML.main.enableForTesting();
window.bentoMLDisable = () => window.comfyUIBentoML.main.disable();