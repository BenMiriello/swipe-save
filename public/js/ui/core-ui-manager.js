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
    const optionsContainer = document.querySelector('.options-container');
    
    if (optionsContainer) {
      this.elements.optionsContainer = optionsContainer;
      this.elements.optionsButton = optionsContainer.querySelector('.btn-options');
      this.elements.optionsDropdown = optionsContainer.querySelector('.options-dropdown');
    } else {
      console.error('Options container not found - this should not happen with inline options');
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
    const useDatestampFoldersEl = document.getElementById('useDatestampFolders');

    if (sourcePathEl && config.sourceDir) {
      sourcePathEl.textContent = this.shortenPath(config.sourceDir);
      sourcePathEl.title = `Click to browse: ${config.sourceDir}`;
    }

    if (destPathEl && config.destinationDir) {
      destPathEl.textContent = this.shortenPath(config.destinationDir);
      destPathEl.title = `Click to browse: ${config.destinationDir}`;
    }

    if (useDatestampFoldersEl) {
      useDatestampFoldersEl.checked = config.useDatestampFolders !== false;
    }

    const enableLoggingEl = document.getElementById('enableLogging');
    if (enableLoggingEl) {
      enableLoggingEl.checked = config.enableLogging !== false;
    }

    const saveCopiesWhenSortingEl = document.getElementById('saveCopiesWhenSorting');
    if (saveCopiesWhenSortingEl) {
      const savedSetting = localStorage.getItem('saveCopiesWhenSorting');
      saveCopiesWhenSortingEl.checked = savedSetting !== null ? savedSetting === 'true' : true;
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
    if (!this.elements.optionsButton) {
      console.error('Options button not found - initialization failed');
      return;
    }

    this.elements.optionsButton.addEventListener('click', () => {
      this.toggleOptionsDropdown();
    });

    window.addEventListener('click', (event) => {
      // Don't close dropdown if clicking on toggle elements or sort section
      const isToggleClick = event.target.closest('.toggle-option') || 
                           event.target.closest('.sort-options-container') ||
                           event.target.closest('.sort-section-toggle') ||
                           event.target.id === 'useDatestampFolders' ||
                           event.target.id === 'enableLogging' ||
                           event.target.id === 'saveCopiesWhenSorting' ||
                           event.target.id === 'sortField' ||
                           event.target.id === 'sortOrder';
      
      if (!isToggleClick && 
          !this.elements.optionsButton.contains(event.target) && 
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

    const useDatestampFoldersEl = document.getElementById('useDatestampFolders');
    if (useDatestampFoldersEl) {
      useDatestampFoldersEl.addEventListener('change', async (event) => {
        try {
          await window.configApi.updateConfig({ 
            useDatestampFolders: event.target.checked 
          });
        } catch (error) {
          console.error('Failed to update datestamp folders setting:', error);
          // Revert the toggle on error
          event.target.checked = !event.target.checked;
        }
      });
    }

    const enableLoggingEl = document.getElementById('enableLogging');
    if (enableLoggingEl) {
      enableLoggingEl.addEventListener('change', async (event) => {
        try {
          await window.configApi.updateConfig({ 
            enableLogging: event.target.checked 
          });
        } catch (error) {
          console.error('Failed to update logging setting:', error);
          // Revert the toggle on error
          event.target.checked = !event.target.checked;
        }
      });
    }

    const saveCopiesWhenSortingEl = document.getElementById('saveCopiesWhenSorting');
    if (saveCopiesWhenSortingEl) {
      saveCopiesWhenSortingEl.addEventListener('change', (event) => {
        try {
          localStorage.setItem('saveCopiesWhenSorting', event.target.checked);

        } catch (error) {
          console.error('Failed to save copies setting:', error);
          // Revert the toggle on error
          event.target.checked = !event.target.checked;
        }
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

    // Core navigation events handled by EventManager
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
  updateImageCounter(currentIndex, totalFiles, loading = false) {
    if (!this.elements.counterContainer) {
      this.elements.counterContainer = document.querySelector('.counter-container');
      if (!this.elements.counterContainer) return;
    }

    if (loading) {
      this.elements.counterContainer.textContent = ''; // Show nothing while loading
    } else if (totalFiles === 0) {
      this.elements.counterContainer.textContent = 'No images';
    } else {
      const current = currentIndex + 1;
      const total = totalFiles;
      
      // Calculate total character count of both numbers
      const totalChars = current.toString().length + total.toString().length;
      
      // Use compact format (n/nn) if combined numbers > 5 characters, otherwise use verbose format (n of nn)
      const counterText = totalChars > 5 ? `${current}/${total}` : `${current} of ${total}`;
      this.elements.counterContainer.textContent = counterText;
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
   * Setup pinch zoom for images (disabled - was causing display cropping)
   */
  setupPinchZoom() {
    // Disabled: PinchZoom library not properly loaded and container was causing
    // media content to be cropped due to overflow: hidden constraint
    return;
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
