/**
 * Shared Toolbar Component
 * Reusable toolbar for both individual viewer and file list viewer
 */
window.sharedComponents = window.sharedComponents || {};

window.sharedComponents.toolbar = {
  /**
   * Create toolbar element with specified buttons
   * @param {Object} options - Toolbar configuration
   * @param {Array} options.buttons - Array of button configurations
   * @param {string} options.title - Optional title text
   * @param {string} options.leftContent - Optional left content (like options)
   * @returns {HTMLElement} Toolbar element
   */
  create(options = {}) {
    const { buttons = [], title = '', leftContent = null } = options;
    
    const toolbar = document.createElement('div');
    toolbar.className = 'header-container';
    
    // Left content (options dropdown or other)
    if (leftContent) {
      toolbar.appendChild(leftContent);
    }
    
    // Title
    if (title) {
      const titleElement = document.createElement('h1');
      titleElement.textContent = title;
      toolbar.appendChild(titleElement);
    }
    
    // Right buttons
    if (buttons.length > 0) {
      const iconsContainer = document.createElement('div');
      iconsContainer.className = 'header-icons';
      
      buttons.forEach(buttonConfig => {
        const button = this.createButton(buttonConfig);
        iconsContainer.appendChild(button);
      });
      
      toolbar.appendChild(iconsContainer);
    }
    
    return toolbar;
  },
  
  /**
   * Create individual button
   * @param {Object} config - Button configuration
   * @returns {HTMLElement} Button element
   */
  createButton(config) {
    const { 
      type, 
      title, 
      icon, 
      iconSvg, 
      onClick, 
      className = '',
      id = null 
    } = config;
    
    const button = document.createElement('button');
    button.className = `icon-button ${type}-icon ${className}`.trim();
    button.title = title;
    
    if (id) {
      button.id = id;
    }
    
    if (iconSvg) {
      button.innerHTML = iconSvg;
    } else if (icon) {
      button.innerHTML = icon;
    }
    
    if (onClick) {
      button.addEventListener('click', onClick);
    }
    
    return button;
  },
  
  /**
   * Get standard button configurations
   */
  getStandardButtons() {
    return {
      reload: {
        type: 'reload',
        title: 'Reload Media',
        iconSvg: `<svg width="50px" height="50px" stroke="currentColor" stroke-width="1" fill="currentColor" color="currentColor" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg"><path d="M25 38c-7.2 0-13-5.8-13-13 0-3.2 1.2-6.2 3.3-8.6l1.5 1.3C15 19.7 14 22.3 14 25c0 6.1 4.9 11 11 11 1.6 0 3.1-.3 4.6-1l.8 1.8c-1.7.8-3.5 1.2-5.4 1.2z"/><path d="M34.7 33.7l-1.5-1.3c1.8-2 2.8-4.6 2.8-7.3 0-6.1-4.9-11-11-11-1.6 0-3.1.3-4.6 1l-.8-1.8c1.7-.8 3.5-1.2 5.4-1.2 7.2 0 13 5.8 13 13 0 3.1-1.2 6.2-3.3 8.6z"/><path d="M18 24h-2v-6h-6v-2h8z"/><path d="M40 34h-8v-8h2v6h6z"/></svg>`,
        onClick: () => window.actionController?.reloadMedia?.()
      },
      download: {
        type: 'save',
        title: 'Download',
        iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`,
        onClick: () => window.actionController?.downloadCurrentFile?.()
      },
      comfyui: {
        type: 'comfyui',
        title: 'Load in ComfyUI',
        icon: '&#x2192;',
        onClick: () => window.actionController?.loadInComfyUI?.()
      },
      listView: {
        type: 'list-view',
        title: 'List View',
        icon: '☰',
        onClick: () => {
          if (window.navigationController && window.navigationController.showListView) {
            window.navigationController.showListView();
          }
        }
      },
      singleView: {
        type: 'single-view', 
        title: 'Single View',
        icon: '□',
        onClick: () => {
          if (window.navigationController && window.navigationController.showSingleView) {
            window.navigationController.showSingleView();
          }
        }
      }
    };
  }
};