// app.js
document.addEventListener('DOMContentLoaded', () => {
  const mediaList = document.getElementById('mediaList');
  const API_URL = 'http://your-debian-ip:3000';
  
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
      hammer.on('swipeleft swiperight', async (e) => {
        const filename = item.dataset.filename;
        const action = e.type === 'swiperight' ? 'right' : 'left';
        
        // Visual feedback
        item.classList.add(`swipe-${action}`);
        item.querySelector('.swipe-instruction').textContent = 
          action === 'right' ? 'Copying to Mac...' : 'Moving to date folder...';
        
        try {
          const response = await fetch(`${API_URL}/api/files/action`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ filename, action })
          });
          
          if (response.ok) {
            setTimeout(() => {
              item.remove();
            }, 300);
          }
        } catch (error) {
          console.error('Error performing action:', error);
          item.classList.remove(`swipe-${action}`);
        }
      });
      
      hammer.on('swipemove', (e) => {
        const instruction = item.querySelector('.swipe-instruction');
        if (e.deltaX > 50) {
          instruction.textContent = 'Swipe right to copy to Mac';
          item.classList.add('swiping');
        } else if (e.deltaX < -50) {
          instruction.textContent = 'Swipe left to move to date folder';
          item.classList.add('swiping');
        } else {
          item.classList.remove('swiping');
        }
      });
      
      hammer.on('swipeend', () => {
        item.classList.remove('swiping');
      });
    });
  }
  
  // Initial load
  fetchMediaFiles();
  
  // Refresh periodically
  setInterval(fetchMediaFiles, 30000);
});
