/**
 * BentoML UI Adapter
 * Bridges new BentoML services with existing Alpine.js components
 */

window.comfyUIBentoML = window.comfyUIBentoML || {};

window.comfyUIBentoML.uiAdapter = {
  // Feature flag integration
  isEnabled: false,

  /**
   * Initialize UI adapter
   */
  async init() {
    try {
      // Check if BentoML is enabled
      const status = await window.comfyUIBentoML.client.getStatus();
      this.isEnabled = status.featureFlags.USE_BENTOML_SUBMISSION;

      if (this.isEnabled) {
        console.log('BentoML UI adapter enabled');
        this.enhanceExistingComponents();
      }

    } catch (error) {
      console.warn('BentoML UI adapter initialization failed:', error.message);
    }
  },

  /**
   * Enhance existing modal components with BentoML functionality
   */
  enhanceExistingComponents() {
    // Add BentoML methods to existing workflow modal
    if (window.Alpine && window.Alpine.store('comfyWorkflow')) {
      this.enhanceWorkflowModal();
    }

    // Enhance workflow editor if available
    if (window.Alpine && window.Alpine.store('workflowEditor')) {
      this.enhanceWorkflowEditor();
    }
  },

  /**
   * Add BentoML queue method to existing modal
   */
  enhanceWorkflowModal() {
    const originalModalComponent = window.comfyUIComponents.modalComponents.workflowModal;
    
    // Extend with BentoML queue method
    const enhancedComponent = function() {
      const baseComponent = originalModalComponent.call(this);
      
      return {
        ...baseComponent,

        // Enhanced queue method with BentoML support
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
            // Check if BentoML is available
            const bentomlClient = window.comfyUIBentoML.client;
            const canUseBentoML = bentomlClient.featureFlags.USE_BENTOML_SUBMISSION;

            let results = [];

            if (canUseBentoML) {
              try {
                // Try BentoML submission
                console.log('Attempting BentoML submission...');
                
                const result = await bentomlClient.queueWorkflow(file, {
                  seedMode: settings.seedMode,
                  controlAfterGenerate: settings.controlAfterGenerate,
                  quantity: settings.quantity
                });

                results.push(result);
                this.setButtonState('queue', 'success');
                this.addResultLog(settings.quantity, settings.seedMode !== 'original', settings.controlAfterGenerate, false, 'BentoML');

              } catch (bentomlError) {
                console.warn('BentoML submission failed, falling back to legacy:', bentomlError.message);
                
                // Fallback to legacy method
                const legacyResult = await this.handleLegacyQueue(file, settings);
                results.push(legacyResult);
                this.setButtonState('queue', 'success');
                this.addResultLog(settings.quantity, settings.seedMode !== 'original', settings.controlAfterGenerate, false, 'Legacy (fallback)');
              }
            } else {
              // Use legacy method
              const legacyResult = await this.handleLegacyQueue(file, settings);
              results.push(legacyResult);
              this.setButtonState('queue', 'success');
              this.addResultLog(settings.quantity, settings.seedMode !== 'original', settings.controlAfterGenerate, false, 'Legacy');
            }

          } catch (error) {
            console.error('All queue methods failed:', error);
            this.setButtonState('queue', 'error');
            this.error = error.message || 'Failed to queue workflow';
            this.addResultLog(settings.quantity, settings.seedMode !== 'original', settings.controlAfterGenerate, true, 'Error', error.message);
          }
        },

        // Legacy queue method (original implementation)
        async handleLegacyQueue(file, settings) {
          const modifiedWorkflow = this.$store.workflowEditor.getModifiedWorkflow();

          for (let i = 0; i < settings.quantity; i++) {
            await window.comfyUIServices.apiClient.queueWorkflowWithEdits(
              file,
              modifiedWorkflow,
              settings.seedMode !== 'original', // Convert seedMode to boolean for backward compatibility
              settings.controlAfterGenerate,
              Alpine.store('comfyDestinations').selectedDestination
            );
          }

          return { method: 'legacy', success: true };
        },

        // Enhanced result logging with method info
        addResultLog(count, useNewSeed, controlMode, isError, method = '', errorMessage = null) {
          const timeCount = count === 1 ? 'time' : 'times';
          const seedText = useNewSeed ? (count === 1 ? 'new seed' : 'new seeds') : 'original seed';
          const methodSuffix = method ? ` (${method})` : '';

          let message;
          if (isError) {
            message = `Error queueing workflow to run ${count} ${timeCount} with ${seedText} and ${controlMode} control${methodSuffix}`;
          } else {
            message = `Queued workflow to run ${count} ${timeCount} with ${seedText} and ${controlMode} control${methodSuffix}`;
          }

          Alpine.store('comfyWorkflow').addResult({
            message,
            isError,
            errorMessage,
            method,
            timestamp: new Date().toLocaleTimeString()
          });
        }
      };
    };

    // Replace the original component
    window.comfyUIComponents.modalComponents.workflowModal = enhancedComponent;
    console.log('Enhanced workflow modal with BentoML support');
  },

  /**
   * Enhance workflow editor with schema-driven field detection
   */
  enhanceWorkflowEditor() {
    const store = Alpine.store('workflowEditor');
    
    // Add BentoML field detection method
    store.loadWorkflowWithBentoML = async function(file) {
      if (!file) {
        this.reset();
        return;
      }

      try {
        // Fetch workflow data
        const response = await fetch(`/api/workflow/${encodeURIComponent(file.name)}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch workflow: ${response.status}`);
        }

        const workflowData = await response.json();
        this.originalWorkflow = JSON.parse(JSON.stringify(workflowData));
        this.currentWorkflow = workflowData;

        // Try BentoML schema-driven analysis first
        try {
          const textFields = await window.comfyUIBentoML.schemaService.identifyTextFields(workflowData);
          
          this.analysisResult = {
            nodes: this.extractNodesFromTextFields(textFields),
            textFields: textFields,
            hasValidStructure: textFields.length > 0,
            method: 'bentoml-schema'
          };

          console.log(`BentoML schema analysis found ${textFields.length} text fields`);

        } catch (schemaError) {
          console.warn('BentoML schema analysis failed, using fallback:', schemaError.message);
          
          // Fallback to legacy analysis
          this.analysisResult = await window.comfyUIServices.workflowAnalyzer.analyzeWorkflow(workflowData);
          this.analysisResult.method = 'legacy-fallback';
        }

        this.loadSavedEdits(file.name);
        this.triggerComponentUpdate();

      } catch (error) {
        console.error('Error loading workflow with BentoML:', error);
        this.reset();
      }
    };

    // Helper method to create node structure from text fields
    store.extractNodesFromTextFields = function(textFields) {
      const nodeMap = new Map();

      for (const field of textFields) {
        const nodeId = this.extractNodeIdFromPath(field.path);
        
        if (!nodeMap.has(nodeId)) {
          nodeMap.set(nodeId, {
            id: nodeId,
            type: 'Unknown', // Could be enhanced with schema info
            fields: []
          });
        }

        nodeMap.get(nodeId).fields.push(field);
      }

      return Array.from(nodeMap.values());
    };

    // Helper to extract node ID from field path
    store.extractNodeIdFromPath = function(path) {
      const parts = path.split('.');
      return parts[0] || 'unknown';
    };

    console.log('Enhanced workflow editor with BentoML schema support');
  },

  /**
   * Feature flag toggle UI integration
   */
  async toggleBentoMLFeature(enable = true) {
    try {
      const result = await window.comfyUIBentoML.client.setFeatureFlag('USE_BENTOML_SUBMISSION', enable);
      
      if (result && result.success) {
        this.isEnabled = result.value;
        
        if (this.isEnabled) {
          this.enhanceExistingComponents();
        }
        
        console.log(`BentoML submission ${this.isEnabled ? 'enabled' : 'disabled'}`);
        return true;
      }
    } catch (error) {
      console.error('Failed to toggle BentoML feature:', error);
      return false;
    }
  },

  /**
   * Get adapter status
   */
  getStatus() {
    return {
      enabled: this.isEnabled,
      componentsEnhanced: Boolean(window.comfyUIComponents?.modalComponents?.workflowModal?.isBentoMLEnhanced),
      timestamp: new Date().toISOString()
    };
  }
};

// Auto-initialize when Alpine is ready
document.addEventListener('alpine:init', () => {
  setTimeout(() => {
    window.comfyUIBentoML.uiAdapter.init().catch(error => {
      console.warn('BentoML UI adapter auto-initialization failed:', error.message);
    });
  }, 100); // Small delay to ensure stores are ready
});