/**
 * View Router
 * Handles single view initialization based on URL parameters
 */
const ViewRouter = {
  /**
   * Initialize single view based on URL parameters
   * Only runs for non-list paths
   */
  initializeSingleView() {
    // Only initialize for single view paths
    if (window.location.pathname !== '/' && window.location.pathname !== '/list') {
      const initializeApp = () => {
        const app = new window.AppController();
        window.app = app;
        
        const urlParams = new URLSearchParams(window.location.search);
        const filePath = urlParams.get('file');
        const index = urlParams.get('index');
        
        if (filePath) {
          this.initializeWithFilePath(app, filePath);
        } else if (index !== null) {
          this.initializeWithIndex(app, index);
        } else {
          app.initWithoutAutoLoad();
        }
      };

      // Initialize app after DOM is ready
      document.addEventListener('DOMContentLoaded', initializeApp);
    }
  },

  /**
   * Initialize app with specific file path
   */
  initializeWithFilePath(app, filePath) {
    window.globalState.currentFilePath = filePath;
    app.init();
    
    setTimeout(() => {
      if (window.app && window.app.state && window.app.state.allFiles) {
        const fileIndex = window.app.state.allFiles.findIndex(f => f.path === filePath);
        if (fileIndex >= 0 && window.app.goToIndex) {
          window.app.goToIndex(fileIndex);
        }
      }
    }, 1500);
  },

  /**
   * Initialize app with specific file index
   */
  initializeWithIndex(app, index) {
    app.init();
    
    setTimeout(() => {
      if (window.app && window.app.goToIndex) {
        window.app.goToIndex(parseInt(index));
      }
    }, 1000);
  }
};

// Auto-initialize when script loads
ViewRouter.initializeSingleView();