/**
 * ComfyUI Panel Components
 * Alpine.js components for settings and destination panels
 */

window.comfyUIComponents = window.comfyUIComponents || {};

window.comfyUIComponents.panelComponents = {
  // Register workflow editor component  
  workflowEditor() {
    return {
      // Initialize computed values
      init() {
        this.$watch('$store.workflowEditor.updateCounter', () => {
          this.updateFilteredNodes();
        });
        this.$watch('$store.workflowEditor.showPromptsOnly', () => {
          this.updateFilteredNodes();
        });
        this.updateFilteredNodes();
      },
      
      // Reactive data
      filteredNodes: [],
      
      // Update filtered nodes
      updateFilteredNodes() {
        const store = Alpine.store('workflowEditor');
        if (store && typeof store.getFilteredNodes === 'function') {
          this.filteredNodes = store.getFilteredNodes();
        } else {
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
      toggleAllNodes() { Alpine.store('workflowEditor').toggleAllNodes(); },
      getCollapseButtonText() { return Alpine.store('workflowEditor').getCollapseButtonText(); },
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
      
      toggleSettingsSection() {
        this.isSettingsExpanded = !this.isSettingsExpanded;
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
      
      updateControlAfterGenerate(value) {
        Alpine.store('comfyWorkflow').updateSettings({ controlAfterGenerate: value });
      },
      
      getSettingsSummary() {
        const settings = Alpine.store('comfyWorkflow').settings;
        const parts = [];
        
        if (settings.quantity > 1) {
          parts.push(`${settings.quantity}x`);
        }
        
        if (settings.modifySeeds) {
          parts.push('new seed');
        }
        
        if (settings.controlAfterGenerate !== 'increment') {
          parts.push(settings.controlAfterGenerate);
        }
        
        return parts.length > 0 ? parts.join(', ') : 'Default settings';
      }
    };
  }
};