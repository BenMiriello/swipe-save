/**
 * Filter Service
 * Core filtering logic for media files
 */

class FilterService {
  constructor() {
    // Initialize without dependencies for now
  }

  /**
   * Apply filters to file list
   * @param {Array} files - Array of file objects
   * @param {Object} filterConfig - Filter configuration
   * @returns {Array} Filtered file array
   */
  applyFilters(files, filterConfig) {
    if (!filterConfig || !files || !Array.isArray(files)) {
      return files;
    }

    let filtered = [...files];

    // Apply basic filters
    filtered = this.applyBasicFilters(filtered, filterConfig);

    return filtered;
  }

  /**
   * Apply basic filters (filename, size, date, type)
   * @param {Array} files - Array of file objects
   * @param {Object} filterConfig - Filter configuration
   * @returns {Array} Filtered file array
   */
  applyBasicFilters(files, filterConfig) {
    let filtered = files;

    // Filename filter
    if (filterConfig.filename && filterConfig.filename.trim()) {
      const caseSensitive = filterConfig.caseSensitive !== undefined ? filterConfig.caseSensitive : true;
      filtered = this.applyFilenameFilter(filtered, filterConfig.filename, caseSensitive);
    }

    // Size filter
    if (filterConfig.size && filterConfig.size.trim()) {
      filtered = this.applySizeFilter(filtered, filterConfig.size);
    }

    // Date filter
    if (filterConfig.date && filterConfig.date.trim()) {
      filtered = this.applyDateFilter(filtered, filterConfig.date);
    }

    // Metadata filter
    if (filterConfig.metadata && filterConfig.metadata.trim()) {
      const caseSensitive = filterConfig.caseSensitive !== undefined ? filterConfig.caseSensitive : true;
      filtered = this.applyMetadataFilter(filtered, filterConfig.metadata, caseSensitive);
    }

    // Input file metadata filter
    if (filterConfig.inputMetadata && filterConfig.inputMetadata.trim()) {
      const caseSensitive = filterConfig.caseSensitive !== undefined ? filterConfig.caseSensitive : true;
      filtered = this.applyInputMetadataFilter(filtered, filterConfig.inputMetadata, caseSensitive);
    }

    // Media type filter
    if (filterConfig.mediaTypes && filterConfig.mediaTypes.length > 0) {
      filtered = this.applyMediaTypeFilter(filtered, filterConfig.mediaTypes);
    }

    return filtered;
  }

  /**
   * Apply filename filter with basic wildcard support
   * @param {Array} files - Array of file objects
   * @param {string} pattern - Filename pattern
   * @param {boolean} caseSensitive - Whether search should be case sensitive
   * @returns {Array} Filtered file array
   */
  applyFilenameFilter(files, pattern, caseSensitive = true) {
    const trimmedPattern = pattern.trim();
    const searchPattern = caseSensitive ? trimmedPattern : trimmedPattern.toLowerCase();
    
    // Simple wildcard to regex conversion
    const regexPattern = searchPattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    try {
      const flags = caseSensitive ? 'g' : 'gi';
      const regex = new RegExp(regexPattern, flags);
      return files.filter(file => {
        // Search both filename and full path
        const filename = file.name || '';
        const fullPath = file.fullPath || file.path || '';
        const searchFilename = caseSensitive ? filename : filename.toLowerCase();
        const searchFullPath = caseSensitive ? fullPath : fullPath.toLowerCase();
        return regex.test(searchFilename) || regex.test(searchFullPath);
      });
    } catch (error) {
      // Fallback to simple contains search if regex fails
      return files.filter(file => {
        const filename = file.name || '';
        const fullPath = file.fullPath || file.path || '';
        const searchFilename = caseSensitive ? filename : filename.toLowerCase();
        const searchFullPath = caseSensitive ? fullPath : fullPath.toLowerCase();
        return searchFilename.includes(searchPattern) || searchFullPath.includes(searchPattern);
      });
    }
  }

