/**
 * Main application controller, coordinates between modules
 */
class AppController {
  constructor() {
    // State management
    this.state = {
      allFiles: [],
      currentIndex: 0,
      customFilename: null,
      isLoading: false,
      pathsInitialized: false
    };
    
    // Initialize UI manager
    window.uiManager.initializeUI();
    
    // Setup interaction handlers with callback functions
    window.interactionHandler.init({
      showPrevious: this.showPreviousImage.bind(this),
      showNext: this.showNextImage.bind(this),
      performAction: this.performAction.bind(this),
      undoLastAction: this.undoLastAction.bind(this),
      togglePathOverlay: this.togglePathOverlay.bind(this),
      openFilenameModal: this.openFilenameModal.bind(this),
      downloadCurrentFile: this.downloadCurrentFile.bind(this),
      refreshFiles: this.fetchMediaFiles.bind(this),
      openFile: this.openFileInNewView.bind(this),
      showActionLabel: this.showActionLabel.bind(this),
      editFromPath: this.editFromPath.bind(this),
      editToPath: this.editToPath.bind(this),
      showInstructions: this.showInstructions.bind(this)
    });
    
    // Setup UI event handlers
    window.uiManager.setupEventHandlers({
      openFilenameModal: this.openFilenameModal.bind(this),
      saveCustomFilename: this.saveCustomFilename.bind(this),
      togglePathOverlay: this.togglePathOverlay.bind(this),
      editFromPath: this.editFromPath.bind(this),
      editToPath: this.editToPath.bind(this),
      saveFromPath: this.saveFromPath.bind(this),
      saveToPath: this.saveToPath.bind(this),
      showInstructions: this.showInstructions.bind(this)
    });
    
    // Setup additional UI controls
    this.setupUIControls();
  }
  
  /**
   * Initialize the application
   */
  async init() {
    // Initialize paths from server
    await this.initializePaths();
    
    // Then fetch media files
    this.fetchMediaFiles();
  }
  
  /**
   * Initialize paths from server
   */
  async initializePaths() {
    try {
      await window.appConfig.initPaths();
      this.state.pathsInitialized = true;
      
      // Update UI with paths
      window.uiManager.updatePathsDisplay(
        window.appConfig.getDisplayPath(window.appConfig.fromPath),
        window.appConfig.getDisplayPath(window.appConfig.toPath)
      );
      
      return true;
    } catch (error) {
      console.error('Error initializing paths:', error);
      return false;
    }
  }
  
  /**
   * Setup additional UI controls (buttons, etc.)
   */
  setupUIControls() {
    // Set up header buttons if they exist
    const refreshIcon = document.querySelector('.refresh-btn');
    if (refreshIcon) {
      refreshIcon.addEventListener('click', this.fetchMediaFiles.bind(this));
    }
    
    const saveIcon = document.querySelector('.download-btn');
    if (saveIcon) {
      saveIcon.addEventListener('click', this.downloadCurrentFile.bind(this));
    }
    
    // Setup navigation buttons
    const prevButton = document.querySelector('.btn-secondary:first-child');
    if (prevButton) {
      prevButton.addEventListener('click', this.showPreviousImage.bind(this));
    }
    
    const nextButton = document.querySelector('.btn-secondary:last-child');
    if (nextButton) {
      nextButton.addEventListener('click', this.showNextImage.bind(this));
    }
    
    // Setup undo button
    const undoButton = document.querySelector('.btn-undo');
    if (undoButton) {
      undoButton.addEventListener('click', this.undoLastAction.bind(this));
    }
  }
  
  /**
   * Toggle path overlay visibility
   */
  togglePathOverlay() {
    window.uiManager.togglePathOverlay();
  }
  
  /**
   * Show instructions modal
   */
  showInstructions() {
    window.uiManager.showInstructionsModal();
  }
  
  /**
   * Edit 'from' path
   */
  editFromPath() {
    const currentPath = window.appConfig.getDisplayPath(window.appConfig.fromPath);
    window.uiManager.showPathModal('FROM', currentPath, this.saveFromPath.bind(this));
  }
  
