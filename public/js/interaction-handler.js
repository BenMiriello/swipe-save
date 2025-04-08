/**
 * Handles user interactions like keyboard, swipe, and tap events
 */
const interactionHandler = {
  /**
   * Initialize with app controller callback functions
   * @param {Object} callbacks - Object containing callback functions
   */
  init(callbacks) {
    this.callbacks = callbacks;
    
    // Add event listeners
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  },
  
  /**
   * Set up tap handlers for the current media item
   */
  setupTapHandlers() {
    const tapZones = document.querySelectorAll('.tap-zone');
    
    tapZones.forEach(zone => {
      if (zone.dataset.action) {
        // Show action label on tap
        zone.addEventListener('click', () => {
          // Special case for middle center zone (open file)
          if (zone.dataset.action === 'open_file') {
            this.callbacks.openFile();
            return;
          }
          
          // Get the action name and rect for visual feedback
          const actionName = zone.dataset.action;
          const rect = zone.getBoundingClientRect();
          
          // Show visual feedback
          this.callbacks.showActionLabel(actionName, rect);
          
          // Perform the action
          this.callbacks.performAction(actionName);
        });
      }
    });
  },
  
  /**
   * Set up swipe handlers for the current media item
   */
  setupSwipeHandlers() {
    const mediaItems = document.querySelectorAll('.media-item');
    
    // Check if Hammer.js is available
    if (typeof Hammer === 'undefined') {
      console.error('Hammer.js not available for swipe gestures');
      return;
    }
    
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
        
        this.callbacks.performAction(action);
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
  },
  
  /**
   * Handle keyboard events
   * @param {KeyboardEvent} e - Keyboard event
   */
  handleKeyDown(e) {
    // Skip if typing in an input or textarea
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    // Handle arrow key navigation
    if (e.key === 'ArrowLeft' && !e.metaKey) {
      e.preventDefault();
      this.callbacks.showPrevious();
      return;
    }
    
    if (e.key === 'ArrowRight' && !e.metaKey) {
      e.preventDefault();
      this.callbacks.showNext();
      return;
    }
    
    // Map 'n' key to filename modal (for renaming)
    if (e.key.toLowerCase() === 'n') {
      e.preventDefault();
      this.callbacks.openFilenameModal();
      return;
    }
    
    // Handle action keys (from the keyboardMap in config)
    if (window.appConfig.keyboardMap[e.key] && !e.metaKey) {
      const action = window.appConfig.keyboardMap[e.key];
      this.callbacks.performAction(action);
      return;
    }
    
    // Handle Command/Ctrl key combinations
    if (e.metaKey) {
      switch(e.key) {
        // Command+Z for undo
        case 'z':
          e.preventDefault();
          this.callbacks.undoLastAction();
          return;
          
        // Command+O for options menu
        case 'o':
          e.preventDefault();
          this.callbacks.toggleOptions();
          return;
          
        // Command+S for download
        case 's':
          e.preventDefault();
          this.callbacks.downloadCurrentFile();
          return;
          
        // Command+R for refresh
        case 'r':
          e.preventDefault();
          this.callbacks.refreshFiles();
          return;
          
        // Command+Left or Command+A/J for previous image
        case 'ArrowLeft':
          e.preventDefault();
          this.callbacks.performAction('best_complete');
          return;
          
        // Command+Down for delete
        case 'ArrowDown':
          e.preventDefault();
          this.callbacks.performAction('delete');
          return;
          
        // Command+Right for next image
        case 'ArrowRight':
          e.preventDefault();
          this.callbacks.showNext();
          return;
      }
      
      // Command+A/J for previous image
      if (e.key.toLowerCase() === 'a' || e.key.toLowerCase() === 'j') {
        e.preventDefault();
        this.callbacks.showPrevious();
        return;
      }
      
      // Command+D/L for next image
      if (e.key.toLowerCase() === 'd' || e.key.toLowerCase() === 'l') {
        e.preventDefault();
        this.callbacks.showNext();
        return;
      }
    }
  }
};

// Export as a global variable
window.interactionHandler = interactionHandler;