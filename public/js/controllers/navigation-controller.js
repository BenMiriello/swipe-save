/**
 * Handles file navigation logic
 */
const navigationController = {

  /**
   * Display the current image
   */
  displayCurrentImage() {
    const state = window.stateManager.getState();
    
    if (state.allFiles.length === 0) {
      window.uiManager.showEmptyState();
      window.uiManager.updateImageCounter(0, 0);
      return;
    }

    const file = state.allFiles[state.currentIndex];
    const mediaList = document.getElementById('mediaList');
    mediaList.innerHTML = '';

    const mediaItem = window.uiManager.createMediaItem(
      file, 
      state.customFilename, 
      window.appConfig.getApiUrl()
    );
    mediaList.appendChild(mediaItem);

    window.interactionHandler.setupSwipeHandlers();
    window.interactionHandler.setupTapHandlers();

    // Removed setupPinchZoom() call - pinch zoom disabled due to display issues

    window.uiManager.updateImageCounter(
      state.currentIndex, 
      state.allFiles.length
    );
  },

  /**
   * Show the previous image
   */
  showPreviousImage() {
    const state = window.stateManager.getState();
    if (state.allFiles.length === 0) return;

    window.stateManager.gotoPrevious();
    this.displayCurrentImage();
  },

  /**
   * Show the next image
   */
  showNextImage() {
    const state = window.stateManager.getState();
    if (state.allFiles.length === 0) return;

    window.stateManager.gotoNext();
    this.displayCurrentImage();
  },

  /**
   * Go to specific image index
   * @param {number} index - Index to navigate to
   */
  goToIndex(index) {
    const state = window.stateManager.getState();
    if (state.allFiles.length === 0) return;

    if (window.stateManager.goToIndex(index)) {
      this.displayCurrentImage();
    }
  }
};

window.navigationController = navigationController;
