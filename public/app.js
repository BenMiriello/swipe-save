document.addEventListener('DOMContentLoaded', () => {
  const mediaList = document.getElementById('mediaList');
  // Use window.location to dynamically determine the API_URL
  const API_URL = `${window.location.protocol}//${window.location.host}`;

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

  function updateUI() {
    // Force a repaint
    document.body.style.display = 'none';
    // Using a timeout of 0 to make it asynchronous
    setTimeout(() => {
      document.body.style.display = '';
    }, 0);
    
    // Or force a layout recalculation
    document.querySelectorAll('.media-item').forEach(item => {
      item.style.opacity = '0.99';
      setTimeout(() => {
        item.style.opacity = '1';
      }, 10);
    });
  }

  function checkLoadedImages() {
    const totalImages = document.querySelectorAll('.media-content').length;
    const loadedImages = document.querySelectorAll('.media-content.loaded').length;
    
    console.log(`Images loaded: ${loadedImages}/${totalImages}`);
    
    // Add a visual indicator
    const container = document.querySelector('.container');
    const statusEl = document.createElement('div');
    statusEl.className = 'loading-status';
    statusEl.textContent = `Images loaded: ${loadedImages}/${totalImages}`;
    statusEl.style.position = 'fixed';
    statusEl.style.bottom = '10px';
    statusEl.style.right = '10px';
    statusEl.style.backgroundColor = 'rgba(0,0,0,0.7)';
    statusEl.style.color = 'white';
    statusEl.style.padding = '8px';
    statusEl.style.borderRadius = '4px';
    
    const oldStatus = document.querySelector('.loading-status');
    if (oldStatus) {
      container.removeChild(oldStatus);
    }
    
    container.appendChild(statusEl);
  }
  
  // Call this every second after loading
  function startImageLoadCheck() {
    checkLoadedImages();
    setInterval(checkLoadedImages, 1000);
  }

  async function fetchMediaFiles() {
    const API_URL = `${window.location.protocol}//${window.location.host}`;
    const mediaList = document.getElementById('mediaList');
    
    try {
      // Show loading state
      mediaList.innerHTML = '<div style="text-align:center;padding:20px;">Loading media files...</div>';
      
      // Fetch the files
      console.log('Fetching media files...');
      const response = await fetch(`${API_URL}/api/files`);
      const files = await response.json();
      console.log(`Received ${files.length} files`);
      
      // Empty the container
      mediaList.innerHTML = '';
      
      // Only load the first 20 images to start (for performance)
      const filesToShow = files.slice(0, 20);
      console.log(`Showing first ${filesToShow.length} files`);
      
      // For each file, create and append a simple media item
      filesToShow.forEach(file => {
        // Create container
        const item = document.createElement('div');
        item.className = 'media-item';
        item.dataset.filename = file.name;
        
        // Create image
        const img = document.createElement('img');
        img.className = 'media-content';
        img.src = `${API_URL}/media/${encodeURIComponent(file.name)}`;
        img.alt = file.name;
        
        // Add load event for debugging
        img.onload = () => console.log(`Loaded: ${file.name}`);
        img.onerror = () => console.error(`Failed to load: ${file.name}`);
        
        // Create caption
        const caption = document.createElement('div');
        caption.className = 'media-info';
        caption.textContent = file.name;
        
        // Assemble and append to list
        item.appendChild(img);
        item.appendChild(caption);
        mediaList.appendChild(item);
      });
      
      // Add a count of displayed/total items
      const counter = document.createElement('div');
      counter.style.textAlign = 'center';
      counter.style.padding = '15px';
      counter.textContent = `Showing ${filesToShow.length} of ${files.length} files`;
      mediaList.parentNode.appendChild(counter);
      
      // Setup the swipe handlers
      setupSwipeHandlers();
    } catch (error) {
      console.error('Error loading media files:', error);
      mediaList.innerHTML = `<div style="color:red;text-align:center;padding:20px;">
        Error loading media files: ${error.message}
      </div>`;
    }
  }

  // Update the createMediaItem function to include better logging and error handling
  function createMediaItem(file) {
    const item = document.createElement('div');
    item.className = 'media-item';
    item.dataset.filename = file.name;
    
    let mediaContent;
    const imageUrl = `${API_URL}${file.path}`;
    console.log(`Creating media item for ${file.name}, URL: ${imageUrl}`);
    
    if (/\.(png)$/i.test(file.name)) {
      mediaContent = document.createElement('img');
      mediaContent.alt = file.name;
      mediaContent.src = imageUrl;
      mediaContent.loading = "lazy"; // Use lazy loading for better performance
      
      // Add onload handler to verify successful loading
      mediaContent.onload = function() {
        console.log(`Successfully loaded image: ${file.name}`);
        // Add a class to show it's loaded
        this.classList.add('loaded');
      };
      
      mediaContent.onerror = function() {
        console.error(`Failed to load image: ${imageUrl}`);
        // Try a direct server path instead
        this.src = `${window.location.origin}/media/${encodeURIComponent(file.name)}`;
      };
    } else {
      // Similar handlers for video content
      mediaContent = document.createElement('video');
      mediaContent.src = imageUrl;
      mediaContent.controls = true;
      // Add error handling for videos too
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
          case 'right': instruction.textContent = 'Copying to Mac...'; break;
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
            // Wait for animation to complete before removing
            setTimeout(() => {
              item.remove();
            }, 500);
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
            instruction.textContent = 'Swipe right to copy to Mac';
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

  // Initial load
  fetchMediaFiles();

  // Add a refresh button
  const refreshButton = document.createElement('button');
  refreshButton.textContent = 'Refresh';
  refreshButton.style.display = 'block';
  refreshButton.style.margin = '1rem auto';
  refreshButton.style.padding = '0.5rem 1rem';
  refreshButton.style.backgroundColor = '#007bff';
  refreshButton.style.color = 'white';
  refreshButton.style.border = 'none';
  refreshButton.style.borderRadius = '4px';
  refreshButton.style.cursor = 'pointer';

  refreshButton.addEventListener('click', fetchMediaFiles);
  container.appendChild(refreshButton);
});
