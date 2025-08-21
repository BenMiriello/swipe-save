/**
 * List Page Controller - Clean implementation without single-view dependencies
 */
class ListPage {
  constructor() {
    this.isInitialized = false;
  }
  
  /**
   * Initialize and render the list page
   */
  async init() {
    if (this.isInitialized) return;
    
    console.log('Initializing List Page');
    
    // Hide all single-view elements
    this.hideSingleViewElements();
    
    // Show list view elements
    this.showListViewElements();
    
    // Initialize Alpine.js list view
    await this.initializeListView();
    
    this.isInitialized = true;
  }
  
  /**
   * Hide single view elements
   */
  hideSingleViewElements() {
    const elementsToHide = [
      '.media-container',
      '.bottom-controls',
      '#listViewButton'
    ];
    
    elementsToHide.forEach(selector => {
      const element = document.querySelector(selector);
      if (element) {
        element.style.display = 'none';
      }
    });
  }
  
  /**
   * Show list view elements
   */
  showListViewElements() {
    // Clear any existing list view
    const existing = document.querySelector('.alpine-list-view');
    if (existing) {
      existing.remove();
    }
    
    // Create list view container
    this.createListViewContainer();
  }
  
  /**
   * Create the list view container
   */
  createListViewContainer() {
    const container = document.createElement('div');
    container.className = 'alpine-list-view';
    container.setAttribute('x-data', 'listViewController()');
    
    container.innerHTML = `
      <!-- ComfyUI Queue Section -->
      <div class="comfyui-section" x-data="queueViewer()">
        <div class="comfyui-section-header" @click="toggleQueueSection()">
          <span class="comfyui-section-caret" :class="{ 'expanded': isQueueExpanded }">▶</span>
          <h3 class="comfyui-section-title">
            Active Queue
            <span x-show="!isQueueExpanded && queueItems.length === 0" class="comfyui-status-summary">empty</span>
            <span x-show="!isQueueExpanded && queueItems.length > 0" class="comfyui-queue-indicators">
              <span class="comfyui-header-dot active"></span>
              <template x-for="index in Math.min(3, queueItems.length - 1)" :key="index">
                <span class="comfyui-header-dot"></span>
              </template>
              <span class="comfyui-queue-overflow" x-text="getQueueSummary()"></span>
            </span>
          </h3>
          <button class="comfy-btn comfy-btn-warning comfy-btn-small" 
                  @click.stop="$store.queueViewer.showCancelAllModal = true"
                  x-show="queueItems.length > 0 && isQueueExpanded">
            Clear Queue
          </button>
        </div>
        
        <div class="comfyui-section-content" x-show="isQueueExpanded" x-transition>
          <template x-if="queueItems.length === 0">
            <div class="comfyui-queue-empty">No items in queue</div>
          </template>
          
          <template x-if="queueItems.length > 0">
            <div class="comfyui-queue-list">
              <template x-for="(item, index) in queueItems" :key="item[0]">
                <div class="comfyui-queue-item" 
                     :class="{ 'active': index === 0 }"
                     @click="openItemDetails(item)">
                  <div class="comfyui-queue-item-indicator"></div>
                  <div class="comfyui-queue-item-id" x-text="item[0]"></div>
                </div>
              </template>
            </div>
          </template>
        </div>
      </div>
      
      <!-- File List Section -->
      <div class="comfyui-section" x-data="{ isFileListExpanded: true }">
        <div class="comfyui-section-header" @click="isFileListExpanded = !isFileListExpanded; $store.listView.fileListOpen = isFileListExpanded;">
          <span class="comfyui-section-caret" :class="{ 'expanded': isFileListExpanded }">▶</span>
          <h3 class="comfyui-section-title">
            File List
            <span x-show="!isFileListExpanded" class="comfyui-status-summary" x-text="'page ' + $store.listView.currentPage + ' of ' + $store.listView.totalPages"></span>
          </h3>
        </div>
        
        <div class="comfyui-section-content" x-show="isFileListExpanded" x-transition>
          <!-- Compact Pagination Controls -->
          <div x-show="$store.listView.totalPages > 1" class="compact-pagination-controls">
            <button @click="$store.listView.togglePreviews()" 
                    class="preview-toggle-btn" 
                    :class="{ 'active': $store.listView.showPreviews }"
                    title="Toggle Previews">
              <span class="toggle-icon">⚬</span>
            </button>
            
            <div class="pagination-center">
              <button @click="$store.listView.previousPage()" 
                      :disabled="$store.listView.currentPage === 1"
                      class="page-btn">
                ← Previous
              </button>
              <span class="page-info">
                Page <span x-text="$store.listView.currentPage"></span> of <span x-text="$store.listView.totalPages"></span>
              </span>
              <button @click="$store.listView.nextPage()" 
                      :disabled="$store.listView.currentPage === $store.listView.totalPages"
                      class="page-btn">
                Next →
              </button>
            </div>
          </div>
        
          <!-- Loading State -->
          <div x-show="$store.listView.isLoading" class="loading">
            Loading files...
          </div>
        
          <!-- File List -->
          <div x-show="!$store.listView.isLoading && $store.listView.displayedFiles.length > 0" 
               class="file-list">
            <template x-for="(file, index) in $store.listView.displayedFiles" :key="file.name">
              <div class="file-item" 
                   :class="{ 
                     'highlighted': ($store.listView.currentPage - 1) * $store.listView.itemsPerPage + index === $store.listView.selectedFileIndex 
                   }"
                   :data-item-index="index"
                   @click="$store.listView.selectFile(index)">
                
                <!-- Preview (when enabled) -->
                <div class="file-preview" x-show="$store.listView.showPreviews">
                  <div x-show="file.preview" x-transition>
                    <img :src="$store.listView.getFilePreviewUrl(file)" 
                         :alt="file.name"
                         class="preview-thumbnail"
                         loading="lazy">
                  </div>
                  <div x-show="!file.preview" class="preview-placeholder" x-transition>
                    <span x-show="$store.listView.isVideoFile(file.name)">🎥</span>
                    <span x-show="$store.listView.isImageFile(file.name)">🖼️</span>
                  </div>
                </div>
                
                <!-- File Info -->
                <div class="file-info">
                  <div class="file-name" x-text="file.name"></div>
                  <div class="file-details">
                    <span class="file-size" x-text="$store.listView.formatFileSize(file.size)"></span>
                    <span x-show="file.dimensions" class="file-dimensions" x-text="file.dimensions"></span>
                  </div>
                </div>
              </div>
            </template>
          </div>
        
          <!-- Empty State -->
          <div x-show="!$store.listView.isLoading && $store.listView.displayedFiles.length === 0" 
               class="empty-state">
            No files found.
          </div>
        </div>
      </div>
    `;
    
    // Add to page
    const header = document.querySelector('.header-container');
    if (header && header.nextSibling) {
      header.parentNode.insertBefore(container, header.nextSibling);
    } else {
      document.body.appendChild(container);
    }
  }
  
