/**
 * Main UI manager that coordinates all UI modules
 */
const uiManager = {
  /**
   * Initialize UI elements
   */
  initializeUI() {
    window.coreUIManager.initializeUI();
  },

  /**
   * Set up event handlers for UI elements
   * @param {Object} handlers - Object containing handler functions
   */
  setupEventHandlers(handlers) {
    window.coreUIManager.setupEventHandlers(handlers);
  },

  /**
   * Show filename modal for renaming
   * @param {string} currentFilename - Current filename
   * @param {string} customFilename - Custom filename if available
   */
  showFilenameModal(currentFilename, customFilename) {
    window.modalManager.showFilenameModal(currentFilename, customFilename);
  },

  /**
   * Update image counter display
   * @param {number} currentIndex - Current image index
   * @param {number} totalFiles - Total number of files
   */
  updateImageCounter(currentIndex, totalFiles) {
    window.coreUIManager.updateImageCounter(currentIndex, totalFiles);
  },

  /**
   * Show loading indicator
   */
  showLoading() {
    window.coreUIManager.showLoading();
  },

  /**
   * Show error message
   * @param {string} message - Error message
   */
  showError(message) {
    window.coreUIManager.showError(message);
  },

  /**
   * Show empty state when no files are available
   */
  showEmptyState() {
    window.coreUIManager.showEmptyState();
  },

  /**
   * Create a media item element for display
   * @param {Object} file - Media file object
   * @param {string} customFilename - Optional custom filename
   * @param {string} apiUrl - Base API URL
   * @returns {HTMLElement} - Media item DOM element
   */
  createMediaItem(file, customFilename, apiUrl) {
    return window.elementFactory.createMediaItem(file, customFilename, apiUrl);
  },

  /**
   * Setup pinch zoom for images
   */
  setupPinchZoom() {
    window.coreUIManager.setupPinchZoom();
  },

  /**
   * Add visual feedback for a swipe action
   * @param {HTMLElement} mediaItem - Media item element
   * @param {string} action - Action being performed
   */
  showActionFeedback(mediaItem, action) {
    window.coreUIManager.showActionFeedback(mediaItem, action);
  },

  /**
   * Hide action feedback (for error cases)
   * @param {HTMLElement} mediaItem - Media item element
   * @param {string} action - Action to remove feedback for
   */
  hideActionFeedback(mediaItem, action) {
    window.coreUIManager.hideActionFeedback(mediaItem, action);
  },

  /**
   * Shows an action label when a tap zone is clicked
   * @param {string} actionName - Name of the action
   * @param {DOMRect} rect - Rectangle position of the tap zone
   */
  showActionLabel(actionName, rect) {
    window.elementFactory.showActionLabel(actionName, rect);
  },

  /**
   * Toggle options dropdown visibility
   */
  toggleOptionsDropdown() {
    window.coreUIManager.toggleOptionsDropdown();
  },

  /**
   * Update config display in options dropdown
   */
  updateConfigDisplay(config) {
    window.coreUIManager.updateConfigDisplay(config);
  },

  /**
   * Open number dial modal
   */
  openNumberDial() {
    window.modalManager.openNumberDial();
  }
};

// Export as a global variable
window.uiManager = uiManager;