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

  // Queue viewer store for global state sharing
  Alpine.store('queueViewer', {
    queueItems: [],
    isLoading: false,
    selectedItem: null,
    selectedItemJson: '',
    showItemDetails: false,
    showCancelAllModal: false,
    showCancelItemModal: false,
    autoRefreshInterval: null,
    lastQueueCount: 0,

    init() {
      console.log('Queue viewer store initialized');
    },

    startAutoRefresh() {
      if (this.autoRefreshInterval) return;
      this.autoRefreshInterval = setInterval(() => {
        this.refreshQueue();
      }, 2000); // Refresh every 2 seconds
      console.log('Queue auto-refresh started (2s interval)');
    },

    stopAutoRefresh() {
      if (this.autoRefreshInterval) {
        clearInterval(this.autoRefreshInterval);
        this.autoRefreshInterval = null;
        console.log('Queue auto-refresh stopped');
      }
    },

    // Refresh queue data from ComfyUI
    async refreshQueue() {
      if (this.isLoading) return;
      
      this.isLoading = true;
      try {
        const comfyUrl = Alpine.store('comfyDestinations').selectedDestination;
        const response = await fetch(`/api/comfyui-queue?comfyUrl=${encodeURIComponent(comfyUrl)}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch queue: ${response.status}`);
        }
        
        const queueData = await response.json();
        
        // Combine running and pending queue items
        const running = queueData.queue_running || [];
        const pending = queueData.queue_pending || [];
        
        // Queue format: [id, prompt_data] for each item
        this.queueItems = [...running, ...pending];
        
        // Only log when queue count changes to reduce noise
        if (this.queueItems.length !== this.lastQueueCount) {
          console.log('Queue updated:', this.queueItems.length, 'items');
          this.lastQueueCount = this.queueItems.length;
        }
        
      } catch (error) {
        console.error('Error fetching queue:', error);
        this.queueItems = [];
      } finally {
        this.isLoading = false;
      }
    },

    // Open queue item details modal
    openItemDetails(item) {
      const [id, promptData] = item;
      console.log('Opening queue item details for ID:', id);
      console.log('Full queue item data:', item);
      console.log('Prompt data keys:', Object.keys(promptData || {}));
      console.log('Prompt data content:', promptData);
      
      this.selectedItem = item;
      this.selectedItemJson = JSON.stringify(item, null, 2);
      this.showItemDetails = true;
      
      console.log('Modal should now be visible, showItemDetails =', this.showItemDetails);
    },

    // Cancel all queue items
    async cancelAllItems() {
      try {
        const comfyUrl = Alpine.store('comfyDestinations').selectedDestination;
        
        // Get all item IDs
        const itemIds = this.queueItems.map(item => item[0]);
        console.log('Cancelling all queue items:', itemIds);
        
        const response = await fetch('/api/comfyui-queue/cancel', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            comfyUrl,
            cancel: itemIds
          })
        });
        
        if (!response.ok) {
          throw new Error(`Failed to cancel queue: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Cancel all response result:', result);
        
        // Close modal first
        this.showCancelAllModal = false;
        
        // Wait a moment for ComfyUI to process the cancellation
        console.log('Waiting for ComfyUI to process cancellation...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Force refresh queue after cancellation
        await this.refreshQueue();
        
        console.log('All queue items cancelled successfully');
        
      } catch (error) {
        console.error('Error cancelling all queue items:', error);
      }
    },

    // Cancel selected queue item
    async cancelSelectedItem() {
      console.log('cancelSelectedItem() called');
      console.log('selectedItem:', this.selectedItem);
      
      if (!this.selectedItem) {
        console.error('No selected item to cancel');
        return;
      }
      
      try {
        const comfyUrl = Alpine.store('comfyDestinations').selectedDestination;
        const itemId = this.selectedItem[0];
        
        console.log('Cancelling queue item:', itemId);
        console.log('ComfyUI URL:', comfyUrl);
        
        const requestBody = {
          comfyUrl,
          cancel: [itemId]
        };
        
        console.log('Cancel request body:', requestBody);
        
        const response = await fetch('/api/comfyui-queue/cancel', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });
        
        console.log('Cancel response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Cancel response error:', errorText);
          throw new Error(`Failed to cancel item: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log('Cancel response result:', result);
        
        // Close modals first
        this.showCancelItemModal = false;
        this.showItemDetails = false;
        
        // Wait a moment for ComfyUI to process the cancellation
        console.log('Waiting for ComfyUI to process cancellation...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Force refresh queue to see changes
        await this.refreshQueue();
        
        console.log('Queue item cancelled successfully:', itemId);
        
      } catch (error) {
        console.error('Error cancelling queue item:', error);
        console.error('Error details:', error.message);
      }
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
    allowClickAway: false,
    
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

  // Register destination section component
  Alpine.data('destinationSection', () => ({
    isExpanded: JSON.parse(localStorage.getItem('destinationExpanded') || 'true'),
    
    init() {
      this.$watch('isExpanded', (value) => {
        localStorage.setItem('destinationExpanded', JSON.stringify(value));
      });
    }
  }));

  // Register queue viewer component (lightweight, delegates to store)
  Alpine.data('queueViewer', () => ({
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
  }));

  // Register settings panel component
  Alpine.data('settingsPanel', () => ({
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
  
  // Global keyboard shortcuts for modals
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      // Close modals in priority order (innermost first)
      if (Alpine.store('queueViewer')?.showCancelItemModal) {
        Alpine.store('queueViewer').showCancelItemModal = false;
      } else if (Alpine.store('queueViewer')?.showCancelAllModal) {
        Alpine.store('queueViewer').showCancelAllModal = false;
      } else if (Alpine.store('queueViewer')?.showItemDetails) {
        Alpine.store('queueViewer').showItemDetails = false;
      } else if (Alpine.store('comfyWorkflow')?.isModalOpen) {
        Alpine.store('comfyWorkflow').closeModal();
      }
    }
    
    // Cmd+Enter to queue workflow when modal is open
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      if (Alpine.store('comfyWorkflow')?.isModalOpen) {
        event.preventDefault();
        // Find the workflow modal component and trigger queue
        const modalElement = document.querySelector('[x-data*="workflowModal"]');
        if (modalElement && modalElement._x_dataStack) {
          const component = modalElement._x_dataStack.find(stack => stack.handleQueue);
          if (component && !component.isProcessing) {
            component.handleQueue();
          }
        }
      }
    }
  });
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
