/**
 * List Pagination Component
 * Provides pagination controls for the media list view
 */
class ListPagination {
  constructor() {
    this.container = null;
    this.initialized = false;
  }

  /**
   * Initialize pagination component
   */
  init(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`Pagination container not found: ${containerId}`);
      return false;
    }

    this.render();
    this.attachEventListeners();
    this.initialized = true;
    return true;
  }

  /**
   * Render pagination controls
   */
  render() {
    if (!window.paginationState) {
      console.error('Pagination state not initialized');
      return;
    }

    const info = window.paginationState.getPaginationInfo();
    
    this.container.innerHTML = `
      <div class="pagination-controls">
        <div class="pagination-nav">
          <button 
            id="prev-page-btn" 
            class="pagination-btn" 
            ${!info.hasPrev ? 'disabled' : ''}
            title="Previous page"
          >
            ←
          </button>
          
          <div class="page-selector">
            <select id="page-dropdown" class="page-dropdown">
              ${this.generatePageOptions(info)}
            </select>
          </div>
          
          <button 
            id="next-page-btn" 
            class="pagination-btn" 
            ${!info.hasNext ? 'disabled' : ''}
            title="Next page"
          >
            →
          </button>
        </div>
        
        <div class="pagination-info">
          <span class="items-info">
            ${this.getItemRangeText(info)} of ${info.totalItems.toLocaleString()} items
          </span>
          
          <span class="memory-info" title="Cache memory usage">
            Cache: ${info.memoryUsageMB.toFixed(1)}MB
          </span>
        </div>
        
        <div class="pagination-settings">
          <label for="items-per-page" class="items-per-page-label">
            Items per page:
          </label>
          <select id="items-per-page" class="items-per-page-select">
            <option value="50" ${info.itemsPerPage === 50 ? 'selected' : ''}>50</option>
            <option value="100" ${info.itemsPerPage === 100 ? 'selected' : ''}>100</option>
            <option value="200" ${info.itemsPerPage === 200 ? 'selected' : ''}>200</option>
            <option value="500" ${info.itemsPerPage === 500 ? 'selected' : ''}>500</option>
          </select>
        </div>
      </div>
    `;
  }

  /**
   * Generate page options for dropdown
   */
  generatePageOptions(info) {
    let options = '';
    
    for (let page = 1; page <= info.totalPages; page++) {
      const startItem = (page - 1) * info.itemsPerPage + 1;
      const endItem = Math.min(page * info.itemsPerPage, info.totalItems);
      const isSelected = page === info.currentPage ? 'selected' : '';
      
      options += `
        <option value="${page}" ${isSelected}>
          Page ${page} (${startItem.toLocaleString()}-${endItem.toLocaleString()})
        </option>
      `;
    }
    
    return options;
  }

  /**
   * Get current item range text
   */
  getItemRangeText(info) {
    if (info.totalItems === 0) return '0';
    
    const startItem = (info.currentPage - 1) * info.itemsPerPage + 1;
    const endItem = Math.min(info.currentPage * info.itemsPerPage, info.totalItems);
    
    return `${startItem.toLocaleString()}-${endItem.toLocaleString()}`;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Previous page button
    const prevBtn = document.getElementById('prev-page-btn');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => this.previousPage());
    }

    // Next page button
    const nextBtn = document.getElementById('next-page-btn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.nextPage());
    }

    // Page dropdown
    const pageDropdown = document.getElementById('page-dropdown');
    if (pageDropdown) {
      pageDropdown.addEventListener('change', (e) => {
        this.goToPage(parseInt(e.target.value));
      });
    }

    // Items per page selector
    const itemsPerPageSelect = document.getElementById('items-per-page');
    if (itemsPerPageSelect) {
      itemsPerPageSelect.addEventListener('change', (e) => {
        this.changeItemsPerPage(parseInt(e.target.value));
      });
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (this.shouldHandleKeyboard(e)) {
        this.handleKeyboardNavigation(e);
      }
    });
  }

  /**
   * Check if keyboard event should be handled
   */
  shouldHandleKeyboard(e) {
    // Don't handle if user is typing in input/textarea
    const activeElement = document.activeElement;
    if (activeElement && (
      activeElement.tagName === 'INPUT' || 
      activeElement.tagName === 'TEXTAREA' || 
      activeElement.contentEditable === 'true'
    )) {
      return false;
    }

    // Only handle arrow keys and page up/down
    return ['ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown'].includes(e.key);
  }

  /**
   * Handle keyboard navigation
   */
  handleKeyboardNavigation(e) {
    switch (e.key) {
      case 'ArrowLeft':
      case 'PageUp':
        e.preventDefault();
        this.previousPage();
        break;
      case 'ArrowRight':
      case 'PageDown':
        e.preventDefault();
        this.nextPage();
        break;
    }
  }

  /**
   * Go to previous page
   */
  async previousPage() {
    if (!window.paginationState) return;
    
    const info = window.paginationState.getPaginationInfo();
    if (info.hasPrev) {
      await this.goToPage(info.currentPage - 1);
    }
  }

  /**
   * Go to next page
   */
  async nextPage() {
    if (!window.paginationState) return;
    
    const info = window.paginationState.getPaginationInfo();
    if (info.hasNext) {
      await this.goToPage(info.currentPage + 1);
    }
  }

  /**
   * Go to specific page
   */
  async goToPage(page) {
    if (!window.paginationState) return;

    try {
      // Show loading state
      this.showLoading();
      
      // Update pagination state
      await window.paginationState.setPage(page);
      
      // Trigger page change event
      this.dispatchPageChangeEvent(page);
      
      // Update UI
      this.render();
      
    } catch (error) {
      console.error('Failed to change page:', error);
      this.showError('Failed to load page');
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Change items per page
   */
  async changeItemsPerPage(itemsPerPage) {
    if (!window.paginationState) return;

    try {
      // Update pagination settings
      window.paginationState.updateSettings({ itemsPerPage });
      
      // Save to server config
      await this.saveItemsPerPageSetting(itemsPerPage);
      
      // Reset to page 1 and reload
      await this.goToPage(1);
      
    } catch (error) {
      console.error('Failed to update items per page:', error);
      this.showError('Failed to update page size');
    }
  }

  /**
   * Save items per page setting to server
   */
  async saveItemsPerPageSetting(itemsPerPage) {
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pagination: { itemsPerPage }
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save pagination settings');
      }
    } catch (error) {
      console.warn('Failed to save pagination settings:', error);
    }
  }

  /**
   * Dispatch page change event
   */
  dispatchPageChangeEvent(page) {
    const event = new CustomEvent('pageChanged', {
      detail: { 
        page,
        paginationInfo: window.paginationState.getPaginationInfo()
      }
    });
    document.dispatchEvent(event);
  }

  /**
   * Show loading state
   */
  showLoading() {
    const loadingEvent = new CustomEvent('paginationLoading', { detail: { loading: true } });
    document.dispatchEvent(loadingEvent);
  }

  /**
   * Hide loading state
   */
  hideLoading() {
    const loadingEvent = new CustomEvent('paginationLoading', { detail: { loading: false } });
    document.dispatchEvent(loadingEvent);
  }

  /**
   * Show error message
   */
  showError(message) {
    const errorEvent = new CustomEvent('paginationError', { detail: { message } });
    document.dispatchEvent(errorEvent);
  }

  /**
   * Update pagination display without changing page
   */
  update() {
    if (this.initialized) {
      this.render();
    }
  }

  /**
   * Get current page information
   */
  getCurrentPageInfo() {
    return window.paginationState ? window.paginationState.getPaginationInfo() : null;
  }

  /**
   * Scroll to top of list (called after page change)
   */
  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// Global pagination component instance
window.listPagination = new ListPagination();