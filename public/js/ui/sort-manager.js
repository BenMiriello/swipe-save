/**
 * Sort Manager
 * Handles sort options in the Options dropdown
 */
class SortManager {
  constructor() {
    this.defaultSettings = {
      sortBy: 'date',
      order: 'desc'
    };
    
    this.settings = this.loadSettings();
    this.isExpanded = false;
    this.init();
  }

  /**
   * Initialize sort manager
   */
  init() {
    this.setupEventHandlers();
    this.applySettings();
  }

  /**
   * Setup event handlers
   */
  setupEventHandlers() {
    // Sort field change handler
    const sortField = document.getElementById('sortField');
    if (sortField) {
      sortField.addEventListener('change', (e) => {
        this.settings.sortBy = e.target.value;
        this.updateOrderOptions();
        this.saveSettings();
        this.triggerMediaRefresh();
      });
    }

    // Sort order change handler
    const sortOrder = document.getElementById('sortOrder');
    if (sortOrder) {
      sortOrder.addEventListener('change', (e) => {
        this.settings.order = e.target.value;
        this.saveSettings();
        this.triggerMediaRefresh();
      });
    }
  }

  /**
   * Toggle sort section visibility
   */
  toggleSection() {
    const container = document.getElementById('sortOptionsContainer');
    const caret = document.getElementById('sortSectionCaret');
    
    if (!container || !caret) return;

    this.isExpanded = !this.isExpanded;
    
    if (this.isExpanded) {
      container.style.display = 'block';
      caret.classList.add('expanded');
    } else {
      container.style.display = 'none';
      caret.classList.remove('expanded');
    }
    
    // Save expansion state
    localStorage.setItem('sortSectionExpanded', JSON.stringify(this.isExpanded));
  }

  /**
   * Load settings from localStorage
   */
  loadSettings() {
    try {
      const saved = localStorage.getItem('sortSettings');
      const expanded = localStorage.getItem('sortSectionExpanded');
      
      if (expanded) {
        this.isExpanded = JSON.parse(expanded);
      }
      
      if (saved) {
        return { ...this.defaultSettings, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('Error loading sort settings:', error);
    }
    
    return { ...this.defaultSettings };
  }

  /**
   * Save settings to localStorage
   */
  saveSettings() {
    try {
      localStorage.setItem('sortSettings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Error saving sort settings:', error);
    }
  }

  /**
   * Apply current settings to UI elements
   */
  applySettings() {
    const sortField = document.getElementById('sortField');
    const sortOrder = document.getElementById('sortOrder');
    const container = document.getElementById('sortOptionsContainer');
    const caret = document.getElementById('sortSectionCaret');
    
    if (sortField) {
      sortField.value = this.settings.sortBy;
    }
    
    if (sortOrder) {
      this.updateOrderOptions();
      sortOrder.value = this.settings.order;
    }
    
    // Apply expansion state
    if (container && caret) {
      if (this.isExpanded) {
        container.style.display = 'block';
        caret.classList.add('expanded');
      } else {
        container.style.display = 'none';
        caret.classList.remove('expanded');
      }
    }
  }

  /**
   * Update order options based on sort field
   */
  updateOrderOptions() {
    const sortOrder = document.getElementById('sortOrder');
    if (!sortOrder) return;

    // Clear current options
    sortOrder.innerHTML = '';
    
    switch (this.settings.sortBy) {
      case 'date':
      case 'created':
        sortOrder.innerHTML = `
          <option value="desc">Newest First</option>
          <option value="asc">Oldest First</option>
        `;
        break;
      case 'name':
        sortOrder.innerHTML = `
          <option value="asc">A to Z</option>
          <option value="desc">Z to A</option>
        `;
        break;
      case 'size':
        sortOrder.innerHTML = `
          <option value="desc">Largest First</option>
          <option value="asc">Smallest First</option>
        `;
        break;
      default:
        sortOrder.innerHTML = `
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        `;
    }
  }

  /**
   * Get current sort parameters for API calls
   */
  getSortParams() {
    return {
      sortBy: this.settings.sortBy,
      order: this.settings.order
    };
  }

  /**
   * Trigger media file refresh with new sort settings
   */
  triggerMediaRefresh() {
    if (window.appController && window.appController.fetchMediaFiles) {
      console.log('Triggering media refresh with new sort settings:', this.settings);
      window.appController.fetchMediaFiles();
    }
  }
}

// Global function for HTML onclick handler
function toggleSortSection() {
  if (window.sortManager) {
    window.sortManager.toggleSection();
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.sortManager = new SortManager();
});

// Also initialize if DOM is already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.sortManager = new SortManager();
  });
} else {
  window.sortManager = new SortManager();
}