  /**
   * Edit 'to' path
   */
  editToPath() {
    const currentPath = window.appConfig.getDisplayPath(window.appConfig.toPath);
    window.uiManager.showPathModal('TO', currentPath, this.saveToPath.bind(this));
  }
  
  /**
   * Save FROM path
   */
  async saveFromPath(newPath) {
    if (!newPath) return;
    
    try {
      await window.appConfig.updatePaths(newPath, null);
      
      // Update UI with new path
      window.uiManager.updatePathsDisplay(
        window.appConfig.getDisplayPath(window.appConfig.fromPath),
        window.appConfig.getDisplayPath(window.appConfig.toPath)
      );
      
      // Refresh files from new path
      this.fetchMediaFiles();
    } catch (error) {
      console.error('Error saving FROM path:', error);
      window.uiManager.showError('Failed to update FROM path: ' + error.message);
    }
  }
  
  /**
   * Save TO path
   */
  async saveToPath(newPath) {
    if (!newPath) return;
    
    try {
      await window.appConfig.updatePaths(null, newPath);
      
      // Update UI with new path
      window.uiManager.updatePathsDisplay(
        window.appConfig.getDisplayPath(window.appConfig.fromPath),
        window.appConfig.getDisplayPath(window.appConfig.toPath)
      );
    } catch (error) {
      console.error('Error saving TO path:', error);
      window.uiManager.showError('Failed to update TO path: ' + error.message);
    }
  }
  
  /**
   * Fetch media files from server
   */
  async fetchMediaFiles() {
    try {
      this.state.isLoading = true;
      window.uiManager.showLoading();
      
      // Ensure paths are initialized first
      if (!this.state.pathsInitialized) {
        await this.initializePaths();
      }
      
      this.state.allFiles = await window.apiService.fetchMediaFiles();
      
      if (this.state.allFiles.length === 0) {
        window.uiManager.showEmptyState();
        window.uiManager.updateImageCounter(0, 0);
        return;
      }
      
      // Reset to first image when refreshing
      this.state.currentIndex = 0;
      this.state.customFilename = null;
      this.displayCurrentImage();
    } catch (error) {
      console.error('Error fetching media files:', error);
      window.uiManager.showError(error.message || 'Failed to load media files');
    } finally {
      this.state.isLoading = false;
    }
  }
  
  /**
   * Display the current image
   */
  displayCurrentImage() {
    if (this.state.allFiles.length === 0) {
      window.uiManager.showEmptyState();
      window.uiManager.updateImageCounter(0, 0);
      return;
    }
    
    const file = this.state.allFiles[this.state.currentIndex];
    const mediaList = document.getElementById('mediaList');
    mediaList.innerHTML = '';
    
    // Create and add the media item
    const mediaItem = window.uiManager.createMediaItem(
      file, 
      this.state.customFilename, 
      window.appConfig.getApiUrl()
    );
    mediaList.appendChild(mediaItem);
    
    // Setup interactions
    window.interactionHandler.setupSwipeHandlers();
    window.interactionHandler.setupTapHandlers();
    
    // Setup pinch zoom for images
    window.uiManager.setupPinchZoom();
    
    // Update counter
    window.uiManager.updateImageCounter(
      this.state.currentIndex, 
      this.state.allFiles.length
    );
  }
  
  /**
   * Show the previous image
   */
  showPreviousImage() {
    if (this.state.allFiles.length === 0) return;
    
    this.state.customFilename = null; // Reset custom filename
    this.state.currentIndex = (this.state.currentIndex - 1 + this.state.allFiles.length) % this.state.allFiles.length;
    this.displayCurrentImage();
  }
  
  /**
   * Show the next image
   */
  showNextImage() {
    if (this.state.allFiles.length === 0) return;
    
    this.state.customFilename = null; // Reset custom filename
    this.state.currentIndex = (this.state.currentIndex + 1) % this.state.allFiles.length;
    this.displayCurrentImage();
  }
  
