/**
 * Media Utilities for handling media items
 */
const mediaUtils = {
  /**
   * Create a media item element
   * @param {Object} file - File information
   * @param {string} customFilename - Custom filename if available
   * @param {string} apiUrl - API URL for fetching media
   * @returns {HTMLElement} - Media item element
   */
  createMediaItem(file, customFilename, apiUrl) {
    if (!file) {
      console.error('Cannot create media item: file is undefined');
      return document.createElement('div');
    }
    
    const item = document.createElement('div');
    item.className = 'media-item';
    
    // Create the appropriate media content element
    let mediaContent;
    // Check file.type safely with fallback
    const fileType = file.type || '';
    
    if (fileType.startsWith('image/')) {
      mediaContent = this.createImageElement(file, apiUrl);
    } else if (fileType.startsWith('video/')) {
      mediaContent = this.createVideoElement(file, apiUrl);
    } else {
      // Fallback for unknown type - treat as image
      console.warn('Unknown file type, using image as fallback:', file.name);
      mediaContent = this.createImageElement(file, apiUrl);
    }
    
    // Update header filename - now removed from the item itself
    const filenameEl = document.querySelector('.filename');
    if (filenameEl) {
      filenameEl.textContent = customFilename || file.name || 'Unknown file';
      
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
    img.alt = file.name || 'Image';
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
    if (!container) return;
    
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
    if (!container) return;
    
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
    if (!window.appConfig || !window.appConfig.actions) {
      console.error('appConfig.actions is not available');
      return '';
    }
    
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
    if (!window.appConfig || !window.appConfig.actions) {
      console.error('appConfig.actions is not available');
      return '';
    }
    
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
window.mediaUtils = mediaUtils;