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
      fields: { seeds: [], textFields: [], otherFields: [] },
      summary: null,
      isLoading: false,
      isExpanded: false,
      isEditorExpanded: false, // Add missing property
      editingField: null,
      tempValue: '',
      
      // Filtering
      fieldFilter: '',
      showSeedsOnly: false,
      showTextFieldsOnly: false,
      filteredSeeds: [],
      filteredTextFields: [],
      
      // Initialize
      init() {
        console.log('Field editor component initialized');
        console.log('Available stores:', this.$store);
        console.log('comfyWorkflow store:', this.$store.comfyWorkflow);
        
        // Load current file immediately if available
        if (this.$store.comfyWorkflow?.currentFile) {
          console.log('Loading current file on init:', this.$store.comfyWorkflow.currentFile);
          this.loadFields(this.$store.comfyWorkflow.currentFile);
        }
        
        // Watch for workflow changes
        this.$watch('$store.comfyWorkflow.currentFile', (file) => {
          console.log('Workflow file changed:', file);
          if (file) {
            this.loadFields(file);
          } else {
            this.resetFields();
          }
        });
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
        console.log('Loading fields for file:', file.name);
        
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
          
          console.log('Field extraction complete:', {
            summary: this.summary,
            textFields: this.fields.textFields,
            textFieldsLength: this.fields.textFields ? this.fields.textFields.length : 0
          });
          
          // Apply initial filtering
          this.applyFieldFilter();
          
          console.log('After filtering applied:', {
            filteredTextFields: this.filteredTextFields,
            getFilteredTextFields: this.getFilteredTextFields()
          });
          
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
        this.fields = { seeds: [], textFields: [], otherFields: [] };
        this.summary = null;
        this.editingField = null;
        this.tempValue = '';
        this.filteredSeeds = [];
        this.filteredTextFields = [];
        this.fieldFilter = '';
      },
      
      /**
       * Apply field filtering
       */
      applyFieldFilter() {
        const filter = this.fieldFilter.toLowerCase();
        
        // Filter seeds
        this.filteredSeeds = this.fields.seeds.filter(field => {
          if (this.showTextFieldsOnly) return false;
          if (!filter) return true;
          
          return (
            field.fieldName.toLowerCase().includes(filter) ||
            field.nodeType.toLowerCase().includes(filter) ||
            String(field.currentValue).toLowerCase().includes(filter)
          );
        });
        
        // Filter text fields
        this.filteredTextFields = this.fields.textFields.filter(field => {
          if (this.showSeedsOnly) return false;
          if (!filter) return true;
          
          return (
            field.fieldName.toLowerCase().includes(filter) ||
            field.nodeType.toLowerCase().includes(filter) ||
            String(field.currentValue).toLowerCase().includes(filter)
          );
        });
      },
      
      /**
       * Get filtered seeds
       */
      getFilteredSeeds() {
        if (this.showTextFieldsOnly) return [];
        if (!this.fieldFilter && !this.showSeedsOnly) return this.fields.seeds || [];
        return this.filteredSeeds;
      },
      
      /**
       * Get filtered text fields
       */
      getFilteredTextFields() {
        console.log('getFilteredTextFields called:', {
          showSeedsOnly: this.showSeedsOnly,
          fieldFilter: this.fieldFilter,
          showTextFieldsOnly: this.showTextFieldsOnly,
          textFieldsCount: (this.fields.textFields || []).length,
          filteredTextFieldsCount: this.filteredTextFields.length
        });
        
        if (this.showSeedsOnly) {
          console.log('Returning empty array because showSeedsOnly is true');
          return [];
        }
        if (!this.fieldFilter && !this.showTextFieldsOnly) {
          console.log('Returning raw text fields:', this.fields.textFields || []);
          return this.fields.textFields || [];
        }
        console.log('Returning filtered text fields:', this.filteredTextFields);
        return this.filteredTextFields;
      },

      /**
       * Toggle section expansion
       */
      toggleExpanded() {
        this.isExpanded = !this.isExpanded;
        this.isEditorExpanded = !this.isEditorExpanded;
      },

      /**
       * Start editing a field
       */
      startEditing(field) {
        this.editingField = `${field.nodeId}-${field.fieldName}`;
        this.tempValue = field.currentValue.toString();
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
        // Use existing workflow editor store if available
        if (window.Alpine && Alpine.store('workflowEditor')) {
          Alpine.store('workflowEditor').updateFieldEdit(
            field.nodeId.toString(),
            field.fieldName,
            field.currentValue
          );
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
        if (this.summary.totalOtherFields > 0) {
          parts.push(`${this.summary.totalOtherFields} other field${this.summary.totalOtherFields === 1 ? '' : 's'}`);
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
          this.summary.totalOtherFields > 0
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
          ...this.fields.otherFields
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