/**
 * Alpine.js Components for ComfyUI Module
 */

window.comfyUIComponents = {
  /**
   * Main workflow modal component
   */
  workflowModal() {
    return {
      // Component state
      isProcessing: false,
      error: null,
      buttonStates: {
        queue: 'idle', // idle, processing, success, error
        load: 'idle'
      },
      // UI state for collapsible sections
      collapsedSections: new Set(['global']), // Start with global collapsed
      
      // Initialize component
      init() {
        this.$watch('$store.comfyWorkflow.isModalOpen', (isOpen) => {
          if (isOpen) {
            this.resetState();
            this.$store.comfyDestinations.init();
          }
        });
      },
      
      // Reset component state
      resetState() {
        this.isProcessing = false;
        this.error = null;
        this.buttonStates = { queue: 'idle', load: 'idle' };
      },
      
      // Close modal
      closeModal() {
        this.$store.comfyWorkflow.closeModal();
      },
      
      // Handle queue action
      async handleQueue() {
        if (this.isProcessing) return;
        
        const settings = this.$store.comfyWorkflow.settings;
        const file = this.$store.comfyWorkflow.currentFile;
        
        if (!file) {
          this.error = 'No file selected';
          return;
        }
        
        this.setButtonState('queue', 'processing');
        this.error = null;
        
        try {
          for (let i = 0; i < settings.quantity; i++) {
            await window.comfyUIServices.apiClient.queueWorkflow(
              file,
              settings.modifySeeds,
              settings.controlAfterGenerate,
              this.$store.comfyDestinations.selectedDestination
            );
          }
          
          this.setButtonState('queue', 'success');
          this.addResultLog(settings.quantity, settings.modifySeeds, settings.controlAfterGenerate, false);
          
        } catch (error) {
          console.error('Queue error:', error);
          this.setButtonState('queue', 'error');
          this.error = error.message || 'Failed to queue workflow';
          this.addResultLog(settings.quantity, settings.modifySeeds, settings.controlAfterGenerate, true, error.message);
        }
      },
      
      // Handle load action (placeholder for future implementation)
      async handleLoad() {
        if (this.isProcessing) return;
        
        this.setButtonState('load', 'processing');
        this.error = null;
        
        try {
          // Load functionality to be implemented
          await new Promise(resolve => setTimeout(resolve, 1000)); // Placeholder
          this.setButtonState('load', 'success');
        } catch (error) {
          this.setButtonState('load', 'error');
          this.error = error.message || 'Failed to load workflow';
        }
      },
      
      // Set button state with auto-reset
      setButtonState(action, state) {
        this.buttonStates[action] = state;
        this.isProcessing = state === 'processing';
        
        if (state === 'success' || state === 'error') {
          setTimeout(() => {
            this.buttonStates[action] = 'idle';
            this.isProcessing = false;
            if (state === 'error') {
              this.error = null;
            }
          }, 3000);
        }
      },
      
      // Add result to log
      addResultLog(count, useNewSeed, controlMode, isError, errorMessage = null) {
        const timeCount = count === 1 ? 'time' : 'times';
        const seedText = useNewSeed ? (count === 1 ? 'new seed' : 'new seeds') : 'original seed';
        
        let message;
        if (isError) {
          message = `Error queueing workflow to run ${count} ${timeCount} with ${seedText} and ${controlMode} control`;
        } else {
          message = `Queued workflow to run ${count} ${timeCount} with ${seedText} and ${controlMode} control`;
        }
        
        this.$store.comfyWorkflow.addResult({
          message,
          isError,
          errorMessage,
          timestamp: new Date().toLocaleTimeString()
        });
      },
      
      // Open ComfyUI in new tab
      openComfyUI() {
        const url = this.$store.comfyDestinations.selectedDestination;
        if (url) {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      },
      
      // Get button text based on state
      getButtonText(action) {
        const state = this.buttonStates[action];
        const baseText = action === 'queue' ? 'Queue' : 'Load';
        
        switch (state) {
          case 'processing': return 'Processing...';
          case 'success': return 'Success!';
          case 'error': return 'Error';
          default: return `${baseText} >`;
        }
      },
      
      // Get button CSS classes
      getButtonClasses(action) {
        const state = this.buttonStates[action];
        const baseClasses = 'run-btn';
        
        switch (state) {
          case 'processing': return `${baseClasses} waiting`;
          case 'success': return `${baseClasses} success`;
          case 'error': return `${baseClasses} error`;
          default: return baseClasses;
        }
      },

      // Section collapse management
      toggleSection(section) {
        if (this.collapsedSections.has(section)) {
          this.collapsedSections.delete(section);
        } else {
          this.collapsedSections.add(section);
        }
      },

      isCollapsed(section) {
        return this.collapsedSections.has(section);
      }
    };
  },
  
  /**
   * Settings panel component
   */
  settingsPanel() {
    return {
      // Quantity controls
      incrementQuantity() {
        const current = this.$store.comfyWorkflow.settings.quantity;
        if (current < 99) {
          this.$store.comfyWorkflow.updateSettings({ quantity: current + 1 });
        }
      },
      
      decrementQuantity() {
        const current = this.$store.comfyWorkflow.settings.quantity;
        if (current > 1) {
          this.$store.comfyWorkflow.updateSettings({ quantity: current - 1 });
        }
      },
      
      // Validate quantity input
      validateQuantity() {
        let value = parseInt(this.$store.comfyWorkflow.settings.quantity);
        if (isNaN(value) || value < 1) value = 1;
        if (value > 99) value = 99;
        this.$store.comfyWorkflow.updateSettings({ quantity: value });
      },
      
      // Toggle seed modification
      toggleNewSeed() {
        const current = this.$store.comfyWorkflow.settings.modifySeeds;
        this.$store.comfyWorkflow.updateSettings({ modifySeeds: !current });
      },
      
      // Update control after generate
      updateControlAfterGenerate(value) {
        this.$store.comfyWorkflow.updateSettings({ controlAfterGenerate: value });
      }
    };
  },

  /**
   * Workflow editor component for text field editing
   */
  workflowEditor() {
    return {
      // State
      showPromptsOnly: true,
      collapsedNodes: new Set(),
      collapsedFields: new Set(),
      nodeEdits: {},
      filteredNodes: [],

      // Initialize
      init() {
        this.loadWorkflowNodes();
        this.loadSavedEdits();
      },

      // Load and analyze workflow nodes
      loadWorkflowNodes() {
        const workflow = this.$store.comfyWorkflow.currentWorkflow;
        if (!workflow) return;

        const analysis = window.comfyUIServices.workflowAnalyzer.analyzeWorkflow(workflow);
        this.filteredNodes = this.processNodes(analysis);
        this.filterNodes();
      },

      // Process nodes for display
      processNodes(analysis) {
        const orderedNodes = window.comfyUIServices.workflowAnalyzer.orderNodesForEditing(
          analysis.nodes, 
          analysis.connections
        );

        return orderedNodes.map(node => ({
          id: node.id,
          type: node.type,
          fields: analysis.textFields
            .filter(field => field.nodeId === node.id)
            .sort((a, b) => a.fieldName.localeCompare(b.fieldName))
        })).filter(node => node.fields.length > 0);
      },

      // Filter nodes based on show prompts only setting
      filterNodes() {
        const allNodes = this.filteredNodes;
        if (this.showPromptsOnly) {
          this.filteredNodes = allNodes.filter(node => 
            node.fields.some(field => field.isPromptLike)
          );
        } else {
          this.filteredNodes = allNodes;
        }
      },

      // Node/field collapse management
      toggleNode(nodeId) {
        if (this.collapsedNodes.has(nodeId)) {
          this.collapsedNodes.delete(nodeId);
        } else {
          this.collapsedNodes.add(nodeId);
        }
      },

      isNodeCollapsed(nodeId) {
        return this.collapsedNodes.has(nodeId);
      },

      toggleField(nodeId, fieldName) {
        const key = `${nodeId}.${fieldName}`;
        if (this.collapsedFields.has(key)) {
          this.collapsedFields.delete(key);
        } else {
          this.collapsedFields.add(key);
        }
      },

      isFieldCollapsed(nodeId, fieldName) {
        return this.collapsedFields.has(`${nodeId}.${fieldName}`);
      },

      collapseAllNodes() {
        this.filteredNodes.forEach(node => {
          this.collapsedNodes.add(node.id);
        });
      },

      // Edit management
      updateFieldEdit(nodeId, fieldName, value) {
        if (!this.nodeEdits[nodeId]) {
          this.nodeEdits[nodeId] = {};
        }
        this.nodeEdits[nodeId][fieldName] = value;
        this.saveEdits();
      },

      getFieldEdit(nodeId, fieldName) {
        return this.nodeEdits[nodeId]?.[fieldName] || '';
      },

      hasFieldEdit(nodeId, fieldName) {
        return Boolean(this.nodeEdits[nodeId]?.[fieldName]);
      },

      hasNodeEdits(nodeId) {
        return Boolean(this.nodeEdits[nodeId] && Object.keys(this.nodeEdits[nodeId]).length > 0);
      },

      hasEdits() {
        return Object.keys(this.nodeEdits).length > 0;
      },

      // Persistence
      saveEdits() {
        const filename = this.$store.comfyWorkflow.currentFile?.name;
        if (!filename) return;

        const key = `workflow-edits-${filename}`;
        const data = {
          timestamp: Date.now(),
          edits: this.nodeEdits
        };
        localStorage.setItem(key, JSON.stringify(data));
      },

      loadSavedEdits() {
        const filename = this.$store.comfyWorkflow.currentFile?.name;
        if (!filename) return;

        const key = `workflow-edits-${filename}`;
        const saved = localStorage.getItem(key);
        if (saved) {
          try {
            const data = JSON.parse(saved);
            this.nodeEdits = data.edits || {};
          } catch (e) {
            console.warn('Failed to load saved edits:', e);
          }
        }
      },

      // Utility functions
      truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
      }
    };
  }
};
