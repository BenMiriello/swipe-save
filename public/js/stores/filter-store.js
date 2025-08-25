/**
 * Alpine.js Store for Filter State Management
 */
document.addEventListener('alpine:init', () => {
  Alpine.store('filters', {
    // UI State
    active: false,
    isLoading: false,
    
    // Filter Configuration (working state - for live preview)
    currentFilters: {
      filename: '',
      metadata: '',
      inputMetadata: '',
      date: '',
      size: ''
    },
    
    // Saved/Applied Filter Configuration (what's actually applied)
    appliedFilters: {
      filename: '',
      metadata: '',
      inputMetadata: '',
      date: '',
      size: ''
    },
    
    // Advanced Options
    includeWorkflowMetadata: false,
    caseSensitive: true, // On by default
    
    // Applied state tracking
    appliedIncludeWorkflowMetadata: false,
    appliedCaseSensitive: true,
    
    
    // Media Type Filters
    mediaTypes: [],
    availableMediaTypes: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'mp4', 'webm', 'mov'],
    
    // Filter Suggestions (loaded from server)
    suggestions: {
      filename: [],
      metadata: [],
      inputMetadata: [],
      date: [],
      size: []
    },
    
    // Filter Presets
    presets: [],
    
    // Live preview state
    previewActive: false,
    previewResultCount: null,
    
    // Methods
    async init() {
      console.log('Filter store initialized');
      
      // Ensure we start with clean loading states
      this.isLoading = false;
      const listView = Alpine.store('listView');
      if (listView) {
        listView.isLoading = false;
      }
      
      try {
        await this.loadPresets();
        await this.loadSuggestions();
        await this.loadCurrentState();
        
        // Apply loaded state immediately if there are saved filters
        // Don't auto-save on initialization to prevent stuck loading states
        if (this.hasAppliedFilters()) {
          console.log('Saved filters detected - they will be applied when list loads');
          // Just mark that we have applied filters, don't actually save/load now
          // The list view will automatically apply them when it loads
        }
      } catch (error) {
        console.error('Error during filter store initialization:', error);
        // Ensure loading states are cleared on any error
        this.isLoading = false;
        if (listView) {
          listView.isLoading = false;
        }
      }
    },
    
    /**
     * Toggle filter modal visibility
     */
    toggle() {
      this.active = !this.active;
      if (this.active) {
        // Load initial count when opening modal
        this.previewActive = true;
        this.updateLiveResults();
        
        if (this.presets.length === 0) {
          this.loadPresets();
        }
      }
    },
    
    /**
     * Open filter modal
     */
    open() {
      this.active = true;
      if (this.presets.length === 0) {
        this.loadPresets();
      }
    },
    
    /**
     * Close filter modal
     */
    close() {
      this.active = false;
    },
    
    /**
     * Check if any filters are active
     */
    hasActiveFilters() {
      return !!(
        this.currentFilters.filename ||
        this.currentFilters.metadata ||
        this.currentFilters.inputMetadata ||
        this.currentFilters.date ||
        this.currentFilters.size ||
        this.mediaTypes.length > 0
      );
    },
    
    /**
     * Check if any applied filters exist (for auto-loading)
     */
    hasAppliedFilters() {
      return !!(
        this.appliedFilters.filename ||
        this.appliedFilters.metadata ||
        this.appliedFilters.inputMetadata ||
        this.appliedFilters.date ||
        this.appliedFilters.size ||
        (this.appliedMediaTypes && this.appliedMediaTypes.length > 0)
      );
    },
    
    /**
     * Apply filters immediately to UI (can be reverted on cancel)
     */
    async applyFiltersImmediately() {
      this.previewActive = true;
      await this.updateLiveResults();
    },
    
    /**
     * Update live results and apply to UI immediately
     */
    async updateLiveResults() {
      // Safety timeout to prevent stuck loading state
      const safetyTimeout = setTimeout(() => {
        console.warn('Live results timeout - clearing loading state');
        const listView = Alpine.store('listView');
        if (listView) {
          listView.isLoading = false;
        }
      }, 10000); // 10 second timeout
      
      try {
        const listView = Alpine.store('listView');
        
        // Build filter URL parameters
        let url = `${window.appConfig.getApiUrl()}/api/media?includePreviews=true`;
        
        const filterConfig = { ...this.currentFilters };
        if (this.mediaTypes.length > 0) {
          filterConfig.mediaTypes = this.mediaTypes;
        }
        filterConfig.caseSensitive = this.caseSensitive;
        
        if (this.hasActiveFilters()) {
          url += `&filters=${encodeURIComponent(JSON.stringify(filterConfig))}`;
          // Automatically include workflow metadata if any metadata filtering is used
          const needsMetadata = !!(filterConfig.metadata || filterConfig.inputMetadata);
          url += `&includeWorkflowMetadata=${this.includeWorkflowMetadata || needsMetadata}`;
        }
        
        
        // Apply to UI immediately
        listView.isLoading = true;
        
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          const newFiles = data.items || data.files || [];
          
          // Update count immediately
          this.previewResultCount = newFiles.length;
          
          // Update list view with new results
          listView.allFiles.length = 0;
          listView.allFiles.push(...newFiles);
          listView.totalPages = Math.ceil(listView.allFiles.length / listView.itemsPerPage);
          listView.currentPage = 1; // Reset to first page
          listView.updateDisplayedFiles();
        }
      } catch (error) {
        console.error('Error updating live results:', error);
        // On error, show no files
        listView.allFiles.length = 0;
        listView.displayedFiles.length = 0;
        listView.totalPages = 0;
        listView.currentPage = 1;
        this.previewResultCount = 0;
      } finally {
        clearTimeout(safetyTimeout); // Clear the safety timeout
        const listView = Alpine.store('listView');
        listView.isLoading = false;
      }
    },
    
    /**
     * Apply current filters (save them)
     */
    async saveFilters() {
      // Prevent multiple simultaneous save operations
      if (this.isLoading) {
        console.log('Save already in progress, skipping...');
        return;
      }
      
      this.isLoading = true;
      
      // Safety timeout to prevent stuck loading state
      const safetyTimeout = setTimeout(() => {
        console.warn('Filter save timeout - clearing loading state');
        this.isLoading = false;
        const listView = Alpine.store('listView');
        if (listView) {
          listView.isLoading = false;
        }
      }, 10000); // 10 second timeout
      
      try {
        const listView = Alpine.store('listView');
        
        // Build filter URL parameters
        let url = `${window.appConfig.getApiUrl()}/api/media?includePreviews=true`;
        
        // Add filter parameters
        if (this.hasActiveFilters()) {
          const filterConfig = { ...this.currentFilters };
          
          if (this.mediaTypes.length > 0) {
            filterConfig.mediaTypes = this.mediaTypes;
          }
          
          filterConfig.caseSensitive = this.caseSensitive;
          
          url += `&filters=${encodeURIComponent(JSON.stringify(filterConfig))}`;
          // Automatically include workflow metadata if any metadata filtering is used
          const needsMetadata = !!(filterConfig.metadata || filterConfig.inputMetadata);
          url += `&includeWorkflowMetadata=${this.includeWorkflowMetadata || needsMetadata}`;
        }
        
        
        // Directly fetch and update list view
        listView.isLoading = true;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to load filtered files');
        
        const data = await response.json();
        const newFiles = data.items || data.files || [];
        console.log('Filter saved, loaded', newFiles.length, 'files');
        
        // Update list view with filtered results
        listView.allFiles.length = 0;
        listView.allFiles.push(...newFiles);
        listView.totalPages = Math.ceil(listView.allFiles.length / listView.itemsPerPage);
        listView.currentPage = 1; // Reset to first page
        listView.updateDisplayedFiles();
        
        // Save applied state
        this.appliedFilters = { ...this.currentFilters };
        this.appliedMediaTypes = [...this.mediaTypes];
        this.appliedIncludeWorkflowMetadata = this.includeWorkflowMetadata;
        this.appliedCaseSensitive = this.caseSensitive;
        this.appliedSorting = { ...this.sorting };
        
        // Update suggestions with newly used filter strings
        this.updateFilterUsage();
        
        // Save current state for persistence
        await this.saveCurrentState();
        
        console.log('Filters saved successfully');
      } catch (error) {
        console.error('Error saving filters:', error);
        // On error, ensure UI shows no files and is not loading
        const listView = Alpine.store('listView');
        listView.allFiles.length = 0;
        listView.displayedFiles.length = 0;
        listView.totalPages = 0;
        listView.currentPage = 1;
        this.previewResultCount = 0;
      } finally {
        clearTimeout(safetyTimeout); // Clear the safety timeout
        this.isLoading = false;
        const listView = Alpine.store('listView');
        listView.isLoading = false;
        this.previewActive = false;
      }
    },
    
    /**
     * Cancel filter changes and restore previous state
     */
    async cancelFilters() {
      // Revert to applied state
      this.currentFilters = { ...this.appliedFilters };
      this.mediaTypes = [...(this.appliedMediaTypes || [])];
      this.includeWorkflowMetadata = this.appliedIncludeWorkflowMetadata || false;
      this.caseSensitive = this.appliedCaseSensitive !== undefined ? this.appliedCaseSensitive : true;
      
      // Restore list view to the last saved state
      const listView = Alpine.store('listView');
      await listView.loadFiles(); // Reload original files without filters
      
      this.previewActive = false;
      this.previewResultCount = null;
    },
    
    /**
     * Clear all filters
     */
    async clearFilters() {
      // Clear current filters
      this.currentFilters = {
        filename: '',
        metadata: '',
        inputMetadata: '',
        date: '',
        size: ''
      };
      this.mediaTypes = [];
      this.includeWorkflowMetadata = false;
      this.caseSensitive = true; // Reset to default
      
      // Clear applied filters
      this.appliedFilters = {
        filename: '',
        metadata: '',
        inputMetadata: '',
        date: '',
        size: ''
      };
      this.appliedMediaTypes = [];
      this.appliedIncludeWorkflowMetadata = false;
      this.appliedCaseSensitive = true;
      
      
      // Clear preview state
      this.previewActive = false;
      this.previewResultCount = null;
      
      // Save cleared state for persistence
      await this.saveCurrentState();
      
      // Reload all files without filters
      const listView = Alpine.store('listView');
      await listView.loadFiles();
    },
    
    
    /**
     * Toggle media type selection
     */
    toggleMediaType(type) {
      const index = this.mediaTypes.indexOf(type);
      if (index > -1) {
        this.mediaTypes.splice(index, 1);
      } else {
        this.mediaTypes.push(type);
      }
    },
    
    /**
     * Check if media type is selected
     */
    isMediaTypeSelected(type) {
      return this.mediaTypes.includes(type);
    },
    
    /**
     * Load filter presets from server
     */
    async loadPresets() {
      try {
        const response = await fetch(`${window.appConfig.getApiUrl()}/api/filters/presets`);
        if (response.ok) {
          this.presets = await response.json();
          console.log('Loaded', this.presets.length, 'filter presets');
        }
      } catch (error) {
        console.error('Error loading filter presets:', error);
        this.presets = [];
      }
    },
    
    /**
     * Load filter suggestions from server
     */
    async loadSuggestions() {
      const fields = ['filename', 'metadata', 'inputMetadata', 'date', 'size'];
      
      for (const field of fields) {
        try {
          const response = await fetch(`${window.appConfig.getApiUrl()}/api/filters/suggestions/${field}`);
          if (response.ok) {
            const suggestions = await response.json();
            this.suggestions[field] = suggestions;
          }
        } catch (error) {
          console.error(`Error loading suggestions for ${field}:`, error);
          this.suggestions[field] = [];
        }
      }
    },
    
    /**
     * Save current filters as a preset
     */
    async savePreset(name) {
      if (!name || !name.trim()) {
        return false;
      }
      
      const preset = {
        name: name.trim(),
        filters: { ...this.currentFilters },
        mediaTypes: [...this.mediaTypes],
        includeWorkflowMetadata: this.includeWorkflowMetadata,
        caseSensitive: this.caseSensitive
      };
      
      try {
        const response = await fetch(`${window.appConfig.getApiUrl()}/api/filters/presets`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(preset)
        });
        
        if (response.ok) {
          await this.loadPresets(); // Refresh presets list
          return true;
        } else {
          console.error('Error saving preset:', response.statusText);
          return false;
        }
      } catch (error) {
        console.error('Error saving preset:', error);
        return false;
      }
    },
    
    /**
     * Load a filter preset
     */
    async loadPreset(presetId) {
      const preset = this.presets.find(p => p.id === presetId);
      if (!preset) {
        console.error('Preset not found:', presetId);
        return;
      }
      
      // Load preset configuration
      this.currentFilters = { ...preset.filters };
      this.mediaTypes = [...(preset.mediaTypes || [])];
      this.includeWorkflowMetadata = preset.includeWorkflowMetadata || false;
      this.caseSensitive = preset.caseSensitive !== undefined ? preset.caseSensitive : true;
      
      // Update preset usage
      try {
        await fetch(`${window.appConfig.getApiUrl()}/api/filters/presets/${presetId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...preset,
            usageCount: (preset.usageCount || 0) + 1,
            lastUsed: new Date().toISOString()
          })
        });
      } catch (error) {
        console.error('Error updating preset usage:', error);
      }
      
      // Apply the loaded filters
      await this.saveFilters();
    },
    
    /**
     * Delete a filter preset
     */
    async deletePreset(presetId) {
      try {
        const response = await fetch(`${window.appConfig.getApiUrl()}/api/filters/presets/${presetId}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          await this.loadPresets(); // Refresh presets list
          return true;
        } else {
          console.error('Error deleting preset:', response.statusText);
          return false;
        }
      } catch (error) {
        console.error('Error deleting preset:', error);
        return false;
      }
    },
    
    /**
     * Update filter usage statistics
     */
    async updateFilterUsage() {
      const fields = ['filename', 'metadata', 'inputMetadata', 'date', 'size'];
      
      for (const field of fields) {
        const value = this.currentFilters[field];
        if (value && value.trim()) {
          try {
            await fetch(`${window.appConfig.getApiUrl()}/api/filters/suggestions/${field}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                value: value.trim()
              })
            });
          } catch (error) {
            console.error(`Error updating usage for ${field}:`, error);
          }
        }
      }
    },
    
    /**
     * Get suggestions for a filter field based on current input
     */
    getSuggestions(field, input) {
      const fieldSuggestions = this.suggestions[field] || [];
      if (!input || !input.trim()) {
        return fieldSuggestions.slice(0, 5); // Return top 5 if no input
      }
      
      const searchTerm = input.toLowerCase().trim();
      return fieldSuggestions
        .filter(suggestion => 
          suggestion.value.toLowerCase().includes(searchTerm)
        )
        .slice(0, 10);
    },
    
    /**
     * Get available date filter options
     */
    getDateOptions() {
      return [
        { value: 'today', label: 'Today' },
        { value: 'yesterday', label: 'Yesterday' },
        { value: 'last_week', label: 'Last Week' },
        { value: 'last_month', label: 'Last Month' }
      ];
    },
    
    /**
     * Get available size filter options
     */
    getSizeOptions() {
      return [
        { value: '<1MB', label: 'Small (< 1MB)' },
        { value: '1-5MB', label: 'Medium (1-5MB)' },
        { value: '5-20MB', label: 'Large (5-20MB)' },
        { value: '>20MB', label: 'Very Large (> 20MB)' }
      ];
    },
    
    /**
     * Save current filter state for persistence
     */
    async saveCurrentState() {
      try {
        const state = {
          currentFilters: { ...this.currentFilters },
          appliedFilters: { ...this.appliedFilters },
          mediaTypes: [...this.mediaTypes],
          appliedMediaTypes: [...(this.appliedMediaTypes || [])],
          includeWorkflowMetadata: this.includeWorkflowMetadata,
          appliedIncludeWorkflowMetadata: this.appliedIncludeWorkflowMetadata || false,
          caseSensitive: this.caseSensitive,
          appliedCaseSensitive: this.appliedCaseSensitive !== undefined ? this.appliedCaseSensitive : true
        };
        
        const response = await fetch(`${window.appConfig.getApiUrl()}/api/filters/current-state`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(state)
        });
        
        if (!response.ok) {
          console.error('Failed to save current state:', response.statusText);
        }
      } catch (error) {
        console.error('Error saving current state:', error);
      }
    },
    
    /**
     * Force clear all loading states (emergency method)
     */
    forceClearLoadingStates() {
      console.log('Force clearing all loading states');
      this.isLoading = false;
      this.previewActive = false;
      const listView = Alpine.store('listView');
      if (listView) {
        listView.isLoading = false;
      }
    },
    
    /**
     * Load current filter state for persistence
     */
    async loadCurrentState() {
      try {
        const response = await fetch(`${window.appConfig.getApiUrl()}/api/filters/current-state`);
        if (response.ok) {
          const state = await response.json();
          if (state) {
            // Load applied filters (what was actually applied to the data)
            this.appliedFilters = { ...(state.appliedFilters || {}) };
            this.appliedMediaTypes = [...(state.appliedMediaTypes || [])];
            this.appliedIncludeWorkflowMetadata = state.appliedIncludeWorkflowMetadata || false;
            this.appliedCaseSensitive = state.appliedCaseSensitive !== undefined ? state.appliedCaseSensitive : true;
            
            // Set current filters to match applied filters (so modal shows what's actually applied)
            this.currentFilters = { ...this.appliedFilters };
            this.mediaTypes = [...this.appliedMediaTypes];
            this.includeWorkflowMetadata = this.appliedIncludeWorkflowMetadata;
            this.caseSensitive = this.appliedCaseSensitive;
            
            console.log('Loaded saved filter state:', {
              appliedFilters: this.appliedFilters,
              appliedMediaTypes: this.appliedMediaTypes
            });
          }
        }
      } catch (error) {
        console.error('Error loading current state:', error);
      }
    }
  });
});