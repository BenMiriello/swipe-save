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
      date: '',
      size: ''
    },
    
    // Saved/Applied Filter Configuration (what's actually applied)
    appliedFilters: {
      filename: '',
      metadata: '',
      date: '',
      size: ''
    },
    
    // Advanced Options
    includeWorkflowMetadata: false,
    
    // Sorting Configuration
    sorting: {
      field: 'date',
      direction: 'desc'
    },
    
    // Media Type Filters
    mediaTypes: [],
    availableMediaTypes: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'mp4', 'webm', 'mov'],
    
    // Filter Suggestions (loaded from server)
    suggestions: {
      filename: [],
      metadata: [],
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
      await this.loadPresets();
      await this.loadSuggestions();
      await this.loadCurrentState();
      
      // Apply loaded state immediately if there are saved filters
      if (this.hasAppliedFilters()) {
        console.log('Auto-applying saved filters on initialization');
        await this.saveFilters();
      }
    },
    
    /**
     * Toggle filter modal visibility
     */
    toggle() {
      this.active = !this.active;
      if (this.active && this.presets.length === 0) {
        this.loadPresets();
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
        this.appliedFilters.date ||
        this.appliedFilters.size ||
        (this.appliedMediaTypes && this.appliedMediaTypes.length > 0)
      );
    },
    
    /**
     * Start live preview of filters
     */
    async startPreview() {
      if (this.previewActive) return;
      
      this.previewActive = true;
      await this.updatePreview();
    },
    
    /**
     * Update live preview
     */
    async updatePreview() {
      if (!this.previewActive) return;
      
      try {
        // Build filter URL parameters
        let url = `${window.appConfig.getApiUrl()}/api/media?includePreviews=false`; // No previews for count only
        
        const filterConfig = { ...this.currentFilters };
        if (this.mediaTypes.length > 0) {
          filterConfig.mediaTypes = this.mediaTypes;
        }
        
        if (this.hasActiveFilters()) {
          url += `&filters=${encodeURIComponent(JSON.stringify(filterConfig))}`;
          url += `&includeWorkflowMetadata=${this.includeWorkflowMetadata}`;
        }
        
        // Add sorting
        url += `&sortBy=${this.sorting.field}&order=${this.sorting.direction}`;
        
        // Fetch just for count
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          this.previewResultCount = (data.items || data.files || []).length;
        }
      } catch (error) {
        console.error('Error updating preview:', error);
      }
    },
    
    /**
     * Apply current filters (save them)
     */
    async saveFilters() {
      this.isLoading = true;
      
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
          
          url += `&filters=${encodeURIComponent(JSON.stringify(filterConfig))}`;
          url += `&includeWorkflowMetadata=${this.includeWorkflowMetadata}`;
        }
        
        // Add sorting
        url += `&sortBy=${this.sorting.field}&order=${this.sorting.direction}`;
        
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
        this.appliedSorting = { ...this.sorting };
        
        // Update suggestions with newly used filter strings
        this.updateFilterUsage();
        
        // Save current state for persistence
        await this.saveCurrentState();
        
        console.log('Filters saved successfully');
      } catch (error) {
        console.error('Error saving filters:', error);
      } finally {
        this.isLoading = false;
        const listView = Alpine.store('listView');
        listView.isLoading = false;
        this.previewActive = false;
      }
    },
    
    /**
     * Cancel filter changes
     */
    cancelFilters() {
      // Revert to applied state
      this.currentFilters = { ...this.appliedFilters };
      this.mediaTypes = [...(this.appliedMediaTypes || [])];
      this.includeWorkflowMetadata = this.appliedIncludeWorkflowMetadata || false;
      this.sorting = { ...(this.appliedSorting || { field: 'date', direction: 'desc' }) };
      
      this.previewActive = false;
      this.previewResultCount = null;
    },
    
    /**
     * Clear all filters
     */
    async clearFilters() {
      this.currentFilters = {
        filename: '',
        metadata: '',
        date: '',
        size: ''
      };
      this.mediaTypes = [];
      this.includeWorkflowMetadata = false;
      
      // Reload all files without filters
      const listView = Alpine.store('listView');
      await listView.loadFiles();
    },
    
    /**
     * Reset sorting to default
     */
    resetSorting() {
      this.sorting = {
        field: 'date',
        direction: 'desc'
      };
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
      const fields = ['filename', 'metadata', 'date', 'size'];
      
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
        sorting: { ...this.sorting },
        mediaTypes: [...this.mediaTypes],
        includeWorkflowMetadata: this.includeWorkflowMetadata
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
      this.sorting = { ...preset.sorting };
      this.mediaTypes = [...(preset.mediaTypes || [])];
      this.includeWorkflowMetadata = preset.includeWorkflowMetadata || false;
      
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
      const fields = ['filename', 'metadata', 'date', 'size'];
      
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
          sorting: { ...this.sorting },
          appliedSorting: { ...(this.appliedSorting || { field: 'date', direction: 'desc' }) },
          includeWorkflowMetadata: this.includeWorkflowMetadata,
          appliedIncludeWorkflowMetadata: this.appliedIncludeWorkflowMetadata || false
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
            this.appliedSorting = { ...(state.appliedSorting || { field: 'date', direction: 'desc' }) };
            this.appliedIncludeWorkflowMetadata = state.appliedIncludeWorkflowMetadata || false;
            
            // Set current filters to match applied filters (so modal shows what's actually applied)
            this.currentFilters = { ...this.appliedFilters };
            this.mediaTypes = [...this.appliedMediaTypes];
            this.sorting = { ...this.appliedSorting };
            this.includeWorkflowMetadata = this.appliedIncludeWorkflowMetadata;
            
            console.log('Loaded saved filter state:', {
              appliedFilters: this.appliedFilters,
              appliedMediaTypes: this.appliedMediaTypes,
              appliedSorting: this.appliedSorting
            });
          }
        }
      } catch (error) {
        console.error('Error loading current state:', error);
      }
    }
  });
});