/**
 * Main application controller, coordinates between modules
 */
class AppController {
  constructor() {
    // Initialize UI manager
    window.uiManager.initializeUI();

    // Setup interaction handlers with callback functions
    window.interactionHandler.init({
      showPrevious: this.showPreviousImage.bind(this),
      showNext: this.showNextImage.bind(this),
      performAction: this.performAction.bind(this),
      undoLastAction: this.undoLastAction.bind(this),
      toggleOptions: this.toggleOptionsMenu.bind(this),
      openFilenameModal: this.openFilenameModal.bind(this),
      downloadCurrentFile: this.downloadCurrentFile.bind(this),
      refreshFiles: this.fetchMediaFiles.bind(this),
      openFile: this.openFileInNewView.bind(this),
      showActionLabel: this.showActionLabel.bind(this)
    });

    // Setup UI event handlers
    window.uiManager.setupEventHandlers({
      openFilenameModal: this.openFilenameModal.bind(this),
      saveCustomFilename: this.saveCustomFilename.bind(this),
      openComfyUIModal: this.openComfyUIModal.bind(this),
      showPrevious: this.showPreviousImage.bind(this),
      showNext: this.showNextImage.bind(this),
      undoLastAction: this.undoLastAction.bind(this),
      downloadCurrentFile: this.downloadCurrentFile.bind(this)
    });

    // Event handling now managed by CoreEventSetup
  }

  /**
   * Initialize the application
   */
  init() {
    // Expose globally for UI manager
    window.appController = this;
    this.fetchMediaFiles();
  }

  /**
   * Initialize without auto-loading files (for list view default)
   */
  initWithoutAutoLoad() {
    // Expose globally for UI manager
    window.appController = this;
    // Don't call fetchMediaFiles() - let list view handle file loading
  }

  /**
   * Get current state (for backward compatibility)
   */
  get state() {
    return window.stateManager.getState();
  }


  /**
   * Fetch media files from server
   */
  async fetchMediaFiles() {
    try {
      window.stateManager.updateState({ isLoading: true });
      window.uiManager.showLoading();

      const files = await window.apiService.fetchMediaFiles();
      window.stateManager.setFiles(files);

      if (files.length === 0) {
        window.uiManager.showEmptyState();
        window.uiManager.updateImageCounter(0, 0);
        return;
      }

      window.navigationController.displayCurrentImage();
    } catch (error) {
      console.error('Error fetching media files:', error);
      window.uiManager.showError(error.message || 'Failed to load media files');
    } finally {
      window.stateManager.updateState({ isLoading: false });
    }
  }

  /**
   * Show the previous image
   */
  showPreviousImage() {
    window.navigationController.showPreviousImage();
  }

  /**
   * Show the next image
   */
  showNextImage() {
    window.navigationController.showNextImage();
  }

  /**
   * Go to specific image index
   * @param {number} index - Index to navigate to
   */
  goToIndex(index) {
    window.navigationController.goToIndex(index);
  }

  /**
   * Perform an action on the current image
   * @param {string} action - Action to perform
   */
  async performAction(action) {
    return window.actionController.performAction(action);
  }

  /**
   * Undo the last action
   */
  async undoLastAction() {
    console.log('APP CONTROLLER: undoLastAction called');
    return window.actionController.undoLastAction();
  }

  /**
   * Open the filename modal for renaming
   */
  openFilenameModal() {
    const state = window.stateManager.getState();
    if (state.allFiles.length === 0) return;

    const currentFile = state.allFiles[state.currentIndex];
    window.uiManager.showFilenameModal(currentFile.name, state.customFilename);
  }

  /**
   * Save the custom filename
   * @param {string} filename - New filename
   */
  saveCustomFilename(filename) {
    window.actionController.saveCustomFilename(filename);
  }

  /**
   * Download the current file
   */
  downloadCurrentFile() {
    window.actionController.downloadCurrentFile();
  }

  /**
   * Open current file in new tab/window
   */
  openFileInNewView() {
    window.actionController.openFileInNewView();
  }

  /**
   * Toggle options menu
   */
  toggleOptionsMenu() {
    window.uiManager.toggleOptionsDropdown();
  }

  /**
   * Show action label for tap interactions
   * @param {string} actionName - Name of the action
   * @param {DOMRect} rect - Position of the tap zone
   */
  showActionLabel(actionName, rect) {
    window.uiManager.showActionLabel(actionName, rect);
  }

  /**
   * Open ComfyUI modal
   */
  openComfyUIModal() {
    const state = window.stateManager.getState();
    if (state.allFiles.length === 0) return;

    const currentFile = state.allFiles[state.currentIndex];
    
    // Safety check for ComfyUI module
    if (!window.comfyUIModule) {
      console.error('ComfyUI module not loaded');
      return;
    }
    
    try {
      window.comfyUIModule.openWorkflowModal(currentFile);
    } catch (error) {
      console.error('Error opening ComfyUI modal:', error);
    }
  }

  /**
   * Setup ComfyUI modal button handlers (legacy - now handled by Alpine.js)
   */
  setupComfyUIModalHandlers() {
    // ComfyUI modal is now handled by Alpine.js module
    // This method is kept for compatibility but does nothing
  }

  /**
   * Handle run action (queue or load) - legacy method
   */
  async handleRunAction(type) {
    // ComfyUI actions are now handled by Alpine.js module
    // This method is kept for compatibility but does nothing
  }

  /**
   * Set button state with animations - legacy method
   */
  setButtonState(button, state, text, errorMessage = null) {
    // Button state management is now handled by Alpine.js module
    // This method is kept for compatibility but does nothing
  }

  /**
   * Setup number picker controls - legacy method
   */
  setupNumberPickers() {
    // Number picker controls are now handled by Alpine.js module
    // This method is kept for compatibility but does nothing
  }

  /**
   * Add result to the log - legacy method
   */
  addResultLog(count, useNewSeed, controlMode = 'increment', isError, errorMessage = null) {
    // Result logging is now handled by Alpine.js module
    // This method is kept for compatibility but does nothing
  }
}

// Export as a global variable
window.AppController = AppController;
