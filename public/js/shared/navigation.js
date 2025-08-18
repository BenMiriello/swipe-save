/**
 * Shared Navigation Component
 * Reusable navigation controls for both individual viewer and file list viewer
 */
window.sharedComponents = window.sharedComponents || {};

window.sharedComponents.navigation = {
  /**
   * Create navigation controls
   * @param {Object} options - Navigation configuration
   * @returns {HTMLElement} Navigation element
   */
  create(options = {}) {
    const {
      showSlider = true,
      showPrevNext = true,
      showCounter = true,
      mode = 'single', // 'single' or 'list'
      onPrevious = null,
      onNext = null,
      onSliderChange = null
    } = options;
    
    const nav = document.createElement('div');
    nav.className = 'navigation-controls';
    
    if (showPrevNext) {
      const prevButton = this.createNavButton('previous', '←', onPrevious);
      nav.appendChild(prevButton);
    }
    
    if (showSlider) {
      const sliderContainer = this.createSlider(mode, onSliderChange);
      nav.appendChild(sliderContainer);
    }
    
    if (showPrevNext) {
      const nextButton = this.createNavButton('next', '→', onNext);
      nav.appendChild(nextButton);
    }
    
    if (showCounter) {
      const counter = this.createCounter();
      nav.appendChild(counter);
    }
    
    return nav;
  },
  
  /**
   * Create navigation button
   */
  createNavButton(type, text, onClick) {
    const button = document.createElement('button');
    button.className = `nav-button nav-${type}`;
    button.textContent = text;
    button.title = type === 'previous' ? 'Previous' : 'Next';
    
    if (onClick) {
      button.addEventListener('click', onClick);
    }
    
    return button;
  },
  
  /**
   * Create slider control
   */
  createSlider(mode, onChange) {
    const container = document.createElement('div');
    container.className = 'slider-container';
    
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'navigation-slider';
    slider.id = 'navigationSlider';
    slider.min = 1;
    slider.max = 1;
    slider.value = 1;
    
    if (onChange) {
      slider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        onChange(value, mode);
      });
    }
    
    container.appendChild(slider);
    return container;
  },
  
  /**
   * Create counter display
   */
  createCounter() {
    const counter = document.createElement('div');
    counter.className = 'image-counter';
    counter.id = 'imageCounter';
    counter.textContent = '0 of 0';
    return counter;
  },
  
  /**
   * Update navigation state
   * @param {Object} state - Current navigation state
   */
  updateState(state) {
    const { currentIndex, totalFiles, mode = 'single' } = state;
    
    // Update slider
    const slider = document.getElementById('navigationSlider');
    if (slider) {
      slider.max = totalFiles;
      slider.value = currentIndex + 1;
    }
    
    // Update counter
    const counter = document.getElementById('imageCounter');
    if (counter) {
      counter.textContent = `${currentIndex + 1} of ${totalFiles}`;
    }
    
    // Update button states
    const prevButton = document.querySelector('.nav-previous');
    const nextButton = document.querySelector('.nav-next');
    
    if (prevButton) {
      prevButton.disabled = currentIndex === 0;
    }
    
    if (nextButton) {
      nextButton.disabled = currentIndex === totalFiles - 1;
    }
  },
  
  /**
   * Handle slider change for different modes
   * @param {number} value - Slider value (1-based)
   * @param {string} mode - Navigation mode
   */
  handleSliderChange(value, mode = 'single') {
    const index = value - 1; // Convert to 0-based
    
    if (mode === 'single') {
      // Single view: jump to specific item
      if (window.stateManager) {
        window.stateManager.setCurrentIndex(index);
        window.navigationController.displayCurrentImage();
      }
    } else if (mode === 'list') {
      // List view: scroll to center item if possible
      this.scrollToItem(index);
    }
  },
  
  /**
   * Scroll to specific item in list view
   * @param {number} index - Item index to scroll to
   */
  scrollToItem(index) {
    const listContainer = document.querySelector('.file-list-container');
    if (!listContainer) return;
    
    const items = listContainer.querySelectorAll('.file-list-item');
    if (!items[index]) return;
    
    const item = items[index];
    const containerHeight = listContainer.clientHeight;
    const itemHeight = item.offsetHeight;
    const itemTop = item.offsetTop;
    const maxScrollTop = listContainer.scrollHeight - containerHeight;
    
    // Try to center the item in the viewport
    let scrollTop = itemTop - (containerHeight / 2) + (itemHeight / 2);
    
    // Handle edge cases: if too close to top or bottom, scroll to limits
    if (scrollTop < 0) {
      scrollTop = 0; // Scroll to top
    } else if (scrollTop > maxScrollTop) {
      scrollTop = maxScrollTop; // Scroll to bottom
    }
    
    listContainer.scrollTo({
      top: scrollTop,
      behavior: 'smooth'
    });
  },
  
  /**
   * Handle page navigation for list view
   * @param {string} direction - 'next' or 'previous'
   */
  handlePageNavigation(direction) {
    const listContainer = document.querySelector('.file-list-container');
    if (!listContainer) return;
    
    const containerHeight = listContainer.clientHeight;
    const currentScrollTop = listContainer.scrollTop;
    
    let newScrollTop;
    if (direction === 'next') {
      newScrollTop = currentScrollTop + containerHeight;
    } else {
      newScrollTop = currentScrollTop - containerHeight;
    }
    
    listContainer.scrollTo({
      top: Math.max(0, newScrollTop),
      behavior: 'smooth'
    });
  }
};