/**
 * Paginated List Viewer Component
 * Modern file list with pagination, previews, and memory management
 */
window.views = window.views || {};

window.views.paginatedListViewer = {
  isInitialized: false,
  currentFiles: [],
  isLoading: false,
  
  /**
   * Initialize the paginated list viewer
   */
  async init() {
    if (this.isInitialized) return;
    
    console.log('Initializing paginated list viewer...');
    
    // Initialize pagination state
    if (window.paginationState) {
      await window.paginationState.initialize();
    }
    
    // Initialize pagination UI components
    if (window.listPagination) {
      window.listPagination.init('topPagination');
      // Clone for bottom pagination
      const bottomContainer = document.getElementById('bottomPagination');
      if (bottomContainer) {
        bottomContainer.innerHTML = document.getElementById('topPagination').innerHTML;
      }
    }
    
    // Set up event listeners
    this.setupEventListeners();
    
    this.isInitialized = true;
    
    // Load first page
    await this.loadCurrentPage();
  },
  
  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Page change events
    document.addEventListener('pageChanged', (e) => {
      this.handlePageChange(e.detail);
    });
    
    // Loading state events
    document.addEventListener('paginationLoading', (e) => {
      this.handleLoadingState(e.detail.loading);
    });
    
    // Error events
    document.addEventListener('paginationError', (e) => {
      this.showError(e.detail.message);
    });
    
    // Settings changes
    document.addEventListener('change', (e) => {
      if (e.target.id === 'globalItemsPerPage') {
        this.handleItemsPerPageChange(parseInt(e.target.value));
      } else if (e.target.id === 'memoryLimit') {
        this.handleMemoryLimitChange(parseInt(e.target.value));
      }
    });
  },
  
  /**
   * Handle page change
   */
  async handlePageChange(detail) {
    console.log(`Loading page ${detail.page}...`);
    await this.loadCurrentPage();
    this.scrollToTop();
  },
  
  /**
   * Handle loading state changes
   */
  handleLoadingState(loading) {
    const mediaList = document.getElementById('mediaList');
    if (!mediaList) return;
    
    if (loading) {
      mediaList.classList.add('loading');
      this.showLoadingPlaceholder();
    } else {
      mediaList.classList.remove('loading');
    }
  },
  
  /**
   * Load current page from pagination state
   */
  async loadCurrentPage() {
    if (!window.paginationState || this.isLoading) return;
    
    try {
      this.isLoading = true;
      
      // Get current page data
      const files = await window.paginationState.getPage(window.paginationState.currentPage);
      this.currentFiles = files || [];
      
      // Update display
      await this.renderFileList();
      
      // Update pagination UI
      if (window.listPagination) {
        window.listPagination.update();
      }
      
    } catch (error) {
      console.error('Failed to load page:', error);
      this.showError('Failed to load media files');
    } finally {
      this.isLoading = false;
    }
  },
  
  /**
   * Render the file list
   */
  async renderFileList() {
    const mediaList = document.getElementById('mediaList');
    if (!mediaList) return;
    
    // Clear existing content
    mediaList.innerHTML = '';
    
    if (this.currentFiles.length === 0) {
      this.showEmptyState();
      return;
    }
    
    // Create file items
    const fragment = document.createDocumentFragment();
    
    for (const [index, file] of this.currentFiles.entries()) {
      const fileItem = await this.createFileItem(file, index);
      fragment.appendChild(fileItem);
    }
    
    mediaList.appendChild(fragment);
    
    // Set up intersection observer for lazy loading
    this.setupLazyLoading();
  },
  
  /**
   * Create individual file item
   */
  async createFileItem(file, index) {
    const item = document.createElement('div');
    item.className = 'media-item paginated-item';
    item.dataset.index = index;
    item.dataset.filename = file.name;
    
    // Create preview container
    const previewContainer = document.createElement('div');
    previewContainer.className = 'preview-container';
    
    // Add preview image if available
    if (file.preview) {
      const preview = document.createElement('img');
      preview.src = file.preview;
      preview.alt = file.name;
      preview.className = 'media-preview';
      preview.loading = 'lazy';
      
      preview.onerror = () => {
        previewContainer.innerHTML = '<div class="preview-placeholder preview-error">Preview failed</div>';
      };
      
      previewContainer.appendChild(preview);
    } else {
      // Show loading placeholder
      previewContainer.innerHTML = '<div class="preview-placeholder">Loading preview...</div>';
      
      // Try to generate preview
      this.generatePreviewForItem(file, previewContainer);
    }
    
    // Create info overlay
    const infoOverlay = document.createElement('div');
    infoOverlay.className = 'item-info-overlay';
    infoOverlay.innerHTML = `
      <div class="item-title">${file.name}</div>
      <div class="item-details">
        <span class="item-size">${this.formatFileSize(file.size)}</span>
        <span class="item-date">${this.formatDate(file.date)}</span>
      </div>
    `;
    
    // Add click handler for single view
    item.addEventListener('click', () => {
      this.openInSingleView(file, index);
    });
    
    item.appendChild(previewContainer);
    item.appendChild(infoOverlay);
    
    return item;
  },
  
  /**
   * Generate preview for item
   */
  async generatePreviewForItem(file, container) {
    try {
      // Request preview generation via existing preview service
      const response = await fetch(`/api/media?limit=1&includePreviews=true&filename=${encodeURIComponent(file.name)}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.items && data.items[0] && data.items[0].preview) {
          const preview = document.createElement('img');
          preview.src = data.items[0].preview;
          preview.alt = file.name;
          preview.className = 'media-preview';
          preview.loading = 'lazy';
          
          container.innerHTML = '';
          container.appendChild(preview);
        }
      }
    } catch (error) {
      console.error('Failed to generate preview:', error);
      container.innerHTML = '<div class="preview-placeholder preview-error">Preview failed</div>';
    }
  },
  
  /**
   * Open file in single view
   */
  openInSingleView(file, listIndex) {
    // Save current list position
    if (window.paginationState) {
      const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
      window.paginationState.saveListPosition(file.name, scrollPosition);
    }
    
    // Calculate global index (across all pages)
    const paginationInfo = window.paginationState?.getPaginationInfo();
    const globalIndex = paginationInfo ? 
      (paginationInfo.currentPage - 1) * paginationInfo.itemsPerPage + listIndex : 
      listIndex;
    
    // Hide list view
    this.hide();
    
    // Show single view using existing navigation
    if (window.navigationController) {
      window.navigationController.showSingleView(globalIndex);
    }
  },
  
  /**
   * Return to list view from single view
   */
  async returnFromSingleView() {
    this.show();
    
    // Restore list position if saved
    const position = window.paginationState?.getListPosition();
    if (position && position.itemId) {
      // Find the page containing this item
      const itemPage = window.paginationState.findItemPage(position.itemId);
      if (itemPage && itemPage !== window.paginationState.currentPage) {
        await window.paginationState.setPage(itemPage);
        await this.loadCurrentPage();
      }
      
      // Scroll to saved position
      if (position.scrollPosition) {
        setTimeout(() => {
          window.scrollTo(0, position.scrollPosition);
        }, 100);
      }
    }
  },
  
  /**
   * Show list view
   */
  show() {
    const mediaContainer = document.querySelector('.media-container');
    if (mediaContainer) {
      mediaContainer.style.display = 'block';
    }
    
    // Update list view button
    const listViewBtn = document.getElementById('listViewButton');
    if (listViewBtn) {
      listViewBtn.style.display = 'none';
    }
  },
  
  /**
   * Hide list view
   */
  hide() {
    const mediaContainer = document.querySelector('.media-container');
    if (mediaContainer) {
      mediaContainer.style.display = 'none';
    }
    
    // Show list view button
    const listViewBtn = document.getElementById('listViewButton');
    if (listViewBtn) {
      listViewBtn.style.display = 'block';
    }
  },
  
  /**
   * Handle items per page change
   */
  async handleItemsPerPageChange(itemsPerPage) {
    if (window.paginationState) {
      window.paginationState.updateSettings({ itemsPerPage });
      
      // Save to server
      await this.savePaginationSettings({ itemsPerPage });
      
      // Reload from page 1
      await window.paginationState.setPage(1);
      await this.loadCurrentPage();
    }
  },
  
  /**
   * Handle memory limit change
   */
  async handleMemoryLimitChange(memoryLimitMB) {
    if (window.paginationState) {
      window.paginationState.updateSettings({ memoryLimitMB });
      
      // Save to server
      await this.savePaginationSettings({ memoryLimitMB });
    }
  },
  
  /**
   * Save pagination settings to server
   */
  async savePaginationSettings(settings) {
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pagination: settings })
      });
    } catch (error) {
      console.warn('Failed to save pagination settings:', error);
    }
  },
  
  /**
   * Set up lazy loading for images
   */
  setupLazyLoading() {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src || img.src;
            img.classList.remove('lazy');
            imageObserver.unobserve(img);
          }
        });
      });
      
      document.querySelectorAll('img.lazy').forEach(img => {
        imageObserver.observe(img);
      });
    }
  },
  
  /**
   * Show loading placeholder
   */
  showLoadingPlaceholder() {
    const mediaList = document.getElementById('mediaList');
    if (!mediaList) return;
    
    mediaList.innerHTML = `
      <div class="loading-placeholder">
        <div class="loading-message">Loading media files...</div>
        <div class="loading-spinner"></div>
      </div>
    `;
  },
  
  /**
   * Show empty state
   */
  showEmptyState() {
    const mediaList = document.getElementById('mediaList');
    if (!mediaList) return;
    
    mediaList.innerHTML = `
      <div class="empty-state">
        <div class="empty-message">No media files found</div>
        <div class="empty-suggestion">Check your source directories in Options</div>
      </div>
    `;
  },
  
  /**
   * Show error message
   */
  showError(message) {
    const mediaList = document.getElementById('mediaList');
    if (!mediaList) return;
    
    mediaList.innerHTML = `
      <div class="error-state">
        <div class="error-message">${message}</div>
        <button onclick="window.views.paginatedListViewer.loadCurrentPage()" class="retry-button">
          Retry
        </button>
      </div>
    `;
  },
  
  /**
   * Scroll to top of page
   */
  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },
  
  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  },
  
  /**
   * Format date for display
   */
  formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  },
  
  /**
   * Get current page info
   */
  getCurrentPageInfo() {
    return window.paginationState?.getPaginationInfo() || null;
  },
  
  /**
   * Refresh current page
   */
  async refresh() {
    if (window.paginationState) {
      // Clear cache for current page
      window.paginationState.loadedPages.delete(window.paginationState.currentPage);
      
      // Reload page
      await this.loadCurrentPage();
    }
  }
};

// Export for global access
window.paginatedListViewer = window.views.paginatedListViewer;