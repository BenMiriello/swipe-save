/**
 * Manages UI components and DOM interactions
 */
const uiManager = {
  elements: {
    mediaList: null,
    filenameModal: null,
    pathModal: null,
    infoModal: null,
    filenameInput: null,
    pathInput: null,
    counterContainer: null,
    controls: null,
    fileHeader: null,
    pathOverlay: null
  },
  
  /**
   * Initialize UI elements
   */
  initializeUI() {
    // Create needed DOM elements if they don't exist
    this.createInitialElements();
    
    // Get references to DOM elements
    this.elements.mediaList = document.getElementById('mediaList');
    this.elements.filenameModal = document.getElementById('filenameModal');
    this.elements.pathModal = document.getElementById('pathModal');
    this.elements.infoModal = document.getElementById('infoModal');
    this.elements.filenameInput = document.getElementById('customFilename');
    this.elements.pathInput = document.getElementById('pathInput');
    this.elements.counterContainer = document.querySelector('.counter-container');
    this.elements.fileHeader = document.querySelector('.file-header');
    this.elements.pathOverlay = document.querySelector('.path-overlay');
    
    // Create the info modal if not already present
    this.createInfoModal();
    
    // Create the path editing modal
    this.createPathModal();
  },
  
  /**
   * Create initial elements needed by the application
   */
  createInitialElements() {
    // Replace header container with new one containing file header and path overlay
    const existingHeaderContainer = document.querySelector('.header-container');
    if (existingHeaderContainer) {
      // Create new header structure
      const headerContainer = document.createElement('div');
      headerContainer.className = 'header-container';
      
      // Create file header (caret + filename)
      const fileHeader = document.createElement('div');
      fileHeader.className = 'file-header';
      
      const caret = document.createElement('span');
      caret.className = 'caret';
      caret.innerHTML = '&#9654;'; // Right-pointing triangle
      
      const filename = document.createElement('span');
      filename.className = 'filename';
      filename.textContent = 'No file selected';
      
      const editIcon = document.createElement('span');
      editIcon.className = 'edit-icon';
      editIcon.innerHTML = '&#9998;'; // Pencil icon
      
      fileHeader.appendChild(caret);
      fileHeader.appendChild(filename);
      fileHeader.appendChild(editIcon);
      
      // Create path overlay (hidden by default)
      const pathOverlay = document.createElement('div');
      pathOverlay.className = 'path-overlay';
      pathOverlay.style.display = 'none';
      
      const overlayContent = document.createElement('div');
      overlayContent.className = 'overlay-content';
      
      // Saving As section (only shown when custom filename is set)
      const filenameSection = document.createElement('div');
      filenameSection.className = 'path-section filename-section';
      filenameSection.style.display = 'none';
      
      // Only use "Saving As" without the "Original" line
      const savingAsLabel = document.createElement('div');
      savingAsLabel.className = 'path-label';
      savingAsLabel.textContent = 'Saving As:';
      
      const savingAsName = document.createElement('div');
      savingAsName.className = 'path-value saving-as-name';
      
      filenameSection.appendChild(savingAsLabel);
      filenameSection.appendChild(savingAsName);
      
      // From path section
      const fromSection = document.createElement('div');
      fromSection.className = 'path-section from-section';
      
      const fromLabel = document.createElement('div');
      fromLabel.className = 'path-label';
      fromLabel.textContent = 'FROM:';
      
      const fromPath = document.createElement('div');
      fromPath.className = 'path-value from-path';
      fromPath.textContent = '~/Documents/ComfyUI/output';
      
      fromSection.appendChild(fromLabel);
      fromSection.appendChild(fromPath);
      
      // To path section
      const toSection = document.createElement('div');
      toSection.className = 'path-section to-section';
      
      const toLabel = document.createElement('div');
      toLabel.className = 'path-label';
      toLabel.textContent = 'TO:';
      
      const toPath = document.createElement('div');
      toPath.className = 'path-value to-path';
      toPath.textContent = '~/Documents/sorted';
      
      toSection.appendChild(toLabel);
      toSection.appendChild(toPath);
      
      // Show instructions button
      const instructionsSection = document.createElement('div');
      instructionsSection.className = 'path-section instructions-section';
      
      const showInstructionsButton = document.createElement('button');
      showInstructionsButton.id = 'showInfo';
      showInstructionsButton.className = 'btn btn-info';
      showInstructionsButton.textContent = 'Show Instructions';
      
      instructionsSection.appendChild(showInstructionsButton);
      
      // Add sections to overlay content
      overlayContent.appendChild(filenameSection);
      overlayContent.appendChild(fromSection);
      overlayContent.appendChild(toSection);
      overlayContent.appendChild(instructionsSection);
      
      pathOverlay.appendChild(overlayContent);
      
      // Add components to the header container
      headerContainer.appendChild(fileHeader);
      headerContainer.appendChild(pathOverlay);
      
      // Create action buttons container (moved to bottom)
      const actionButtons = document.createElement('div');
      actionButtons.className = 'action-buttons';
      
      // Move to parent container and replace old header
      const container = existingHeaderContainer.parentNode;
      container.replaceChild(headerContainer, existingHeaderContainer);
      
      this.elements.fileHeader = fileHeader;
      this.elements.pathOverlay = pathOverlay;
      
      // Create bottom controls if they don't exist
      if (!document.querySelector('.bottom-controls')) {
        const bottomControls = document.createElement('div');
        bottomControls.className = 'bottom-controls';
        
        // Add navigation buttons to the center
        const controls = document.createElement('div');
        controls.className = 'controls';
        
        const prevButton = document.createElement('button');
        prevButton.className = 'btn btn-secondary';
        prevButton.textContent = 'Previous';
        
        const undoButton = document.createElement('button');
        undoButton.className = 'btn btn-undo';
        undoButton.textContent = 'Undo';
        
        const nextButton = document.createElement('button');
        nextButton.className = 'btn btn-secondary';
        nextButton.textContent = 'Next';
        
        controls.appendChild(prevButton);
        controls.appendChild(undoButton);
        controls.appendChild(nextButton);
        
        // Add utility buttons to the left
        const utilityButtons = document.createElement('div');
        utilityButtons.className = 'utility-buttons';
        
        const refreshButton = document.createElement('button');
        refreshButton.className = 'btn btn-utility refresh-btn';
        refreshButton.innerHTML = '&#x21bb;'; // Refresh symbol
        refreshButton.title = 'Refresh';
        
        const downloadButton = document.createElement('button');
        downloadButton.className = 'btn btn-utility download-btn';
        downloadButton.innerHTML = '&#x2193;'; // Down arrow
        downloadButton.title = 'Download';
        
        utilityButtons.appendChild(refreshButton);
        utilityButtons.appendChild(downloadButton);
        
        // Add counter to the right
        const counterContainer = document.createElement('div');
        counterContainer.className = 'counter-container';
        counterContainer.textContent = 'No images';
        
        // Add everything to bottom controls
        bottomControls.appendChild(utilityButtons);
        bottomControls.appendChild(controls);
        bottomControls.appendChild(counterContainer);
        
        // Add to container
        container.appendChild(bottomControls);
        
        this.elements.counterContainer = counterContainer;
        this.elements.controls = controls;
      }
    }
  },
  
  /**
   * Create path editing modal
   */
  createPathModal() {
    // Check if the modal already exists
    if (document.getElementById('pathModal')) {
      this.elements.pathModal = document.getElementById('pathModal');
      return;
    }
    
    const pathModal = document.createElement('div');
    pathModal.id = 'pathModal';
    pathModal.className = 'modal';
    pathModal.innerHTML = `
      <div class="modal-content">
        <span class="close-modal" id="closePathModal">&times;</span>
        <h2>Edit <span id="pathType">Path</span></h2>
        <input type="text" id="pathInput" placeholder="Enter path">
        <button id="savePath">Save</button>
      </div>
    `;
    document.body.appendChild(pathModal);
    this.elements.pathModal = pathModal;
    
    // Close modal when clicking X
    document.getElementById('closePathModal').addEventListener('click', () => {
      this.elements.pathModal.style.display = "none";
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
      if (event.target === this.elements.pathModal) {
        this.elements.pathModal.style.display = "none";
      }
    });
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
   * Set up event handlers for UI elements
   * @param {Object} handlers - Object containing handler functions
   */
  setupEventHandlers(handlers) {
    // Set up file header click to toggle path overlay
    if (this.elements.fileHeader) {
      this.elements.fileHeader.addEventListener('click', handlers.togglePathOverlay);
    }
    
    // Edit icon for custom filename
    const editIcon = document.querySelector('.edit-icon');
    if (editIcon) {
      editIcon.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent triggering the fileHeader click
        handlers.openFilenameModal();
      });
    }
    
    // FROM path click handler
    const fromPath = document.querySelector('.from-path');
    if (fromPath) {
      fromPath.addEventListener('click', (e) => {
        e.stopPropagation();
        handlers.editFromPath();
      });
    }
    
    // TO path click handler
    const toPath = document.querySelector('.to-path');
    if (toPath) {
      toPath.addEventListener('click', (e) => {
        e.stopPropagation();
        handlers.editToPath();
      });
    }
    
    // Show instructions button
    const showInfoBtn = document.getElementById('showInfo');
    if (showInfoBtn) {
      showInfoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handlers.showInstructions();
      });
    }
    
    // Path modal save button
    const savePathBtn = document.getElementById('savePath');
    if (savePathBtn) {
      savePathBtn.addEventListener('click', () => {
        const pathType = document.getElementById('pathType').textContent;
        const pathValue = this.elements.pathInput.value.trim();
        
        this.elements.pathModal.style.display = "none";
        
        if (pathType === 'FROM Path') {
          handlers.saveFromPath(pathValue);
        } else if (pathType === 'TO Path') {
          handlers.saveToPath(pathValue);
        }
      });
    }
    
    // Filename modal
    const closeFilenameModal = document.querySelector('#filenameModal .close-modal');
    if (closeFilenameModal) {
      closeFilenameModal.addEventListener('click', () => {
        this.elements.filenameModal.style.display = "none";
      });
    }
    
    // Click outside modal to close
    window.addEventListener('click', (event) => {
      if (event.target === this.elements.filenameModal) {
        this.elements.filenameModal.style.display = "none";
      }
    });
    
    // Save filename button
    const saveFilenameBtn = document.getElementById('saveFilename');
    if (saveFilenameBtn) {
      saveFilenameBtn.addEventListener('click', () => {
        const customFilename = this.elements.filenameInput.value.trim();
        this.elements.filenameModal.style.display = "none";
        handlers.saveCustomFilename(customFilename);
      });
    }
    
    // Bottom utility buttons
    const refreshBtn = document.querySelector('.refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', handlers.refreshFiles);
    }
    
    const downloadBtn = document.querySelector('.download-btn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', handlers.downloadCurrentFile);
    }
    
    // Navigation buttons
    const prevButton = document.querySelector('.controls .btn-secondary:first-child');
    if (prevButton) {
      prevButton.addEventListener('click', handlers.showPrevious);
    }
    
    const nextButton = document.querySelector('.controls .btn-secondary:last-child');
    if (nextButton) {
      nextButton.addEventListener('click', handlers.showNext);
    }
    
    // Undo button
    const undoButton = document.querySelector('.btn-undo');
    if (undoButton) {
      undoButton.addEventListener('click', handlers.undoLastAction);
    }
  },
  
  /**
   * Toggle path overlay visibility
   */
  togglePathOverlay() {
    if (this.elements.pathOverlay) {
      const isHidden = this.elements.pathOverlay.style.display === 'none';
      
      // Update caret icon
      const caret = document.querySelector('.caret');
      if (caret) {
        caret.innerHTML = isHidden ? '&#9660;' : '&#9654;'; // Down or right arrow
      }
      
      // Toggle visibility
      this.elements.pathOverlay.style.display = isHidden ? 'block' : 'none';
    }
  },
  
  /**
   * Show the path editing modal
   * @param {string} pathType - Type of path (FROM or TO)
   * @param {string} currentPath - Current path value
   * @param {Function} saveCallback - Function to call when saving
   */
  showPathModal(pathType, currentPath, saveCallback) {
    if (!this.elements.pathModal) return;
    
    // Update modal title and input value
    document.getElementById('pathType').textContent = `${pathType} Path`;
    this.elements.pathInput.value = currentPath || '';
    
    // Show modal
    this.elements.pathModal.style.display = "block";
    
    // Focus and select the input text
    setTimeout(() => {
      this.elements.pathInput.focus();
      this.elements.pathInput.select();
    }, 50);
  },
  
  /**
   * Show instructions modal
   */
  showInstructionsModal() {
    if (this.elements.infoModal) {
      this.elements.infoModal.style.display = "block";
    }
  },
  
  /**
   * Update paths display in the UI
   * @param {string} fromPath - FROM path to display
   * @param {string} toPath - TO path to display
   */
  updatePathsDisplay(fromPath, toPath) {
    const fromPathEl = document.querySelector('.from-path');
    const toPathEl = document.querySelector('.to-path');
    
    if (fromPathEl && fromPath) {
      fromPathEl.textContent = fromPath;
    }
    
    if (toPathEl && toPath) {
      toPathEl.textContent = toPath;
    }
  },
  
  /**
   * Show filename modal for renaming
   * @param {string} currentFilename - Current filename
   * @param {string} customFilename - Custom filename if available
   */
  showFilenameModal(currentFilename, customFilename) {
    if (!this.elements.filenameInput || !this.elements.filenameModal) return;
    
    this.elements.filenameInput.value = customFilename || currentFilename;
    this.elements.filenameModal.style.display = "block";
    
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
    
    // Update header filename - now removed from the item itself
    const filenameEl = document.querySelector('.filename');
    if (filenameEl) {
      filenameEl.textContent = customFilename || file.name;
      
      // Show/hide the custom filename section in the overlay
      const filenameSection = document.querySelector('.filename-section');
      const savingAsName = document.querySelector('.saving-as-name');
      
      if (filenameSection && savingAsName) {
        if (customFilename) {
          filenameSection.style.display = 'block';
          savingAsName.textContent = customFilename;
        } else {
          filenameSection.style.display = 'none';
        }
      }
    }
    
    // Create swipe instruction element
    const swipeInstruction = document.createElement('div');
    swipeInstruction.className = 'swipe-instruction';
    
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
    
    // Assemble the media item
    item.appendChild(mediaContent);
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