  /**
   * Initialize Alpine.js list view functionality
   */
  async initializeListView() {
    // Wait for Alpine to be available
    await this.waitForAlpine();
    
    // Initialize Alpine.js for the new component
    if (window.Alpine) {
      const container = document.querySelector('.alpine-list-view');
      if (container) {
        window.Alpine.initTree(container);
      }
    }
    
    // Initialize the list view store
    if (Alpine?.store('listView')) {
      Alpine.store('listView').init();
    }
  }
  
  /**
   * Wait for Alpine.js to be available
   */
  waitForAlpine() {
    return new Promise((resolve) => {
      if (window.Alpine) {
        resolve();
        return;
      }
      
      const checkAlpine = () => {
        if (window.Alpine) {
          resolve();
        } else {
          setTimeout(checkAlpine, 100);
        }
      };
      checkAlpine();
    });
  }
  
  /**
   * Navigate to single file view
   */
  navigateToFile(file, index) {
    const globalIndex = (Alpine.store('listView').currentPage - 1) * Alpine.store('listView').itemsPerPage + index;
    const encodedPath = encodeURIComponent(file.path);
    window.router.navigate(`/view?file=${encodedPath}&index=${globalIndex}`);
  }
}

/**
 * Alpine.js component controller for list view
 */
window.listViewController = () => ({
  init() {
    console.log('List view controller initialized');
  },
  
  navigateToFile(file, index) {
    window.listPage.navigateToFile(file, index);
  },
  
  getQueueSummary() {
    const queueItems = this.queueItems || [];
    const running = 1;
    const queued = queueItems.length - 1;
    const hasOverflow = queued > 3;
    const prefix = hasOverflow ? '... ' : '';
    
    if (queued === 0) {
      return prefix + running + ' running';
    } else {
      return prefix + running + ' running and ' + queued + ' queued';
    }
  }
});

// Create global instance
window.listPage = new ListPage();