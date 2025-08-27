/**
 * ComfyUI Modal Components
 * Alpine.js components for modal UI elements
 */

window.comfyUIComponents = window.comfyUIComponents || {};

window.comfyUIComponents.modalComponents = {
  // Register workflow modal component
  workflowModal() {
    return {
      isProcessing: false,
      error: null,
      buttonStates: { queue: 'idle' },
      allowClickAway: false,
      
      // Missing variables that are referenced in HTML
      showPromptsOnly: false,
      filteredNodes: [],
      isEditorExpanded: false,
      hasUnsavedChanges: false,
      
      init() {
        if (window.location.hostname === 'localhost') {
          console.log('Workflow modal component initialized');
        }
        
        // Enable click-away after modal is fully settled
        this.$watch('$store.comfyWorkflow.isModalOpen', (isOpen) => {
          if (isOpen) {
            this.allowClickAway = false;
            setTimeout(() => {
              this.allowClickAway = true;
            }, 3000); // Wait 3 seconds before allowing click-away
          } else {
            console.log('Modal closing - resetting state');
            this.filteredNodes = [];
          }
        });
      },
      
      closeModal() {
        Alpine.store('comfyWorkflow').closeModal();
      },
      
      async handleQueue() {
        if (this.isProcessing) return;
        
        const settings = Alpine.store('comfyWorkflow').settings;
        const file = Alpine.store('comfyWorkflow').currentFile;
        
        if (!file) {
          this.error = 'No file selected';
          return;
        }
        
        this.setButtonState('queue', 'processing');
        this.error = null;
        
        // Check if there are field edits that need to be applied
        const workflowStore = Alpine.store('comfyWorkflow');
        const hasFieldEdits = workflowStore.fieldEdits && Object.keys(workflowStore.fieldEdits).length > 0;
        
        try {
          if (hasFieldEdits) {
            console.log(`ComfyUI: Workflow has field edits - using BentoML edited workflow submission`);
            const modifiedWorkflow = await this.getModifiedWorkflow(file, workflowStore.fieldEdits);
            
            const result = await window.comfyUIBentoML.client.queueWorkflowWithEdits(file, modifiedWorkflow, {
              seedMode: settings.seedMode,
              controlAfterGenerate: settings.controlAfterGenerate,
              quantity: settings.quantity
            });
            console.log('BentoML edited workflow result:', result);
            
          } else {
            console.log(`ComfyUI: No field edits - using BentoML standard submission`);
            const result = await window.comfyUIBentoML.client.queueWorkflow(file, {
              seedMode: settings.seedMode,
              controlAfterGenerate: settings.controlAfterGenerate,
              quantity: settings.quantity
            });
            console.log('BentoML standard result:', result);
          }
          
          this.setButtonState('queue', 'success');
          this.addResultLog(settings.quantity, settings.seedMode !== 'original', settings.controlAfterGenerate, false);
          
        } catch (error) {
          console.error('Queue error:', error);
          this.setButtonState('queue', 'error');
          this.error = error.message || 'Failed to queue workflow';
          this.addResultLog(settings.quantity, settings.seedMode !== 'original', settings.controlAfterGenerate, true, error.message);
        }
      },
      
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
      
      addResultLog(count, useNewSeed, controlMode, isError, errorMessage = null) {
        const timeCount = count === 1 ? 'time' : 'times';
        const seedText = useNewSeed ? (count === 1 ? 'new seed' : 'new seeds') : 'original seed';
        
        let message;
        if (isError) {
          message = `Error queueing workflow to run ${count} ${timeCount} with ${seedText} and ${controlMode} control`;
        } else {
          message = `Queued workflow to run ${count} ${timeCount} with ${seedText} and ${controlMode} control`;
        }
        
        Alpine.store('comfyWorkflow').addResult({
          message,
          isError,
          errorMessage,
          timestamp: new Date().toLocaleTimeString()
        });
      },
      
      openComfyUI() {
        const url = Alpine.store('comfyDestinations').selectedDestination;
        if (url) {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      },
      
      // Missing methods referenced in HTML
      togglePromptsOnly() {
        this.showPromptsOnly = !this.showPromptsOnly;
        // Filter nodes based on the toggle
        this.updateFilteredNodes();
      },
      
      updateFilteredNodes() {
        // This would normally filter the workflow nodes
        // For now, just return empty array to prevent errors
        this.filteredNodes = [];
      },
      
      toggleNode(nodeId) {
        // This would normally expand/collapse a node
        console.log('Toggle node:', nodeId);
      },
      
      isNodeCollapsed(nodeId) {
        // This would normally check if a node is collapsed
        return false;
      },
      
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
      
      getButtonClasses(action) {
        const state = this.buttonStates[action];
        const baseClasses = 'comfy-btn comfy-btn-primary';
        
        switch (state) {
          case 'processing': return `${baseClasses} comfy-btn-processing`;
          case 'success': return `${baseClasses} comfy-btn-success-state`;
          case 'error': return `${baseClasses} comfy-btn-error`;
          default: return baseClasses;
        }
      },
      
      /**
       * Get workflow with field edits applied
       */
      async getModifiedWorkflow(file, fieldEdits) {
        try {
          // Get the original workflow from the file
          const response = await fetch(`${window.appConfig.getApiUrl()}/api/workflow/${encodeURIComponent(file.name)}`);
          if (!response.ok) {
            throw new Error('Failed to get original workflow');
          }
          
          const originalWorkflow = await response.json();
          
          // Apply field edits to the workflow
          for (const editKey in fieldEdits) {
            const edit = fieldEdits[editKey];
            const nodeId = edit.nodeId;
            
            if (originalWorkflow[nodeId] && originalWorkflow[nodeId].inputs) {
              // Apply the edit to the appropriate field
              originalWorkflow[nodeId].inputs[edit.fieldName] = edit.value;
              console.log(`Applied edit to node ${nodeId}.${edit.fieldName}:`, edit.value);
            }
          }
          
          return originalWorkflow;
        } catch (error) {
          console.error('Error getting modified workflow:', error);
          throw error;
        }
      },
      
    };
  },

  // Register queue viewer component (lightweight, delegates to store)
  queueViewer() {
    return {
      // Queue section collapse state (closed by default if no items)
      isQueueExpanded: JSON.parse(localStorage.getItem('queueExpanded') || 'false'),
      
      // Initialize component
      init() {
        this.$watch('isQueueExpanded', (value) => {
          localStorage.setItem('queueExpanded', JSON.stringify(value));
        });
        
        this.$watch('$store.comfyWorkflow.isModalOpen', (isOpen) => {
          if (isOpen) {
            console.log('ComfyUI modal opened - starting queue polling');
            // Add small delay to allow modal to fully initialize before polling
            setTimeout(() => {
              if (this.$store.comfyWorkflow.isModalOpen) { // Double-check modal is still open
                this.$store.queueViewer.refreshQueue();
                this.$store.queueViewer.startAutoRefresh();
              }
            }, 100);
          } else {
            console.log('ComfyUI modal closed - stopping queue polling');
            this.$store.queueViewer.stopAutoRefresh();
          }
        });
      },

      // Delegate methods to store
      get queueItems() { return this.$store.queueViewer.queueItems; },
      get isLoading() { return this.$store.queueViewer.isLoading; },
      get showCancelAllModal() { return this.$store.queueViewer.showCancelAllModal; },
      set showCancelAllModal(value) { this.$store.queueViewer.showCancelAllModal = value; },
      
      refreshQueue() { return this.$store.queueViewer.refreshQueue(); },
      openItemDetails(item) { return this.$store.queueViewer.openItemDetails(item); },
      
      toggleQueueSection() {
        this.isQueueExpanded = !this.isQueueExpanded;
      }
    };
  }
};
