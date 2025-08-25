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
      // Restore selected file index from localStorage
      const storedIndex = localStorage.getItem('selectedFileIndex');
      if (storedIndex !== null) {
        this.selectedFileIndex = parseInt(storedIndex, 10);
      }
      
      // Check if we should navigate to a specific page (from back button)
      const targetPage = localStorage.getItem('targetListPage');
      if (targetPage !== null) {
        this.currentPage = parseInt(targetPage, 10);
        localStorage.removeItem('targetListPage'); // Clear it after using
      }
      
      this.loadFiles();
    },
    
    async loadFiles() {
      this.isLoading = true;
      
      try {
        const url = `${window.appConfig.getApiUrl()}/api/media?includePreviews=true`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to load files');
        
        const data = await response.json();
        const newFiles = data.items || data.files || [];
        console.log('List view loaded', newFiles.length, 'files');
        
        // Ensure Alpine reactivity by replacing array contents, not the array reference
        this.allFiles.length = 0;
        this.allFiles.push(...newFiles);
        
        this.totalPages = Math.ceil(this.allFiles.length / this.itemsPerPage);
        this.updateDisplayedFiles();
        
        // Navigate to page containing selected item if coming from single view
        this.navigateToSelectedItem();
        
      } catch (error) {
        console.error('Error loading files:', error);
        // Clear arrays on error
        this.allFiles.length = 0;
        this.displayedFiles.length = 0;
      } finally {
        this.isLoading = false;
      }
    },
    
    updateDisplayedFiles() {
      const startIndex = (this.currentPage - 1) * this.itemsPerPage;
      const endIndex = startIndex + this.itemsPerPage;
      const newDisplayedFiles = this.allFiles.slice(startIndex, endIndex);
      
      // Ensure Alpine reactivity by replacing array contents, not the array reference
      this.displayedFiles.length = 0;
      this.displayedFiles.push(...newDisplayedFiles);
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
      // Prevent rapid double calls with simple debounce
      const now = Date.now();
      if (this._lastPrevPage && (now - this._lastPrevPage) < 500) {
        return;
      }
      this._lastPrevPage = now;
      
      if (this.currentPage > 1) {
        this.currentPage--;
        this.updateDisplayedFiles();
      }
    },
    
    nextPage() {
      // Prevent rapid double calls with simple debounce
      const now = Date.now();
      if (this._lastNextPage && (now - this._lastNextPage) < 500) {
        return;
      }
      this._lastNextPage = now;
      
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
      const selectedIndex = this.selectedFileIndex;
      
      if (selectedIndex !== undefined && selectedIndex >= 0 && selectedIndex < this.allFiles.length) {
        const targetPage = Math.floor(selectedIndex / this.itemsPerPage) + 1;
        if (targetPage !== this.currentPage && targetPage >= 1 && targetPage <= this.totalPages) {
          this.goToPage(targetPage);
        }
        
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
      // Prevent rapid double calls with simple debounce
      const now = Date.now();
      if (this._lastSelectFile && (now - this._lastSelectFile) < 500) {
        return;
      }
      this._lastSelectFile = now;
      
      const globalIndex = (this.currentPage - 1) * this.itemsPerPage + fileIndex;
      this.selectedFileIndex = globalIndex;
      
      // Store in localStorage for persistence across page loads
      localStorage.setItem('selectedFileIndex', globalIndex.toString());
      
      // Get the file object
      const file = this.allFiles[globalIndex];
      if (!file) {
        console.error('File not found at index:', globalIndex);
        return;
      }
      
      // Exit list view and switch to existing single view  
      this.exitListView();
      
      // Use file.path (URL path) instead of file.fullPath (filesystem path)
      // because single view searches for f.path in findIndex
      const encodedPath = encodeURIComponent(file.path);
      window.location.href = `/view?file=${encodedPath}&index=${globalIndex}`;
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