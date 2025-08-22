/**
 * Field Editor Component
 * Alpine.js component for displaying and editing extracted workflow fields
 */

window.comfyUIBentoML = window.comfyUIBentoML || {};

window.comfyUIBentoML.fieldEditor = {
  /**
   * Create Alpine.js component for field editing
   */
  createComponent() {
    return {
      // State
      fields: { seeds: [], textFields: [], parameters: [] },
      summary: null,
      isLoading: false,
      isExpanded: false,
      isEditorExpanded: false, // Add missing property
      editingField: null,
      tempValue: '',
      
      // Filtering
      fieldFilter: '',
      showSeedsOnly: false,
      showPromptsOnly: false,
      showTextFieldsOnly: false,
      showParametersOnly: false,
      showAllFields: true,
      filteredSeeds: [],
      filteredPrompts: [],
      filteredTextFields: [],
      filteredParameters: [],
      
      // Dropdown search
      dropdownSearchTerms: {}, // Key: fieldId, Value: search term
      filteredDropdownOptions: {}, // Key: fieldId, Value: filtered options
      
      // Initialize
      init() {
        // Load ComfyUI object_info for real dropdown options
        this.loadComfyUIObjectInfo();
        
        // Load current file immediately if available
        if (this.$store.comfyWorkflow?.currentFile) {
          this.loadFields(this.$store.comfyWorkflow.currentFile);
        }
        
        // Watch for workflow changes
        this.$watch('$store.comfyWorkflow.currentFile', (file) => {
          if (file) {
            this.loadFields(file);
          } else {
            this.resetFields();
          }
        });
        
        // Watch for filter changes
        this.$watch('fieldFilter', () => {
          this.applyFieldFilter();
        });
      },

      /**
       * Load ComfyUI object_info for real dropdown options
       */
      async loadComfyUIObjectInfo() {
        try {
          const response = await fetch('/api/comfyui/object_info');
          if (response.ok) {
            const objectInfo = await response.json();
            window.comfyUIObjectInfo = objectInfo;
            console.log('ComfyUI object_info loaded:', Object.keys(objectInfo).length, 'nodes');
          } else {
            console.warn('Failed to load ComfyUI object_info:', response.status);
          }
        } catch (error) {
          console.error('Error loading ComfyUI object_info:', error);
        }
      },

      /**
       * Load and extract fields from workflow
       */
      async loadFields(file) {
        if (!file || this.isLoading) return;
        
        // Prevent duplicate requests
        if (this.currentFile === file.name) {
          console.log('File already loaded, skipping:', file.name);
          return;
        }
        
        this.isLoading = true;
        this.currentFile = file.name;
        
        try {
          // Get workflow data
          const response = await fetch(`/api/workflow/${encodeURIComponent(file.name)}`);
          if (!response.ok) {
            throw new Error(`Failed to fetch workflow: ${response.status}`);
          }
          
          const workflowData = await response.json();
          
          // Extract fields using our service
          this.fields = await window.comfyUIBentoML.fieldExtractor.extractFields(workflowData);
          this.summary = window.comfyUIBentoML.fieldExtractor.summarizeFields(this.fields);
          
          // Apply initial filtering
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
        this.fields = { seeds: [], textFields: [], parameters: [] };
        this.summary = null;
        this.editingField = null;
        this.tempValue = '';
        this.filteredSeeds = [];
        this.filteredTextFields = [];
        this.filteredParameters = [];
        this.fieldFilter = '';
      },
      
      /**
       * Set filter mode (mutually exclusive toggles)
       */
      setFilterMode(mode) {
        // Reset all toggles first
        this.showSeedsOnly = false;
        this.showPromptsOnly = false;
        this.showTextFieldsOnly = false;
        this.showParametersOnly = false;
        this.showAllFields = false;
        
        // Set the selected mode
        switch(mode) {
          case 'seeds':
            this.showSeedsOnly = true;
            break;
          case 'prompts':
            this.showPromptsOnly = true;
            break;
          case 'text':
            this.showTextFieldsOnly = true;
            break;
          case 'parameters':
            this.showParametersOnly = true;
            break;
          case 'all':
          default:
            this.showAllFields = true;
            break;
        }
        
        // Apply the new filter
        this.applyFieldFilter();
      },

      /**
       * Apply field filtering
       */
      applyFieldFilter() {
        const filter = this.fieldFilter.toLowerCase();
        
        // Helper function to check if field matches filter
        const matchesFilter = (field) => {
          if (!filter) return true;
          
          const fieldName = (field.fieldName || '').toLowerCase();
          const nodeType = (field.nodeType || '').toLowerCase();
          const currentValue = String(field.currentValue || '').toLowerCase();
          const displayName = this.getDisplayName(field).toLowerCase();
          
          return fieldName.includes(filter) ||
                 nodeType.includes(filter) ||
                 currentValue.includes(filter) ||
                 displayName.includes(filter);
        };
        
        // When "Show All" is enabled, show everything but still apply filter
        if (this.showAllFields) {
          this.filteredSeeds = (this.fields?.seeds || []).filter(matchesFilter);
          this.filteredPrompts = (this.fields?.prompts || []).filter(matchesFilter);
          this.filteredTextFields = (this.fields?.textFields || []).filter(matchesFilter);
          this.filteredParameters = (this.fields?.parameters || []).filter(matchesFilter);
          return;
        }
        
        // Filter based on selected mode only
        this.filteredSeeds = this.showSeedsOnly ? (this.fields?.seeds || []).filter(matchesFilter) : [];
        this.filteredPrompts = this.showPromptsOnly ? (this.fields?.prompts || []).filter(matchesFilter) : [];
        this.filteredTextFields = this.showTextFieldsOnly ? (this.fields?.textFields || []).filter(matchesFilter) : [];
        this.filteredParameters = this.showParametersOnly ? (this.fields?.parameters || []).filter(matchesFilter) : [];
      },


      /**
       * Get field ID for dropdown search
       */
      getFieldId(field) {
        return `${field.nodeId}-${field.fieldName}`;
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
       * Update filtered options for a dropdown
       */
      updateFilteredDropdownOptions(field) {
        const fieldId = this.getFieldId(field);
        const searchTerm = (this.dropdownSearchTerms[fieldId] || '').toLowerCase();
        const allOptions = this.getFieldOptions(field);
        
        if (!searchTerm) {
          this.filteredDropdownOptions[fieldId] = allOptions;
        } else {
          this.filteredDropdownOptions[fieldId] = allOptions.filter(option =>
            option.toLowerCase().includes(searchTerm)
          );
        }
      },

      /**
       * Get filtered options for a dropdown
       */
      getFilteredDropdownOptions(field) {
        const fieldId = this.getFieldId(field);
        
        // If no filtered options exist yet, initialize them
        if (!this.filteredDropdownOptions[fieldId]) {
          this.updateFilteredDropdownOptions(field);
        }
        
        return this.filteredDropdownOptions[fieldId] || [];
      },

      /**
       * Clear dropdown search
       */
      clearDropdownSearch(field) {
        const fieldId = this.getFieldId(field);
        this.dropdownSearchTerms[fieldId] = '';
        this.updateFilteredDropdownOptions(field);
      },
      
      /**
       * Get filtered seeds
       */
      getFilteredSeeds() {
        if (this.showAllFields) return this.filteredSeeds;
        return this.showSeedsOnly ? this.filteredSeeds : [];
      },
      
      /**
       * Get filtered prompts
       */
      getFilteredPrompts() {
        if (this.showAllFields) return this.filteredPrompts;
        return this.showPromptsOnly ? this.filteredPrompts : [];
      },
      
      /**
       * Get filtered text fields
       */
      getFilteredTextFields() {
        if (this.showAllFields) return this.filteredTextFields;
        return this.showTextFieldsOnly ? this.filteredTextFields : [];
      },

      /**
       * Get filtered parameters
       */
      getFilteredParameters() {
        if (this.showAllFields) return this.filteredParameters;
        return this.showParametersOnly ? this.filteredParameters : [];
      },

      /**
       * Toggle section expansion
       */
      toggleExpanded() {
        this.isExpanded = !this.isExpanded;
        this.isEditorExpanded = !this.isEditorExpanded;
      },

      /**
       * Check if field is a dropdown type
       */
      isDropdownField(field) {
        return field.fieldType && field.fieldType.type === 'dropdown';
      },

      /**
       * Get options for a dropdown field
       */
      getFieldOptions(field) {
        if (!this.isDropdownField(field)) return [];
        
        const fieldType = field.fieldType;
        
        // Check if options are loaded and available
        if (fieldType.options && Array.isArray(fieldType.options) && fieldType.options.length > 0) {
          return fieldType.options;
        }
        
        // Filesystem options that haven't loaded yet - don't show Loading placeholder
        if (fieldType.subtype === 'filesystem' && !fieldType.loaded) {
          // Return empty array to hide dropdown until loaded
          return [];
        }
        
        return [];
      },

      /**
       * Check if dropdown field should be shown (has options or is loading)
       */
      shouldShowDropdown(field) {
        if (!this.isDropdownField(field)) return false;
        
        const options = this.getFieldOptions(field);
        const fieldType = field.fieldType;
        
        // Show if we have options
        if (options.length > 0) return true;
        
        // Show if it's a filesystem dropdown that's loaded (even if empty)
        if (fieldType.subtype === 'filesystem' && fieldType.loaded) return true;
        
        // Show for non-filesystem dropdowns even if empty
        if (fieldType.subtype !== 'filesystem') return true;
        
        return false;
      },

      /**
       * Handle dropdown selection change
       */
      handleDropdownChange(field, event) {
        this.tempValue = event.target.value;
      },

      /**
       * Start editing a field
       */
      startEditing(field) {
        this.editingField = `${field.nodeId}-${field.fieldName}`;
        this.tempValue = field.currentValue.toString();
        
        // For dropdown fields, load options if needed
        if (this.isDropdownField(field)) {
          this.loadDropdownOptions(field);
        }
      },

      /**
       * Load dropdown options for filesystem-based dropdowns
       */
      async loadDropdownOptions(field) {
        const fieldType = field.fieldType;
        
        if (fieldType.subtype === 'filesystem' && fieldType.modelType && !fieldType.loaded) {
          try {
            console.log(`Loading ${fieldType.modelType} options for ${field.fieldName}`);
            
            // Fetch model files from API
            const response = await fetch(`/api/comfyui/models/${fieldType.modelType}`);
            if (response.ok) {
              const data = await response.json();
              
              // Extract just the filenames for the dropdown
              const options = data.files.map(file => file.name);
              
              // Update the field type with loaded options
              fieldType.options = options;
              fieldType.loaded = true;
              
              console.log(`Loaded ${options.length} ${fieldType.modelType} files`);
              
              // Trigger reactivity by updating the field object
              field.fieldType = {...fieldType};
              
            } else {
              console.error('Failed to load model files:', response.status);
              fieldType.options = ['Error loading files'];
              fieldType.loaded = true;
            }
          } catch (error) {
            console.error('Failed to load dropdown options:', error);
            fieldType.options = ['Error loading files'];  
            fieldType.loaded = true;
          }
        }
      },

      /**
       * Cancel editing
       */
      cancelEditing() {
        this.editingField = null;
        this.tempValue = '';
      },

      /**
       * Save field edit
       */
      saveEdit(field) {
        // Update the field value
        field.currentValue = this.tempValue;
        field.isModified = true;
        
        // Store the edit for later application
        this.storeFieldEdit(field);
        
        this.editingField = null;
        this.tempValue = '';
        
        console.log('Saved edit for field:', field);
      },

      /**
       * Store field edit for later application to workflow
       */
      storeFieldEdit(field) {
        // Store edits in the comfyWorkflow store so the modal can access them
        if (window.Alpine && Alpine.store('comfyWorkflow')) {
          const store = Alpine.store('comfyWorkflow');
          
          // Initialize fieldEdits object if it doesn't exist
          if (!store.fieldEdits) {
            store.fieldEdits = {};
          }
          
          // Store the edit using nodeId-fieldName as key
          const editKey = `${field.nodeId}-${field.fieldName}`;
          store.fieldEdits[editKey] = {
            nodeId: field.nodeId.toString(),
            fieldName: field.fieldName,
            value: field.currentValue,
            nodeType: field.nodeType
          };
          
          console.log('Stored field edit:', editKey, field.currentValue);
        }
      },

      /**
       * Check if field is being edited
       */
      isEditing(field) {
        return this.editingField === `${field.nodeId}-${field.fieldName}`;
      },

      /**
       * Randomize a seed field
       */
      randomizeSeed(seedField) {
        const newSeed = Math.floor(Math.random() * 2147483647) + 1;
        seedField.currentValue = newSeed;
        seedField.isModified = true;
        this.storeFieldEdit(seedField);
        console.log('Randomized seed:', newSeed);
      },

      /**
       * Randomize all seeds
       */
      randomizeAllSeeds() {
        for (const seedField of this.fields.seeds) {
          this.randomizeSeed(seedField);
        }
      },

      /**
       * Get field display value
       */
      getDisplayValue(field) {
        return window.comfyUIBentoML.fieldExtractor.formatFieldValue(field);
      },

      /**
       * Get field display name
       */
      getDisplayName(field) {
        return window.comfyUIBentoML.fieldExtractor.getFieldDisplayName(field);
      },

      /**
       * Get CSS classes for field
       */
      getFieldClasses(field) {
        const baseClasses = 'field-item';
        const modifiedClasses = field.isModified ? 'field-modified' : '';
        const promptClasses = field.isPrompt ? 'field-prompt' : '';
        
        return [baseClasses, modifiedClasses, promptClasses].filter(Boolean).join(' ');
      },

      /**
       * Get summary display text
       */
      getSummaryText() {
        if (!this.summary) return 'No fields found';
        
        const parts = [];
        if (this.summary.totalSeeds > 0) {
          parts.push(`${this.summary.totalSeeds} seed${this.summary.totalSeeds === 1 ? '' : 's'}`);
        }
        if (this.summary.totalTextFields > 0) {
          parts.push(`${this.summary.totalTextFields} text field${this.summary.totalTextFields === 1 ? '' : 's'}`);
        }
        if (this.summary.totalParameters > 0) {
          parts.push(`${this.summary.totalParameters} parameter${this.summary.totalParameters === 1 ? '' : 's'}`);
        }
        
        return parts.length > 0 ? parts.join(', ') : 'No editable fields';
      },

      /**
       * Check if there are any fields to display
       */
      hasFields() {
        return this.summary && (
          this.summary.totalSeeds > 0 ||
          this.summary.totalTextFields > 0 ||
          this.summary.totalParameters > 0
        );
      },

      /**
       * Check if there are unsaved changes
       */
      get hasUnsavedChanges() {
        if (!this.fields) return false;
        
        // Check if any field has been modified
        const allFields = [
          ...this.fields.seeds,
          ...this.fields.textFields,
          ...this.fields.parameters
        ];
        
        return allFields.some(field => field.isModified);
      },

      /**
       * Handle text area auto-resize
       */
      autoResize(event) {
        const textarea = event.target;
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
      }
    };
  }
};