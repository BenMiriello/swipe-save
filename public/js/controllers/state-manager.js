/**
 * Manages application state
 */
const stateManager = {
  state: {
    allFiles: [],
    currentIndex: 0,
    customFilename: null,
    isLoading: false
  },

  /**
   * Get current state
   */
  getState() {
    return this.state;
  },

  /**
   * Update state
   * @param {Object} updates - State updates
   */
  updateState(updates) {
    Object.assign(this.state, updates);
  },

  /**
   * Reset state to initial values
   */
  resetState() {
    this.state = {
      allFiles: [],
      currentIndex: 0,
      customFilename: null,
      isLoading: false
    };
  },

  /**
   * Set files list
   * @param {Array} files - Array of files
   */
  setFiles(files) {
    this.state.allFiles = files;
    this.state.currentIndex = 0;
    this.state.customFilename = null;
  },

  /**
   * Get current file
   */
  getCurrentFile() {
    if (this.state.allFiles.length === 0) return null;
    return this.state.allFiles[this.state.currentIndex];
  },

  /**
   * Remove file at current index
   */
  removeCurrentFile() {
    if (this.state.allFiles.length === 0) return;

    this.state.allFiles.splice(this.state.currentIndex, 1);
    this.state.customFilename = null;

    if (this.state.currentIndex >= this.state.allFiles.length) {
      this.state.currentIndex = this.state.allFiles.length - 1;
    }
  },

  /**
   * Navigate to specific index
   * @param {number} index - Index to navigate to
   */
  goToIndex(index) {
    if (index < 0 || index >= this.state.allFiles.length) return false;
    
    this.state.currentIndex = index;
    this.state.customFilename = null;
    return true;
  },

  /**
   * Set current index directly
   * @param {number} index - Index to set
   */
  setCurrentIndex(index) {
    if (index < 0 || index >= this.state.allFiles.length) return false;
    
    this.state.currentIndex = index;
    this.state.customFilename = null;
    return true;
  },

  /**
   * Navigate to previous file
   */
  gotoPrevious() {
    this.state.customFilename = null;
    this.state.currentIndex = (this.state.currentIndex - 1 + this.state.allFiles.length) % this.state.allFiles.length;
  },

  /**
   * Navigate to next file
   */
  gotoNext() {
    this.state.customFilename = null;
    this.state.currentIndex = (this.state.currentIndex + 1) % this.state.allFiles.length;
  }
};

window.stateManager = stateManager;
