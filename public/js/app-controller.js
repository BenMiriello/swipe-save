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

    // Setup additional UI controls
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
   * Get current state (for backward compatibility)
   */
  get state() {
    return window.stateManager.getState();
  }

  /**
   * Setup additional UI controls (buttons, etc.)
   */
  setupUIControls() {
    const reloadIcon = document.querySelector('.reload-icon');
    if (reloadIcon) {
      reloadIcon.addEventListener('click', this.fetchMediaFiles.bind(this));
    }

    const refreshIcon = document.querySelector('.refresh-icon');
    if (refreshIcon) {
      refreshIcon.addEventListener('click', this.fetchMediaFiles.bind(this));
    }

    const saveIcon = document.querySelector('.save-icon');
    if (saveIcon) {
      saveIcon.addEventListener('click', this.downloadCurrentFile.bind(this));
    }

    const prevButton = document.querySelector('.btn-secondary:first-child');
    if (prevButton) {
      prevButton.addEventListener('click', this.showPreviousImage.bind(this));
    }

    const nextButton = document.querySelector('.btn-secondary:last-child');
    if (nextButton) {
      nextButton.addEventListener('click', this.showNextImage.bind(this));
    }

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

    window.uiManager.showComfyUIModal();
    window.uiManager.initializeComfyUIDestinations();

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

    const newSeedText = document.querySelector('.toggle-text');
    const newSeedToggle = document.getElementById('newSeedToggle');
    if (newSeedText && newSeedToggle) {
      newSeedText.onclick = () => {
        newSeedToggle.checked = !newSeedToggle.checked;
      };
    }

    this.setupNumberPickers();
  }

  /**
   * Handle run action (queue or load)
   */
  async handleRunAction(type) {
    const button = document.getElementById(type + 'Run');
    const countInput = document.getElementById(type + 'Count');
    const newSeedToggle = document.getElementById('newSeedToggle');
    const controlAfterGenerate = document.getElementById('controlAfterGenerate');

    const count = parseInt(countInput.value) || 1;
    const useNewSeed = type === 'queue' ? newSeedToggle.checked : false;
    const controlMode = controlAfterGenerate ? controlAfterGenerate.value : 'increment';
    const destination = window.uiManager.getSelectedDestination();

    this.setButtonState(button, 'waiting', 'Waiting');

    try {
      if (type === 'queue') {
        for (let i = 0; i < count; i++) {
          await window.apiService.queueInComfyUI(
            this.state.allFiles[this.state.currentIndex], 
            useNewSeed,
            controlMode,
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

      this.setButtonState(button, 'success', 'Success!');
      this.addResultLog(count, useNewSeed, controlMode, false);

    } catch (error) {
      console.error(`Error in ${type} action:`, error);
      this.setButtonState(button, 'error', 'Error occurred', error.message || 'Unknown error occurred');
      this.addResultLog(count, useNewSeed, controlMode, true, error.message);
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
        button.textContent = 'Queue >';
        button.className = 'run-btn';
      }, 2000);
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

      input.addEventListener('input', () => {
        let value = parseInt(input.value);
        if (!isNaN(value) && value > 99) {
          input.value = 99;
        }
      });

      input.addEventListener('blur', () => {
        let value = parseInt(input.value);
        if (isNaN(value) || value < 1 || !input.value || input.value === '') {
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

      incrementBtn.onclick = increment;
      incrementBtn.onmousedown = () => startHold(increment);
      incrementBtn.onmouseup = stopHold;
      incrementBtn.onmouseleave = stopHold;
      incrementBtn.ontouchstart = () => startHold(increment);
      incrementBtn.ontouchend = stopHold;

      decrementBtn.onclick = decrement;
      decrementBtn.onmousedown = () => startHold(decrement);
      decrementBtn.onmouseup = stopHold;
      decrementBtn.onmouseleave = stopHold;
      decrementBtn.ontouchstart = () => startHold(decrement);
      decrementBtn.ontouchend = stopHold;
    });
  }

  /**
   * Add result to the log
   */
  addResultLog(count, useNewSeed, controlMode = 'increment', isError, errorMessage = null) {
    const resultsContainer = document.getElementById('comfyuiResults');
    if (!resultsContainer) return;

    const resultItem = document.createElement('div');
    resultItem.className = 'result-item';
    
    if (isError) {
      resultItem.classList.add('error');
      const timeCount = count === 1 ? 'time' : 'times';
      const seedText = useNewSeed ? 'new seed' : 'original seed';
      resultItem.textContent = `An error occurred queueing workflow to run ${count} ${timeCount} with ${seedText} and ${controlMode} control`;
    } else {
      const timeCount = count === 1 ? 'time' : 'times';
      const seedText = useNewSeed ? 'new seeds' : 'original seed';
      resultItem.textContent = `Queued workflow to run ${count} ${timeCount} with ${seedText} and ${controlMode} control`;
    }

    resultsContainer.insertBefore(resultItem, resultsContainer.firstChild);
  }
}

// Export as a global variable
window.AppController = AppController;
