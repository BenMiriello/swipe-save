/**
 * Alpine.js List View Component
 * Replaces the vanilla JS simple-list-view.js
 */
window.alpineListView = {
  /**
   * Initialize and show the Alpine.js list view
   */
  init() {
    // If Alpine.js isn't ready yet, wait for it
    if (!window.Alpine) {
      document.addEventListener('alpine:init', () => {
        this.init();
      });
      return;
    }
    
    // Also wait for stores to be available
    if (!Alpine.store('listView') || !Alpine.store('appState')) {
      setTimeout(() => this.init(), 100);
      return;
    }
    
    // Check if we already created the list view to prevent double creation
    const existing = document.querySelector('.alpine-list-view');
    if (existing) {
      return;
    }
    
    // Switch app state - also do manual DOM manipulation as backup
    if (Alpine?.store('appState')) {
      Alpine.store('appState').switchToListView();
    } else {
      console.warn('appState store not available, doing manual DOM manipulation');
      // Manual fallback
      const mediaContainer = document.querySelector('.media-container');
      if (mediaContainer) mediaContainer.style.display = 'none';
      
      const listViewButton = document.getElementById('listViewButton');
      if (listViewButton) listViewButton.style.display = 'none';
      
      const bottomControls = document.querySelector('.bottom-controls');
      if (bottomControls) {
        console.log('Hiding bottom controls manually');
        bottomControls.style.display = 'none';
      }
    }
    
    // Create the Alpine component
    this.createListViewComponent();
    
    // Initialize the store
    if (Alpine?.store('listView')) {
      Alpine.store('listView').init();
    } else {
      console.error('listView store not found!');
    }
  },
  
  /**
   * Create the main Alpine.js list view component
   */
  createListViewComponent() {
    // Remove existing list view if any
    const existing = document.querySelectorAll('.alpine-list-view');
    if (existing.length > 0) {
      existing.forEach(el => el.remove());
    }
    
    const container = document.createElement('div');
    container.className = 'alpine-list-view';
    container.setAttribute('x-data', 'listViewController()');
    
    container.innerHTML = `
      <!-- ComfyUI Queue Section (reusing existing Alpine component) -->
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
              <span class="comfyui-queue-overflow"
                    x-text="(() => {
                      const running = 1;
                      const queued = queueItems.length - 1;
                      const hasOverflow = queued > 3;
                      const prefix = hasOverflow ? '... ' : '';
                      if (queued === 0) {
                        return prefix + running + ' running';
                      } else {
                        return prefix + running + ' running and ' + queued + ' queued';
                      }
                    })()">
              </span>
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
      
      <!-- File List Section (using same component pattern as Active Queue) -->
      <div class="comfyui-section" x-data="{ isFileListExpanded: false }">
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
            <button @click.stop="$store.listView.togglePreviews()" 
                    class="preview-toggle-btn" 
                    :class="{ 'active': $store.listView.showPreviews }"
                    title="Toggle Previews">
              <span class="toggle-icon">Preview</span>
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
              <div class="file-preview" x-show="$store.listView.showPreviews" style="width: auto; height: auto;">
                <img x-show="file.preview" 
                     :src="window.location.origin + file.preview" 
                     :alt="file.name"
                     loading="lazy"
                     style="width: 75px; height: auto; object-fit: contain;">
                <div x-show="!file.preview" class="preview-placeholder">
                  No Preview
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
    
    // Add after the header
    const header = document.querySelector('.header-container');
    if (header && header.nextSibling) {
      header.parentNode.insertBefore(container, header.nextSibling);
    } else {
      document.body.appendChild(container);
    }
    
    // Initialize Alpine.js for the new component
    if (window.Alpine) {
      window.Alpine.initTree(container);
    }
    
    // Start queue polling
    this.initializeQueuePolling();
  },
  
  /**
   * Initialize queue polling for the list view
   */
  initializeQueuePolling() {
    const startQueuePolling = () => {
      if (typeof Alpine !== 'undefined' && Alpine.store && Alpine.store('queueViewer')) {
        console.log('Starting queue polling for Alpine list view');
        Alpine.store('queueViewer').refreshQueue();
        Alpine.store('queueViewer').startAutoRefresh();
        return true;
      }
      return false;
    };
    
    // Try immediately, then with increasing delays
    if (!startQueuePolling()) {
      setTimeout(() => {
        if (!startQueuePolling()) {
          setTimeout(() => {
            if (!startQueuePolling()) {
              console.warn('Failed to initialize queue polling - Alpine.js stores may not be ready');
            }
          }, 1000);
        }
      }, 500);
    }
  }
};

/**
 * Alpine.js component controller for list view
 */
window.listViewController = () => ({
  init() {
    // Component initialization if needed
    console.log('List view controller initialized');
  }
});