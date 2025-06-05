/**
 * ComfyUI Module - Alpine.js Integration
 * Simplified initialization
 */

// Pre-register stores immediately
document.addEventListener('alpine:init', () => {
  if (typeof Alpine === 'undefined') {
    console.error('Alpine.js not loaded');
    return;
  }
  
  if (window.location.hostname === 'localhost') {
    console.log('Initializing ComfyUI Alpine components...');
  }
  
  // Setup stores first
  Alpine.store('comfyWorkflow', {
    currentFile: null,
    isModalOpen: false,
    settings: {
      quantity: 1,
      modifySeeds: true,
      controlAfterGenerate: 'increment',
      comfyUrl: 'http://localhost:8188'
    },
    results: [],
    
    init() {
      if (window.location.hostname === 'localhost') {
        console.log('ComfyWorkflow store initializing...');
      }
    },
    
    setFile(file) {
      this.currentFile = file;
    },
    
    openModal() {
      this.isModalOpen = true;
    },
    
    closeModal() {
      this.isModalOpen = false;
    },
    
    updateSettings(newSettings) {
      this.settings = { ...this.settings, ...newSettings };
    },
    
    addResult(result) {
      this.results.unshift(result);
      if (this.results.length > 10) {
        this.results = this.results.slice(0, 10);
      }
    },
    
    clearResults() {
      this.results = [];
    }
  });

  Alpine.store('comfyDestinations', {
    destinations: ['http://localhost:8188'],
    selectedDestination: 'http://localhost:8188',
    showMoreOptions: false,
    
    init() {
      if (window.location.hostname === 'localhost') {
        console.log('ComfyDestinations store initializing...');
      }
      this.loadDestinations();
    },
    
    loadDestinations() {
      try {
        const saved = JSON.parse(localStorage.getItem('comfyui-destinations') || '[]');
        if (saved.length === 0) {
          saved.push('http://localhost:8188');
          this.saveDestinations(saved);
        }
        this.destinations = saved;
        this.selectedDestination = saved[0] || '';
      } catch (error) {
        console.error('Error loading destinations:', error);
        this.destinations = ['http://localhost:8188'];
        this.selectedDestination = 'http://localhost:8188';
      }
    },
    
    saveDestinations(destinations) {
      localStorage.setItem('comfyui-destinations', JSON.stringify(destinations));
    },
    
    addDestination(url) {
      if (!url || this.destinations.includes(url)) return;
      this.destinations.push(url);
      this.saveDestinations(this.destinations);
    },
    
    removeDestination(url) {
      this.destinations = this.destinations.filter(dest => dest !== url);
      if (this.destinations.length === 0) {
        this.destinations.push('http://localhost:8188');
      }
      this.saveDestinations(this.destinations);
      
      if (this.selectedDestination === url) {
        this.selectedDestination = this.destinations[0];
      }
    },
    
    selectDestination(url) {
      this.selectedDestination = url;
    },
    
    toggleMoreOptions() {
      this.showMoreOptions = !this.showMoreOptions;
    }
  });

// Initialize Alpine stores and components
function initializeComfyUI() {
  // Ensure Alpine is available before registering
  if (typeof Alpine === 'undefined') {
    console.error('Alpine.js not loaded');
    return;
  }
  
  if (window.location.hostname === 'localhost') {
    console.log('Registering ComfyUI Alpine components...');
  }

  // Register workflow modal component
  Alpine.data('workflowModal', () => ({
    isProcessing: false,
    error: null,
    buttonStates: { queue: 'idle' },
    
    init() {
      if (window.location.hostname === 'localhost') {
        console.log('Workflow modal component initialized');
      }
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
        
        for (let i = 0; i < settings.quantity; i++) {
          await window.comfyUIServices.apiClient.queueWorkflow(
            file,
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
    }
  }));

  // Register settings panel component
  Alpine.data('settingsPanel', () => ({
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
    }
  }));

  // Initialize the destination store 
  setTimeout(() => {
    if (Alpine.store('comfyDestinations')) {
      Alpine.store('comfyDestinations').init();
    }
  }, 0);
  
  if (window.location.hostname === 'localhost') {
    console.log('ComfyUI Alpine components registered');
  }
}

  initializeComfyUI();
});


// Simple module class
class ComfyUIModule {
  constructor() {
    this.isInitialized = true;
  }

  openWorkflowModal(file) {
    if (typeof Alpine !== 'undefined' && Alpine.store) {
      Alpine.store('comfyWorkflow').setFile(file);
      Alpine.store('comfyWorkflow').openModal();
      if (window.location.hostname === 'localhost') {
        console.log('Opening ComfyUI modal for:', file.name);
      }
    } else {
      console.error('Alpine not available');
    }
  }

  closeWorkflowModal() {
    if (typeof Alpine !== 'undefined' && Alpine.store) {
      Alpine.store('comfyWorkflow').closeModal();
    }
  }

  get isModalOpen() {
    if (typeof Alpine !== 'undefined' && Alpine.store) {
      return Alpine.store('comfyWorkflow').isModalOpen;
    }
    return false;
  }
}

// Create global instance
window.comfyUIModule = new ComfyUIModule();
if (window.location.hostname === 'localhost') {
  console.log('ComfyUI Module created');
}
