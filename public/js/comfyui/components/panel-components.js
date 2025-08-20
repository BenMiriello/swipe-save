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
  }
};