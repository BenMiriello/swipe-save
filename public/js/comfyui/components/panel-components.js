/**
 * ComfyUI Panel Components
 * Alpine.js components for settings and destination panels
 */

window.comfyUIComponents = window.comfyUIComponents || {};

window.comfyUIComponents.panelComponents = {
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
