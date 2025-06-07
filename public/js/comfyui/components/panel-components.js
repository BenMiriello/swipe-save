/**
 * ComfyUI Panel Components
 * Alpine.js components for settings and destination panels
 */

window.comfyUIComponents = window.comfyUIComponents || {};

window.comfyUIComponents.panelComponents = {
  // Register workflow editor component  
  workflowEditor() {
    console.log('Creating workflowEditor component instance...');
    return {
      // Initialize computed values
      init() {
        console.log('=== WORKFLOW EDITOR COMPONENT INIT ===');
        console.log('Store available:', !!Alpine.store('workflowEditor'));
        
        this.$watch('$store.workflowEditor.updateCounter', (newVal, oldVal) => {
          console.log('Update counter changed:', oldVal, '->', newVal);
          this.updateFilteredNodes();
        });
        this.$watch('$store.workflowEditor.showPromptsOnly', (newVal, oldVal) => {
          console.log('Show prompts only changed:', oldVal, '->', newVal);
          this.updateFilteredNodes();
        });
        this.updateFilteredNodes();
        
        console.log('Initial filteredNodes:', this.filteredNodes);
      },
      
      // Reactive data
      filteredNodes: [],
      
      // Update filtered nodes
      updateFilteredNodes() {
        console.log('=== UPDATE FILTERED NODES ===');
        const store = Alpine.store('workflowEditor');
        console.log('Store:', store);
        console.log('getFilteredNodes method:', typeof store.getFilteredNodes);
        
        if (store && typeof store.getFilteredNodes === 'function') {
          this.filteredNodes = store.getFilteredNodes();
          console.log('Updated filteredNodes:', this.filteredNodes);
        } else {
          console.error('Store or getFilteredNodes method not available');
          this.filteredNodes = [];
        }
      },
      
      // Proxy properties to store
      get currentWorkflow() { return Alpine.store('workflowEditor').currentWorkflow; },
      get analysisResult() { return Alpine.store('workflowEditor').analysisResult; },
      get nodeEdits() { return Alpine.store('workflowEditor').nodeEdits; },
      get hasUnsavedChanges() { return Alpine.store('workflowEditor').hasUnsavedChanges; },
      get showPromptsOnly() { return Alpine.store('workflowEditor').showPromptsOnly; },
      get isEditorExpanded() { return Alpine.store('workflowEditor').isEditorExpanded; },
      
      // UI methods
      toggleEditorSection() { Alpine.store('workflowEditor').toggleEditorSection(); },
      togglePromptsOnly() { 
        Alpine.store('workflowEditor').togglePromptsOnly(); 
      },
      toggleNode(nodeId) { Alpine.store('workflowEditor').toggleNode(nodeId); },
      isNodeCollapsed(nodeId) { return Alpine.store('workflowEditor').isNodeCollapsed(nodeId); },
      hasFieldEdit(nodeId, fieldName) { return Alpine.store('workflowEditor').hasFieldEdit(nodeId, fieldName); },
      getFieldValue(nodeId, fieldName) { return Alpine.store('workflowEditor').getFieldValue(nodeId, fieldName); },
      updateFieldEdit(nodeId, fieldName, value) { Alpine.store('workflowEditor').updateFieldEdit(nodeId, fieldName, value); },
      truncateText(text, maxLength) { return Alpine.store('workflowEditor').truncateText(text, maxLength); }
    };
  },

  // Register destination section component
  destinationSection() {
    return {
      isExpanded: JSON.parse(localStorage.getItem('destinationExpanded') || 'true'),
      
      init() {
        this.$watch('isExpanded', (value) => {
          localStorage.setItem('destinationExpanded', JSON.stringify(value));
        });
      }
    };
  },

  // Register settings panel component
  settingsPanel() {
    return {
      // Global settings section collapse state (open by default)
      isSettingsExpanded: JSON.parse(localStorage.getItem('settingsExpanded') || 'true'),
      
      init() {
        this.$watch('isSettingsExpanded', (value) => {
          localStorage.setItem('settingsExpanded', JSON.stringify(value));
        });
      },
      
      incrementQuantity() {
        const current = Alpine.store('comfyWorkflow').settings.quantity;
        if (current < 99) {
          Alpine.store('comfyWorkflow').updateSettings({ quantity: current + 1 });
        }
      },
      
      decrementQuantity() {
        const current = Alpine.store('comfyWorkflow').settings.quantity;
        if (current > 1) {
          Alpine.store('comfyWorkflow').updateSettings({ quantity: current - 1 });
        }
      },
      
      validateQuantity() {
        let value = parseInt(Alpine.store('comfyWorkflow').settings.quantity);
        if (isNaN(value) || value < 1) value = 1;
        if (value > 99) value = 99;
        Alpine.store('comfyWorkflow').updateSettings({ quantity: value });
      },
      
      toggleNewSeed() {
        const current = Alpine.store('comfyWorkflow').settings.modifySeeds;
        Alpine.store('comfyWorkflow').updateSettings({ modifySeeds: !current });
      },
      
      updateControlAfterGenerate(value) {
        Alpine.store('comfyWorkflow').updateSettings({ controlAfterGenerate: value });
      },
      
      toggleSettingsSection() {
        this.isSettingsExpanded = !this.isSettingsExpanded;
      },
      
      getSettingsSummary() {
        const settings = Alpine.store('comfyWorkflow').settings;
        const quantity = settings.quantity;
        const seedText = settings.modifySeeds ? 'new seed' : 'same seed';
        const control = settings.controlAfterGenerate;
        return `${quantity}, ${seedText}, ${control}`;
      }
    };
  },

  // Register workflow editor component  
  workflowEditor() {
    return {
      init() {
        // Watch for modal open/close to load workflow
        this.$watch('$store.comfyWorkflow.isModalOpen', (isOpen) => {
          if (isOpen) {
            const file = this.$store.comfyWorkflow.currentFile;
            if (file) {
              this.$store.workflowEditor.loadWorkflow(file);
            }
          }
        });
      },

      // Delegate properties to store
      get showPromptsOnly() { return this.$store.workflowEditor.showPromptsOnly; },
      get isEditorExpanded() { return this.$store.workflowEditor.isEditorExpanded; },
      get filteredNodes() { return this.$store.workflowEditor.filteredNodes; },
      get hasUnsavedChanges() { return this.$store.workflowEditor.hasUnsavedChanges; },

      // Delegate methods to store
      togglePromptsOnly() { this.$store.workflowEditor.togglePromptsOnly(); },
      toggleEditorSection() { this.$store.workflowEditor.toggleEditorSection(); },
      toggleNode(nodeId) { this.$store.workflowEditor.toggleNode(nodeId); },
      isNodeCollapsed(nodeId) { return this.$store.workflowEditor.isNodeCollapsed(nodeId); },
      updateFieldEdit(nodeId, fieldName, value) { this.$store.workflowEditor.updateFieldEdit(nodeId, fieldName, value); },
      getFieldValue(nodeId, fieldName) { return this.$store.workflowEditor.getFieldValue(nodeId, fieldName); },
      hasFieldEdit(nodeId, fieldName) { return this.$store.workflowEditor.hasFieldEdit(nodeId, fieldName); },

      // Utility methods
      truncateText(text, maxLength = 50) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
      }
    };
  }
};
