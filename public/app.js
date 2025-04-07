document.addEventListener('DOMContentLoaded', () => {
  const mediaList = document.getElementById('mediaList');
  const API_URL = `${window.location.protocol}//${window.location.host}`;
  
  // State management
  let allFiles = [];
  let currentIndex = 0;
  let customFilename = null;
  
  // Setup modal
  const modal = document.getElementById('filenameModal');
  const closeModal = document.querySelector('.close-modal');
  const filenameInput = document.getElementById('customFilename');
  const saveFilenameBtn = document.getElementById('saveFilename');
  
  // Add bottom controls container
  const bottomControls = document.createElement('div');
  bottomControls.className = 'bottom-controls';
  
  // Add counter to the left
  const counterContainer = document.createElement('div');
  counterContainer.className = 'counter-container';
  
  // Add controls in the center
  const controls = document.createElement('div');
  controls.className = 'controls';
  
  // Add navigation buttons
  const prevButton = document.createElement('button');
  prevButton.className = 'btn btn-secondary';
  prevButton.textContent = 'Previous';
  prevButton.addEventListener('click', showPreviousImage);
  
  const nextButton = document.createElement('button');
  nextButton.className = 'btn btn-secondary';
  nextButton.textContent = 'Next';
  nextButton.addEventListener('click', showNextImage);
  
  // Add undo button
  const undoButton = document.createElement('button');
  undoButton.className = 'btn btn-undo';
  undoButton.textContent = 'Undo';
  undoButton.addEventListener('click', undoLastAction);
  
  controls.appendChild(prevButton);
  controls.appendChild(undoButton);
  controls.appendChild(nextButton);
  
  // Add options dropdown to the right
  const optionsContainer = document.createElement('div');
  optionsContainer.className = 'options-container';
  
  const optionsButton = document.createElement('button');
  optionsButton.className = 'btn btn-options';
  optionsButton.textContent = 'Options';
  optionsButton.addEventListener('click', toggleOptionsDropdown);
  
  const optionsDropdown = document.createElement('div');
  optionsDropdown.className = 'options-dropdown';
  optionsDropdown.innerHTML = `
    <ul>
      <li id="customName">Custom Name</li>
    </ul>
  `;
  
  optionsContainer.appendChild(optionsButton);
  optionsContainer.appendChild(optionsDropdown);
  
  // Add all elements to the bottom controls
  bottomControls.appendChild(counterContainer);
  bottomControls.appendChild(controls);
  bottomControls.appendChild(optionsContainer);
  
  const container = document.querySelector('.container');
  container.appendChild(bottomControls);
  
  // Set up header buttons
  const refreshIcon = document.querySelector('.refresh-icon');
  refreshIcon.addEventListener('click', fetchMediaFiles);
  
  const saveIcon = document.querySelector('.save-icon');
  saveIcon.addEventListener('click', downloadCurrentImage);
  
  // Function to download the current image to device
  function downloadCurrentImage() {
    if (allFiles.length === 0) return;
    
    const currentFile = allFiles[currentIndex];
    const imageUrl = `${API_URL}${currentFile.path}`;
    
    // Create a temporary link element
    const downloadLink = document.createElement('a');
    downloadLink.href = imageUrl;
    downloadLink.download = customFilename || currentFile.name; // Use custom filename if available
    
    // Append to the body, click and remove
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  }
  
  // Function to toggle options dropdown
  function toggleOptionsDropdown() {
    optionsDropdown.classList.toggle('show');
  }
  
  // Close dropdown when clicking outside
  window.addEventListener('click', function(event) {
    if (!optionsButton.contains(event.target) && !optionsDropdown.contains(event.target)) {
      optionsDropdown.classList.remove('show');
    }
  });
  
  // Custom name option
  document.getElementById('customName').addEventListener('click', function() {
    openFilenameModal();
    optionsDropdown.classList.remove('show');
  });
  
  // Modal functions
  function openFilenameModal() {
    const currentFile = allFiles[currentIndex];
    filenameInput.value = customFilename || currentFile.name;
    modal.style.display = "block";
  }
  
  closeModal.addEventListener('click', function() {
    modal.style.display = "none";
  });
  
  window.addEventListener('click', function(event) {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  });
  
  saveFilenameBtn.addEventListener('click', function() {
    customFilename = filenameInput.value.trim();
    modal.style.display = "none";
    updateFilenameDisplay();
  });
  
  function updateFilenameDisplay() {
    const nameElement = document.querySelector('.media-name');
    if (nameElement && customFilename) {
      nameElement.textContent = customFilename;
    }
  }
  
  // Save current file (placeholder function)
  function saveCurrentFile() {
    if (allFiles.length === 0) return;
    
    // Default to "saved" action (right)
    performAction('right');
  }
  
  // Function to update the image counter display
  function updateImageCounter() {
    if (allFiles.length === 0) {
      counterContainer.textContent = 'No images';
    } else {
      counterContainer.textContent = `${currentIndex + 1} of ${allFiles.length}`;
    }
  }
  
  // Navigate to previous image
  function showPreviousImage() {
    if (allFiles.length === 0) return;
    
    customFilename = null; // Reset custom filename
    currentIndex = (currentIndex - 1 + allFiles.length) % allFiles.length;
    displayCurrentImage();
  }
  
  // Navigate to next image
  function showNextImage() {
    if (allFiles.length === 0) return;
    
    customFilename = null; // Reset custom filename
    currentIndex = (currentIndex + 1) % allFiles.length;
    displayCurrentImage();
  }
  
  // Perform action on current image
  async function performAction(action) {
    if (allFiles.length === 0) return;
    
    const file = allFiles[currentIndex];
    const filename = file.name;
    const mediaItem = document.querySelector('.media-item');
    
    if (!mediaItem) return;
    
    // Visual feedback
    mediaItem.classList.add(`swipe-${action}`);
    
    // Update instruction text
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
    
    try {
      // Add custom filename if set
      const requestData = { 
        filename,
        action,
        ...(customFilename && { customFilename })
      };
      
      const response = await fetch(`${API_URL}/api/files/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      
      if (response.ok) {
        // Move to next image faster: reduced timeout from 500ms to 300ms
        setTimeout(() => {
          // Remove current file from array
          allFiles.splice(currentIndex, 1);
          
          // Reset custom filename for next image
          customFilename = null;
          
          // If there are no more files, show empty state
          if (allFiles.length === 0) {
            mediaList.innerHTML = '<div class="no-media">No media files found</div>';
            updateImageCounter();
            return;
          }
          
          // If we're at the end of the array, go back one
          if (currentIndex >= allFiles.length) {
            currentIndex = allFiles.length - 1;
          }
          
          // Display the next image
          displayCurrentImage();
        }, 300);
      } else {
        // Handle error
        const errorData = await response.json();
        console.error('Action failed:', errorData.error);
        mediaItem.classList.remove(`swipe-${action}`);
        if (instruction) instruction.style.opacity = 0;
      }
    } catch (error) {
      console.error('Error performing action:', error);
      mediaItem.classList.remove(`swipe-${action}`);
      if (instruction) instruction.style.opacity = 0;
    }
  }
  
  // Handle keydown events
  function handleKeyDown(e) {
    // Skip if typing in an input or textarea
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    switch(e.key) {
      // Original arrow key controls
      case 'ArrowLeft':
        performAction('archive');
        break;
      case 'ArrowRight':
        performAction('saved');
        break;
      case 'ArrowUp':
        performAction('best_complete');
        break;
      case 'ArrowDown':
        performAction('delete');
        break;
        
      // New WASD keyboard controls
      case 'a':
      case 'A':
        performAction('archive');
        break;
      case 'd':
      case 'D':
        performAction('saved');
        break;
      case 'w':
      case 'W':
        performAction('best_complete');
        break;
      case 's':
      case 'S':
        performAction('delete');
        break;
        
      // Corner keys
      case 'q':
      case 'Q':
        performAction('archive_good');
        break;
      case 'e':
      case 'E':
        performAction('best_wip');
        break;
      case 'z':
      case 'Z':
        performAction('archive_bad');
        break;
      case 'c':
      case 'C':
        performAction('saved_wip');
        break;
      case 'x':
      case 'X':
        performAction('delete');
        break;
        
      // Command key combinations
      case 'z':
        if (e.metaKey) {
          e.preventDefault();
          undoLastAction();
        }
        break;
      case 'o':
        if (e.metaKey) {
          e.preventDefault();
          toggleOptionsDropdown();
        }
        break;
      case 'n':
        if (e.metaKey) {
          e.preventDefault();
          openFilenameModal();
          // Focus and select the input text
          setTimeout(() => {
            filenameInput.focus();
            filenameInput.select();
          }, 50);
        }
        break;
      case 's':
        if (e.metaKey) {
          e.preventDefault();
          downloadCurrentImage();
        }
        break;
      case 'r':
        if (e.metaKey) {
          e.preventDefault();
          fetchMediaFiles();
        }
        break;
    }
    
    // Navigation with Command + Left/Right or Command + A/D
    if (e.metaKey) {
      if (e.key === 'ArrowLeft' || (e.key.toLowerCase() === 'a')) {
        e.preventDefault();
        showPreviousImage();
      } else if (e.key === 'ArrowRight' || (e.key.toLowerCase() === 'd')) {
        e.preventDefault();
        showNextImage();
      }
    }
  }
  
  // Add keyboard event listener
  document.addEventListener('keydown', handleKeyDown);
  
  // Display the current image
  function displayCurrentImage() {
    if (allFiles.length === 0) {
      mediaList.innerHTML = '<div class="no-media">No media files found</div>';
      updateImageCounter();
      return;
    }
    
    const file = allFiles[currentIndex];
    mediaList.innerHTML = '';
    
    const mediaItem = createMediaItem(file);
    mediaList.appendChild(mediaItem);
    
    setupSwipeHandlers();
    setupTapHandlers();
    setupPinchZoom();
    updateImageCounter();
  }
  
  // Setup pinch zoom
  function setupPinchZoom() {
    const mediaContent = document.querySelector('.media-content');
    if (mediaContent && mediaContent.tagName === 'IMG') {
      const container = mediaContent.parentElement;
      
      // Create a wrapper for pinch zoom
      const wrapper = document.createElement('div');
      wrapper.className = 'pinch-zoom-container';
      
      // Move the image into the wrapper
      container.insertBefore(wrapper, mediaContent);
      wrapper.appendChild(mediaContent);
      
      // Initialize pinch zoom if the library is available
      if (typeof PinchZoom !== 'undefined') {
        new PinchZoom(wrapper, {
          draggable: true,
          maxZoom: 5
        });
      }
    }
  }
  
  // Undo last action
  async function undoLastAction() {
    try {
      const response = await fetch(`${API_URL}/api/undo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (response.ok) {
        // Refresh the media files
        fetchMediaFiles();
      } else {
        alert(`Undo failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Error performing undo:', error);
      alert('Failed to undo the last action');
    }
  }
  
  // Fetch media files from server
  async function fetchMediaFiles() {
    try {
      mediaList.innerHTML = '<div style="text-align:center;">Loading...</div>';
      
      const response = await fetch(`${API_URL}/api/files`);
      allFiles = await response.json();
      
      if (allFiles.length === 0) {
        mediaList.innerHTML = '<div class="no-media">No media files found</div>';
        updateImageCounter();
        return;
      }
      
      // Reset to first image when refreshing
      currentIndex = 0;
      customFilename = null;
      displayCurrentImage();
    } catch (error) {
      console.error('Error fetching media files:', error);
      mediaList.innerHTML = `<div style="color:red;text-align:center;">
        Error loading media files: ${error.message}
      </div>`;
    }
  }
  
  // Create a media item element
  function createMediaItem(file) {
    const item = document.createElement('div');
    item.className = 'media-item';
    item.dataset.filename = file.name;
    
    let mediaContent;
    
    if (/\.(png)$/i.test(file.name)) {
      mediaContent = document.createElement('img');
      mediaContent.src = `${API_URL}${file.path}`;
      mediaContent.alt = file.name;
      // Check orientation after loading
      mediaContent.onload = function() {
        if (this.naturalHeight > this.naturalWidth) {
          item.classList.add('portrait');
        } else {
          item.classList.add('landscape');
        }
      };
    } else if (/\.(mp4|webm)$/i.test(file.name)) {
      mediaContent = document.createElement('video');
      mediaContent.src = `${API_URL}${file.path}`;
      mediaContent.controls = true;
      mediaContent.autoplay = false;
      mediaContent.muted = false;
      mediaContent.loop = false;
      mediaContent.playsInline = true;
      mediaContent.preload = 'metadata';
      
      // Fix for video playback issues
      mediaContent.addEventListener('click', function() {
        if (this.paused) {
          this.play();
        } else {
          this.pause();
        }
      });
      
      // Add double-click to fullscreen
      mediaContent.addEventListener('dblclick', function() {
        if (this.requestFullscreen) {
          this.requestFullscreen();
        } else if (this.webkitRequestFullscreen) { /* Safari */
          this.webkitRequestFullscreen();
        } else if (this.msRequestFullscreen) { /* IE11 */
          this.msRequestFullscreen();
        }
      });
    }
    
    mediaContent.className = 'media-content';
    
    // Create 9-zone grid for taps
    const tapZones = document.createElement('div');
    tapZones.className = 'tap-zones';
    
    // Create 9 zones (3x3 grid)
    const zoneConfig = [
      { className: 'top-left', action: 'archive_good' },
      { className: 'top-middle', action: 'best_complete' },
      { className: 'top-right', action: 'best_wip' },
      { className: 'middle-left', action: 'archive' },
      { className: 'middle-center', action: null },
      { className: 'middle-right', action: 'saved' },
      { className: 'bottom-left', action: 'archive_bad' },
      { className: 'bottom-middle', action: 'delete' },
      { className: 'bottom-right', action: 'saved_wip' }
    ];
    
    zoneConfig.forEach(config => {
      const zone = document.createElement('div');
      zone.className = `tap-zone ${config.className}`;
      if (config.action) {
        zone.dataset.action = config.action;
      }
      tapZones.appendChild(zone);
    });
    
    const swipeInstruction = document.createElement('div');
    swipeInstruction.className = 'swipe-instruction';
    
    // Create filename overlay that appears on top of image
    const filenameOverlay = document.createElement('div');
    filenameOverlay.className = 'filename-overlay';
    filenameOverlay.textContent = customFilename || file.name;
    
    item.appendChild(mediaContent);
    item.appendChild(tapZones);
    item.appendChild(swipeInstruction);
    item.appendChild(filenameOverlay);
    
    return item;
  }
  
  // Setup tap handlers
  function setupTapHandlers() {
    const tapZones = document.querySelectorAll('.tap-zone');
    
    tapZones.forEach(zone => {
      if (zone.dataset.action) {
        // Show action label on tap
        zone.addEventListener('click', () => {
          // Show action label
          const actionName = zone.dataset.action;
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
          }
          
          document.body.appendChild(actionLabel);
          
          // Position the label
          const rect = zone.getBoundingClientRect();
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
          
          performAction(actionName);
        });
      }
    });
  }
  
  // Setup swipe handlers
  function setupSwipeHandlers() {
    const mediaItems = document.querySelectorAll('.media-item');
    
    mediaItems.forEach(item => {
      const hammer = new Hammer(item);
      
      // Enable all directions
      hammer.get('swipe').set({ direction: Hammer.DIRECTION_ALL });
      
      hammer.on('swipeleft swiperight swipeup swipedown', (e) => {
        let action;
        
        switch(e.type) {
          case 'swipeleft': action = 'archive'; break;
          case 'swiperight': action = 'saved'; break;
          case 'swipeup': action = 'best_complete'; break;
          case 'swipedown': action = 'delete'; break;
        }
        
        performAction(action);
      });
      
      // Add visual feedback during swipe
      hammer.on('pan', (e) => {
        const instruction = item.querySelector('.swipe-instruction');
        
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
          // Horizontal swipe
          if (e.deltaX > 50) {
            instruction.textContent = 'Swipe right to save';
            instruction.style.opacity = 0.9;
            // Add visual rotation effect
            item.style.transform = `translateX(${e.deltaX * 0.5}px) rotate(${e.deltaX * 0.02}deg)`;
          } else if (e.deltaX < -50) {
            instruction.textContent = 'Swipe left to archive';
            instruction.style.opacity = 0.9;
            // Add visual rotation effect
            item.style.transform = `translateX(${e.deltaX * 0.5}px) rotate(${e.deltaX * 0.02}deg)`;
          } else {
            instruction.style.opacity = 0;
            item.style.transform = '';
          }
        } else {
          // Vertical swipe
          if (e.deltaY < -50) {
            instruction.textContent = 'Swipe up for super save';
            instruction.style.opacity = 0.9;
            // Add visual scale effect
            item.style.transform = `translateY(${e.deltaY * 0.5}px) scale(${1 - Math.abs(e.deltaY) * 0.001})`;
          } else if (e.deltaY > 50) {
            instruction.textContent = 'Swipe down to delete';
            instruction.style.opacity = 0.9;
            // Add visual scale effect
            item.style.transform = `translateY(${e.deltaY * 0.5}px) scale(${1 - Math.abs(e.deltaY) * 0.001})`;
          } else {
            instruction.style.opacity = 0;
            item.style.transform = '';
          }
        }
      });
      
      hammer.on('panend', () => {
        // Reset transform when pan ends without a swipe
        const instruction = item.querySelector('.swipe-instruction');
        instruction.style.opacity = 0;
        item.style.transform = '';
      });
    });
  }
  
  // Initialize the app
  fetchMediaFiles();
});