/**
 * Handles file navigation logic
 */
const navigationController = {
  currentView: 'single', // 'single' or 'list'

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
    this.updateURL();
    // Store the current file index for cross-view navigation
    const newState = window.stateManager.getState();
    localStorage.setItem('selectedFileIndex', newState.currentIndex.toString());
  },

  /**
   * Show the next image
   */
  showNextImage() {
    const state = window.stateManager.getState();
    if (state.allFiles.length === 0) return;

    window.stateManager.gotoNext();
    this.displayCurrentImage();
    this.updateURL();
    // Store the current file index for cross-view navigation
    const newState = window.stateManager.getState();
    localStorage.setItem('selectedFileIndex', newState.currentIndex.toString());
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
      this.updateURL();
      // Store the current file index for cross-view navigation
      localStorage.setItem('selectedFileIndex', index.toString());
    }
  },

  /**
   * Show list view
   */
  showListView() {
    this.currentView = 'list';
    
    // Use Alpine list view instead of old file list viewer
    if (window.simpleListView) {
      window.simpleListView.init();
    }
    
    // Update navigation buttons
    this.updateNavigationButtons();
  },

  /**
   * Show single view
   */
  showSingleView() {
    this.currentView = 'single';
    
    // Hide Alpine list view
    if (window.simpleListView) {
      window.simpleListView.exit();
    }
    
    // Display current image
    this.displayCurrentImage();
    
    // Update navigation buttons
    this.updateNavigationButtons();
  },

  /**
   * Toggle between views
   */
  toggleView() {
    if (this.currentView === 'single') {
      this.showListView();
    } else {
      this.showSingleView();
    }
  },

  /**
   * Get current view mode
   */
  getCurrentView() {
    return this.currentView;
  },

  /**
   * Update URL to reflect current file
   */
  updateURL() {
    const state = window.stateManager.getState();
    if (state.allFiles.length === 0 || state.currentIndex < 0) return;

    const currentFile = state.allFiles[state.currentIndex];
    if (!currentFile) return;

    const encodedPath = encodeURIComponent(currentFile.fullPath);
    const newURL = `/view?file=${encodedPath}`;
    
    // Update URL without reloading the page
    history.replaceState(null, '', newURL);
  },

  /**
   * Update navigation buttons based on current view
   */
  updateNavigationButtons() {
    const backButton = document.getElementById('backToListButton');
    const openFileButton = document.getElementById('openFileButton');
    
    if (this.currentView === 'single') {
      // Show back to list button in single view
      if (backButton) {
        backButton.style.display = 'block';
        backButton.onclick = () => this.backToList();
      }
      if (openFileButton) {
        openFileButton.style.display = 'none';
      }
    } else {
      // Show open file button in list view
      if (backButton) {
        backButton.style.display = 'none';
      }
      if (openFileButton) {
        openFileButton.style.display = 'block';
        openFileButton.onclick = () => this.openCurrentFile();
      }
    }
  },

  /**
   * Navigate back to list view, preserving current page
   */
  backToList() {
    console.log('backToList called');
    // Calculate which page contains the current file
    const state = window.stateManager.getState();
    console.log('Current state:', state);
    if (state.currentIndex >= 0) {
      const itemsPerPage = 100; // Match the default from list-view-store.js
      const targetPage = Math.floor(state.currentIndex / itemsPerPage) + 1;
      console.log('Setting targetListPage to:', targetPage);
      localStorage.setItem('targetListPage', targetPage.toString());
    }
    window.location.href = '/list';
  },

  /**
   * Open current file or first file on current page
   */
  openCurrentFile() {
    console.log('openCurrentFile called');
    const listStore = Alpine?.store('listView');
    console.log('listStore:', listStore);
    if (!listStore || !listStore.allFiles || listStore.allFiles.length === 0) {
      console.log('List store not ready or no files available');
      return;
    }
    console.log('List store has', listStore.allFiles.length, 'files, currentPage:', listStore.currentPage);

    // Get stored file index from localStorage first
    const storedIndex = localStorage.getItem('selectedFileIndex');
    console.log('Raw stored index from localStorage:', storedIndex);
    let fileIndex;
    
    if (storedIndex !== null) {
      fileIndex = parseInt(storedIndex, 10);
      console.log('Using stored file index:', fileIndex);
    } else {
      // Use first file on current page as fallback
      fileIndex = (listStore.currentPage - 1) * listStore.itemsPerPage;
      console.log('No stored index, using first file on page:', fileIndex);
    }
    
    // Validate the index is within bounds
    if (fileIndex < 0 || fileIndex >= listStore.allFiles.length) {
      console.log('Index out of bounds, using first file on page');
      fileIndex = (listStore.currentPage - 1) * listStore.itemsPerPage;
    }

    const file = listStore.allFiles[fileIndex];
    if (file) {
      console.log('Opening file:', file.name, 'at index:', fileIndex);
      listStore.selectedFileIndex = fileIndex;
      localStorage.setItem('selectedFileIndex', fileIndex.toString());
      listStore.exitListView();
      const encodedPath = encodeURIComponent(file.fullPath);
      window.location.href = `/view?file=${encodedPath}`;
    } else {
      console.error('File not found at index:', fileIndex);
    }
  }
};

window.navigationController = navigationController;
