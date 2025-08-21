/**
 * Alpine.js Store for List View State Management
 */
document.addEventListener('alpine:init', () => {
  Alpine.store('listView', {
    // State
    isActive: false,
    isLoading: false,
    showPreviews: false, // Hidden by default
    fileListOpen: false, // Always start closed
    
    // Pagination
    currentPage: 1,
    totalPages: 1,
    itemsPerPage: 100,
    allFiles: [],
    displayedFiles: [],
    
    // Cross-view navigation
    selectedFileIndex: 0,
    
    // Methods
    init() {
      this.loadFiles();
    },
    
    async loadFiles() {
      this.isLoading = true;
      try {
        const url = `${window.appConfig.getApiUrl()}/api/media?includePreviews=true`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to load files');
        
        const data = await response.json();
        this.allFiles = data.items || data.files || [];
        this.totalPages = Math.ceil(this.allFiles.length / this.itemsPerPage);
        this.updateDisplayedFiles();
        
        // Navigate to page containing selected item if coming from single view
        this.navigateToSelectedItem();
      } catch (error) {
        console.error('Error loading files:', error);
      } finally {
        this.isLoading = false;
      }
    },
    
    updateDisplayedFiles() {
      const startIndex = (this.currentPage - 1) * this.itemsPerPage;
      const endIndex = startIndex + this.itemsPerPage;
      this.displayedFiles = this.allFiles.slice(startIndex, endIndex);
    },
    
    togglePreviews() {
      // Prevent rapid double calls with simple debounce
      const now = Date.now();
      if (this._lastToggle && (now - this._lastToggle) < 500) {
        return;
      }
      this._lastToggle = now;
      
      this.showPreviews = !this.showPreviews;
      localStorage.setItem('listViewPreviews', JSON.stringify(this.showPreviews));
    },
    
    openFileGrid() {
      this.fileListOpen = true;
      localStorage.setItem('fileListOpen', 'true');
    },
    
    hideFileGrid() {
      this.fileListOpen = false;
      localStorage.setItem('fileListOpen', 'false');
    },
    
    previousPage() {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.updateDisplayedFiles();
      }
    },
    
    nextPage() {
      if (this.currentPage < this.totalPages) {
        this.currentPage++;
        this.updateDisplayedFiles();
      }
    },
    
    goToPage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page;
        this.updateDisplayedFiles();
      }
    },
    
    // Cross-view navigation: find page containing specific item
    navigateToSelectedItem() {
      const globalState = Alpine.store('appState');
      if (globalState && globalState.currentFileIndex !== undefined) {
        const targetPage = Math.ceil((globalState.currentFileIndex + 1) / this.itemsPerPage);
        if (targetPage !== this.currentPage) {
          this.goToPage(targetPage);
        }
        this.selectedFileIndex = globalState.currentFileIndex;
        
        // Scroll to item after a short delay
        setTimeout(() => this.scrollToSelectedItem(), 200);
      }
    },
    
    scrollToSelectedItem() {
      const itemIndex = this.selectedFileIndex % this.itemsPerPage;
      const itemElement = document.querySelector(`[data-item-index="${itemIndex}"]`);
      if (itemElement) {
        itemElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        // Highlight the item briefly
        itemElement.classList.add('highlighted');
        setTimeout(() => {
          itemElement.classList.remove('highlighted');
        }, 2000);
      }
    },
    
    selectFile(fileIndex) {
      const globalIndex = (this.currentPage - 1) * this.itemsPerPage + fileIndex;
      this.selectedFileIndex = globalIndex;
      
      // Get the file object
      const file = this.allFiles[globalIndex];
      if (!file) {
        console.error('File not found at index:', globalIndex);
        return;
      }
      
      console.log('Selecting file:', file.name, 'at index:', globalIndex);
      
      // Exit list view and switch to existing single view  
      this.exitListView();
      
      // Navigate using file path instead of fragile index
      const encodedPath = encodeURIComponent(file.path);
      window.location.href = `/view?file=${encodedPath}`;
    },
    
    exitListView() {
      this.isActive = false;
      
      // Show single view
      const mediaContainer = document.querySelector('.media-container');
      if (mediaContainer) {
        mediaContainer.style.display = 'block';
      }
      
      // Show list view button
      const listViewButton = document.getElementById('listViewButton');
      if (listViewButton) {
        listViewButton.style.display = 'block';
      }
      
      // Show bottom controls (for single view)
      const bottomControls = document.querySelector('.bottom-controls');
      if (bottomControls) {
        bottomControls.style.display = 'flex';
      }
      
      // Remove list view container
      const container = document.querySelector('.alpine-list-view');
      if (container) {
        container.remove();
      }
    },
    
    getFilePreviewUrl(file) {
      if (!this.showPreviews || !file.preview) {
        return null;
      }
      const url = `${window.appConfig.getApiUrl()}${file.preview}`;
      return url;
    },
    
    isVideoFile(filename) {
      return /\.(mp4|webm|mov|avi|mkv|flv|wmv|m4v|3gp|ogv)$/i.test(filename);
    },
    
    isImageFile(filename) {
      return /\.(png|jpe?g|gif|bmp|webp|tiff?|svg)$/i.test(filename);
    },
    
    formatFileSize(bytes) {
      if (!bytes) return 'Unknown';
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
  });
});