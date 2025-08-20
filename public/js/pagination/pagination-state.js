/**
 * Pagination State Manager
 * Handles page caching, memory management, and navigation state
 */
class PaginationState {
  constructor() {
    this.currentPage = 1;
    this.itemsPerPage = 100;
    this.totalItems = 0;
    this.totalPages = 0;
    
    // Page caching
    this.loadedPages = new Map(); // page -> { items, loadTime, lastAccess, size }
    this.maxCachedPages = 5;
    
    // Full file caching (for single item view)
    this.loadedFiles = new Map(); // fileId -> { data, loadTime, lastAccess, size }
    this.maxCachedFiles = 10;
    this.fileEvictionTimeout = 5 * 60 * 1000; // 5 minutes
    
    // Memory management
    this.maxMemoryUsageMB = 100;
    this.currentMemoryUsageBytes = 0;
    
    // Navigation state
    this.lastListPosition = { page: 1, itemId: null, scrollPosition: 0 };
    
    // Settings
    this.settings = {
      itemsPerPage: 100,
      maxCachedPages: 5,
      maxCachedFiles: 10,
      memoryLimitMB: 100,
      preloadPages: 1,
      fileEvictionTimeoutMinutes: 5
    };
    
    // Start memory management timer
    this.startMemoryManager();
  }

  /**
   * Initialize pagination with configuration
   */
  async initialize() {
    try {
      const response = await fetch('/api/config');
      const config = await response.json();
      
      if (config.pagination) {
        this.updateSettings(config.pagination);
      }
    } catch (error) {
      console.warn('Failed to load pagination config:', error);
    }
  }

