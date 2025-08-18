/**
 * Simple List View Implementation
 * No Alpine.js, no complex components - just basic JavaScript
 */
window.simpleListView = {
  isActive: false,
  container: null,

  /**
   * Initialize and show the list view
   */
  init() {
    // Hide the original media container
    const mediaContainer = document.querySelector('.media-container');
    if (mediaContainer) {
      mediaContainer.style.display = 'none';
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
    this.container.innerHTML = `
      <div class="list-header">
        <h2>File List View</h2>
        <button id="toggleFiles" class="toggle-btn">Show Files</button>
      </div>
      <div id="fileGrid" class="file-grid" style="display: none;">
        <div class="loading">Loading files...</div>
      </div>
    `;

    // Add after the header
    const header = document.querySelector('.header-container');
    if (header && header.nextSibling) {
      header.parentNode.insertBefore(this.container, header.nextSibling);
    } else {
      document.body.appendChild(this.container);
    }

    // Set up toggle button
    const toggleBtn = document.getElementById('toggleFiles');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggleFileGrid());
    }

    this.isActive = true;
  },

  /**
   * Toggle the file grid visibility
   */
  toggleFileGrid() {
    const fileGrid = document.getElementById('fileGrid');
    const toggleBtn = document.getElementById('toggleFiles');
    
    if (fileGrid.style.display === 'none') {
      fileGrid.style.display = 'block';
      toggleBtn.textContent = 'Hide Files';
    } else {
      fileGrid.style.display = 'none';
      toggleBtn.textContent = 'Show Files';
    }
  },

  /**
   * Load and display files
   */
  async loadFiles() {
    try {
      const response = await fetch('/api/media');
      const data = await response.json();
      
      if (data.success && data.files) {
        this.displayFiles(data.files);
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

    const gridHtml = files.slice(0, 20).map((file, index) => `
      <div class="file-item" onclick="window.simpleListView.openFile(${index})" data-index="${index}">
        <div class="file-preview">
          ${this.getFilePreview(file)}
        </div>
        <div class="file-info">
          <div class="file-name">${file.name}</div>
          <div class="file-size">${this.formatFileSize(file.size)}</div>
        </div>
      </div>
    `).join('');

    fileGrid.innerHTML = `
      <div class="file-count">${files.length} files total (showing first 20)</div>
      <div class="grid-container">
        ${gridHtml}
      </div>
    `;

    // Store files for later use
    this.files = files;
  },

  /**
   * Get file preview HTML
   */
  getFilePreview(file) {
    const baseUrl = window.location.origin;
    const fileUrl = `${baseUrl}/media/${encodeURIComponent(file.name)}`;
    
    if (file.name.match(/\.(mp4|webm|mov)$/i)) {
      return `<video src="${fileUrl}" muted style="width: 100%; height: 150px; object-fit: cover;"></video>`;
    } else if (file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return `<img src="${fileUrl}" style="width: 100%; height: 150px; object-fit: cover;" alt="${file.name}">`;
    } else {
      return `<div class="file-icon">📄</div>`;
    }
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
    
    // Show the original media container
    const mediaContainer = document.querySelector('.media-container');
    if (mediaContainer) {
      mediaContainer.style.display = 'block';
    }

    // Hide list view
    if (this.container) {
      this.container.style.display = 'none';
    }

    // Set the file index and display
    if (window.stateManager) {
      window.stateManager.setCurrentIndex(index);
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

    if (this.container) {
      this.container.style.display = 'block';
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
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid #ddd;
}

.toggle-btn {
  background: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
}

.toggle-btn:hover {
  background: #0056b3;
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