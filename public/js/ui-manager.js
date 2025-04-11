/**
 * UI Manager for the application
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
    // Create core UI elements
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
      
      // Create media container and list
      const mediaContainer = document.createElement('div');
      mediaContainer.className = 'media-container';
      
      const mediaList = document.createElement('div');
      mediaList.id = 'mediaList';
      mediaList.className = 'media-list';
      
      mediaContainer.appendChild(mediaList);
      container.appendChild(mediaContainer);
      
      this.elements.fileHeader = fileHeader;
      this.elements.pathOverlay = pathOverlay;
      this.elements.mediaList = mediaList;
      
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
    } else {
      // If there's no header container yet, create a minimal structure
      const container = document.querySelector('.container');
      if (container) {
        // Create a basic header
        const headerContainer = document.createElement('div');
        headerContainer.className = 'header-container';
        
        const fileHeader = document.createElement('div');
        fileHeader.className = 'file-header';
        fileHeader.textContent = 'ComfyUI Media Viewer';
        
        headerContainer.appendChild(fileHeader);
        container.appendChild(headerContainer);
        
        // Create media container and list
        const mediaContainer = document.createElement('div');
        mediaContainer.className = 'media-container';
        
        const mediaList = document.createElement('div');
        mediaList.id = 'mediaList';
        mediaList.className = 'media-list';
        
        mediaContainer.appendChild(mediaList);
        container.appendChild(mediaContainer);
        
        this.elements.mediaList = mediaList;
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
   * Create the information modal
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
        <div class="info-content">
          ${window.appConfig.helpText}
        </div>
      </div>
    `;
    document.body.appendChild(infoModal);
    this.elements.infoModal = infoModal;
    
    // Close modal when clicking X
    document.getElementById('closeInfoModal').addEventListener('click', () => {
      this.elements.infoModal.style.display = "none";
    });
    
    // Close modal when clicking outside
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
    
    // Save button for filename modal
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
   * Show the filename modal for custom naming
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
   * Initialize or update the pinch-zoom functionality
   */
  setupPinchZoom() {
    const mediaContent = document.querySelector('.media-content');
    if (mediaContent && mediaContent.tagName === 'IMG' && window.PinchZoom) {
      // Use setTimeout to ensure the element is fully rendered
      setTimeout(() => {
        // Don't initialize if video or not found
        try {
          new window.PinchZoom(mediaContent, {
            tapZoomFactor: 2,
            zoomOutFactor: 1.3,
            animationDuration: 300,
            maxZoom: 4,
            minZoom: 0.5
          });
        } catch (error) {
          console.error('Error initializing PinchZoom:', error);
        }
      }, 100);
    }
  },
  
  /**
   * Show loading state
   */
  showLoading() {
    // Get or create the media list
    let mediaList = document.getElementById('mediaList');
    if (!mediaList) {
      // Create the media container and list if it doesn't exist
      const container = document.querySelector('.container');
      if (container) {
        const mediaContainer = document.createElement('div');
        mediaContainer.className = 'media-container';
        
        mediaList = document.createElement('div');
        mediaList.id = 'mediaList';
        mediaList.className = 'media-list';
        
        mediaContainer.appendChild(mediaList);
        container.appendChild(mediaContainer);
        
        this.elements.mediaList = mediaList;
      }
    }
    
    if (mediaList) {
      mediaList.innerHTML = '<div class="loading">Loading...</div>';
    }
  },
  
  /**
   * Show empty state when no files are found
   */
  showEmptyState() {
    if (this.elements.mediaList) {
      this.elements.mediaList.innerHTML = `
        <div class="empty-state">
          <p>No media files found</p>
          <button class="btn btn-secondary refresh-btn">Refresh</button>
        </div>
      `;
      
      // Add click handler to the refresh button
      const refreshBtn = this.elements.mediaList.querySelector('.refresh-btn');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
          window.appController.fetchMediaFiles();
        });
      }
    }
  },
  
  /**
   * Show an error message
   * @param {string} message - Error message to display
   */
  showError(message) {
    if (this.elements.mediaList) {
      this.elements.mediaList.innerHTML = `
        <div class="error-state">
          <p>Error: ${message}</p>
          <button class="btn btn-secondary refresh-btn">Retry</button>
        </div>
      `;
      
      // Add click handler to the refresh button
      const refreshBtn = this.elements.mediaList.querySelector('.refresh-btn');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
          window.appController.fetchMediaFiles();
        });
      }
    } else {
      alert(`Error: ${message}`);
    }
  },
  
  /**
   * Update image counter display
   * @param {number} current - Current image index
   * @param {number} total - Total images
   */
  updateImageCounter(current, total) {
    if (this.elements.counterContainer) {
      if (total === 0) {
        this.elements.counterContainer.textContent = 'No images';
      } else {
        this.elements.counterContainer.textContent = `${current + 1} / ${total}`;
      }
    }
  },
  
  /**
   * Create a media item element
   * @param {Object} file - File information
   * @param {string} customFilename - Custom filename if available
   * @param {string} apiUrl - API URL for fetching media
   * @returns {HTMLElement} - Media item element
   */
  createMediaItem(file, customFilename, apiUrl) {
    const item = document.createElement('div');
    item.className = 'media-item';
    
    // Create the appropriate media content element
    let mediaContent;
    if (file.type.startsWith('image/')) {
      mediaContent = this.createImageElement(file, apiUrl);
    } else if (file.type.startsWith('video/')) {
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
    
    // Create 9 tap zones (3x3 grid)
    Array(9).fill(0).forEach((_, index) => {
      const zoneElement = document.createElement('div');
      zoneElement.className = 'tap-zone';
      zoneElement.dataset.index = index;
      tapZones.appendChild(zoneElement);
    });
    
    // Assemble the media item
    item.appendChild(mediaContent);
    item.appendChild(tapZones);
    item.appendChild(swipeInstruction);
    
    return item;
  },
  
  /**
   * Create an image element
   * @param {Object} file - Image file information
   * @param {string} apiUrl - API URL for fetching media
   * @returns {HTMLElement} - Image element
   */
  createImageElement(file, apiUrl) {
    const img = document.createElement('img');
    img.className = 'media-content';
    img.src = `${apiUrl}/media/${encodeURIComponent(file.name)}`;
    img.alt = file.name;
    img.onerror = () => {
      img.src = 'img/error.svg';
      img.alt = 'Error loading image';
    };
    return img;
  },
  
  /**
   * Create a video element
   * @param {Object} file - Video file information
   * @param {string} apiUrl - API URL for fetching media
   * @returns {HTMLElement} - Video element
   */
  createVideoElement(file, apiUrl) {
    const video = document.createElement('video');
    video.className = 'media-content';
    video.src = `${apiUrl}/media/${encodeURIComponent(file.name)}`;
    video.controls = true;
    video.autoplay = false;
    video.onerror = () => {
      console.error('Video error:', file.name);
      video.innerHTML = 'Error loading video';
    };
    return video;
  },
  
  /**
   * Show visual feedback for actions
   * @param {HTMLElement} container - Container element
   * @param {string} action - Action type
   */
  showActionFeedback(container, action) {
    // Add the appropriate class for the action
    const actionClass = this.getActionClass(action);
    container.classList.add(actionClass);
    
    // Show action label
    const swipeInstruction = container.querySelector('.swipe-instruction');
    if (swipeInstruction) {
      swipeInstruction.textContent = this.getActionLabel(action);
      swipeInstruction.style.display = 'flex';
    }
  },
  
  /**
   * Hide visual feedback for actions
   * @param {HTMLElement} container - Container element
   * @param {string} action - Action type
   */
  hideActionFeedback(container, action) {
    // Remove the appropriate class for the action
    const actionClass = this.getActionClass(action);
    container.classList.remove(actionClass);
    
    // Hide action label
    const swipeInstruction = container.querySelector('.swipe-instruction');
    if (swipeInstruction) {
      swipeInstruction.style.display = 'none';
    }
  },
  
  /**
   * Get the CSS class for an action
   * @param {string} action - Action type
   * @returns {string} - CSS class
   */
  getActionClass(action) {
    const actionMap = {
      [window.appConfig.actions.ARCHIVE]: 'action-archive',
      [window.appConfig.actions.SAVE]: 'action-save',
      [window.appConfig.actions.SUPERSAVE]: 'action-supersave',
      [window.appConfig.actions.DELETE]: 'action-delete'
    };
    
    return actionMap[action] || '';
  },
  
  /**
   * Get the label for an action
   * @param {string} action - Action type
   * @returns {string} - Action label
   */
  getActionLabel(action) {
    const labelMap = {
      [window.appConfig.actions.ARCHIVE]: 'Archiving...',
      [window.appConfig.actions.SAVE]: 'Saving...',
      [window.appConfig.actions.SUPERSAVE]: 'Super Save...',
      [window.appConfig.actions.DELETE]: 'Deleting...'
    };
    
    return labelMap[action] || '';
  },
  
  /**
   * Show action label for tap zones
   * @param {string} actionName - Action name
   * @param {DOMRect} rect - Rectangle position
   */
  showActionLabel(actionName, rect) {
    // Remove existing label if any
    const existingLabel = document.querySelector('.action-label');
    if (existingLabel) {
      existingLabel.remove();
    }
    
    // Create label element
    const label = document.createElement('div');
    label.className = 'action-label';
    label.textContent = actionName;
    
    // Position centered over the tap zone
    if (rect) {
      label.style.top = `${rect.top + rect.height / 2 - 20}px`;
      label.style.left = `${rect.left + rect.width / 2 - 60}px`;
    } else {
      // Center in viewport if no rect provided
      label.style.top = '50%';
      label.style.left = '50%';
      label.style.transform = 'translate(-50%, -50%)';
    }
    
    // Add to body
    document.body.appendChild(label);
    
    // Remove after delay
    setTimeout(() => {
      if (label.parentNode) {
        label.parentNode.removeChild(label);
      }
    }, 1000);
  }
};

// Export as a global variable
window.uiManager = uiManager;