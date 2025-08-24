/**
 * Filter UI Component
 * Reusable component for filter modal and controls
 */

/**
 * Create filter component
 * @returns {Object} Alpine.js component
 */
function createFilterComponent() {
  return {
    // Component state
    showSaveDialog: false,
    newPresetName: '',
    
    // Size slider state (0-100 scale)
    sizeMin: 0,
    sizeMax: 100,
    
    // Initialize component
    init() {
      // Auto-focus first input when modal opens
      this.$watch('$store.filters.active', (active) => {
        if (active) {
          this.$nextTick(() => {
            const firstInput = this.$el.querySelector('input[type="text"]');
            if (firstInput) {
              firstInput.focus();
            }
          });
        }
      });

      // Watch for filter changes and trigger live preview
      let previewTimeout = null;
      const triggerPreview = () => {
        if (previewTimeout) clearTimeout(previewTimeout);
        previewTimeout = setTimeout(() => {
          if (this.$store.filters.hasActiveFilters()) {
            this.$store.filters.startPreview();
          }
        }, 500); // Debounce by 500ms
      };

      // Watch all filter fields
      this.$watch('$store.filters.currentFilters.filename', triggerPreview);
      this.$watch('$store.filters.currentFilters.metadata', triggerPreview);  
      this.$watch('$store.filters.currentFilters.date', triggerPreview);
      this.$watch('$store.filters.currentFilters.size', triggerPreview);
      this.$watch('$store.filters.mediaTypes', triggerPreview);
      this.$watch('$store.filters.sorting', triggerPreview);
      
      // Watch size sliders and convert to filter format
      this.$watch('sizeMin', () => this.updateSizeFilter());
      this.$watch('sizeMax', () => this.updateSizeFilter());
    },
    
    // Handle keyboard shortcuts
    handleKeydown(event) {
      // ESC is disabled - modal can only be closed via Cancel/Save buttons
      
      // Ctrl+Enter to save and apply filters
      if (event.ctrlKey && event.key === 'Enter') {
        this.$store.filters.saveFilters();
        this.$store.filters.close();
        event.preventDefault();
      }
    },
    
    // Apply filters and close modal
    async applyFilters() {
      await this.$store.filters.applyFilters();
      this.$store.filters.close();
    },
    
    // Clear all filters
    async clearFilters() {
      await this.$store.filters.clearFilters();
      this.$store.filters.close();
    },
    
    // Show save preset dialog
    showSavePresetDialog() {
      this.showSaveDialog = true;
      this.newPresetName = '';
      this.$nextTick(() => {
        const input = this.$el.querySelector('#preset-name-input');
        if (input) {
          input.focus();
        }
      });
    },
    
    // Save preset with validation
    async savePreset() {
      const name = this.newPresetName.trim();
      if (!name) {
        alert('Please enter a preset name');
        return;
      }
      
      const success = await this.$store.filters.savePreset(name);
      if (success) {
        this.showSaveDialog = false;
        this.newPresetName = '';
        console.log('Preset saved successfully');
      } else {
        alert('Error saving preset');
      }
    },
    
    // Cancel save preset dialog
    cancelSavePreset() {
      this.showSaveDialog = false;
      this.newPresetName = '';
    },
    
    // Load a preset
    async loadPreset(presetId) {
      await this.$store.filters.loadPreset(presetId);
    },
    
    // Delete preset with confirmation
    async deletePreset(presetId, presetName) {
      if (confirm(`Are you sure you want to delete the preset "${presetName}"?`)) {
        const success = await this.$store.filters.deletePreset(presetId);
        if (!success) {
          alert('Error deleting preset');
        }
      }
    },
    
    // Format preset usage display
    formatPresetUsage(preset) {
      const count = preset.usageCount || 0;
      const lastUsed = preset.lastUsed ? new Date(preset.lastUsed) : null;
      
      let usage = `used ${count}x`;
      if (lastUsed) {
        const now = new Date();
        const diffDays = Math.floor((now - lastUsed) / (24 * 60 * 60 * 1000));
        if (diffDays === 0) {
          usage += ', today';
        } else if (diffDays === 1) {
          usage += ', yesterday';
        } else if (diffDays < 7) {
          usage += `, ${diffDays} days ago`;
        }
      }
      
      return usage;
    },
    
    // Get filter summary for display
    getFilterSummary() {
      const filters = this.$store.filters;
      const parts = [];
      
      if (filters.currentFilters.filename) {
        parts.push(`Name: ${filters.currentFilters.filename}`);
      }
      
      if (filters.currentFilters.metadata) {
        parts.push(`Metadata: ${filters.currentFilters.metadata}`);
      }
      
      if (filters.currentFilters.date) {
        parts.push(`Date: ${filters.currentFilters.date}`);
      }
      
      if (filters.currentFilters.size) {
        parts.push(`Size: ${filters.currentFilters.size}`);
      }
      
      if (filters.mediaTypes.length > 0) {
        parts.push(`Types: ${filters.mediaTypes.join(', ')}`);
      }
      
      return parts.length > 0 ? parts.join(' • ') : 'No filters active';
    },
    
    // Check if filter has content
    hasFilterContent(fieldName) {
      return !!(this.$store.filters.currentFilters[fieldName] && 
               this.$store.filters.currentFilters[fieldName].trim());
    },
    
    // Clear specific filter field
    clearFilterField(fieldName) {
      this.$store.filters.currentFilters[fieldName] = '';
    },
    
    // Size slider methods
    formatSizeValue(value) {
      const sizes = [
        { threshold: 0, label: 'Any Size' },
        { threshold: 10, label: '1KB' },
        { threshold: 20, label: '10KB' }, 
        { threshold: 30, label: '100KB' },
        { threshold: 40, label: '1MB' },
        { threshold: 50, label: '5MB' },
        { threshold: 60, label: '10MB' },
        { threshold: 70, label: '50MB' },
        { threshold: 80, label: '100MB' },
        { threshold: 90, label: '500MB' },
        { threshold: 100, label: '1GB+' }
      ];
      
      for (let i = sizes.length - 1; i >= 0; i--) {
        if (value >= sizes[i].threshold) {
          return sizes[i].label;
        }
      }
      return 'Any Size';
    },
    
    updateSizeFilter() {
      if (this.sizeMin === 0 && this.sizeMax === 100) {
        this.$store.filters.currentFilters.size = '';
        return;
      }
      
      let sizeFilter = '';
      if (this.sizeMin > 0 && this.sizeMax < 100) {
        // Range filter
        const minSize = this.sliderValueToBytes(this.sizeMin);
        const maxSize = this.sliderValueToBytes(this.sizeMax);
        sizeFilter = `${this.formatBytes(minSize)}-${this.formatBytes(maxSize)}`;
      } else if (this.sizeMin > 0) {
        // Min only
        const minSize = this.sliderValueToBytes(this.sizeMin);
        sizeFilter = `>${this.formatBytes(minSize)}`;
      } else if (this.sizeMax < 100) {
        // Max only
        const maxSize = this.sliderValueToBytes(this.sizeMax);
        sizeFilter = `<${this.formatBytes(maxSize)}`;
      }
      
      this.$store.filters.currentFilters.size = sizeFilter;
    },
    
    sliderValueToBytes(value) {
      // Convert slider value (0-100) to bytes
      const sizes = [
        { threshold: 0, bytes: 0 },
        { threshold: 10, bytes: 1024 }, // 1KB
        { threshold: 20, bytes: 10 * 1024 }, // 10KB
        { threshold: 30, bytes: 100 * 1024 }, // 100KB
        { threshold: 40, bytes: 1024 * 1024 }, // 1MB
        { threshold: 50, bytes: 5 * 1024 * 1024 }, // 5MB
        { threshold: 60, bytes: 10 * 1024 * 1024 }, // 10MB
        { threshold: 70, bytes: 50 * 1024 * 1024 }, // 50MB
        { threshold: 80, bytes: 100 * 1024 * 1024 }, // 100MB
        { threshold: 90, bytes: 500 * 1024 * 1024 }, // 500MB
        { threshold: 100, bytes: 1024 * 1024 * 1024 } // 1GB
      ];
      
      for (let i = sizes.length - 1; i >= 0; i--) {
        if (value >= sizes[i].threshold) {
          return sizes[i].bytes;
        }
      }
      return 0;
    },
    
    formatBytes(bytes) {
      if (bytes >= 1024 * 1024 * 1024) {
        return Math.round(bytes / (1024 * 1024 * 1024)) + 'GB';
      }
      if (bytes >= 1024 * 1024) {
        return Math.round(bytes / (1024 * 1024)) + 'MB';
      }
      if (bytes >= 1024) {
        return Math.round(bytes / 1024) + 'KB';
      }
      return bytes + 'B';
    },
    
    resetSizeFilter() {
      this.sizeMin = 0;
      this.sizeMax = 100;
    }
  };
}

// Export for use in other components
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createFilterComponent };
} else {
  window.createFilterComponent = createFilterComponent;
}