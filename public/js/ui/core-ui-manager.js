/**
 * Core UI manager that coordinates all UI modules
 */
const coreUIManager = {
  elements: {
    mediaList: null,
    counterContainer: null,
    optionsButton: null,
    optionsDropdown: null,
    optionsContainer: null
  },

  /**
   * Initialize UI elements
   */
  initializeUI() {
    window.elementFactory.createInitialElements();

    this.elements.mediaList = document.getElementById('mediaList');
    this.elements.counterContainer = document.querySelector('.counter-container');

    window.modalManager.createInfoModal();
    window.modalManager.createDirectoryBrowser();

    this.initializeOptionsMenu();
    this.loadCurrentConfig();
  },

  /**
   * Initialize options menu
   */
  initializeOptionsMenu() {
    const headerContainer = document.querySelector('.header-container');
    const existingOptionsContainer = document.querySelector('.options-container');

    if (existingOptionsContainer) {
      this.elements.optionsContainer = existingOptionsContainer;
      this.elements.optionsButton = existingOptionsContainer.querySelector('.btn-options');
      this.elements.optionsDropdown = existingOptionsContainer.querySelector('.options-dropdown');
    } else {
      const optionsContainer = document.createElement('div');
      optionsContainer.className = 'options-container';

      const optionsButton = document.createElement('button');
      optionsButton.className = 'btn btn-options';
      optionsButton.textContent = 'Options';

      const optionsDropdown = document.createElement('div');
      optionsDropdown.className = 'options-dropdown';
      optionsDropdown.innerHTML = `
        <ul>
          <li class="directory-row">
            <div class="dir-info">
              <span class="dir-label">From:</span>
              <span class="dir-path-clickable" id="sourcePathClickable" title="Click to browse">Loading...</span>
            </div>
          </li>
          <li class="directory-row">
            <div class="dir-info">
              <span class="dir-label">To:</span>
              <span class="dir-path-clickable" id="destPathClickable" title="Click to browse">Loading...</span>
            </div>
          </li>
          <li class="separator"></li>
          <li id="customName">Custom Name</li>
          <li id="showInfo">Show Instructions</li>
        </ul>
      `;

      optionsContainer.appendChild(optionsButton);
      optionsContainer.appendChild(optionsDropdown);

      headerContainer.insertBefore(optionsContainer, headerContainer.firstChild);

      this.elements.optionsContainer = optionsContainer;
      this.elements.optionsButton = optionsButton;
      this.elements.optionsDropdown = optionsDropdown;
    }
  },

  /**
   * Load and display current configuration
   */
  async loadCurrentConfig() {
    try {
      const config = await window.apiService.getConfig();
      this.updateConfigDisplay(config);
    } catch (error) {
      console.error('Error loading config:', error);
    }
  },

  /**
   * Update config display in options dropdown
   */
  updateConfigDisplay(config) {
    const sourcePathEl = document.getElementById('sourcePathClickable');
    const destPathEl = document.getElementById('destPathClickable');

    if (sourcePathEl && config.sourceDir) {
      sourcePathEl.textContent = this.shortenPath(config.sourceDir);
      sourcePathEl.title = `Click to browse: ${config.sourceDir}`;
    }

    if (destPathEl && config.destinationDir) {
      destPathEl.textContent = this.shortenPath(config.destinationDir);
      destPathEl.title = `Click to browse: ${config.destinationDir}`;
    }
  },

  /**
   * Shorten path for display
   */
  shortenPath(path) {
    if (path.length <= 40) return path;
    const parts = path.split('/');
    return '.../' + parts.slice(-2).join('/');
  },

  /**
   * Set up event handlers for UI elements
   * @param {Object} handlers - Object containing handler functions
   */
  setupEventHandlers(handlers) {
    if (!this.elements.optionsButton) return;

    this.elements.optionsButton.addEventListener('click', () => {
      this.toggleOptionsDropdown();
    });

    window.addEventListener('click', (event) => {
      if (!this.elements.optionsButton.contains(event.target) && 
          !this.elements.optionsDropdown.contains(event.target)) {
        this.elements.optionsDropdown.classList.remove('show');
      }
    });

    const customNameEl = document.getElementById('customName');
    if (customNameEl) {
      customNameEl.addEventListener('click', () => {
        handlers.openFilenameModal();
        this.elements.optionsDropdown.classList.remove('show');
      });
    }

    const sourcePathEl = document.getElementById('sourcePathClickable');
    if (sourcePathEl) {
      sourcePathEl.addEventListener('click', () => {
        window.directoryBrowser.openDirectoryBrowser('source');
        this.elements.optionsDropdown.classList.remove('show');
      });
    }

    const destPathEl = document.getElementById('destPathClickable');
    if (destPathEl) {
      destPathEl.addEventListener('click', () => {
        window.directoryBrowser.openDirectoryBrowser('destination');
        this.elements.optionsDropdown.classList.remove('show');
      });
    }

    const showInfoEl = document.getElementById('showInfo');
    if (showInfoEl) {
      showInfoEl.addEventListener('click', () => {
        window.modalManager.elements.infoModal.style.display = "block";
        this.elements.optionsDropdown.classList.remove('show');
      });
    }

    const closeModal = document.querySelector('.close-modal');
    if (closeModal) {
      closeModal.addEventListener('click', () => {
        document.getElementById('filenameModal').style.display = "none";
      });
    }

    window.addEventListener('click', (event) => {
      const modal = document.getElementById('filenameModal');
      const comfyuiModal = document.getElementById('comfyuiModal');
      if (event.target === modal) {
        modal.style.display = "none";
      }
      if (event.target === comfyuiModal) {
        comfyuiModal.style.display = "none";
      }
    });

    const comfyuiModal = document.getElementById('comfyuiModal');
    if (comfyuiModal) {
      const comfyuiCloseButtons = comfyuiModal.querySelectorAll('.close-modal');
      comfyuiCloseButtons.forEach(button => {
        button.addEventListener('click', () => {
          comfyuiModal.style.display = "none";
        });
      });
    }

    const saveFilenameBtn = document.getElementById('saveFilename');
    if (saveFilenameBtn) {
      saveFilenameBtn.addEventListener('click', () => {
        const customFilename = document.getElementById('customFilename').value.trim();
        document.getElementById('filenameModal').style.display = "none";
        handlers.saveCustomFilename(customFilename);
      });
    }

    const counterContainer = document.querySelector('.counter-container');
    if (counterContainer) {
      counterContainer.addEventListener('click', () => {
        window.modalManager.openNumberDial();
      });
    }

    const prevButton = document.querySelector('.controls .btn-secondary:first-child');
    if (prevButton) {
      prevButton.addEventListener('click', handlers.showPrevious);
    }

    const nextButton = document.querySelector('.controls .btn-secondary:last-child');
    if (nextButton) {
      nextButton.addEventListener('click', handlers.showNext);
    }

    const undoButton = document.querySelector('.btn-undo');
    if (undoButton) {
      undoButton.addEventListener('click', handlers.undoLastAction);
    }

    const comfyuiIcon = document.querySelector('.comfyui-icon');
    if (comfyuiIcon) {
      comfyuiIcon.addEventListener('click', handlers.openComfyUIModal);
    }

    const saveIcon = document.querySelector('.save-icon');
    if (saveIcon) {
      saveIcon.addEventListener('click', handlers.downloadCurrentFile);
    }
  },

  /**
   * Toggle options dropdown visibility
   */
  toggleOptionsDropdown() {
    if (this.elements.optionsDropdown) {
      this.elements.optionsDropdown.classList.toggle('show');
    }
  },

  /**
   * Update image counter display
   * @param {number} currentIndex - Current image index
   * @param {number} totalFiles - Total number of files
   */
  updateImageCounter(currentIndex, totalFiles) {
    if (!this.elements.counterContainer) {
      this.elements.counterContainer = document.querySelector('.counter-container');
      if (!this.elements.counterContainer) return;
    }

    if (totalFiles === 0) {
      this.elements.counterContainer.textContent = 'No images';
    } else {
      this.elements.counterContainer.textContent = `${currentIndex + 1} of ${totalFiles}`;
    }
  },

  /**
   * Show loading indicator
   */
  showLoading() {
    if (this.elements.mediaList) {
      this.elements.mediaList.innerHTML = '<div style="text-align:center;">Loading...</div>';
    }
  },

  /**
   * Show error message
   * @param {string} message - Error message
   */
  showError(message) {
    if (this.elements.mediaList) {
      this.elements.mediaList.innerHTML = `<div style="color:red;text-align:center;">
        Error: ${message}
      </div>`;
    }
  },

  /**
   * Show empty state when no files are available
   */
  showEmptyState() {
    if (this.elements.mediaList) {
      this.elements.mediaList.innerHTML = '<div class="no-media">No media files found</div>';
    }
  },

  /**
   * Setup pinch zoom for images
   */
  setupPinchZoom() {
    const mediaContent = document.querySelector('.media-content');
    if (!mediaContent || mediaContent.tagName !== 'IMG') return;

    if (typeof window.PinchZoom === 'undefined') {
      console.log('PinchZoom library not available');
      return;
    }

    try {
      const container = mediaContent.parentElement;

      const wrapper = document.createElement('div');
      wrapper.className = 'pinch-zoom-container';

      container.insertBefore(wrapper, mediaContent);
      wrapper.appendChild(mediaContent);

      new window.PinchZoom(wrapper, {
        draggable: true,
        maxZoom: 5
      });
    } catch (error) {
      console.error('Error initializing PinchZoom:', error);
    }
  },

  /**
   * Add visual feedback for a swipe action
   * @param {HTMLElement} mediaItem - Media item element
   * @param {string} action - Action being performed
   */
  showActionFeedback(mediaItem, action) {
    if (!mediaItem) return;

    mediaItem.classList.add(`swipe-${action}`);

    const instruction = mediaItem.querySelector('.swipe-instruction');
    if (instruction) {
      switch(action) {
        case 'archive': 
        case 'left': instruction.textContent = 'Archived'; break;
        case 'archive_good': instruction.textContent = 'Archived - Good'; break;
        case 'archive_bad': instruction.textContent = 'Archived - Bad'; break;
        case 'saved':
        case 'right': instruction.textContent = 'Saved'; break;
        case 'saved_wip': instruction.textContent = 'Saved - WIP'; break;
        case 'best_complete': 
        case 'up': instruction.textContent = 'Super Save - Complete'; break;
        case 'best_wip': instruction.textContent = 'Super Save - WIP'; break;
        case 'delete':
        case 'down': instruction.textContent = 'Deleted'; break;
      }
      instruction.style.opacity = 1;
    }
  },

  /**
   * Hide action feedback (for error cases)
   * @param {HTMLElement} mediaItem - Media item element
   * @param {string} action - Action to remove feedback for
   */
  hideActionFeedback(mediaItem, action) {
    if (!mediaItem) return;

    mediaItem.classList.remove(`swipe-${action}`);

    const instruction = mediaItem.querySelector('.swipe-instruction');
    if (instruction) {
      instruction.style.opacity = 0;
    }
  }
};

window.coreUIManager = coreUIManager;
