/**
 * Simple List View Implementation
 * No Alpine.js, no complex components - just basic JavaScript
 */
window.simpleListView = {
  isActive: false,
  container: null,
  showPreviews: false, // Off by default

  /**
   * Initialize and show the list view
   */
  init() {
    // Hide the original media container
    const mediaContainer = document.querySelector('.media-container');
    if (mediaContainer) {
      mediaContainer.style.display = 'none';
    }

    // Hide the list view button since we're in list view
    const listViewButton = document.getElementById('listViewButton');
    if (listViewButton) {
      listViewButton.style.display = 'none';
    }

    // Create and show list view
    this.createListView();
    this.loadFiles();
  },

  /**
   * Create the list view container
   */
  createListView() {
    if (this.container) return;

    this.container = document.createElement('div');
    this.container.className = 'simple-list-view';
    
    // Use the exact same Alpine.js queue component as the modal
    const queueSection = document.createElement('div');
    queueSection.innerHTML = `
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
    `;
    this.container.appendChild(queueSection);
    
    // Start queue polling for the list view (like the modal does)
    // Use more robust Alpine.js initialization detection
    const startQueuePolling = () => {
      if (typeof Alpine !== 'undefined' && Alpine.store && Alpine.store('queueViewer')) {
        console.log('Starting queue polling for list view');
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
    
    // Add the rest of the content
    const contentDiv = document.createElement('div');
    contentDiv.innerHTML = `
      <div class="list-header">
        <button id="openFileList" class="toggle-btn">Open File List</button>
      </div>
      <div id="fileGrid" class="file-grid" style="display: none;">
        <div class="file-grid-header">
          <h2>File List</h2>
          <div class="controls">
            <button id="hideFiles" class="toggle-btn">Hide Files</button>
            <button id="togglePreviews" class="toggle-btn preview-btn" title="Toggle Previews">
              <span class="toggle-icon">⚬</span>
            </button>
          </div>
        </div>
        <div class="loading">Loading files...</div>
      </div>
    `;
    
    this.container.appendChild(contentDiv);

    // Add after the header
    const header = document.querySelector('.header-container');
    if (header && header.nextSibling) {
      header.parentNode.insertBefore(this.container, header.nextSibling);
    } else {
      document.body.appendChild(this.container);
    }

    // Set up toggle buttons
    const openBtn = document.getElementById('openFileList');
    if (openBtn) {
      openBtn.addEventListener('click', () => this.openFileGrid());
    }

    const hideBtn = document.getElementById('hideFiles');
    if (hideBtn) {
      hideBtn.addEventListener('click', () => this.hideFileGrid());
    }

    const previewBtn = document.getElementById('togglePreviews');
    if (previewBtn) {
      previewBtn.addEventListener('click', () => this.togglePreviews());
      this.updatePreviewButton(); // Set initial state
    }

    this.isActive = true;
  },

  /**
   * Open the file grid
   */
  openFileGrid() {
    const fileGrid = document.getElementById('fileGrid');
    const openBtn = document.getElementById('openFileList');
    
    fileGrid.style.display = 'block';
    openBtn.style.display = 'none';
  },

  /**
   * Hide the file grid
   */
  hideFileGrid() {
    const fileGrid = document.getElementById('fileGrid');
    const openBtn = document.getElementById('openFileList');
    
    fileGrid.style.display = 'none';
    openBtn.style.display = 'block';
  },

  /**
   * Toggle preview visibility
   */
  togglePreviews() {
    this.showPreviews = !this.showPreviews;
    this.updatePreviewButton();
    
    // Update existing file items
    const fileItems = document.querySelectorAll('.file-preview');
    fileItems.forEach(preview => {
      preview.style.display = this.showPreviews ? 'flex' : 'none';
    });
    
    // Set up lazy loading if previews are now on
    if (this.showPreviews) {
      this.setupLazyLoading();
    }
  },

  /**
   * Update preview button appearance
   */
  updatePreviewButton() {
    const previewBtn = document.getElementById('togglePreviews');
    if (previewBtn) {
      const toggleIcon = previewBtn.querySelector('.toggle-icon');
      if (this.showPreviews) {
        toggleIcon.textContent = '●'; // Filled circle (on)
        previewBtn.classList.add('active');
        previewBtn.title = 'Hide Previews';
      } else {
        toggleIcon.textContent = '⚬'; // Empty circle (off)
        previewBtn.classList.remove('active');
        previewBtn.title = 'Show Previews';
      }
    }
  },

  /**
   * Load and display files
   */
  async loadFiles() {
    try {
      const response = await fetch('/api/files');
      const files = await response.json();
      
      if (Array.isArray(files) && files.length > 0) {
        this.displayFiles(files);
      } else if (Array.isArray(files) && files.length === 0) {
        this.showError('No files found in directory');
      } else {
        this.showError('Failed to load files');
      }
    } catch (error) {
      console.error('Error loading files:', error);
      this.showError('Error loading files: ' + error.message);
    }
  },

  /**
   * Display files in grid
   */
  displayFiles(files) {
    const fileGrid = document.getElementById('fileGrid');
    if (!fileGrid) return;

    if (files.length === 0) {
      fileGrid.innerHTML = '<div class="no-files">No files found</div>';
      return;
    }

    const gridHtml = files.map((file, index) => `
      <div class="file-item" onclick="window.simpleListView.openFile(${index})" data-index="${index}">
        <div class="file-preview" style="display: ${this.showPreviews ? 'flex' : 'none'};">
          ${this.getFilePreview(file)}
        </div>
        <div class="file-info">
          <div class="file-name">${file.name}</div>
          <div class="file-size">${this.formatFileSize(file.size)}</div>
        </div>
      </div>
    `).join('');

    const fileGridContent = document.querySelector('.file-grid-header').nextElementSibling;
    if (fileGridContent) {
      fileGridContent.remove();
    }
    
    const newContent = document.createElement('div');
    newContent.innerHTML = `
      <div class="file-count">${files.length} files total</div>
      <div class="grid-container">
        ${gridHtml}
      </div>
    `;
    
    fileGrid.appendChild(newContent);

    // Store files for later use
    this.files = files;
    
    // Set up lazy loading for media
    this.setupLazyLoading();
  },

  /**
   * Get file preview HTML with lazy loading
   */
  getFilePreview(file) {
    const baseUrl = window.location.origin;
    const fileUrl = `${baseUrl}/media/${encodeURIComponent(file.name)}`;
    
    if (file.name.match(/\.(mp4|webm|mov)$/i)) {
      return `<video data-src="${fileUrl}" muted style="width: 100%; height: 150px; object-fit: cover; background: #f0f0f0;" preload="none"></video>`;
    } else if (file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return `<img data-src="${fileUrl}" style="width: 100%; height: 150px; object-fit: cover; background: #f0f0f0;" alt="${file.name}">`;
    } else {
      return `<div class="file-icon">📄</div>`;
    }
  },

  /**
   * Set up lazy loading for media elements
   */
  setupLazyLoading() {
    if (!this.showPreviews) return; // Don't set up if previews are off
    
    const mediaElements = document.querySelectorAll('img[data-src], video[data-src]');
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target;
          const src = element.getAttribute('data-src');
          if (src) {
            element.src = src;
            element.removeAttribute('data-src');
          }
          observer.unobserve(element);
        }
      });
    }, {
      rootMargin: '50px' // Start loading 50px before element becomes visible
    });

    mediaElements.forEach(element => {
      imageObserver.observe(element);
    });
  },

  /**
   * Format file size
   */
  formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  },

  /**
   * Open file in single view
   */
  openFile(index) {
    if (!this.files || !this.files[index]) return;
    
    // Make sure state manager has all the files
    if (window.stateManager && this.files) {
      window.stateManager.setFiles(this.files);
      window.stateManager.setCurrentIndex(index);
    }
    
    // Show the original media container
    const mediaContainer = document.querySelector('.media-container');
    if (mediaContainer) {
      mediaContainer.style.display = 'block';
    }

    // Show the list view button since we're leaving list view
    const listViewButton = document.getElementById('listViewButton');
    if (listViewButton) {
      listViewButton.style.display = 'block';
    }

    // Hide list view
    if (this.container) {
      this.container.style.display = 'none';
    }

    // Stop queue polling when leaving list view
    if (typeof Alpine !== 'undefined' && Alpine.store && Alpine.store('queueViewer')) {
      console.log('Stopping queue polling - leaving list view');
      Alpine.store('queueViewer').stopAutoRefresh();
    }

    // Display the current image
    if (window.navigationController) {
      window.navigationController.displayCurrentImage();
    }
  },

  /**
   * Show list view (return from single view)
   */
  show() {
    const mediaContainer = document.querySelector('.media-container');
    if (mediaContainer) {
      mediaContainer.style.display = 'none';
    }

    // Hide the list view button since we're returning to list view
    const listViewButton = document.getElementById('listViewButton');
    if (listViewButton) {
      listViewButton.style.display = 'none';
    }

    if (this.container) {
      this.container.style.display = 'block';
      
      // Restart queue polling when returning to list view
      const restartQueuePolling = () => {
        if (typeof Alpine !== 'undefined' && Alpine.store && Alpine.store('queueViewer')) {
          console.log('Restarting queue polling - returning to list view');
          Alpine.store('queueViewer').refreshQueue();
          Alpine.store('queueViewer').startAutoRefresh();
          return true;
        }
        return false;
      };
      
      if (!restartQueuePolling()) {
        setTimeout(() => {
          if (!restartQueuePolling()) {
            console.warn('Failed to restart queue polling - Alpine.js stores may not be ready');
          }
        }, 500);
      }
    } else {
      this.init();
    }
  },


  /**
   * Show error message
   */
  showError(message) {
    const fileGrid = document.getElementById('fileGrid');
    if (fileGrid) {
      fileGrid.innerHTML = `<div class="error">${message}</div>`;
    }
  }
};

