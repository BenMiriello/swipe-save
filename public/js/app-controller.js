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
      isLoading: false
    };
    
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
      openComfyUIModal: this.openComfyUIModal.bind(this)
    });
    
    // Setup additional UI elements
    this.setupUIControls();
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
   * Setup additional UI controls (buttons, etc.)
   */
  setupUIControls() {
    // Set up header buttons if they exist
    const refreshIcon = document.querySelector('.refresh-icon');
    if (refreshIcon) {
      refreshIcon.addEventListener('click', this.fetchMediaFiles.bind(this));
    }
    
    const saveIcon = document.querySelector('.save-icon');
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
   * Fetch media files from server
   */
  async fetchMediaFiles() {
    try {
      this.state.isLoading = true;
      window.uiManager.showLoading();
      
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
    if (this.state.allFiles.length === 0) return;
    
    window.uiManager.showComfyUIModal();
    window.uiManager.initializeComfyUIDestinations();
    
    // Setup modal button handlers
    this.setupComfyUIModalHandlers();
  }
  
  /**
   * Setup ComfyUI modal button handlers
   */
  setupComfyUIModalHandlers() {
    const queueRun = document.getElementById('queueRun');
    const loadRun = document.getElementById('loadRun');
    
    if (queueRun) {
      queueRun.onclick = () => this.handleRunAction('queue');
    }
    
    if (loadRun) {
      loadRun.onclick = () => this.handleRunAction('load');
    }
    
    // Make New Seed text clickable
    const newSeedText = document.querySelector('.toggle-text');
    const newSeedToggle = document.getElementById('newSeedToggle');
    if (newSeedText && newSeedToggle) {
      newSeedText.onclick = () => {
        newSeedToggle.checked = !newSeedToggle.checked;
      };
    }
    
    // Setup number pickers
    this.setupNumberPickers();
  }
  
  /**
   * Handle run action (queue or load)
   */
  async handleRunAction(type) {
    const button = document.getElementById(type + 'Run');
    const countInput = document.getElementById(type + 'Count');
    const newSeedToggle = document.getElementById('newSeedToggle');
    
    const count = parseInt(countInput.value) || 1;
    const useNewSeed = type === 'queue' ? newSeedToggle.checked : false;
    const destination = window.uiManager.getSelectedDestination();
    
    console.log('Queue Debug - Selected destination:', destination);
    console.log('Queue Debug - Count:', count, 'UseNewSeed:', useNewSeed);
    
    // Set button to waiting state
    this.setButtonState(button, 'waiting', 'Waiting');
    
    try {
      if (type === 'queue') {
        for (let i = 0; i < count; i++) {
          await window.apiService.queueInComfyUI(
            this.state.allFiles[this.state.currentIndex], 
            useNewSeed,
            destination
          );
        }
      } else {
        for (let i = 0; i < count; i++) {
          await window.apiService.loadInComfyUI(
            this.state.allFiles[this.state.currentIndex], 
            false,
            destination
          );
        }
      }
      
      // Success state
      this.setButtonState(button, 'success', 'Success!');
      
    } catch (error) {
      console.error(`Error in ${type} action:`, error);
      this.setButtonState(button, 'error', 'Error occurred', error.message || 'Unknown error occurred');
    }
  }
  
  /**
   * Set button state with animations
   */
  setButtonState(button, state, text, errorMessage = null) {
    const runButtons = button.parentElement;
    const errorDiv = document.getElementById('comfyuiError');
    
    if (state === 'waiting') {
      button.textContent = text;
      button.className = 'run-btn waiting';
      if (errorDiv) errorDiv.style.display = 'none';
      
    } else if (state === 'success') {
      button.textContent = text;
      button.className = 'run-btn success';
      if (errorDiv) errorDiv.style.display = 'none';
      
      setTimeout(() => {
        button.textContent = button.id === 'queueRun' ? 'Queue:' : 'Load:';
        button.classList.add('shrinking');
        
        const openBtn = document.createElement('button');
        openBtn.className = 'open-btn';
        openBtn.textContent = '→';
        openBtn.onclick = () => {
          const destination = window.uiManager.getSelectedDestination();
          window.apiService.openComfyUITab(destination);
        };
        
        runButtons.appendChild(openBtn);
        
        setTimeout(() => {
          button.style.transform = 'scaleX(0.6)';
          openBtn.classList.add('show');
        }, 50);
        
        setTimeout(() => {
          button.style.transform = '';
          button.textContent = 'Run >';
          button.className = 'run-btn';
          button.classList.remove('shrinking');
          if (openBtn.parentElement) {
            openBtn.remove();
          }
        }, 3000);
        
      }, 1000);
      
    } else if (state === 'error') {
      button.textContent = text;
      button.className = 'run-btn error';
      
      if (errorDiv && errorMessage) {
        errorDiv.textContent = errorMessage;
        errorDiv.style.display = 'block';
      }
      
      setTimeout(() => {
        button.textContent = 'Run >';
        button.className = 'run-btn';
      }, 1500);
    }
  }
  
  /**
   * Setup number picker controls
   */
  setupNumberPickers() {
    const pickers = document.querySelectorAll('.number-picker');
    
    pickers.forEach(picker => {
      const input = picker.querySelector('input[type="number"]');
      const decrementBtn = picker.querySelector('[data-action="decrement"]');
      const incrementBtn = picker.querySelector('[data-action="increment"]');
      
      let holdInterval = null;
      let holdTimeout = null;
      
      // Handle input validation - cap at 99 and replace empty with 1
      input.addEventListener('input', () => {
        let value = parseInt(input.value);
        if (isNaN(value) || value < 1) {
          input.value = 1;
        } else if (value > 99) {
          input.value = 99;
        }
      });
      
      input.addEventListener('blur', () => {
        if (!input.value || input.value === '') {
          input.value = 1;
        }
      });
      
      const increment = () => {
        const current = parseInt(input.value) || 1;
        const max = 99;
        input.value = Math.min(current + 1, max);
      };
      
      const decrement = () => {
        const current = parseInt(input.value) || 1;
        const min = 1;
        input.value = Math.max(current - 1, min);
      };
      
      const startHold = (action) => {
        holdTimeout = setTimeout(() => {
          holdInterval = setInterval(action, 100);
        }, 500);
      };
      
      const stopHold = () => {
        if (holdTimeout) clearTimeout(holdTimeout);
        if (holdInterval) clearInterval(holdInterval);
        holdTimeout = null;
        holdInterval = null;
      };
      
      // Increment button
      incrementBtn.onclick = increment;
      incrementBtn.onmousedown = () => startHold(increment);
      incrementBtn.onmouseup = stopHold;
      incrementBtn.onmouseleave = stopHold;
      incrementBtn.ontouchstart = () => startHold(increment);
      incrementBtn.ontouchend = stopHold;
      
      // Decrement button
      decrementBtn.onclick = decrement;
      decrementBtn.onmousedown = () => startHold(decrement);
      decrementBtn.onmouseup = stopHold;
      decrementBtn.onmouseleave = stopHold;
      decrementBtn.ontouchstart = () => startHold(decrement);
      decrementBtn.ontouchend = stopHold;
    });
  }
  
  /**
   * Load current image workflow in ComfyUI
   * @param {boolean} modifySeeds - Whether to modify seed values
   */
  async loadInComfyUI(modifySeeds) {
    if (this.state.allFiles.length === 0) return;
    
    const currentFile = this.state.allFiles[this.state.currentIndex];
    const destination = window.uiManager.getSelectedDestination();
    
    window.uiManager.hideComfyUIModal();
    
    try {
      await window.apiService.loadInComfyUI(currentFile, modifySeeds, destination);
    } catch (error) {
      alert('Failed to load workflow in ComfyUI: ' + error.message);
    }
  }
  
  /**
   * Queue current image workflow in ComfyUI
   * @param {boolean} modifySeeds - Whether to modify seed values
   */
  async queueInComfyUI(modifySeeds) {
    if (this.state.allFiles.length === 0) return;
    
    const currentFile = this.state.allFiles[this.state.currentIndex];
    const destination = window.uiManager.getSelectedDestination();
    
    try {
      await window.apiService.queueInComfyUI(currentFile, modifySeeds, destination);
      // Success handled by button state management - no popup
    } catch (error) {
      throw error; // Let calling function handle the error
    }
  }
}

// Export as a global variable
window.AppController = AppController;