/**
 * Error handling and debugging utilities
 */
const errorHandler = {
  /**
   * Initialize error handling
   */
  init() {
    // Set up global error handler
    window.addEventListener('error', this.handleGlobalError.bind(this));
    window.addEventListener('unhandledrejection', this.handlePromiseRejection.bind(this));

    // Adding retry mechanism for API calls
    this.setupFetchRetry();

    console.log('Error handler initialized');
  },

  /**
   * Handle global JavaScript errors
   * @param {ErrorEvent} event - Error event
   */
  handleGlobalError(event) {
    console.error('Global error:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    });

    // Show error in UI if appropriate
    if (event.error && event.error.message && window.uiManager) {
      const mediaList = document.getElementById('mediaList');
      if (mediaList && mediaList.innerHTML.includes('Loading...')) {
        window.uiManager.showError(`${event.error.message} - Please try refreshing the page.`);
      }
    }
  },

  /**
   * Handle unhandled Promise rejections
   * @param {PromiseRejectionEvent} event - Promise rejection event
   */
  handlePromiseRejection(event) {
    console.error('Unhandled promise rejection:', event.reason);
  },

  /**
   * Add retry mechanism to fetch API
   */
  setupFetchRetry() {
    const originalFetch = window.fetch;

    window.fetch = async function(...args) {
      let retries = 3;
      let lastError;

      while (retries > 0) {
        try {
          const response = await originalFetch.apply(this, args);
          return response;
        } catch (error) {
          lastError = error;
          console.warn(`Fetch retry (${retries} left): ${args[0]}`, error);
          retries--;
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, (4 - retries) * 500));
        }
      }

      throw lastError;
    };
  }
};

// Export as a global variable
window.errorHandler = errorHandler;