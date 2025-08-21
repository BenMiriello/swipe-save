/**
 * Main Application Initialization
 * Handles early app setup, error handling, and view routing initialization
 */
const AppInit = {
  /**
   * Initialize the application based on current URL path
   */
  init() {
    this.setupEarlyErrorHandler();
    this.initializePinchZoomPolyfill();
    this.setupViewRouting();
    this.initializeErrorHandler();
    this.setupGlobalState();
  },

  /**
   * Setup basic error logging before full error handler loads
   */
  setupEarlyErrorHandler() {
    window.addEventListener('error', function(e) {
      console.error('Early error:', e.message, e.filename, e.lineno);
    });
  },

  /**
   * Initialize PinchZoom polyfill to prevent missing library errors
   */
  initializePinchZoomPolyfill() {
    window.PinchZoom = function(el, options) {
      // Simplified polyfill that prevents errors when library is missing
      this.el = el;
      this.options = options || {};
      console.log('Simple PinchZoom polyfill initialized (no actual zoom)');
    };
  },

  /**
   * Setup view routing based on current URL path
   */
  setupViewRouting() {
    // Initialize list view for direct URL access
    if (window.location.pathname === '/list' || window.location.pathname === '/') {
      const initializeListView = () => {
        // Initialize UI managers for options dropdown functionality
        if (window.uiManager) {
          window.uiManager.initializeUI();
          window.uiManager.setupEventHandlers({});
        }
        
        if (window.simpleListView && !window.simpleListView.isActive) {
          window.simpleListView.init();
        }
        // Show appropriate navigation button
        if (window.navigationController) {
          window.navigationController.currentView = 'list';
          window.navigationController.updateNavigationButtons();
        }
      };

      // Initialize list view after DOM is ready
      document.addEventListener('DOMContentLoaded', initializeListView);
    } else {
      // Single view mode
      const initializeSingleView = () => {
        if (window.navigationController) {
          window.navigationController.currentView = 'single';
          window.navigationController.updateNavigationButtons();
        }
      };

      // Initialize single view after DOM is ready
      document.addEventListener('DOMContentLoaded', initializeSingleView);
    }
  },

  /**
   * Initialize the main error handler
   */
  initializeErrorHandler() {
    if (window.errorHandler) {
      window.errorHandler.init();
    }
  },

  /**
   * Setup global state for current file tracking
   */
  setupGlobalState() {
    window.globalState = {
      currentFileIndex: 0,
      currentFilePath: null,
      totalFiles: 0
    };
  }
};

// Auto-initialize when script loads
AppInit.init();