  /**
   * Apply size filter
   * @param {Array} files - Array of file objects
   * @param {string} sizePattern - Size pattern (e.g., ">1MB", "<500KB", "1-5MB")
   * @returns {Array} Filtered file array
   */
  applySizeFilter(files, sizePattern) {
    const pattern = sizePattern.trim();
    
    // Parse size pattern
    const sizeInfo = this.parseSizePattern(pattern);
    if (!sizeInfo) {
      return files;
    }

    return files.filter(file => {
      if (!file.size) return false;
      return this.matchesSize(file.size, sizeInfo);
    });
  }

  /**
   * Parse size pattern into comparison object
   * @param {string} pattern - Size pattern
   * @returns {Object|null} Parsed size info
   */
  parseSizePattern(pattern) {
    // Handle patterns like ">1MB", "<500KB", "1-5MB"
    const rangeMatch = pattern.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)(MB|KB|GB)$/i);
    if (rangeMatch) {
      return {
        type: 'range',
        min: this.parseSize(rangeMatch[1] + rangeMatch[3]),
        max: this.parseSize(rangeMatch[2] + rangeMatch[3])
      };
    }

    const comparisonMatch = pattern.match(/^([><]=?)\s*(\d+(?:\.\d+)?)(MB|KB|GB)$/i);
    if (comparisonMatch) {
      return {
        type: 'comparison',
        operator: comparisonMatch[1],
        size: this.parseSize(comparisonMatch[2] + comparisonMatch[3])
      };
    }

    return null;
  }

  /**
   * Parse size string to bytes
   * @param {string} sizeStr - Size string (e.g., "1.5MB")
   * @returns {number} Size in bytes
   */
  parseSize(sizeStr) {
    const match = sizeStr.match(/^(\d+(?:\.\d+)?)(KB|MB|GB)$/i);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case 'kb': return value * 1024;
      case 'mb': return value * 1024 * 1024;
      case 'gb': return value * 1024 * 1024 * 1024;
      default: return value;
    }
  }

  /**
   * Check if file size matches size criteria
   * @param {number} fileSize - File size in bytes
   * @param {Object} sizeInfo - Parsed size info
   * @returns {boolean} Whether size matches
   */
  matchesSize(fileSize, sizeInfo) {
    if (sizeInfo.type === 'range') {
      return fileSize >= sizeInfo.min && fileSize <= sizeInfo.max;
    }

    if (sizeInfo.type === 'comparison') {
      switch (sizeInfo.operator) {
        case '>': return fileSize > sizeInfo.size;
        case '>=': return fileSize >= sizeInfo.size;
        case '<': return fileSize < sizeInfo.size;
        case '<=': return fileSize <= sizeInfo.size;
        default: return false;
      }
    }

    return false;
  }

  /**
   * Apply date filter
   * @param {Array} files - Array of file objects
   * @param {string} datePattern - Date pattern (e.g., "last_week", "today", "2025-01-01")
   * @returns {Array} Filtered file array
   */
  applyDateFilter(files, datePattern) {
    const pattern = datePattern.toLowerCase().trim();
    const now = new Date();

    let startDate, endDate;

    switch (pattern) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
        break;
      
      case 'yesterday':
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
        break;
      
      case 'last_week':
        endDate = now;
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      
      case 'last_month':
        endDate = now;
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      
      default:
        // Check for date range format (startDate:endDate)
        if (pattern.includes(':')) {
          const [start, end] = pattern.split(':');
          
          if (start && start.trim()) {
            startDate = new Date(start.trim());
            if (isNaN(startDate)) startDate = null;
          }
          
          if (end && end.trim()) {
            endDate = new Date(end.trim());
            if (isNaN(endDate)) endDate = null;
            else {
              // Set end date to end of day
              endDate.setHours(23, 59, 59, 999);
            }
          }
          
          // If we have valid dates, break to use them
          if (startDate || endDate) break;
        }
        
        // Try to parse as single date
        const customDate = new Date(pattern);
        if (!isNaN(customDate.getTime())) {
          startDate = new Date(customDate.getFullYear(), customDate.getMonth(), customDate.getDate());
          endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
        } else {
          return files; // Invalid pattern, return all files
        }
    }

    return files.filter(file => {
      if (!file.created_at && !file.mtime) return false;
      const fileDate = new Date(file.created_at || file.mtime);
      return fileDate >= startDate && fileDate < endDate;
    });
  }

  /**
   * Apply media type filter
   * @param {Array} files - Array of file objects
   * @param {Array} mediaTypes - Array of allowed media types
   * @returns {Array} Filtered file array
   */
  applyMediaTypeFilter(files, mediaTypes) {
    if (!Array.isArray(mediaTypes) || mediaTypes.length === 0) {
      return files;
    }

    const allowedExtensions = mediaTypes.map(type => type.toLowerCase());

    return files.filter(file => {
      const extension = this.getFileExtension(file.name);
      return allowedExtensions.includes(extension);
    });
  }

  /**
   * Get file extension from filename
   * @param {string} filename - Filename
   * @returns {string} File extension without dot
   */
  getFileExtension(filename) {
    const match = filename.match(/\.([^.]+)$/);
    return match ? match[1].toLowerCase() : '';
  }


  /**
   * Apply metadata filter - searches in ComfyUI workflow JSON metadata
   * @param {Array} files - Array of file objects
   * @param {string} searchTerm - Search term to look for in metadata
   * @param {boolean} caseSensitive - Whether search is case sensitive
   * @returns {Array} Filtered file array
   */
  applyMetadataFilter(files, searchTerm, caseSensitive = true) {
    if (!searchTerm || !searchTerm.trim()) {
      return files;
    }

    const searchPattern = caseSensitive ? searchTerm : searchTerm.toLowerCase();
    
    return files.filter(file => {
      // Check if file has workflow metadata
      if (!file.workflow || typeof file.workflow !== 'object') {
        return false;
      }

      // Convert workflow object to searchable JSON string
      const workflowString = JSON.stringify(file.workflow);
      const searchableText = caseSensitive ? workflowString : workflowString.toLowerCase();
      
      // Support basic wildcard patterns
      if (searchPattern.includes('*')) {
        const regexPattern = searchPattern
          .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
          .replace(/\\\\?\*/g, '.*'); // Convert * to .*
        
        const regex = new RegExp(regexPattern, caseSensitive ? '' : 'i');
        return regex.test(searchableText);
      }
      
      // Simple substring search
      return searchableText.includes(searchPattern);
    });
  }

  /**
   * Apply input file metadata filter - searches in workflow input file metadata
   * Uses the same syntax and patterns as other filters for consistency
   * @param {Array} files - Array of file objects
   * @param {string} searchTerm - Search term to look for in input file metadata
   * @param {boolean} caseSensitive - Whether search is case sensitive
   * @returns {Array} Filtered file array
   */
  applyInputMetadataFilter(files, searchTerm, caseSensitive = true) {
    if (!searchTerm || !searchTerm.trim()) {
      return files;
    }

    const trimmedPattern = searchTerm.trim();
    const searchPattern = caseSensitive ? trimmedPattern : trimmedPattern.toLowerCase();
    
    return files.filter(file => {
      // Check if file has input file metadata
      if (!file.inputFiles || !Array.isArray(file.inputFiles) || file.inputFiles.length === 0) {
        return false;
      }

      // Search through all input file metadata using consistent pattern matching
      return file.inputFiles.some(inputFile => {
        // Use searchableContent if available, otherwise convert to JSON
        let searchableText = inputFile.searchableContent || JSON.stringify(inputFile);
        searchableText = caseSensitive ? searchableText : searchableText.toLowerCase();
        
        // Use the same wildcard pattern matching as filename filter
        if (searchPattern.includes('*') || searchPattern.includes('?')) {
          // Simple wildcard to regex conversion (same as filename filter)
          const regexPattern = searchPattern
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.');
          
          try {
            const flags = caseSensitive ? 'g' : 'gi';
            const regex = new RegExp(regexPattern, flags);
            return regex.test(searchableText);
          } catch (error) {
            // Fallback to simple contains search if regex fails
            return searchableText.includes(searchPattern);
          }
        }
        
        // Simple substring search (same as other filters)
        return searchableText.includes(searchPattern);
      });
    });
  }
}

module.exports = FilterService;