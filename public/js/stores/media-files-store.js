/**
 * Shared Media Files Store
 * Single source of truth for all media files data
 * Used by both list view and single view for consistency
 */

document.addEventListener('alpine:init', () => {
  Alpine.store('mediaFiles', {
    // Core data
    files: [],
    isLoading: false,
    error: null,
    lastLoaded: null,
    
    // Preview state
    previewsLoaded: false,
    previewsLoading: false,
    
    // Methods
    async init() {
      console.log('Media files store initialized');
      // Load core files data without previews for fast startup
      await this.loadCoreFiles();
    },

    /**
     * Load core files data (without previews)
     */
    async loadCoreFiles() {
      if (this.isLoading) return;
      
      this.isLoading = true;
      this.error = null;
      
      try {
        const files = await window.mediaService.loadFiles('/api/media', {
          includePreviews: false,
          includeMetadata: false
        });
        
        // Replace array contents to maintain Alpine reactivity
        this.files.length = 0;
        this.files.push(...files);
        
        this.lastLoaded = Date.now();
        console.log(`Loaded ${files.length} core files`);
        
      } catch (error) {
        console.error('Error loading core files:', error);
        this.error = error.message;
        
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Load previews for files (lazy loading)
     */
    async loadPreviews() {
      if (this.previewsLoading || this.previewsLoaded) return;
      
      this.previewsLoading = true;
      
      try {
        const filesWithPreviews = await window.mediaService.loadPreviews(this.files, '/api/media');
        
        // Update files array with preview data
        this.files.length = 0;
        this.files.push(...filesWithPreviews);
        
        this.previewsLoaded = true;
        console.log('Loaded previews for files');
        
      } catch (error) {
        console.error('Error loading previews:', error);
        this.error = error.message;
        
      } finally {
        this.previewsLoading = false;
      }
    },

    /**
     * Apply filters to files and return filtered results
     * @param {Object} filterConfig - Filter configuration
     * @returns {Array} Filtered files
     */
    async getFilteredFiles(filterConfig) {
      if (!filterConfig || !this.hasActiveFilters(filterConfig)) {
        return this.files;
      }

      try {
        // Use media service to get filtered files
        const filteredFiles = await window.mediaService.loadFiles('/api/media', {
          includePreviews: this.previewsLoaded,
          includeMetadata: true, // Needed for metadata filtering
          filters: filterConfig
        });

        return filteredFiles;
        
      } catch (error) {
        console.error('Error getting filtered files:', error);
        return this.files; // Fallback to unfiltered
      }
    },

    /**
     * Check if filter config has active filters
     * @param {Object} filterConfig - Filter configuration
     * @returns {boolean} Whether filters are active
     */
    hasActiveFilters(filterConfig) {
      return !!(
        filterConfig.filename ||
        filterConfig.metadata ||
        filterConfig.inputMetadata ||
        filterConfig.date ||
        filterConfig.size ||
        (filterConfig.mediaTypes && filterConfig.mediaTypes.length > 0)
      );
    },

    /**
     * Get file by index
     * @param {number} index - File index
     * @returns {Object|null} File object or null
     */
    getFile(index) {
      return this.files[index] || null;
    },

    /**
     * Find file by path
     * @param {string} path - File path (path or fullPath)
     * @returns {number} File index or -1 if not found
     */
    findFileIndex(path) {
      return this.files.findIndex(file => 
        file.fullPath === path || file.path === path
      );
    },

    /**
     * Get total number of files
     * @returns {number} Total files count
     */
    getTotalCount() {
      return this.files.length;
    },

    /**
     * Get files for specific page
     * @param {number} page - Page number (1-based)
     * @param {number} itemsPerPage - Items per page
     * @returns {Array} Files for the page
     */
    getPage(page, itemsPerPage) {
      const startIndex = (page - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      return this.files.slice(startIndex, endIndex);
    },

    /**
     * Calculate which page contains a specific file index
     * @param {number} fileIndex - File index
     * @param {number} itemsPerPage - Items per page
     * @returns {number} Page number (1-based)
     */
    getPageForIndex(fileIndex, itemsPerPage) {
      return Math.floor(fileIndex / itemsPerPage) + 1;
    },

    /**
     * Refresh files data
     */
    async refresh() {
      // Clear cache and reload
      window.mediaService.clearCache();
      this.previewsLoaded = false;
      await this.loadCoreFiles();
    },

    /**
     * Get store statistics
     */
    getStats() {
      return {
        totalFiles: this.files.length,
        previewsLoaded: this.previewsLoaded,
        lastLoaded: this.lastLoaded,
        cacheStats: window.mediaService.getCacheStats()
      };
    }
  });
});