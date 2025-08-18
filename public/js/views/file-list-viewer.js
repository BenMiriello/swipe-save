/**
 * File List Viewer Component
 * Displays all media files in a scrollable list with queue integration
 */
window.views = window.views || {};

window.views.fileListViewer = {
  isInitialized: false,
  currentView: null,
  
  /**
   * Initialize the file list viewer
   */
  init() {
    if (this.isInitialized) return;
    
    this.isInitialized = true;
  },
  
  /**
   * Create and show the file list viewer
   */
  show() {
    if (this.currentView) {
      this.currentView.style.display = 'block';
      return;
    }
    
    this.currentView = this.createViewer();
    
    // Replace main content
    const container = document.querySelector('.container');
    const mainContent = container.querySelector('.media-container');
    if (mainContent) {
      mainContent.style.display = 'none';
    }
    
    container.appendChild(this.currentView);
    
    // Load media files
    this.loadMediaFiles();
  },
  
  /**
   * Hide the file list viewer
   */
  hide() {
    if (this.currentView) {
      this.currentView.style.display = 'none';
    }
    
    // Show main content
    const container = document.querySelector('.container');
    const mainContent = container.querySelector('.media-container');
    if (mainContent) {
      mainContent.style.display = 'block';
    }
  },
  
  /**
   * Create the complete file list viewer structure
   */
  createViewer() {
    const viewer = document.createElement('div');
    viewer.className = 'file-list-viewer';
    viewer.id = 'fileListViewer';
    
    // Create header with queue and navigation
    const header = this.createHeader();
    viewer.appendChild(header);
    
    // Create file list container
    const listContainer = this.createFileList();
    viewer.appendChild(listContainer);
    
    return viewer;
  },
  
  /**
   * Create header section with queue and controls
   */
  createHeader() {
    const header = document.createElement('div');
    header.className = 'file-list-header';
    
    // Queue viewer (expandable)
    const queueViewer = window.sharedComponents.queueViewer.create({
      expandable: true,
      showClearButton: true,
      className: 'file-list-queue'
    });
    header.appendChild(queueViewer);
    
    // Show/Hide file list button
    const toggleButton = document.createElement('button');
    toggleButton.className = 'comfy-btn comfy-btn-primary file-list-toggle';
    toggleButton.textContent = 'Show File List';
    toggleButton.addEventListener('click', () => this.toggleFileList());
    header.appendChild(toggleButton);
    
    // Navigation controls
    const navigation = window.sharedComponents.navigation.create({
      mode: 'list',
      onPrevious: () => this.handlePageNavigation('previous'),
      onNext: () => this.handlePageNavigation('next'),
      onSliderChange: (value) => this.handleSliderChange(value)
    });
    navigation.classList.add('file-list-navigation');
    header.appendChild(navigation);
    
    // Filtered action buttons
    const actions = this.createActionButtons();
    header.appendChild(actions);
    
    return header;
  },
  
  /**
   * Create action buttons (filtered for list view)
   */
  createActionButtons() {
    const standardButtons = window.sharedComponents.toolbar.getStandardButtons();
    
    // Only include global actions, not item-specific ones
    const listButtons = [
      standardButtons.reload,
      standardButtons.singleView
    ];
    
    const toolbar = window.sharedComponents.toolbar.create({
      buttons: listButtons
    });
    toolbar.classList.add('file-list-actions');
    
    return toolbar;
  },
  
  /**
   * Create file list container
   */
  createFileList() {
    const container = document.createElement('div');
    container.className = 'file-list-container';
    container.id = 'fileListContainer';
    container.style.display = 'none'; // Hidden by default
    
    const list = document.createElement('div');
    list.className = 'file-list';
    list.id = 'fileList';
    
    container.appendChild(list);
    return container;
  },
  
  /**
   * Toggle file list visibility
   */
  toggleFileList() {
    const container = document.getElementById('fileListContainer');
    const toggleButton = document.querySelector('.file-list-toggle');
    
    if (container.style.display === 'none') {
      container.style.display = 'block';
      toggleButton.textContent = 'Hide File List';
      this.loadMediaFiles();
    } else {
      container.style.display = 'none';
      toggleButton.textContent = 'Show File List';
    }
  },
  
  /**
   * Load and display media files
   */
  async loadMediaFiles() {
    const state = window.stateManager?.getState();
    if (!state || !state.allFiles.length) return;
    
    const fileList = document.getElementById('fileList');
    if (!fileList) return;
    
    fileList.innerHTML = '';
    
    // Update navigation state
    window.sharedComponents.navigation.updateState({
      currentIndex: state.currentIndex,
      totalFiles: state.allFiles.length,
      mode: 'list'
    });
    
    // Create file items
    state.allFiles.forEach((file, index) => {
      const fileItem = this.createFileListItem(file, index);
      fileList.appendChild(fileItem);
    });
  },
  
  /**
   * Create individual file list item
   */
  createFileListItem(file, index) {
    const item = document.createElement('div');
    item.className = 'file-list-item';
    item.dataset.index = index;
    
    // Tap to open in single view
    item.addEventListener('click', () => this.openInSingleView(index));
    
    // Create media element (reuse existing factory)
    const mediaElement = window.elementFactory?.createMediaItem(
      file, 
      null, // No custom filename in list view
      window.appConfig?.getApiUrl() || ''
    );
    
    if (mediaElement) {
      // Remove individual item controls for list view
      const controls = mediaElement.querySelectorAll('.swipe-hint, .tap-zones, .action-feedback');
      controls.forEach(control => control.remove());
      
      // Add list-specific styling
      mediaElement.classList.add('file-list-media');
      
      item.appendChild(mediaElement);
    }
    
    // Add file info
    const info = document.createElement('div');
    info.className = 'file-list-info';
    info.innerHTML = `
      <div class="file-list-name">${file.name}</div>
      <div class="file-list-meta">${this.formatFileSize(file.size)} • ${this.formatDate(file.modified)}</div>
    `;
    item.appendChild(info);
    
    return item;
  },
  
  /**
   * Open file in single view
   */
  openInSingleView(index) {
    // Set current index
    if (window.stateManager) {
      window.stateManager.setCurrentIndex(index);
    }
    
    // Switch to single view
    this.hide();
    
    // Display current image in single view
    if (window.navigationController) {
      window.navigationController.displayCurrentImage();
    }
  },
  
  /**
   * Handle page navigation
   */
  handlePageNavigation(direction) {
    window.sharedComponents.navigation.handlePageNavigation(direction);
  },
  
  /**
   * Handle slider change
   */
  handleSliderChange(value) {
    window.sharedComponents.navigation.handleSliderChange(value, 'list');
  },
  
  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    if (!bytes) return '0 B';
    
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  },
  
  /**
   * Format date for display
   */
  formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  }
};