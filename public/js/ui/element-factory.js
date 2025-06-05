/**
 * Factory for creating DOM elements
 */
const elementFactory = {
  
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

    let mediaContent;

    if (/\.(png|jpe?g|gif|bmp|webp|tiff?|svg)$/i.test(file.name)) {
      mediaContent = this.createImageElement(file, apiUrl);
    } else if (/\.(mp4|webm|mov|avi|mkv|flv|wmv|m4v|3gp|ogv)$/i.test(file.name)) {
      mediaContent = this.createVideoElement(file, apiUrl);
    }

    const filenameContainer = document.createElement('div');
    filenameContainer.className = 'filename-container';

    const fsPath = file.originalPath || file.name;

    const filenamePath = document.createElement('div');
    filenamePath.className = 'filename-path';
    filenamePath.innerHTML = `<strong>${customFilename || file.name}</strong>`;
    filenameContainer.appendChild(filenamePath);

    const tapZones = document.createElement('div');
    tapZones.className = 'tap-zones';

    window.appConfig.zoneConfig.forEach(zone => {
      const zoneElement = document.createElement('div');
      zoneElement.className = `tap-zone ${zone.className}`;
      if (zone.action) {
        zoneElement.dataset.action = zone.action;
      }
      tapZones.appendChild(zoneElement);
    });

    const swipeInstruction = document.createElement('div');
    swipeInstruction.className = 'swipe-instruction';

    item.appendChild(filenameContainer);
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
    video.preload = 'auto';
    video.className = 'media-content';

    video.addEventListener('loadedmetadata', function() {
      this.play().catch(e => console.log('Auto-play prevented:', e));
    });

    video.addEventListener('play', function() {
      setTimeout(() => {
        if (!this.paused) {
          this.setAttribute('data-hide-controls', 'true');
        }
      }, 800);
    });

    video.addEventListener('mouseenter', function() {
      this.removeAttribute('data-hide-controls');
    });

    video.addEventListener('pause', function() {
      this.removeAttribute('data-hide-controls');
    });

    video.addEventListener('click', function(e) {
      const rect = this.getBoundingClientRect();
      const y = e.clientY - rect.top;

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
   * Create initial elements needed by the application
   */
  createInitialElements() {
    if (!document.querySelector('.bottom-controls')) {
      const bottomControls = document.createElement('div');
      bottomControls.className = 'bottom-controls';

      const counterContainer = document.createElement('div');
      counterContainer.className = 'counter-container';
      counterContainer.textContent = 'No images';

      const controls = document.createElement('div');
      controls.className = 'controls';

      const prevButton = document.createElement('button');
      prevButton.className = 'btn btn-secondary';
      prevButton.textContent = 'Previous';

      const nextButton = document.createElement('button');
      nextButton.className = 'btn btn-secondary';
      nextButton.textContent = 'Next';

      const undoButton = document.createElement('button');
      undoButton.className = 'btn btn-undo';
      undoButton.textContent = 'Undo';

      controls.appendChild(prevButton);
      controls.appendChild(undoButton);
      controls.appendChild(nextButton);

      const spacer = document.createElement('div');
      spacer.className = 'spacer';

      bottomControls.appendChild(counterContainer);
      bottomControls.appendChild(controls);
      bottomControls.appendChild(spacer);

      const container = document.querySelector('.container');
      container.appendChild(bottomControls);
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

    actionLabel.style.top = rect.top + rect.height / 2 + 'px';
    actionLabel.style.left = rect.left + rect.width / 2 + 'px';

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

window.elementFactory = elementFactory;
