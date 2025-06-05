/**
 * Manages ComfyUI destination settings and modal
 */
const comfyuiManager = {

  /**
   * Initialize ComfyUI destination management
   */
  initializeComfyUIDestinations() {
    const input = document.getElementById('comfyuiDestination');
    const saveBtn = document.getElementById('saveDestination');
    const openBtn = document.getElementById('openComfyUI');
    const moreOptionsToggle = document.getElementById('moreOptionsToggle');
    const moreOptionsContent = document.getElementById('moreOptionsContent');

    if (input && saveBtn) {
      const saved = this.loadSavedDestinations();

      if (!input.value && saved.length === 0) {
        input.value = this.getDefaultComfyUIUrl();
      } else if (!input.value && saved.length > 0) {
        input.value = saved[0];
      }

      input.originalValue = input.value;

      if (openBtn && input.value.trim()) {
        openBtn.style.display = 'flex';
      }

      input.addEventListener('input', () => {
        const hasChanged = input.value.trim() !== input.originalValue;
        saveBtn.style.display = hasChanged ? 'inline-block' : 'none';
        
        if (openBtn) {
          openBtn.style.display = input.value.trim() ? 'flex' : 'none';
        }
      });

      saveBtn.addEventListener('click', () => {
        this.saveDestination(input.value.trim());
        input.originalValue = input.value.trim();
        saveBtn.style.display = 'none';
      });

      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.saveDestination(input.value.trim());
          input.originalValue = input.value.trim();
          saveBtn.style.display = 'none';
        }
      });

      if (openBtn) {
        openBtn.addEventListener('click', () => {
          const url = input.value.trim();
          if (url) {
            window.open(url, '_blank');
          }
        });
      }

      if (moreOptionsToggle && moreOptionsContent) {
        moreOptionsToggle.addEventListener('click', () => {
          const isExpanded = moreOptionsContent.classList.contains('show');
          const destinationItems = document.querySelectorAll('.destination-item');
          
          moreOptionsContent.classList.toggle('show');
          moreOptionsToggle.classList.toggle('expanded');
          
          destinationItems.forEach(item => {
            item.style.display = moreOptionsContent.classList.contains('show') ? 'flex' : 'none';
          });
        });
      }
    }
  },

  /**
   * Get default ComfyUI URL
   */
  getDefaultComfyUIUrl() {
    const currentUrl = new URL(window.location.href);
    return `${currentUrl.protocol}//${currentUrl.hostname}:8188`;
  },

  /**
   * Load saved destinations from storage
   */
  loadSavedDestinations() {
    try {
      const saved = JSON.parse(localStorage.getItem('comfyui-destinations') || '[]');
      
      if (saved.length === 0) {
        const defaultUrl = this.getDefaultComfyUIUrl();
        saved.push(defaultUrl);
        localStorage.setItem('comfyui-destinations', JSON.stringify(saved));
      }

      this.renderDestinations(saved);
      return saved;
    } catch (error) {
      console.error('Error loading destinations:', error);
      const defaultUrl = this.getDefaultComfyUIUrl();
      this.renderDestinations([defaultUrl]);
      return [defaultUrl];
    }
  },

  /**
   * Save a new destination
   */
  saveDestination(url) {
    if (!url) return;

    try {
      const saved = JSON.parse(localStorage.getItem('comfyui-destinations') || '[]');

      if (!saved.includes(url)) {
        saved.push(url);
        localStorage.setItem('comfyui-destinations', JSON.stringify(saved));
        this.renderDestinations(saved);
      }

      this.selectDestination(url);
    } catch (error) {
      console.error('Error saving destination:', error);
    }
  },

  /**
   * Delete a destination
   */
  deleteDestination(url) {
    try {
      let saved = JSON.parse(localStorage.getItem('comfyui-destinations') || '[]');
      saved = saved.filter(dest => dest !== url);

      if (saved.length === 0) {
        saved.push(this.getDefaultComfyUIUrl());
      }

      localStorage.setItem('comfyui-destinations', JSON.stringify(saved));
      this.renderDestinations(saved);

      const input = document.getElementById('comfyuiDestination');
      if (input && input.value === url) {
        this.selectDestination(saved[0]);
      }
    } catch (error) {
      console.error('Error deleting destination:', error);
    }
  },

  /**
   * Select a destination
   */
  selectDestination(url) {
    const input = document.getElementById('comfyuiDestination');
    const openBtn = document.getElementById('openComfyUI');
    
    if (input) {
      input.value = url;
      input.originalValue = url;

      const saveBtn = document.getElementById('saveDestination');
      if (saveBtn) {
        saveBtn.style.display = 'none';
      }
      
      if (openBtn) {
        openBtn.style.display = 'flex';
      }

      const saved = this.loadSavedDestinations();
      this.renderDestinations(saved);
    }
  },

  /**
   * Render saved destinations
   */
  renderDestinations(destinations) {
    const container = document.getElementById('savedDestinations');
    const moreOptionsContainer = document.getElementById('moreOptionsContainer');
    
    if (!container) return;

    container.innerHTML = '';

    const currentDestination = this.getSelectedDestination();
    const availableDestinations = destinations.filter(url => url !== currentDestination && url.trim() !== currentDestination.trim());

    if (moreOptionsContainer) {
      if (availableDestinations.length > 0) {
        moreOptionsContainer.style.display = 'block';
      } else {
        moreOptionsContainer.style.display = 'none';
      }
    }

    availableDestinations.forEach(url => {
      const item = document.createElement('div');
      item.className = 'destination-item';
      item.dataset.url = url;
      item.style.display = 'none';

      const text = document.createElement('span');
      text.className = 'destination-text';
      text.textContent = url;

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'destination-delete';
      deleteBtn.textContent = 'Delete';
      deleteBtn.onclick = (e) => {
        e.stopPropagation();
        this.deleteDestination(url);
      };

      item.appendChild(text);
      item.appendChild(deleteBtn);

      item.onclick = () => {
        this.selectDestination(url);
      };

      container.appendChild(item);
    });
  },

  /**
   * Get currently selected ComfyUI destination
   */
  getSelectedDestination() {
    const input = document.getElementById('comfyuiDestination');
    return input ? input.value.trim() : '';
  }
};

window.comfyuiManager = comfyuiManager;
