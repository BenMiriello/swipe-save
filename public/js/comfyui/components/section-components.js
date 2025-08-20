/**
 * Alpine.js Section Components for ComfyUI Modal
 * Using proper Alpine.data() pattern
 */

// Destination Section Component
Alpine.data('destinationSection', () => ({
  isExpanded: false,
  
  openComfyUI() {
    if (window.comfyWorkflow && window.comfyWorkflow.openComfyUI) {
      window.comfyWorkflow.openComfyUI();
    }
  }
}));

// Global Settings Section Component  
Alpine.data('settingsPanel', () => ({
  isSettingsExpanded: false,
  
  toggleSettingsSection() {
    this.isSettingsExpanded = !this.isSettingsExpanded;
  },
  
  getSettingsSummary() {
    const store = this.$store.comfyWorkflow;
    if (!store) return '';
    
    const parts = [];
    if (store.settings.quantity > 1) {
      parts.push(`${store.settings.quantity}x`);
    }
    if (store.settings.modifySeeds) {
      parts.push('new seeds');
    }
    if (store.settings.controlAfterGenerate !== 'increment') {
      parts.push(store.settings.controlAfterGenerate);
    }
    
    return parts.join(', ') || 'defaults';
  },
  
  incrementQuantity() {
    if (this.$store.comfyWorkflow && this.$store.comfyWorkflow.settings.quantity < 99) {
      this.$store.comfyWorkflow.settings.quantity++;
    }
  },
  
  decrementQuantity() {
    if (this.$store.comfyWorkflow && this.$store.comfyWorkflow.settings.quantity > 1) {
      this.$store.comfyWorkflow.settings.quantity--;
    }
  },
  
  validateQuantity() {
    if (this.$store.comfyWorkflow) {
      const quantity = this.$store.comfyWorkflow.settings.quantity;
      if (quantity < 1) this.$store.comfyWorkflow.settings.quantity = 1;
      if (quantity > 99) this.$store.comfyWorkflow.settings.quantity = 99;
    }
  },
  
  updateControlAfterGenerate(value) {
    if (this.$store.comfyWorkflow) {
      this.$store.comfyWorkflow.settings.controlAfterGenerate = value;
    }
  },

  updateSeedMode(value) {
    if (this.$store.comfyWorkflow) {
      this.$store.comfyWorkflow.settings.seedMode = value;
    }
  }
}));

// Queue Viewer Section Component
Alpine.data('queueViewer', () => ({
  isQueueExpanded: false,
  queueItems: [],
  
  init() {
    // Subscribe to queue updates from store
    this.$watch('$store.queueViewer.items', (newItems) => {
      this.queueItems = newItems || [];
    });
    
    // Initialize with current queue items
    if (this.$store.queueViewer) {
      this.queueItems = this.$store.queueViewer.items || [];
    }
  },
  
  toggleQueueSection() {
    this.isQueueExpanded = !this.isQueueExpanded;
  },
  
  openItemDetails(item) {
    if (this.$store.queueViewer) {
      this.$store.queueViewer.showItemDetails = true;
      this.$store.queueViewer.selectedItem = item;
    }
  }
}));

// Field Editor Section Component
Alpine.data('fieldEditorSection', () => ({
  isExpanded: true,
  isLoading: false,
  fieldFilter: '',
  showSeedsOnly: false,
  showTextFieldsOnly: false,
  editingField: null,
  tempValue: '',
  
  init() {
    // Initialize field editor when component mounts
    this.loadFields();
  },
  
  toggleExpanded() {
    this.isExpanded = !this.isExpanded;
  },
  
  hasFields() {
    const fields = this.$store.comfyWorkflow?.fields || {};
    return (fields.seeds?.length > 0) || 
           (fields.textFields?.length > 0) || 
           (fields.parameters?.length > 0);
  },
  
  getSummaryText() {
    const fields = this.$store.comfyWorkflow?.fields || {};
    const counts = [];
    if (fields.seeds?.length > 0) counts.push(`${fields.seeds.length} seeds`);
    if (fields.textFields?.length > 0) counts.push(`${fields.textFields.length} text`);
    if (fields.parameters?.length > 0) counts.push(`${fields.parameters.length} params`);
    return counts.join(', ') || 'no fields';
  },
  
  getFilteredSeeds() {
    const fields = this.$store.comfyWorkflow?.fields || {};
    return this.applyFilters(fields.seeds || []);
  },
  
  getFilteredTextFields() {
    const fields = this.$store.comfyWorkflow?.fields || {};
    return this.applyFilters(fields.textFields || []);
  },
  
  applyFilters(fieldList) {
    let filtered = fieldList;
    
    if (this.fieldFilter) {
      const searchTerm = this.fieldFilter.toLowerCase();
      filtered = filtered.filter(field => 
        (field.fieldName || '').toLowerCase().includes(searchTerm) ||
        (field.nodeType || '').toLowerCase().includes(searchTerm) ||
        (field.currentValue || '').toLowerCase().includes(searchTerm)
      );
    }
    
    return filtered;
  },
  
  applyFieldFilter() {
    // Reactive filtering handled by getFilteredSeeds() and getFilteredTextFields()
  },
  
  getDisplayName(field) {
    return field.displayName || field.fieldName || 'Unknown Field';
  },
  
  getDisplayValue(field) {
    const value = field.currentValue || '';
    return value.length > 50 ? value.substring(0, 50) + '...' : value;
  },
  
  getFieldClasses(field) {
    return {
      'comfyui-field-modified': this.hasFieldEdit(field),
      'comfyui-field-editing': this.isEditing(field)
    };
  },
  
  isEditing(field) {
    return this.editingField === `${field.nodeId}-${field.fieldName}`;
  },
  
  hasFieldEdit(field) {
    // Check if field has been modified
    return false; // Implement based on your edit tracking system
  },
  
  startEditing(field) {
    this.editingField = `${field.nodeId}-${field.fieldName}`;
    this.tempValue = field.currentValue || '';
  },
  
  cancelEditing() {
    this.editingField = null;
    this.tempValue = '';
  },
  
  saveEdit(field) {
    // Save the edit to the field
    field.currentValue = this.tempValue;
    this.editingField = null;
    this.tempValue = '';
    
    // Trigger workflow update
    if (this.$store.comfyWorkflow && this.$store.comfyWorkflow.updateField) {
      this.$store.comfyWorkflow.updateField(field.nodeId, field.fieldName, this.tempValue);
    }
  },
  
  randomizeSeed(field) {
    const randomSeed = Math.floor(Math.random() * 2147483647) + 1;
    field.currentValue = randomSeed.toString();
    
    if (this.$store.comfyWorkflow && this.$store.comfyWorkflow.updateField) {
      this.$store.comfyWorkflow.updateField(field.nodeId, field.fieldName, randomSeed);
    }
  },
  
  randomizeAllSeeds() {
    const seeds = this.getFilteredSeeds();
    seeds.forEach(seed => this.randomizeSeed(seed));
  },
  
  async loadFields() {
    this.isLoading = true;
    try {
      // Load fields from workflow
      if (window.comfyUIBentoML && window.comfyUIBentoML.fieldEditor) {
        await window.comfyUIBentoML.fieldEditor.extractFields();
      }
    } catch (error) {
      console.error('Error loading fields:', error);
    } finally {
      this.isLoading = false;
    }
  }
}));