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
        
        if (settings.seedMode === 'randomize') {
          parts.push('new seed');
        }
        
        if (settings.controlAfterGenerate !== 'increment') {
          parts.push(settings.controlAfterGenerate);
        }
        
        return parts.length > 0 ? parts.join(', ') : 'Default settings';
      }
    };
  },

  // Register save to inputs section component
  saveToInputsSection() {
    return {
      isExpanded: JSON.parse(localStorage.getItem('saveToInputsExpanded') || 'false'),
      savePath: '/home/simonsays/Documents/Data/Packages/ComfyUI/input/',
      defaultPath: '/home/simonsays/Documents/Data/Packages/ComfyUI/input/',
      saveStatus: '',
      mediaAvailable: false,
      
      init() {
        this.$watch('isExpanded', (value) => {
          localStorage.setItem('saveToInputsExpanded', JSON.stringify(value));
        });
        
        // Load saved path from localStorage
        const savedPath = localStorage.getItem('saveToInputsPath');
        if (savedPath) {
          this.savePath = savedPath;
        }
        
        this.$watch('savePath', (value) => {
          localStorage.setItem('saveToInputsPath', value);
        });
        
        // Check media availability
        const checkMedia = () => {
          const available = this.hasSelectedMedia();
          if (this.mediaAvailable !== available) {
            this.mediaAvailable = available;
          }
        };
        
        // Initial check
        checkMedia();
        
        // Set up periodic checks (every 500ms is sufficient)
        setInterval(checkMedia, 500);
        
        // Also listen for global events that might indicate state changes
        if (window.addEventListener) {
          const events = ['click', 'keydown', 'hashchange'];
          events.forEach(event => {
            window.addEventListener(event, () => {
              setTimeout(checkMedia, 100); // Small delay to let state update
            });
          });
        }
      },
      
      resetToDefault() {
        this.savePath = this.defaultPath;
        this.saveStatus = 'Path reset to default';
        setTimeout(() => { this.saveStatus = ''; }, 3000);
      },
      
      hasSelectedMedia() {
        // Simple check: are there any files available?
        if (window.stateManager) {
          const state = window.stateManager.getState();
          return state && state.allFiles && state.allFiles.length > 0;
        }
        return false;
      },
      
      async saveToInputs() {
        if (!this.mediaAvailable) {
          this.saveStatus = 'No media file selected';
          setTimeout(() => { this.saveStatus = ''; }, 3000);
          return;
        }
        
        this.saveStatus = 'Saving...';
        
        try {
          // Get current file from state manager
          if (!window.stateManager) {
            throw new Error('State manager not available');
          }
          
          const state = window.stateManager.getState();
          if (!state || !state.allFiles || state.allFiles.length === 0) {
            throw new Error('No files available');
          }
          
          // Use current file if available, otherwise use first file
          let fileIndex = 0;
          if (typeof state.currentIndex === 'number' && 
              state.currentIndex >= 0 && 
              state.currentIndex < state.allFiles.length) {
            fileIndex = state.currentIndex;
          }
          
          const currentFile = state.allFiles[fileIndex];
          
          // Make API call to save file
          const response = await fetch('/api/save-to-inputs', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              sourceFile: currentFile.name,
              destinationPath: this.savePath
            })
          });
          
          const result = await response.json();
          
          if (response.ok && result.success) {
            this.saveStatus = `Saved to ${result.savedPath}`;
          } else {
            this.saveStatus = `Error: ${result.error || 'Save failed'}`;
          }
        } catch (error) {
          console.error('Save to inputs error:', error);
          this.saveStatus = `Error: ${error.message}`;
        }
        
        // Clear status after 5 seconds
        setTimeout(() => { this.saveStatus = ''; }, 5000);
      }
    };
  }
};