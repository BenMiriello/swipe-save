/**
 * Universal Media Service
 * Handles loading, caching, and management of media files for both
 * output media browser and input media picker with unified patterns
 */

class MediaService {
  constructor() {
    this.cache = new Map();
    this.previewCache = new Map();
    this.loadingStates = new Map();
    
    // LRU cache settings
    this.maxCacheSize = 1000;
    this.maxPreviewCacheSize = 500;
  }

  /**
   * Load files from specified endpoint with options
   * @param {string} endpoint - API endpoint (/api/media, /api/input-media, etc.)
   * @param {Object} options - Loading options
   * @returns {Promise<Array>} Array of file objects
   */
  async loadFiles(endpoint, options = {}) {
    const {
      includePreviews = false,
      includeMetadata = false,
      filters = null,
      limit = null,
      offset = 0
    } = options;

    // Build cache key
    const cacheKey = this.buildCacheKey(endpoint, options);
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Prevent duplicate requests
    if (this.loadingStates.has(cacheKey)) {
      return this.loadingStates.get(cacheKey);
    }

    try {
      // Build URL with parameters
      let url = `${window.appConfig.getApiUrl()}${endpoint}`;
      const params = new URLSearchParams();
      
      if (includePreviews) params.append('includePreviews', 'true');
      if (includeMetadata) params.append('includeWorkflowMetadata', 'true');
      if (filters) params.append('filters', JSON.stringify(filters));
      if (limit) params.append('limit', limit.toString());
      if (offset) params.append('offset', offset.toString());
      
      if (params.toString()) {
        url += '?' + params.toString();
      }

      // Create loading promise
      const loadingPromise = this.fetchFiles(url);
      this.loadingStates.set(cacheKey, loadingPromise);

      const response = await loadingPromise;
      const files = response.items || response.files || [];
      
      // Process and cache files
      const processedFiles = this.processFiles(files, includePreviews);
      this.cacheFiles(processedFiles, cacheKey);
      
      // Clean up loading state
      this.loadingStates.delete(cacheKey);
      
      return processedFiles;
      
    } catch (error) {
      this.loadingStates.delete(cacheKey);
      console.error('Error loading files:', error);
      throw error;
    }
  }

  /**
   * Lazy load previews for files that don't have them
   * @param {Array} files - Files to load previews for
   * @param {string} endpoint - Source endpoint for reload
   * @returns {Promise<Array>} Files with preview data loaded
   */
  async loadPreviews(files, endpoint) {
    // Find files that need previews
    const needsPreviews = files.filter(file => !file.preview || !file.preview.loaded);
    
    if (needsPreviews.length === 0) {
      return files;
    }

    try {
      // Reload with previews enabled
      const filesWithPreviews = await this.loadFiles(endpoint, { 
        includePreviews: true,
        limit: null // Get all files to maintain indexes
      });
      
      // Merge preview data into original files
      return files.map(file => {
        const fileWithPreview = filesWithPreviews.find(f => f.name === file.name);
        if (fileWithPreview && fileWithPreview.preview) {
          return { ...file, preview: fileWithPreview.preview };
        }
        return file;
      });
      
    } catch (error) {
      console.error('Error loading previews:', error);
      return files;
    }
  }

  /**
   * Process files into standard format
   * @param {Array} files - Raw files from API
   * @param {boolean} includePreviews - Whether previews are included
   * @returns {Array} Processed files
   */
  processFiles(files, includePreviews) {
    return files.map(file => ({
      // Core file data (always present)
      name: file.name,
      path: file.path,
      fullPath: file.fullPath,
      size: file.size,
      date: file.date,
      
      // Additional metadata if present
      ...(file.workflow && { workflow: file.workflow }),
      ...(file.inputFiles && { inputFiles: file.inputFiles }),
      
      // Preview layer
      preview: {
        url: file.preview || null,
        loaded: !!file.preview,
        error: null
      },
      
      // Full media layer
      fullMedia: {
        loaded: false,
        cached: false
      }
    }));
  }

  /**
   * Cache files with LRU eviction
   * @param {Array} files - Files to cache
   * @param {string} cacheKey - Cache key
   */
  cacheFiles(files, cacheKey) {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(cacheKey, files);
  }

  /**
   * Build cache key from endpoint and options
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Loading options
   * @returns {string} Cache key
   */
  buildCacheKey(endpoint, options) {
    const keyParts = [endpoint];
    
    if (options.includePreviews) keyParts.push('previews');
    if (options.includeMetadata) keyParts.push('metadata');
    if (options.filters) keyParts.push('filtered');
    if (options.limit) keyParts.push(`limit${options.limit}`);
    if (options.offset) keyParts.push(`offset${options.offset}`);
    
    return keyParts.join('-');
  }

  /**
   * Fetch files from URL (bottom layer - can be overridden for different endpoints)
   * @param {string} url - Full URL to fetch
   * @returns {Promise<Object>} API response
   */
  async fetchFiles(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Clear cache (useful for refresh scenarios)
   */
  clearCache() {
    this.cache.clear();
    this.previewCache.clear();
    this.loadingStates.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getCacheStats() {
    return {
      files: this.cache.size,
      previews: this.previewCache.size,
      loading: this.loadingStates.size,
      maxFiles: this.maxCacheSize,
      maxPreviews: this.maxPreviewCacheSize
    };
  }
}

// Global instance
window.mediaService = new MediaService();