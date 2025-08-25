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
    app.initWithoutAutoLoad();
    
    // Load files manually and navigate to correct one
    app.fetchMediaFiles().then(() => {
      const navigate = () => {
        if (window.app && window.app.state && window.app.state.allFiles && window.app.state.allFiles.length > 0) {
          // Try both encoded and decoded path matching
          const decodedFilePath = decodeURIComponent(filePath);
          const fileIndex = window.app.state.allFiles.findIndex(f => 
            f.path === filePath || f.path === decodedFilePath || f.fullPath === decodedFilePath
          );
          if (fileIndex >= 0 && window.app.goToIndex) {
            window.app.goToIndex(fileIndex);
          }
        } else {
          // Retry if not ready yet
          setTimeout(navigate, 100);
        }
      };
      navigate();
    });
  },

  /**
   * Initialize app with specific file index
   */
  initializeWithIndex(app, index) {
    app.initWithoutAutoLoad();
    
    // Load files manually and navigate to correct index
    app.fetchMediaFiles().then(() => {
      const navigate = () => {
        if (window.app && window.app.goToIndex && window.app.state && window.app.state.allFiles && window.app.state.allFiles.length > 0) {
          const targetIndex = parseInt(index);
          if (targetIndex >= 0 && targetIndex < window.app.state.allFiles.length) {
            window.app.goToIndex(targetIndex);
          }
        } else {
          // Retry if not ready yet
          setTimeout(navigate, 100);
        }
      };
      navigate();
    });
  }
};

// Auto-initialize when script loads
ViewRouter.initializeSingleView();