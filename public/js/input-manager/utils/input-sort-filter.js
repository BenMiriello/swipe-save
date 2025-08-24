/**
 * Input Sort & Filter Utilities
 * Handles sorting and filtering logic for input file collections
 */

window.InputManager = window.InputManager || {};
window.InputManager.utils = window.InputManager.utils || {};

window.InputManager.utils.SortFilterUtils = {
  
  /**
   * Apply filters and sorting to input files collection
   */
  applyFiltersAndSort(files, filterText = '', sortBy = 'created_at', sortOrder = 'desc') {
    if (!Array.isArray(files)) return [];
    
    let filtered = [...files];
    
    // Apply text filtering
    if (filterText && filterText.trim()) {
      const searchTerm = filterText.toLowerCase().trim();
      filtered = filtered.filter(file => 
        file.filename.toLowerCase().includes(searchTerm) ||
        (file.original_path && file.original_path.toLowerCase().includes(searchTerm))
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let valueA, valueB;
      
      switch (sortBy) {
        case 'filename':
          valueA = a.filename.toLowerCase();
          valueB = b.filename.toLowerCase();
          break;
        case 'created_at':
          valueA = new Date(a.created_at);
          valueB = new Date(b.created_at);
          break;
        case 'last_used_at':
          valueA = new Date(a.last_used_at || '1970-01-01');
          valueB = new Date(b.last_used_at || '1970-01-01');
          break;
        case 'usage_count':
          valueA = a.usage_count || 0;
          valueB = b.usage_count || 0;
          break;
        case 'file_size':
          valueA = a.file_size || 0;
          valueB = b.file_size || 0;
          break;
        default:
          valueA = a.created_at;
          valueB = b.created_at;
      }
      
      // Compare values
      let result = 0;
      if (valueA < valueB) result = -1;
      if (valueA > valueB) result = 1;
      
      // Apply sort order
      return sortOrder.toLowerCase() === 'desc' ? -result : result;
    });
    
    return filtered;
  },

  /**
   * Paginate filtered results
   */
  paginate(items, page = 1, perPage = 100) {
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    
    return {
      items: items.slice(startIndex, endIndex),
      totalItems: items.length,
      totalPages: Math.ceil(items.length / perPage),
      currentPage: page,
      perPage: perPage,
      hasNext: endIndex < items.length,
      hasPrev: page > 1
    };
  },

  /**
   * Get sort options for UI
   */
  getSortOptions() {
    return [
      { value: 'created_at', label: 'Date Added', default: true },
      { value: 'filename', label: 'Name' },
      { value: 'last_used_at', label: 'Last Used' },
      { value: 'usage_count', label: 'Usage Count' },
      { value: 'file_size', label: 'File Size' }
    ];
  }
};