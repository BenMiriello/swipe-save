/**
 * Dropdown Provider Service
 * Handles loading dropdown options from various sources (ComfyUI API, filesystem, etc.)
 */

window.comfyUIBentoML = window.comfyUIBentoML || {};
window.comfyUIBentoML.services = window.comfyUIBentoML.services || {};

window.comfyUIBentoML.services.dropdownProvider = {
  // Cache for loaded options
  optionCache: new Map(),
  cacheTimeout: 300000, // 5 minutes

  /**
   * Get dropdown options for a field
   */
  async getDropdownOptions(field) {
    if (!field.fieldType || field.fieldType.type !== 'dropdown') {
      return [];
    }

    const cacheKey = this.getCacheKey(field);
    
    // Check cache first
    const cached = this.optionCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.options;
    }

    let options = [];

    try {
      switch (field.fieldType.subtype) {
        case 'combo':
          options = field.fieldType.options || [];
          break;
          
        case 'filesystem':
          options = await this.loadFilesystemOptions(field);
          break;
          
        default:
          // Try to load from ComfyUI object_info
          options = await this.loadComfyUIOptions(field);
          break;
      }

      // Cache the results
      this.optionCache.set(cacheKey, {
        options: options,
        timestamp: Date.now()
      });

      return options;
    } catch (error) {
      console.error('Failed to load dropdown options:', error);
      return [];
    }
  },

  /**
   * Load options from ComfyUI object_info API
   */
  async loadComfyUIOptions(field) {
    if (!window.comfyUIObjectInfo) {
      await this.loadComfyUIObjectInfo();
    }

    if (window.comfyUIObjectInfo && field.nodeType && field.fieldName) {
      const nodeInfo = window.comfyUIObjectInfo[field.nodeType];
      if (nodeInfo && nodeInfo.input && nodeInfo.input.required && nodeInfo.input.required[field.fieldName]) {
        const fieldDef = nodeInfo.input.required[field.fieldName];
        if (Array.isArray(fieldDef) && fieldDef.length > 0 && Array.isArray(fieldDef[0])) {
          return fieldDef[0];
        }
      }
    }

    return [];
  },

  /**
   * Load ComfyUI object_info if not already loaded
   */
  async loadComfyUIObjectInfo() {
    try {
      const response = await fetch('/api/comfyui/object_info');
      if (response.ok) {
        const objectInfo = await response.json();
        window.comfyUIObjectInfo = objectInfo;
      }
    } catch (error) {
      console.error('Error loading ComfyUI object_info:', error);
    }
  },

  /**
   * Load filesystem-based options
   */
  async loadFilesystemOptions(field) {
    const category = this.getFilesystemCategory(field);
    
    try {
      const response = await fetch(`/api/comfyui/models/${category}`);
      if (response.ok) {
        const data = await response.json();
        return data.files || [];
      }
    } catch (error) {
      console.error(`Error loading ${category} files:`, error);
    }

    return [];
  },

  /**
   * Determine filesystem category for field
   */
  getFilesystemCategory(field) {
    // Check explicit category first
    if (field.fieldType.category) {
      return field.fieldType.category;
    }

    // Infer from field name
    const fieldName = field.fieldName.toLowerCase();
    
    if (fieldName.includes('ckpt') || fieldName.includes('checkpoint')) {
      return 'checkpoints';
    }
    if (fieldName.includes('lora')) {
      return 'loras';
    }
    if (fieldName.includes('vae')) {
      return 'vae';
    }
    if (fieldName.includes('image') || this.looksLikeImageFile(field.currentValue)) {
      return 'input';
    }

    // Default based on file extension
    if (typeof field.currentValue === 'string') {
      const lowerValue = field.currentValue.toLowerCase();
      if (lowerValue.endsWith('.safetensors') || lowerValue.endsWith('.ckpt')) {
        return 'checkpoints';
      }
      if (lowerValue.endsWith('.png') || lowerValue.endsWith('.jpg') || lowerValue.endsWith('.jpeg')) {
        return 'input';
      }
    }

    return 'checkpoints'; // Default fallback
  },

  /**
   * Check if value looks like an image file
   */
  looksLikeImageFile(value) {
    if (typeof value !== 'string') return false;
    const lowerValue = value.toLowerCase();
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif'];
    return imageExtensions.some(ext => lowerValue.endsWith(ext));
  },

  /**
   * Filter options based on search term
   */
  filterOptions(options, searchTerm) {
    if (!searchTerm || !Array.isArray(options)) {
      return options;
    }

    const lowerSearch = searchTerm.toLowerCase();
    return options.filter(option => 
      option.toLowerCase().includes(lowerSearch)
    );
  },

  /**
   * Generate cache key for field
   */
  getCacheKey(field) {
    return `${field.nodeType || 'unknown'}-${field.fieldName}-${field.fieldType.subtype || 'unknown'}`;
  },

  /**
   * Clear all cached options
   */
  clearCache() {
    this.optionCache.clear();
  },

  /**
   * Clear cached options for specific field type
   */
  clearCacheForCategory(category) {
    for (const [key, value] of this.optionCache.entries()) {
      if (key.includes(category)) {
        this.optionCache.delete(key);
      }
    }
  },

  /**
   * Get available filesystem categories
   */
  getAvailableCategories() {
    return [
      'checkpoints',
      'loras', 
      'vae',
      'input'
    ];
  },

  /**
   * Validate dropdown option
   */
  isValidOption(field, value) {
    // For filesystem dropdowns, any string is potentially valid
    if (field.fieldType.subtype === 'filesystem') {
      return typeof value === 'string' && value.length > 0;
    }

    // For combo dropdowns, check against known options
    if (field.fieldType.options && Array.isArray(field.fieldType.options)) {
      return field.fieldType.options.includes(value);
    }

    // Default to valid for unknown types
    return true;
  },

  /**
   * Get default value for dropdown field
   */
  getDefaultValue(field) {
    if (field.fieldType.options && field.fieldType.options.length > 0) {
      return field.fieldType.options[0];
    }
    
    return field.currentValue || '';
  }
};