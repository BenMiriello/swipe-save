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
  
  // Fetch media files
  async function fetchMediaFiles() {
    try {
      const response = await fetch(`${API_URL}/api/files`);
      const files = await response.json();
      
      mediaList.innerHTML = '';
      
      files.forEach(file => {
        const mediaItem = createMediaItem(file);
        mediaList.appendChild(mediaItem);
      });
      
      setupSwipeHandlers();
    } catch (error) {
      console.error('Error fetching media files:', error);
    }
  }
  
  // Create media item element
  function createMediaItem(file) {
    const item = document.createElement('div');
    item.className = 'media-item';
    item.dataset.filename = file.name;
    
    let mediaContent;
    if (/\.(png)$/i.test(file.name)) {
      mediaContent = document.createElement('img');
      mediaContent.src = `${API_URL}${file.path}`;
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
