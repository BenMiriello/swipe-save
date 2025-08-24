/**
 * Input Picker Modal Component
 * Main modal component for visual input file selection
 */

window.InputManager = window.InputManager || {};
window.InputManager.ui = window.InputManager.ui || {};

window.InputManager.ui.createInputPickerModal = function() {
  return {
    // Modal state
    showModal: false,
    isLoading: false,
    debugCounter: 0,
    
    // File data
    allFiles: [],
    selectedFile: null,
    
    // Filtering and sorting
    filterText: '',
    sortBy: 'created_at',
    sortOrder: 'desc',
    
    // Pagination
    currentPage: 1,
    perPage: 100,
    
    // Services
    get fileService() {
      return window.InputManager.core.InputFileService;
    },
    
    get sortFilterUtils() {
      return window.InputManager.utils.SortFilterUtils;
    },

    // Computed properties 
    get filteredFiles() {
      // Simplified filtering for now
      let filtered = [...this.allFiles];
      if (this.filterText && this.filterText.trim()) {
        const searchTerm = this.filterText.toLowerCase();
        filtered = filtered.filter(file => 
          file.filename?.toLowerCase().includes(searchTerm) ||
          file.name?.toLowerCase().includes(searchTerm)
        );
      }
      return filtered;
    },

    get paginationData() {
      const totalItems = this.filteredFiles.length;
      const totalPages = Math.ceil(totalItems / this.perPage);
      const startIndex = (this.currentPage - 1) * this.perPage;
      const endIndex = startIndex + this.perPage;
      const items = this.filteredFiles.slice(startIndex, endIndex);
      
      return { items, totalPages, totalItems };
    },

    get paginatedFiles() {
      return this.paginationData.items;
    },
    
    get displayedFiles() {
      return this.paginatedFiles;
    },

    get totalPages() {
      return this.paginationData.totalPages;
    },

    get hasFiles() {
      const result = this.allFiles.length > 0;
      console.log('🔍 hasFiles getter called: allFiles.length =', this.allFiles.length, 'result =', result);
      return result;
    },

    get sortOptions() {
      return this.sortFilterUtils.getSortOptions();
    },

    // Modal actions
    async openModal() {
      console.log('🔥 Opening input picker modal...');
      this.showModal = true;
      await this.loadInputFiles();
    },

    closeModal() {
      this.showModal = false;
      this.selectedFile = null;
      this.resetPagination();
    },

    // File loading
    async loadInputFiles() {
      if (this.isLoading) return;
      
      this.isLoading = true;
      try {
        console.log('Loading input files...');
        
        // Use the input picker API endpoint  
        const response = await fetch('/api/media/input-picker');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        const files = data.files || data.items || [];
        
        // Filter for image files only
        const imageFiles = files.filter(file => {
          const ext = file.name.toLowerCase();
          return ext.endsWith('.png') || ext.endsWith('.jpg') || 
                 ext.endsWith('.jpeg') || ext.endsWith('.webp') || 
                 ext.endsWith('.gif') || ext.endsWith('.bmp');
        });
        
        this.allFiles = imageFiles.map((file, index) => ({
          id: index + 1,
          filename: file.name,
          name: file.name, // Also include name for compatibility
          input_path: file.path, // Use the path from the media API
          thumbnail: file.path, // Use the same path for thumbnail
          file_size: file.size,
          size: file.size, // Include size for template
          created_at: file.date,
          mtime: file.date, // Include mtime for template
          usage_count: 0
        }));
        
        console.log('Input picker loaded', this.allFiles.length, 'files');
        console.log('Sample file thumbnail path:', this.allFiles[0]?.thumbnail);
        console.log('displayedFiles after load:', this.displayedFiles?.length);
        
        // Force reactivity update 
        this.$nextTick(() => {
          console.log('nextTick - displayedFiles:', this.displayedFiles?.length);
        });
        
        // Reset to first page when data changes
        this.resetPagination();
        
      } catch (error) {
        console.error('Failed to load input files:', error);
        this.allFiles = [];
      } finally {
        this.isLoading = false;
      }
    },

    // File selection
    selectFile(file) {
      this.selectedFile = file;
      console.log('Selected input file:', file.filename);
    },

    async applySelection() {
      if (!this.selectedFile) return;
      
      try {
        // Update usage statistics (skip if database not available)
        try {
          const database = window.InputManager.core.InputDatabase;
          if (database && database.updateUsage) {
            await database.updateUsage(this.selectedFile.id);
          }
        } catch (dbError) {
          console.warn('Could not update usage statistics:', dbError);
          // Continue without database update
        }
        
        // Dispatch document-level event for ComfyUI field editor integration
        document.dispatchEvent(new CustomEvent('input-file-selected', {
          detail: {
            filename: this.selectedFile.filename,
            name: this.selectedFile.name
          }
        }));
        
        this.closeModal();
        
      } catch (error) {
        console.error('Failed to apply input selection:', error);
        // Show error to user
        alert('Failed to apply input selection: ' + error.message);
      }
    },

    // Sorting and filtering
    setSortBy(newSortBy) {
      if (this.sortBy === newSortBy) {
        // Toggle sort order if same field
        this.sortOrder = this.sortOrder === 'desc' ? 'asc' : 'desc';
      } else {
        this.sortBy = newSortBy;
        this.sortOrder = 'desc'; // Default to descending for new field
      }
      this.resetPagination();
    },

    onFilterChange() {
      // Reset to first page when filter changes
      this.resetPagination();
    },

    clearFilter() {
      this.filterText = '';
      this.resetPagination();
    },

    // Pagination
    goToPage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page;
      }
    },

    nextPage() {
      if (this.currentPage < this.totalPages) {
        this.currentPage++;
      }
    },

    prevPage() {
      if (this.currentPage > 1) {
        this.currentPage--;
      }
    },

    resetPagination() {
      this.currentPage = 1;
    },

    // File selection
    selectFile(file) {
      this.selectedFile = file;
      console.log('Selected file:', file.filename);
    },
    
    
    handleImageError(event) {
      // Handle broken image
      event.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjMzMzIi8+CjxwYXRoIGQ9Ik0xMCAxMEwzMCAzME0zMCAxMEwxMCAzMCIgc3Ryb2tlPSIjNzc3IiBzdHJva2Utd2lkdGg9IjIiLz4KPC9zdmc+';
    },
    
    formatFilename(file) {
      const filename = file.filename || file.name || '';
      if (filename.length > 20) {
        return filename.substring(0, 17) + '...';
      }
      return filename;
    },

    formatFileSize(size) {
      if (size < 1024) return size + ' B';
      if (size < 1024 * 1024) return Math.round(size / 1024) + ' KB';
      return Math.round(size / (1024 * 1024)) + ' MB';
    },

    formatDate(date) {
      return new Date(date).toLocaleDateString();
    },

    // Utility methods
    getSortLabel(sortBy) {
      const option = this.sortOptions.find(opt => opt.value === sortBy);
      return option ? option.label : sortBy;
    },

    getSortIcon(sortBy) {
      if (this.sortBy !== sortBy) return '↕️';
      return this.sortOrder === 'desc' ? '↓' : '↑';
    },

    getThumbnailUrl(file) {
      // Use the path directly from the media API
      return file.input_path;
    },

    getFileDisplayName(file) {
      // Truncate long filenames for display
      if (file.filename.length > 20) {
        return file.filename.substring(0, 17) + '...';
      }
      return file.filename;
    },

    formatFileSize(bytes) {
      if (!bytes) return '';
      
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    },

    formatDate(dateString) {
      if (!dateString) return '';
      
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      
      return date.toLocaleDateString();
    },

    getResultsText() {
      const { totalItems, currentPage, perPage } = this.paginationData;
      const start = (currentPage - 1) * perPage + 1;
      const end = Math.min(currentPage * perPage, totalItems);
      
      if (totalItems === 0) return 'No files found';
      if (totalItems <= perPage) return `${totalItems} file${totalItems === 1 ? '' : 's'}`;
      
      return `${start}-${end} of ${totalItems} files`;
    },

    // Quick actions
    async selectMostRecentFile() {
      if (this.allFiles.length === 0) return;
      
      const sortedByDate = [...this.allFiles].sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
      
      this.selectFile(sortedByDate[0]);
    },

    async selectMostUsedFile() {
      if (this.allFiles.length === 0) return;
      
      const sortedByUsage = [...this.allFiles].sort((a, b) => 
        (b.usage_count || 0) - (a.usage_count || 0)
      );
      
      this.selectFile(sortedByUsage[0]);
    },

    // Lifecycle
    init() {
      // Handle escape key
      this.handleKeydown = (event) => {
        if (event.key === 'Escape' && this.showModal) {
          this.closeModal();
        }
      };
      
      document.addEventListener('keydown', this.handleKeydown);
    },

    destroy() {
      document.removeEventListener('keydown', this.handleKeydown);
    }
  };
};