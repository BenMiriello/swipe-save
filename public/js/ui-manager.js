/**
 * Manages UI components and DOM interactions
 */
const uiManager = {
  elements: {
    mediaList: null,
    modal: null,
    infoModal: null,
    filenameInput: null,
    optionsButton: null,
    optionsDropdown: null,
    counterContainer: null,
    controls: null
  },
  
  /**
   * Initialize UI elements
   */
  initializeUI() {
    // Create needed DOM elements if they don't exist
    this.createInitialElements();
    
    // Get references to DOM elements
    this.elements.mediaList = document.getElementById('mediaList');
    this.elements.modal = document.getElementById('filenameModal');
    this.elements.filenameInput = document.getElementById('customFilename');
    this.elements.counterContainer = document.querySelector('.counter-container');
    
    // Create the info modal if not already present
    this.createInfoModal();
    
    // Initialize options menu
    this.initializeOptionsMenu();
  },
  
  /**
   * Create initial elements needed by the application
   */
  createInitialElements() {
    // Add bottom controls container if it doesn't exist
    if (!document.querySelector('.bottom-controls')) {
      const bottomControls = document.createElement('div');
      bottomControls.className = 'bottom-controls';
      
      // Add counter to the left
      const counterContainer = document.createElement('div');
      counterContainer.className = 'counter-container';
      counterContainer.textContent = 'No images';
      
      // Add controls in the center
      const controls = document.createElement('div');
      controls.className = 'controls';
      
      // Add navigation buttons
      const prevButton = document.createElement('button');
      prevButton.className = 'btn btn-secondary';
      prevButton.textContent = 'Previous';
      
      const nextButton = document.createElement('button');
      nextButton.className = 'btn btn-secondary';
      nextButton.textContent = 'Next';
      
      // Add undo button
      const undoButton = document.createElement('button');
      undoButton.className = 'btn btn-undo';
      undoButton.textContent = 'Undo';
      
      controls.appendChild(prevButton);
      controls.appendChild(undoButton);
      controls.appendChild(nextButton);
      
      // Add bottom controls to container
      bottomControls.appendChild(counterContainer);
      bottomControls.appendChild(controls);
      
      const container = document.querySelector('.container');
      container.appendChild(bottomControls);
    }
  },
  
  /**
   * Create info modal with instructions
   */
  createInfoModal() {
    // Check if the modal already exists
    if (document.getElementById('infoModal')) {
      this.elements.infoModal = document.getElementById('infoModal');
      return;
    }
    
    const infoModal = document.createElement('div');
    infoModal.id = 'infoModal';
    infoModal.className = 'modal';
    infoModal.innerHTML = `
      <div class="modal-content">
        <span class="close-modal" id="closeInfoModal">&times;</span>
        <h2>Instructions</h2>
        <div class="instructions-content">
          ${window.appConfig.instructionsContent}
        </div>
      </div>
    `;
    document.body.appendChild(infoModal);
    this.elements.infoModal = infoModal;
    
    // Close info modal when clicking X
    document.getElementById('closeInfoModal').addEventListener('click', () => {
      this.elements.infoModal.style.display = "none";
    });
    
    // Close info modal when clicking outside
    window.addEventListener('click', (event) => {
      if (event.target === this.elements.infoModal) {
        this.elements.infoModal.style.display = "none";
      }
    });
  },
  
  /**
   * Initialize options menu
   */
  initializeOptionsMenu() {
    // Create options container if not present
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
          <li id="customName">Custom Name</li>
          <li id="showInfo">Show Instructions</li>
        </ul>
      `;
      
      optionsContainer.appendChild(optionsButton);
      optionsContainer.appendChild(optionsDropdown);
      
      // Insert at the beginning of header
      headerContainer.insertBefore(optionsContainer, headerContainer.firstChild);
      
      this.elements.optionsContainer = optionsContainer;
      this.elements.optionsButton = optionsButton;
      this.elements.optionsDropdown = optionsDropdown;
    }
  },
  
  /**
   * Set up event handlers for UI elements
   * @param {Object} handlers - Object containing handler functions
   */
  setupEventHandlers(handlers) {
    // Ensure elements exist before attaching handlers
    if (!this.elements.optionsButton) return;
    
    // Options button toggle
    this.elements.optionsButton.addEventListener('click', () => {
      this.toggleOptionsDropdown();
    });
    
    // Close dropdown when clicking outside
    window.addEventListener('click', (event) => {
      if (!this.elements.optionsButton.contains(event.target) && 
          !this.elements.optionsDropdown.contains(event.target)) {
        this.elements.optionsDropdown.classList.remove('show');
      }
    });
    
    // Custom name option
    const customNameEl = document.getElementById('customName');
    if (customNameEl) {
      customNameEl.addEventListener('click', () => {
        handlers.openFilenameModal();
        this.elements.optionsDropdown.classList.remove('show');
      });
    }
    
    // Show info option
    const showInfoEl = document.getElementById('showInfo');
    if (showInfoEl) {
      showInfoEl.addEventListener('click', () => {
        this.elements.infoModal.style.display = "block";
        this.elements.optionsDropdown.classList.remove('show');
      });
    }
    
    // Modal close button
    const closeModal = document.querySelector('.close-modal');
    if (closeModal) {
      closeModal.addEventListener('click', () => {
        this.elements.modal.style.display = "none";
      });
    }
    
    // Click outside modal to close
    window.addEventListener('click', (event) => {
      if (event.target === this.elements.modal) {
        this.elements.modal.style.display = "none";
      }
    });
    
    // Save filename button
    const saveFilenameBtn = document.getElementById('saveFilename');
    if (saveFilenameBtn) {
      saveFilenameBtn.addEventListener('click', () => {
        const customFilename = this.elements.filenameInput.value.trim();
        this.elements.modal.style.display = "none";
        handlers.saveCustomFilename(customFilename);
      });
    }
    
    // Navigation buttons
    const prevButton = document.querySelector('.btn-secondary:first-child');
    if (prevButton) {
      prevButton.addEventListener('click', handlers.showPrevious);
    }
    
    const nextButton = document.querySelector('.btn-secondary:last-of-type');
    if (nextButton) {
      nextButton.addEventListener('click', handlers.showNext);
    }
    
    // Undo button
    const undoButton = document.querySelector('.btn-undo');
    if (undoButton) {
      undoButton.addEventListener('click', handlers.undoLastAction);
    }
    
    // Header buttons
    const refreshIcon = document.querySelector('.refresh-icon');
    if (refreshIcon) {
      refreshIcon.addEventListener('click', handlers.refreshFiles);
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
   * Show filename modal for renaming
   * @param {string} currentFilename - Current filename
   * @param {string} customFilename - Custom filename if available
   */
  showFilenameModal(currentFilename, customFilename) {
    if (!this.elements.filenameInput || !this.elements.modal) return;
    
    this.elements.filenameInput.value = customFilename || currentFilename;
    this.elements.modal.style.display = "block";
    
    // Focus and select the input text
    setTimeout(() => {
      this.elements.filenameInput.focus();
      this.elements.filenameInput.select();
    }, 50);
  },
  
  /**
   * Update image counter display
   * @param {number} currentIndex - Current image index
   * @param {number} totalFiles - Total number of files
   */
  updateImageCounter(currentIndex, totalFiles) {
    if (!this.elements.counterContainer) {
      // Try to find it again
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
   * Create a media item element for display
   * @param {Object} file - Media file object
   * @param {string} customFilename - Optional custom filename
   * @param {string} apiUrl - Base API URL
   * @returns {HTMLElement} - Media item DOM element
   */
  createMediaItem(file, customFilename, apiUrl) {
    const item = document.createElement('div');
    item.className = 'media-item';
    item.dataset.filename = file.name;
    
    // Create content based on file type
    let mediaContent;
    
    if (/\.(png)$/i.test(file.name)) {
      mediaContent = this.createImageElement(file, apiUrl);
    } else if (/\.(mp4|webm)$/i.test(file.name)) {
      mediaContent = this.createVideoElement(file, apiUrl);
    }
    
    // Add filename path container with semi-transparent background
    const filenameContainer = document.createElement('div');
    filenameContainer.className = 'filename-container overlay';
    
    // Extract path and actual filesystem path instead of browser URL
    // Get the original path from file (which should be the filesystem path)
    // This assumes 'file' contains the original path somewhere, either in name or as a property
    const fsPath = file.originalPath || file.name; // Using file.name as fallback
    
    // Create path + bold filename
    const filenamePath = document.createElement('div');
    filenamePath.className = 'filename-path';
    filenamePath.innerHTML = `<strong>${customFilename || file.name}</strong>`;
    filenameContainer.appendChild(filenamePath);
    
    // Create 9-zone grid for taps
    const tapZones = document.createElement('div');
    tapZones.className = 'tap-zones';
    
    // Create zones according to config
    window.appConfig.zoneConfig.forEach(zone => {
      const zoneElement = document.createElement('div');
      zoneElement.className = `tap-zone ${zone.className}`;
      if (zone.action) {
        zoneElement.dataset.action = zone.action;
      }
      tapZones.appendChild(zoneElement);
    });
    
    // Create swipe instruction element
    const swipeInstruction = document.createElement('div');
    swipeInstruction.className = 'swipe-instruction';
    
    // Assemble the media item
    item.appendChild(mediaContent);
    item.appendChild(filenameContainer);
    item.appendChild(tapZones);
    item.appendChild(swipeInstruction);
    
    return item;
  },
  
  /**
   * Create image element
   * @param {Object} file - File object
   * @param {string} apiUrl - Base API URL
   * @returns {HTMLElement} - Image element
   */
  createImageElement(file, apiUrl) {
    const img = document.createElement('img');
    img.src = `${apiUrl}${file.path}`;
    img.alt = file.name;
    img.className = 'media-content';
    
    // Check orientation after loading
    img.onload = function() {
      const parentItem = this.closest('.media-item');
      if (parentItem) {
        if (this.naturalHeight > this.naturalWidth) {
          parentItem.classList.add('portrait');
        } else {
          parentItem.classList.add('landscape');
        }
      }
    };
    
    return img;
  },
  
  /**
   * Create video element with improved playback
   * @param {Object} file - File object
   * @param {string} apiUrl - Base API URL
   * @returns {HTMLElement} - Video element
   */
  createVideoElement(file, apiUrl) {
    const video = document.createElement('video');
    video.src = `${apiUrl}${file.path}`;
    video.controls = true;
    video.autoplay = false;
    video.muted = false;
    video.loop = false;
    video.playsInline = true;
    video.preload = 'auto'; // Changed from 'metadata' to 'auto' for better initial loading
    video.className = 'media-content';
    
    // Improved video playback
    video.addEventListener('loadedmetadata', function() {
      // Try to autoplay once metadata is loaded
      this.play().catch(e => console.log('Auto-play prevented:', e));
    });
    
    // Handle click to play/pause (but don't interfere with controls)
    video.addEventListener('click', function(e) {
      // Only toggle play/pause if the user didn't click on the control area
      const rect = this.getBoundingClientRect();
      const y = e.clientY - rect.top;
      
      // Avoid conflicting with the video controls at the bottom
      if (y < rect.height - 40) { 
        if (this.paused) {
          this.play();
        } else {
          this.pause();
        }
      }
    });
    
    return video;
  },
  
  /**
   * Setup pinch zoom for images
   */
  setupPinchZoom() {
    const mediaContent = document.querySelector('.media-content');
    if (!mediaContent || mediaContent.tagName !== 'IMG') return;
    
    // Check if PinchZoom is available
    if (typeof window.PinchZoom === 'undefined') {
      console.log('PinchZoom library not available');
      return;
    }
    
    try {
      const container = mediaContent.parentElement;
      
      // Create a wrapper for pinch zoom
      const wrapper = document.createElement('div');
      wrapper.className = 'pinch-zoom-container';
      
      // Move the image into the wrapper
      container.insertBefore(wrapper, mediaContent);
      wrapper.appendChild(mediaContent);
      
      // Initialize pinch zoom
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
    
    // Add swipe class for transition effect
    mediaItem.classList.add(`swipe-${action}`);
    
    // Show instruction text
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
  },
  
  /**
   * Shows an action label when a tap zone is clicked
   * @param {string} actionName - Name of the action
   * @param {DOMRect} rect - Rectangle position of the tap zone
   */
  showActionLabel(actionName, rect) {
    const actionLabel = document.createElement('div');
    actionLabel.className = 'action-label';
    
    switch(actionName) {
      case 'archive': actionLabel.textContent = 'Archived'; break;
      case 'archive_good': actionLabel.textContent = 'Archived - Good'; break;
      case 'archive_bad': actionLabel.textContent = 'Archived - Bad'; break;
      case 'saved': actionLabel.textContent = 'Saved'; break;
      case 'saved_wip': actionLabel.textContent = 'Saved - WIP'; break;
      case 'best_complete': actionLabel.textContent = 'Super Save - Complete'; break;
      case 'best_wip': actionLabel.textContent = 'Super Save - WIP'; break;
      case 'delete': actionLabel.textContent = 'Deleted'; break;
      case 'open_file': actionLabel.textContent = 'Opening File'; break;
    }
    
    document.body.appendChild(actionLabel);
    
    // Position the label
    actionLabel.style.top = rect.top + rect.height / 2 + 'px';
    actionLabel.style.left = rect.left + rect.width / 2 + 'px';
    
    // Animate and remove after 1 second
    setTimeout(() => {
      actionLabel.classList.add('fade-out');
      setTimeout(() => {
        if (actionLabel.parentNode) {
          actionLabel.parentNode.removeChild(actionLabel);
        }
      }, 300);
    }, 1000);
  }
};

// Export as a global variable
window.uiManager = uiManager;