  /**
   * Update pagination settings
   */
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.itemsPerPage = this.settings.itemsPerPage;
    this.maxCachedPages = this.settings.maxCachedPages;
    this.maxCachedFiles = this.settings.maxCachedFiles;
    this.maxMemoryUsageMB = this.settings.memoryLimitMB;
    this.fileEvictionTimeout = this.settings.fileEvictionTimeoutMinutes * 60 * 1000;
  }

  /**
   * Set current page and update cache
   */
  async setPage(page) {
    if (page < 1 || (this.totalPages > 0 && page > this.totalPages)) {
      throw new Error(`Invalid page: ${page}`);
    }

    this.currentPage = page;
    
    // Update last access for current page
    if (this.loadedPages.has(page)) {
      this.loadedPages.get(page).lastAccess = Date.now();
    }

    // Preload adjacent pages
    this.preloadAdjacentPages();
    
    return this.getPage(page);
  }

  /**
   * Get page data (from cache or API)
   */
  async getPage(page) {
    // Check cache first
    if (this.loadedPages.has(page)) {
      const pageData = this.loadedPages.get(page);
      pageData.lastAccess = Date.now();
      return pageData.items;
    }

    // Load from API
    const items = await this.loadPageFromAPI(page);
    
    // Cache the page
    this.cachePage(page, items);
    
    return items;
  }

  /**
   * Load page from API
   */
  async loadPageFromAPI(page) {
    const offset = (page - 1) * this.itemsPerPage;
    const response = await fetch(`/api/media?limit=${this.itemsPerPage}&offset=${offset}&includePreviews=true`);
    
    if (!response.ok) {
      throw new Error(`Failed to load page ${page}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Update total items and pages
    this.totalItems = data.totalItems || data.items.length;
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    
    return data.items;
  }

  /**
   * Cache a page with memory management
   */
  cachePage(page, items) {
    const now = Date.now();
    const estimatedSize = this.estimatePageSize(items);
    
    const pageData = {
      items,
      loadTime: now,
      lastAccess: now,
      size: estimatedSize
    };
    
    this.loadedPages.set(page, pageData);
    this.currentMemoryUsageBytes += estimatedSize;
    
    // Evict old pages if necessary
    this.evictPagesIfNeeded();
  }

  /**
   * Estimate memory size of a page
   */
  estimatePageSize(items) {
    // Rough estimation: JSON.stringify size + preview data
    const jsonSize = JSON.stringify(items).length * 2; // UTF-16
    const previewSize = items.length * 50 * 1024; // Assume 50KB per preview
    return jsonSize + previewSize;
  }

  /**
   * Preload adjacent pages
   */
  async preloadAdjacentPages() {
    const pagesToPreload = [];
    
    for (let i = 1; i <= this.settings.preloadPages; i++) {
      const prevPage = this.currentPage - i;
      const nextPage = this.currentPage + i;
      
      if (prevPage >= 1 && !this.loadedPages.has(prevPage)) {
        pagesToPreload.push(prevPage);
      }
      
      if (nextPage <= this.totalPages && !this.loadedPages.has(nextPage)) {
        pagesToPreload.push(nextPage);
      }
    }

    // Preload in background
    pagesToPreload.forEach(page => {
      this.getPage(page).catch(error => {
        console.warn(`Failed to preload page ${page}:`, error);
      });
    });
  }

  /**
   * Find which page contains a specific item
   */
  findItemPage(itemId) {
    // Search loaded pages first
    for (const [page, pageData] of this.loadedPages) {
      if (pageData.items.some(item => item.id === itemId || item.filename === itemId)) {
        return page;
      }
    }
    
    // If not found in cache, we'll need to search via API
    return null;
  }

  /**
   * Get item position within its page
   */
  getItemPosition(itemId, page) {
    if (!this.loadedPages.has(page)) {
      return -1;
    }
    
    const items = this.loadedPages.get(page).items;
    return items.findIndex(item => item.id === itemId || item.filename === itemId);
  }

  /**
   * Save current list position for return navigation
   */
  saveListPosition(itemId, scrollPosition = 0) {
    this.lastListPosition = {
      page: this.currentPage,
      itemId,
      scrollPosition
    };
  }

  /**
   * Get saved list position
   */
  getListPosition() {
    return this.lastListPosition;
  }

  /**
   * Cache full file data (for single item view)
   */
  cacheFile(fileId, fileData) {
    const now = Date.now();
    const estimatedSize = this.estimateFileSize(fileData);
    
    const cacheData = {
      data: fileData,
      loadTime: now,
      lastAccess: now,
      size: estimatedSize
    };
    
    this.loadedFiles.set(fileId, cacheData);
    this.currentMemoryUsageBytes += estimatedSize;
    
    // Evict old files if necessary
    this.evictFilesIfNeeded();
  }

  /**
   * Get cached file data
   */
  getCachedFile(fileId) {
    if (this.loadedFiles.has(fileId)) {
      const fileData = this.loadedFiles.get(fileId);
      fileData.lastAccess = Date.now();
      return fileData.data;
    }
    return null;
  }

  /**
   * Estimate file data size
   */
  estimateFileSize(fileData) {
    if (typeof fileData === 'string') {
      return fileData.length * 2; // UTF-16
    }
    if (fileData instanceof ArrayBuffer) {
      return fileData.byteLength;
    }
    return JSON.stringify(fileData).length * 2;
  }

  /**
   * Evict pages if memory limit exceeded
   */
  evictPagesIfNeeded() {
    while (this.loadedPages.size > this.maxCachedPages || 
           this.currentMemoryUsageBytes > this.maxMemoryUsageMB * 1024 * 1024) {
      
      this.evictLeastRecentlyUsedPage();
    }
  }

  /**
   * Evict files if needed
   */
  evictFilesIfNeeded() {
    while (this.loadedFiles.size > this.maxCachedFiles || 
           this.currentMemoryUsageBytes > this.maxMemoryUsageMB * 1024 * 1024) {
      
      this.evictLeastRecentlyUsedFile();
    }
  }

  /**
   * Evict least recently used page
   */
  evictLeastRecentlyUsedPage() {
    let oldestPage = null;
    let oldestTime = Date.now();
    
    for (const [page, pageData] of this.loadedPages) {
      // Don't evict current page or adjacent pages
      if (Math.abs(page - this.currentPage) <= this.settings.preloadPages) {
        continue;
      }
      
      if (pageData.lastAccess < oldestTime) {
        oldestTime = pageData.lastAccess;
        oldestPage = page;
      }
    }
    
    if (oldestPage) {
      const pageData = this.loadedPages.get(oldestPage);
      this.currentMemoryUsageBytes -= pageData.size;
      this.loadedPages.delete(oldestPage);
      console.log(`Evicted page ${oldestPage} to free memory`);
    }
  }

  /**
   * Evict least recently used file
   */
  evictLeastRecentlyUsedFile() {
    let oldestFile = null;
    let oldestTime = Date.now();
    
    for (const [fileId, fileData] of this.loadedFiles) {
      if (fileData.lastAccess < oldestTime) {
        oldestTime = fileData.lastAccess;
        oldestFile = fileId;
      }
    }
    
    if (oldestFile) {
      const fileData = this.loadedFiles.get(oldestFile);
      this.currentMemoryUsageBytes -= fileData.size;
      this.loadedFiles.delete(oldestFile);
      console.log(`Evicted file ${oldestFile} to free memory`);
    }
  }

  /**
   * Start background memory management
   */
  startMemoryManager() {
    setInterval(() => {
      this.evictExpiredFiles();
      this.reportMemoryUsage();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Evict files that have expired based on timeout
   */
  evictExpiredFiles() {
    const now = Date.now();
    const filesToEvict = [];
    
    for (const [fileId, fileData] of this.loadedFiles) {
      if (now - fileData.lastAccess > this.fileEvictionTimeout) {
        filesToEvict.push(fileId);
      }
    }
    
    filesToEvict.forEach(fileId => {
      const fileData = this.loadedFiles.get(fileId);
      this.currentMemoryUsageBytes -= fileData.size;
      this.loadedFiles.delete(fileId);
      console.log(`Auto-evicted expired file ${fileId}`);
    });
  }

  /**
   * Report current memory usage
   */
  reportMemoryUsage() {
    const usageMB = this.currentMemoryUsageBytes / (1024 * 1024);
    console.log(`Pagination cache: ${usageMB.toFixed(1)}MB (${this.loadedPages.size} pages, ${this.loadedFiles.size} files)`);
    
    if (usageMB > this.maxMemoryUsageMB * 0.8) {
      console.warn('Pagination cache approaching memory limit');
    }
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this.loadedPages.clear();
    this.loadedFiles.clear();
    this.currentMemoryUsageBytes = 0;
    console.log('Pagination cache cleared');
  }

  /**
   * Get pagination info
   */
  getPaginationInfo() {
    return {
      currentPage: this.currentPage,
      totalPages: this.totalPages,
      itemsPerPage: this.itemsPerPage,
      totalItems: this.totalItems,
      hasNext: this.currentPage < this.totalPages,
      hasPrev: this.currentPage > 1,
      memoryUsageMB: this.currentMemoryUsageBytes / (1024 * 1024),
      cachedPages: this.loadedPages.size,
      cachedFiles: this.loadedFiles.size
    };
  }
}

// Global pagination state instance
window.paginationState = new PaginationState();