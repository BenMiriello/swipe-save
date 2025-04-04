document.addEventListener('DOMContentLoaded', () => {
  const mediaList = document.getElementById('mediaList');
  const API_URL = `${window.location.protocol}//${window.location.host}`;
  
  // State management
  let allFiles = [];
  let currentIndex = 0;
  
  // Add instruction legend
  const container = document.querySelector('.container');
  const legend = document.createElement('div');
  legend.className = 'legend';
  legend.innerHTML = `
    <h3>Swipe Actions:</h3>
    <ul>
      <li><span class="action-icon">←</span> Move to date folder</li>
      <li><span class="action-icon">→</span> Copy to local backup + Move to date folder</li>
      <li><span class="action-icon">↑</span> Super save (add * to filename)</li>
      <li><span class="action-icon">↓</span> Move to deleted folder</li>
    </ul>
  `;
  container.insertBefore(legend, mediaList.parentElement);
  
  // Add controls
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
  
  // Add refresh button
  const refreshButton = document.createElement('button');
  refreshButton.className = 'btn btn-primary';
  refreshButton.textContent = 'Refresh';
  refreshButton.addEventListener('click', fetchMediaFiles);
  
  controls.appendChild(prevButton);
  controls.appendChild(undoButton);
  controls.appendChild(nextButton);
  controls.appendChild(refreshButton);
  
  container.appendChild(controls);
  
  // Add image counter display
  const imageCounter = document.createElement('div');
  imageCounter.className = 'image-counter';
  container.appendChild(imageCounter);
  
  // Function to update the image counter display
  function updateImageCounter() {
    if (allFiles.length === 0) {
      imageCounter.textContent = 'No images';
    } else {
      imageCounter.textContent = `Image ${currentIndex + 1} of ${allFiles.length}`;
    }
  }
  
  // Navigate to previous image
  function showPreviousImage() {
    if (allFiles.length === 0) return;
    
    currentIndex = (currentIndex - 1 + allFiles.length) % allFiles.length;
    displayCurrentImage();
  }
  
  // Navigate to next image
  function showNextImage() {
    if (allFiles.length === 0) return;
    
    currentIndex = (currentIndex + 1) % allFiles.length;
    displayCurrentImage();
  }
  
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
    updateImageCounter();
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
    } else {
      mediaContent = document.createElement('video');
      mediaContent.src = `${API_URL}${file.path}`;
      mediaContent.controls = true;
    }
    
    mediaContent.className = 'media-content';
    
    const swipeInstruction = document.createElement('div');
    swipeInstruction.className = 'swipe-instruction';
    
    const info = document.createElement('div');
    info.className = 'media-info';
    
    const name = document.createElement('div');
    name.className = 'media-name';
    name.textContent = file.name;
    
    info.appendChild(name);
    item.appendChild(mediaContent);
    item.appendChild(swipeInstruction);
    item.appendChild(info);
    
    return item;
  }
  
  // Setup swipe handlers
  function setupSwipeHandlers() {
    const mediaItems = document.querySelectorAll('.media-item');
    
    mediaItems.forEach(item => {
      const hammer = new Hammer(item);
      
      // Enable all directions
      hammer.get('swipe').set({ direction: Hammer.DIRECTION_ALL });
      
      hammer.on('swipeleft swiperight swipeup swipedown', async (e) => {
        const filename = item.dataset.filename;
        let action;
        
        switch(e.type) {
          case 'swipeleft': action = 'left'; break;
          case 'swiperight': action = 'right'; break;
          case 'swipeup': action = 'up'; break;
          case 'swipedown': action = 'down'; break;
        }
        
        // Visual feedback
        item.classList.add(`swipe-${action}`);
        
        // Update instruction text
        const instruction = item.querySelector('.swipe-instruction');
        switch(action) {
          case 'left': instruction.textContent = 'Moving to date folder...'; break;
          case 'right': instruction.textContent = 'Copying to local backup...'; break;
          case 'up': instruction.textContent = 'Super saving...'; break;
          case 'down': instruction.textContent = 'Moving to deleted...'; break;
        }
        instruction.style.opacity = 1;
        
        try {
          const response = await fetch(`${API_URL}/api/files/action`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ filename, action })
          });
          
          if (response.ok) {
            // Wait for animation to complete
            setTimeout(() => {
              // Remove current file from array
              allFiles.splice(currentIndex, 1);
              
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
            }, 500);
          } else {
            // Handle error
            const errorData = await response.json();
            console.error('Action failed:', errorData.error);
            item.classList.remove(`swipe-${action}`);
            instruction.style.opacity = 0;
          }
        } catch (error) {
          console.error('Error performing action:', error);
          item.classList.remove(`swipe-${action}`);
          instruction.style.opacity = 0;
        }
      });
      
      // Add visual feedback during swipe
      hammer.on('pan', (e) => {
        const instruction = item.querySelector('.swipe-instruction');
        
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
          // Horizontal swipe
          if (e.deltaX > 50) {
            instruction.textContent = 'Swipe right to copy to local backup';
            instruction.style.opacity = 0.9;
            // Add visual rotation effect
            item.style.transform = `translateX(${e.deltaX * 0.5}px) rotate(${e.deltaX * 0.02}deg)`;
          } else if (e.deltaX < -50) {
            instruction.textContent = 'Swipe left to move to date folder';
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
            instruction.textContent = 'Swipe up for super save (add *)';
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