// Add basic CSS
const style = document.createElement('style');
style.textContent = `
.simple-list-view {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.simple-list-view > * {
  width: 100%;
  max-width: 1200px;
}

.comfyui-section {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
  width: 100%;
}

.comfyui-section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.comfyui-section-caret {
  font-size: 12px;
  color: #6c757d;
  transition: transform 0.2s;
}

.comfyui-section-caret.expanded {
  transform: rotate(90deg);
}

.comfyui-section-title {
  margin: 0;
  font-size: 16px;
  color: #495057;
  flex: 1;
}

.comfyui-status-summary {
  color: #6c757d;
  font-style: italic;
  font-size: 14px;
}

.comfyui-queue-indicators {
  display: flex;
  align-items: center;
  gap: 4px;
}

.comfyui-header-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #6c757d;
}

.comfyui-header-dot.active {
  background: #28a745;
}

.comfyui-queue-overflow {
  color: #6c757d;
  font-size: 14px;
}

.comfyui-section-content {
  margin-top: 15px;
}

.comfyui-queue-empty {
  color: #6c757d;
  font-style: italic;
  text-align: center;
  padding: 20px;
}

.comfyui-queue-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.comfyui-queue-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.comfyui-queue-item:hover {
  background-color: #f8f9fa;
}

.comfyui-queue-item.active {
  background-color: #e3f2fd;
  border-color: #2196f3;
}

.comfyui-queue-item-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #6c757d;
}

.comfyui-queue-item.active .comfyui-queue-item-indicator {
  background: #28a745;
}

.comfyui-queue-item-id {
  font-family: monospace;
  font-size: 12px;
}

.comfy-btn {
  background: #007bff;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.comfy-btn-warning {
  background: #ffc107;
  color: #212529;
}

.comfy-btn-small {
  padding: 4px 8px;
  font-size: 11px;
}


.list-header {
  margin-bottom: 20px;
  text-align: center;
}

.list-header .toggle-btn {
  width: 100%;
  max-width: none;
}

.file-grid-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid #ddd;
}

.file-grid-header h2 {
  margin: 0;
}

.controls {
  display: flex;
  gap: 10px;
  align-items: center;
}

.toggle-btn {
  background: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.toggle-btn:hover {
  background: #0056b3;
}

.preview-btn {
  padding: 10px 15px;
  min-width: auto;
}

.preview-btn.active {
  background: #28a745;
}

.preview-btn.active:hover {
  background: #218838;
}

.toggle-icon {
  font-size: 18px;
}

.file-count {
  margin-bottom: 15px;
  font-weight: bold;
  color: #666;
}

.grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.file-item {
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.file-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.file-preview {
  height: 150px;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.file-icon {
  font-size: 48px;
}

.file-info {
  padding: 10px;
}

.file-name {
  font-weight: bold;
  margin-bottom: 5px;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  color: #666;
  font-size: 12px;
}

.loading, .error, .no-files {
  text-align: center;
  padding: 40px;
  color: #666;
  font-style: italic;
}

.error {
  color: #d32f2f;
}
`;
document.head.appendChild(style);