  /**
   * Perform an action on the current image
   * @param {string} action - Action to perform
   */
  async performAction(action) {
    if (this.state.allFiles.length === 0) return;
    
    const file = this.state.allFiles[this.state.currentIndex];
    const filename = file.name;
    const mediaItem = document.querySelector('.media-item');
    
    if (!mediaItem) return;
    
    // Show visual feedback
    window.uiManager.showActionFeedback(mediaItem, action);
    
    try {
      // Call API to perform the action
      await window.apiService.performAction(filename, action, this.state.customFilename);
      
      // Move to next image after successful action
      setTimeout(() => {
        // Remove current file from array
        this.state.allFiles.splice(this.state.currentIndex, 1);
        
        // Reset custom filename for next image
        this.state.customFilename = null;
        
        // If there are no more files, show empty state
        if (this.state.allFiles.length === 0) {
          window.uiManager.showEmptyState();
          window.uiManager.updateImageCounter(0, 0);
          return;
        }
        
        // If we're at the end of the array, go back one
        if (this.state.currentIndex >= this.state.allFiles.length) {
          this.state.currentIndex = this.state.allFiles.length - 1;
        }
        
        // Display the next image
        this.displayCurrentImage();
      }, 300);
    } catch (error) {
      console.error('Error performing action:', error);
      // Remove visual feedback on error
      window.uiManager.hideActionFeedback(mediaItem, action);
    }
  }
  
  /**
   * Undo the last action
   */
  async undoLastAction() {
    try {
      // Call API to undo last action
      const result = await window.apiService.undoLastAction();
      
      if (result.undoneAction) {
        // Refresh the media files and try to show the image that was restored
        const undoneFilename = result.undoneAction.filename;
        
        // Keep track of the current filename to possibly restore it later
        const currentFilename = this.state.allFiles[this.state.currentIndex]?.name;
        
        // Fetch updated files
        this.state.allFiles = await window.apiService.fetchMediaFiles();
        
        if (this.state.allFiles.length === 0) {
          window.uiManager.showEmptyState();
          window.uiManager.updateImageCounter(0, 0);
          return;
        }
        
        // Try to find and show the undone file in the refreshed list
        if (undoneFilename) {
          const undoneIndex = this.state.allFiles.findIndex(file => file.name === undoneFilename);
          if (undoneIndex !== -1) {
            this.state.currentIndex = undoneIndex;
          } else if (currentFilename) {
            // If undone file not found, try to keep the current position
            const currentFileIndex = this.state.allFiles.findIndex(file => file.name === currentFilename);
            if (currentFileIndex !== -1) {
              this.state.currentIndex = currentFileIndex;
            } else {
              this.state.currentIndex = 0; // Fallback to first image
            }
          } else {
            this.state.currentIndex = 0; // Fallback to first image
          }
        }
        
        this.state.customFilename = null;
        this.displayCurrentImage();
      }
    } catch (error) {
      console.error('Error performing undo:', error);
      alert('Failed to undo the last action: ' + error.message);
    }
  }
  
  /**
   * Open the filename modal for renaming
   */
  openFilenameModal() {
    if (this.state.allFiles.length === 0) return;
    
    const currentFile = this.state.allFiles[this.state.currentIndex];
    window.uiManager.showFilenameModal(currentFile.name, this.state.customFilename);
  }
  
  /**
   * Save the custom filename
   * @param {string} filename - New filename
   */
  saveCustomFilename(filename) {
    this.state.customFilename = filename;
    // Refresh display to show new filename
    this.displayCurrentImage();
  }
  
  /**
   * Download the current file
   */
  downloadCurrentFile() {
    if (this.state.allFiles.length === 0) return;
    
    const currentFile = this.state.allFiles[this.state.currentIndex];
    window.apiService.downloadFile(currentFile, this.state.customFilename);
  }
  
  /**
   * Open current file in new tab/window
   */
  openFileInNewView() {
    if (this.state.allFiles.length === 0) return;
    
    const currentFile = this.state.allFiles[this.state.currentIndex];
    window.apiService.openFileInNewView(currentFile);
  }
  
  /**
   * Show action label for tap interactions
   * @param {string} actionName - Name of the action
   * @param {DOMRect} rect - Position of the tap zone
   */
  showActionLabel(actionName, rect) {
    window.uiManager.showActionLabel(actionName, rect);
  }
}

// Export as a global variable
window.AppController = AppController;