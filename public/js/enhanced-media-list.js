/**
 * Enhanced Media List with Pagination and Previews
 * Enhances the existing media list without breaking single item navigation
 */
window.enhancedMediaList = {
  currentPage: 1,
  itemsPerPage: 100,
  totalPages: 0,
  totalItems: 0,
  showPreviews: true,
  isLoading: false,
  
  /**
   * Initialize enhanced media list
   */
  async init() {
    console.log('Initializing enhanced media list...');
    
    // Add pagination controls to existing media container
    this.addPaginationControls();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Load first page
    await this.loadPage(1);
  },
  
  /**
   * Add simple pagination controls
   */
  addPaginationControls() {
    const mediaContainer = document.querySelector('.media-container');
    if (!mediaContainer) return;
    
    // Add pagination controls at top
    const paginationHTML = `
      <div id="simplePagination" class="simple-pagination">
        <div class="pagination-nav">
          <button id="prevPageBtn" class="page-btn" disabled>← Previous</button>
          <select id="pageSelect" class="page-select">
            <option value="1">Page 1</option>
          </select>
          <button id="nextPageBtn" class="page-btn">Next →</button>
        </div>
        <div class="pagination-info">
          <span id="pageInfo">Loading...</span>
        </div>
      </div>
    `;
    
    mediaContainer.insertAdjacentHTML('afterbegin', paginationHTML);
  },
  
  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Pagination controls
    document.getElementById('prevPageBtn')?.addEventListener('click', () => {
      if (this.currentPage > 1) this.loadPage(this.currentPage - 1);
    });
    
    document.getElementById('nextPageBtn')?.addEventListener('click', () => {
      if (this.currentPage < this.totalPages) this.loadPage(this.currentPage + 1);
    });
    
    document.getElementById('pageSelect')?.addEventListener('change', (e) => {
      this.loadPage(parseInt(e.target.value));
    });
    
    // Preview toggle
    document.getElementById('showPreviews')?.addEventListener('change', (e) => {
      this.showPreviews = e.target.checked;
      this.togglePreviews();
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (this.shouldHandleKeyboard(e)) {
        if (e.key === 'ArrowLeft' && this.currentPage > 1) {
          e.preventDefault();
          this.loadPage(this.currentPage - 1);
        } else if (e.key === 'ArrowRight' && this.currentPage < this.totalPages) {
          e.preventDefault();
          this.loadPage(this.currentPage + 1);
        }\n      }\n    });\n  },\n  \n  /**\n   * Check if keyboard event should be handled\n   */\n  shouldHandleKeyboard(e) {\n    const activeElement = document.activeElement;\n    return !activeElement || (\n      activeElement.tagName !== 'INPUT' && \n      activeElement.tagName !== 'TEXTAREA' && \n      activeElement.tagName !== 'SELECT'\n    );\n  },\n  \n  /**\n   * Load specific page\n   */\n  async loadPage(page) {\n    if (this.isLoading || page < 1) return;\n    \n    try {\n      this.isLoading = true;\n      this.currentPage = page;\n      \n      // Show loading state\n      this.updatePageInfo('Loading...');\n      \n      // Fetch page data\n      const includePreviews = this.showPreviews;\n      const response = await fetch(`/api/media?limit=${this.itemsPerPage}&offset=${(page - 1) * this.itemsPerPage}&includePreviews=${includePreviews}`);\n      \n      if (!response.ok) {\n        throw new Error('Failed to load media files');\n      }\n      \n      const data = await response.json();\n      \n      // Update pagination info\n      this.totalPages = data.pagination.totalPages;\n      this.totalItems = data.pagination.totalItems;\n      \n      // Update UI\n      this.updatePaginationControls();\n      this.renderMediaItems(data.items);\n      \n      // Scroll to top\n      window.scrollTo({ top: 0, behavior: 'smooth' });\n      \n    } catch (error) {\n      console.error('Failed to load page:', error);\n      this.updatePageInfo('Error loading files');\n    } finally {\n      this.isLoading = false;\n    }\n  },\n  \n  /**\n   * Update pagination controls\n   */\n  updatePaginationControls() {\n    // Update buttons\n    const prevBtn = document.getElementById('prevPageBtn');\n    const nextBtn = document.getElementById('nextPageBtn');\n    \n    if (prevBtn) prevBtn.disabled = this.currentPage <= 1;\n    if (nextBtn) nextBtn.disabled = this.currentPage >= this.totalPages;\n    \n    // Update page select with smart options\n    this.updatePageSelect();\n    \n    // Update info\n    const startItem = (this.currentPage - 1) * this.itemsPerPage + 1;\n    const endItem = Math.min(this.currentPage * this.itemsPerPage, this.totalItems);\n    this.updatePageInfo(`${startItem}-${endItem} of ${this.totalItems.toLocaleString()} items (Page ${this.currentPage}/${this.totalPages})`);\n  },\n  \n  /**\n   * Update page select dropdown with smart pagination\n   */\n  updatePageSelect() {\n    const pageSelect = document.getElementById('pageSelect');\n    if (!pageSelect) return;\n    \n    const options = [];\n    const currentPage = this.currentPage;\n    const totalPages = this.totalPages;\n    \n    // Show first few pages\n    for (let i = 1; i <= Math.min(3, totalPages); i++) {\n      options.push({ value: i, text: `Page ${i}`, selected: i === currentPage });\n    }\n    \n    // Show separator if needed\n    if (currentPage > 6 && totalPages > 10) {\n      options.push({ value: '', text: '...', disabled: true });\n    }\n    \n    // Show pages around current\n    const start = Math.max(4, currentPage - 2);\n    const end = Math.min(totalPages - 3, currentPage + 2);\n    \n    for (let i = start; i <= end; i++) {\n      if (i <= 3) continue; // Skip if already added\n      options.push({ value: i, text: `Page ${i}`, selected: i === currentPage });\n    }\n    \n    // Show separator if needed\n    if (currentPage < totalPages - 5 && totalPages > 10) {\n      options.push({ value: '', text: '...', disabled: true });\n    }\n    \n    // Show last few pages\n    for (let i = Math.max(totalPages - 2, end + 1); i <= totalPages; i++) {\n      if (i <= end) continue; // Skip if already added\n      options.push({ value: i, text: `Page ${i}`, selected: i === currentPage });\n    }\n    \n    // Update select options\n    pageSelect.innerHTML = options.map(opt => \n      `<option value=\"${opt.value}\" ${opt.selected ? 'selected' : ''} ${opt.disabled ? 'disabled' : ''}>${opt.text}</option>`\n    ).join('');\n  },\n  \n  /**\n   * Update page info text\n   */\n  updatePageInfo(text) {\n    const pageInfo = document.getElementById('pageInfo');\n    if (pageInfo) pageInfo.textContent = text;\n  },\n  \n  /**\n   * Render media items using existing system\n   */\n  renderMediaItems(items) {\n    // Clear existing media list\n    const mediaList = document.getElementById('mediaList');\n    if (!mediaList) return;\n    \n    mediaList.innerHTML = '';\n    \n    if (items.length === 0) {\n      mediaList.innerHTML = '<div class=\"no-media\">No media files found</div>';\n      return;\n    }\n    \n    // Create media items\n    items.forEach((item, index) => {\n      const mediaElement = this.createMediaElement(item, index);\n      mediaList.appendChild(mediaElement);\n    });\n  },\n  \n  /**\n   * Create media element\n   */\n  createMediaElement(item, index) {\n    const element = document.createElement('div');\n    element.className = 'media-item';\n    element.dataset.filename = item.name;\n    element.dataset.globalIndex = (this.currentPage - 1) * this.itemsPerPage + index;\n    \n    // Add preview if enabled and available\n    let previewHTML = '';\n    if (this.showPreviews && item.preview) {\n      previewHTML = `\n        <div class=\"media-preview-container\">\n          <img src=\"${item.preview}\" alt=\"${item.name}\" class=\"media-preview-thumb\" loading=\"lazy\">\n        </div>\n      `;\n    }\n    \n    // Create content\n    element.innerHTML = `\n      ${previewHTML}\n      <div class=\"media-info\">\n        <div class=\"media-title\">${item.name}</div>\n        <div class=\"media-details\">\n          <span class=\"media-size\">${this.formatFileSize(item.size)}</span>\n          <span class=\"media-date\">${this.formatDate(item.date)}</span>\n        </div>\n      </div>\n    `;\n    \n    // Add click handler to open in existing single view\n    element.addEventListener('click', () => {\n      this.openInSingleView(item, index);\n    });\n    \n    return element;\n  },\n  \n  /**\n   * Open item in existing single view\n   */\n  openInSingleView(item, listIndex) {\n    // Calculate global index\n    const globalIndex = (this.currentPage - 1) * this.itemsPerPage + listIndex;\n    \n    // Use existing navigation controller\n    if (window.navigationController) {\n      window.navigationController.showSingleView(globalIndex);\n    } else if (window.appController) {\n      // Fallback to app controller\n      window.appController.loadMediaFile(item.name, globalIndex);\n    }\n  },\n  \n  /**\n   * Toggle preview display\n   */\n  togglePreviews() {\n    const mediaList = document.getElementById('mediaList');\n    if (!mediaList) return;\n    \n    const previewContainers = mediaList.querySelectorAll('.media-preview-container');\n    previewContainers.forEach(container => {\n      container.style.display = this.showPreviews ? 'block' : 'none';\n    });\n  },\n  \n  /**\n   * Format file size\n   */\n  formatFileSize(bytes) {\n    if (bytes === 0) return '0 B';\n    const k = 1024;\n    const sizes = ['B', 'KB', 'MB', 'GB'];\n    const i = Math.floor(Math.log(bytes) / Math.log(k));\n    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];\n  },\n  \n  /**\n   * Format date\n   */\n  formatDate(dateString) {\n    if (!dateString) return '';\n    const date = new Date(dateString);\n    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});\n  },\n  \n  /**\n   * Return to list view (called by existing list view button)\n   */\n  show() {\n    const mediaContainer = document.querySelector('.media-container');\n    if (mediaContainer) {\n      mediaContainer.style.display = 'block';\n    }\n    \n    // Hide list view button\n    const listViewBtn = document.getElementById('listViewButton');\n    if (listViewBtn) {\n      listViewBtn.style.display = 'none';\n    }\n  },\n  \n  /**\n   * Hide list view (when going to single view)\n   */\n  hide() {\n    const mediaContainer = document.querySelector('.media-container');\n    if (mediaContainer) {\n      mediaContainer.style.display = 'none';\n    }\n    \n    // Show list view button\n    const listViewBtn = document.getElementById('listViewButton');\n    if (listViewBtn) {\n      listViewBtn.style.display = 'block';\n    }\n  }\n};