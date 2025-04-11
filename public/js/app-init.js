/**
 * Application Initialization Module
 */
const appInit = {
  /**
   * Initialize all application components in the correct order
   */
  init() {
    console.log('Initializing application...');
    
    // Initialize error handler first
    if (window.errorHandler) {
      window.errorHandler.init();
    }
    
    // Initialize UI manager
    if (window.uiManager) {
      window.uiManager.initializeUI();
    }
    
    // Initialize controller and store reference globally
    window.appController = new window.AppController();
    
    // Start the application
    window.appController.init().catch(error => {
      console.error('Error during app initialization:', error);
      if (window.uiManager) {
        window.uiManager.showError('Application initialization failed: ' + error.message);
      }
    });
    
    console.log('Application initialized');
  }
};

// Initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
  appInit.init();
});
