/**
 * Field Editor UI Component
 * Streamlined Alpine.js component focused purely on UI interactions
 * Business logic delegated to services
 */

window.comfyUIBentoML = window.comfyUIBentoML || {};

window.comfyUIBentoML.fieldEditorUI = {
  /**
   * Create streamlined Alpine.js component for field editing UI
   */
  createComponent() {
    return {
      // Core state
      fields: { seeds: [], prompts: [], textFields: [], models: [], options: [], numbers: [], toggles: [] },
      summary: null,
      isLoading: false,
      currentFile: null,
      
      // UI state
      isExpanded: false,
      isEditorExpanded: false,
      editingFieldId: null,
      
      // Filtering state
      fieldFilter: '',
      showSeedsOnly: false,
      showPromptsOnly: false,
      showTextFieldsOnly: false,
      showModelsOnly: false,
      showOptionsOnly: false,
      showNumbersOnly: false,
      showTogglesOnly: false,
      showAllFields: true,
      
      // Dropdown search state
      dropdownSearchTerms: {},
      filteredDropdownOptions: {},
      
      // Filtered results (initialized for reactivity)
      filteredSeeds: [],
      filteredPrompts: [],
      filteredTextFields: [],
      filteredModels: [],
      filteredOptions: [],
      filteredNumbers: [],
      filteredToggles: [],

      // Initialize component
      async init() {
        // Initialize services
        await window.comfyUIBentoML.services.fieldEditorService.init();
        
        // Load current file if available
        if (this.$store.comfyWorkflow?.currentFile) {
          this.loadFields(this.$store.comfyWorkflow.currentFile);
        }
        
        // Watch for workflow changes
        this.$watch('$store.comfyWorkflow.currentFile', (file) => {
          file ? this.loadFields(file) : this.resetFields();
        });
        
        // Watch for filter changes
        this.$watch('fieldFilter', () => this.applyFieldFilter());
      },

      /**
       * Load and extract fields from workflow (delegates to service)
       */
      async loadFields(file) {
        if (!file || this.isLoading || this.currentFile === file.name) return;
        
        this.isLoading = true;
        this.currentFile = file.name;
        
        try {
          const result = await window.comfyUIBentoML.services.fieldEditorService.loadFields(file);
          this.fields = result.fields;
          this.summary = result.summary;
          
          // Apply stored edits if any exist
          window.comfyUIBentoML.services.fieldEditorService.applyStoredEdits(this.fields);
          
          this.applyFieldFilter();
        } catch (error) {
          console.error('Error loading fields:', error);
          this.resetFields();
        } finally {
          this.isLoading = false;
        }
      },

      /**
       * Reset fields state
       */
      resetFields() {
        this.fields = { seeds: [], prompts: [], textFields: [], models: [], options: [], numbers: [], toggles: [] };
        this.summary = null;
        this.currentFile = null;
        this.applyFieldFilter();
      },

      /**
       * Set filter mode (mutually exclusive toggles)
       */
      setFilterMode(mode) {
        // Reset all filter flags
        Object.assign(this, {
          showSeedsOnly: false, showPromptsOnly: false, showTextFieldsOnly: false,
          showModelsOnly: false, showOptionsOnly: false, showNumbersOnly: false,
          showTogglesOnly: false, showAllFields: false
        });
        
        // Set the selected mode
        const modeMap = {
          seeds: 'showSeedsOnly', prompts: 'showPromptsOnly', text: 'showTextFieldsOnly',
          models: 'showModelsOnly', options: 'showOptionsOnly', 
          numbers: 'showNumbersOnly', toggles: 'showTogglesOnly'
        };
        
        this[modeMap[mode] || 'showAllFields'] = true;
        this.applyFieldFilter();
      },

      /**
       * Apply field filtering with text search
       */
      applyFieldFilter() {
        const filter = this.fieldFilter.toLowerCase();
        
        const matchesFilter = (field) => {
          if (!filter || !field) return true;
          // Defensive: ensure field has required properties
          if (!field.nodeId || !field.fieldName) return false;
          const searchStr = [field.fieldName, field.nodeType, field.currentValue, this.getDisplayName(field)]
            .join(' ').toLowerCase();
          return searchStr.includes(filter);
        };
        
        // Apply filters based on current mode
        const categories = ['seeds', 'prompts', 'textFields', 'models', 'options', 'numbers', 'toggles'];
        const showModes = ['showSeedsOnly', 'showPromptsOnly', 'showTextFieldsOnly', 'showModelsOnly', 'showOptionsOnly', 'showNumbersOnly', 'showTogglesOnly'];
        
        categories.forEach((category, i) => {
          const shouldShow = this.showAllFields || this[showModes[i]];
          const categoryFields = this.fields?.[category] || [];
          this[`filtered${category.charAt(0).toUpperCase() + category.slice(1)}`] = 
            shouldShow ? categoryFields.filter(matchesFilter) : [];
        });
      },


      /**
       * Start editing a field (delegates to session manager)
       */
      async startEditing(field) {
        window.comfyUIBentoML.services.fieldEditSession.startEdit(field);
        this.editingFieldId = this.getFieldId(field);
        
        // Load dropdown options if needed
        if (this.isDropdownField(field)) {
          await window.comfyUIBentoML.services.fieldEditorService.loadDropdownOptions(field);
          // Update filtered options after loading
          this.updateFilteredDropdownOptions(field);
        }
      },

      /**
       * Update temporary value during editing
       */
      updateTempValue(value) {
        return window.comfyUIBentoML.services.fieldEditSession.updateTempValue(value);
      },

      /**
       * Cancel current editing session
       */
      cancelEditing() {
        window.comfyUIBentoML.services.fieldEditSession.cancelEdit();
        this.editingFieldId = null;
      },

      /**
       * Save current edit session
       */
      saveEdit(field) {
        const result = window.comfyUIBentoML.services.fieldEditSession.saveEdit();
        if (result.success) {
          this.editingFieldId = null;
          console.log('Field edit saved:', result);
        } else {
          console.error('Failed to save edit:', result.error);
        }
        return result;
      },

      /**
       * Check if field is being edited
       */
      isEditing(field) {
        return this.editingFieldId === this.getFieldId(field);
      },
      
      /**
       * Get temporary value for editing
       */
      getTempValue() {
        return window.comfyUIBentoML.services.fieldEditSession.getTempValue();
      },

      /**
       * Randomize single seed (delegates to service)
       */
      randomizeSeed(seedField) {
        window.comfyUIBentoML.services.fieldEditorService.randomizeSeed(seedField);
        window.comfyUIBentoML.services.fieldEditorService.storeFieldEdit(seedField);
        console.log('Randomized seed:', seedField.fieldName, seedField.currentValue);
      },

      /**
       * Randomize all seeds (delegates to service)
       */
      randomizeAllSeeds() {
        const changes = window.comfyUIBentoML.services.fieldEditorService.randomizeAllSeeds(this.fields.seeds);
        
        // Store all changes
        changes.forEach(change => {
          window.comfyUIBentoML.services.fieldEditorService.storeFieldEdit(change.field);
        });
        
        console.log('Randomized all seeds:', changes.length);
      },

      /**
       * Get field options for dropdowns (sync version for template)
       */
      getFieldOptions(field) {
        if (!this.isDropdownField(field)) return [];
        
        const fieldType = field.fieldType;
        // Return loaded options or empty array
        return fieldType.options || [];
      },

      // Dropdown utilities
      getFieldId(field) { 
        if (!field || !field.nodeId || !field.fieldName) return `invalid-${Date.now()}-${Math.random()}`;
        return `${field.nodeId}-${field.fieldName}`;
      },
      
      isDropdownField(field) { 
        return field.fieldType && field.fieldType.type === 'dropdown' 
      },

      /**
       * Update filtered dropdown options
       */
      updateFilteredDropdownOptions(field) {
        const fieldId = this.getFieldId(field);
        const searchTerm = (this.dropdownSearchTerms[fieldId] || '').toLowerCase();
        const allOptions = field.fieldType?.options || [];
        
        this.filteredDropdownOptions[fieldId] = !searchTerm ? 
          allOptions : allOptions.filter(option => option.toLowerCase().includes(searchTerm));
      },

      /**
       * Get filtered options for dropdown
       */
      getFilteredDropdownOptions(field) {
        const fieldId = this.getFieldId(field);
        if (!this.filteredDropdownOptions[fieldId]) {
          this.updateFilteredDropdownOptions(field);
        }
        return this.filteredDropdownOptions[fieldId] || [];
      },

      /**
       * Handle dropdown search input
       */
      onDropdownSearchInput(field, searchTerm) {
        const fieldId = this.getFieldId(field);
        this.dropdownSearchTerms[fieldId] = searchTerm;
        this.updateFilteredDropdownOptions(field);
      },

      /**
       * Clear dropdown search
       */
      clearDropdownSearch(field) {
        const fieldId = this.getFieldId(field);
        this.dropdownSearchTerms[fieldId] = '';
        this.updateFilteredDropdownOptions(field);
      },

      // Display utilities
      getDisplayValue(field) {
        return window.comfyUIBentoML.fieldExtractor?.formatFieldValue(field) || String(field.currentValue || '');
      },

      getDisplayValueWithEllipsis(field, maxLength = 1000) {
        // Use raw field value to avoid external truncation
        const value = String(field.currentValue || '');
        return value.length <= maxLength ? value : value.substring(0, maxLength) + '...';
      },

      getTextareaRows(field) {
        const value = this.getDisplayValue(field);
        const lines = Math.max(value.split('\n').length, Math.ceil(value.length / 80));
        return Math.max(3, Math.min(20, lines));
      },

      getDisplayName(field) {
        return window.comfyUIBentoML.fieldExtractor?.getFieldDisplayName(field) || field.fieldName || 'Unknown';
      },

      getFieldClasses(field) {
        const classes = ['field-item'];
        if (field.isModified) classes.push('field-modified');
        if (field.isPrompt) classes.push('field-prompt');
        return classes.join(' ');
      },

      // Summary utilities
      getSummaryText() {
        if (!this.summary) return 'No fields found';
        
        const counts = [
          [this.summary.totalSeeds, 'seed'],
          [this.summary.totalPrompts, 'prompt'],
          [this.summary.totalTextFields, 'text field'],
          [this.summary.totalModels, 'model'],
          [this.summary.totalDropdowns, 'dropdown'],
          [this.summary.totalNumbers, 'number'],
          [this.summary.totalToggles, 'toggle']
        ];
        
        const parts = counts
          .filter(([count]) => count > 0)
          .map(([count, type]) => `${count} ${type}${count === 1 ? '' : 's'}`);
        
        return parts.length > 0 ? parts.join(', ') : 'No editable fields';
      },

      hasFields() {
        return this.summary && this.summary.totalFields > 0;
      },

      get hasUnsavedChanges() {
        if (!this.fields) return false;
        const allFields = Object.values(this.fields).flat();
        return allFields.some(field => field.isModified);
      },

      // UI helpers
      toggleExpanded() {
        this.isExpanded = !this.isExpanded;
        this.isEditorExpanded = !this.isEditorExpanded;
      },

      autoResize(event) {
        const textarea = event.target;
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
      },

      handleDropdownChange(field, event) {
        this.updateTempValue(event.target.value);
      }
    };
  }
};