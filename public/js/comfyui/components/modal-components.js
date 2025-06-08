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
      
      // Workflow editor state (integrated directly)
      filteredNodes: [],
      
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
            
            // Load workflow into editor when modal opens
            // Add delay to ensure nested components are initialized
            setTimeout(() => {
              console.log('Loading workflow after modal is fully open...');
              this.$store.workflowEditor.loadWorkflow(this.$store.comfyWorkflow.currentFile);
              
              // Watch for workflow editor updates and sync to modal
              this.updateWorkflowEditorState();
            }, 100);
          } else {
            // Reset workflow editor when modal closes
            console.log('Modal closing - resetting workflow editor state');
            this.$store.workflowEditor.reset();
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
        
        try {
          if (settings.quantity > 1) {
            console.log(`ComfyUI: Starting batch of ${settings.quantity} workflows`);
          }
          
          // Get workflow with text edits applied
          const modifiedWorkflow = this.$store.workflowEditor.getModifiedWorkflow();
          
          for (let i = 0; i < settings.quantity; i++) {
            await window.comfyUIServices.apiClient.queueWorkflowWithEdits(
              file,
              modifiedWorkflow,
              settings.modifySeeds,
              settings.controlAfterGenerate,
              Alpine.store('comfyDestinations').selectedDestination
            );
          }
          
          if (settings.quantity > 1) {
            console.log(`ComfyUI: Completed batch of ${settings.quantity} workflows`);
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
      
      // Workflow editor methods (integrated directly)
      updateWorkflowEditorState() {
        console.log('Updating workflow editor state in modal...');
        
        // Watch for store changes
        this.$watch('$store.workflowEditor.updateCounter', () => {
          console.log('Store update counter changed, syncing to modal...');
          this.syncWorkflowEditorState();
        });
        
        // Initial sync
        this.syncWorkflowEditorState();
      },
      
      syncWorkflowEditorState() {
        const store = Alpine.store('workflowEditor');
        if (store && typeof store.getFilteredNodes === 'function') {
          this.filteredNodes = store.getFilteredNodes();
          console.log('Synced filteredNodes to modal:', this.filteredNodes);
        }
      },
      
      // Workflow editor UI methods (proxied to store)
      get hasUnsavedChanges() { return Alpine.store('workflowEditor').hasUnsavedChanges; },
      get isEditorExpanded() { return Alpine.store('workflowEditor').isEditorExpanded; },
      get showPromptsOnly() { return Alpine.store('workflowEditor').showPromptsOnly; },
      
      toggleEditorSection() { Alpine.store('workflowEditor').toggleEditorSection(); },
      togglePromptsOnly() { Alpine.store('workflowEditor').togglePromptsOnly(); },
      toggleNode(nodeId) { Alpine.store('workflowEditor').toggleNode(nodeId); },
      isNodeCollapsed(nodeId) { return Alpine.store('workflowEditor').isNodeCollapsed(nodeId); },
      hasFieldEdit(nodeId, fieldName) { return Alpine.store('workflowEditor').hasFieldEdit(nodeId, fieldName); },
      getFieldValue(nodeId, fieldName) { return Alpine.store('workflowEditor').getFieldValue(nodeId, fieldName); },
      updateFieldEdit(nodeId, fieldName, value) { Alpine.store('workflowEditor').updateFieldEdit(nodeId, fieldName, value); }
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
