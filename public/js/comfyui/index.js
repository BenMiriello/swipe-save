/**
 * ComfyUI Module - Alpine.js Integration
 * Main initialization and coordination
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
  
  // Register stores from separate modules
  Alpine.store('comfyWorkflow', window.comfyUIStores.workflowStore);
  Alpine.store('comfyDestinations', window.comfyUIStores.destinationStore);
  Alpine.store('queueViewer', window.comfyUIStores.queueStore);
  Alpine.store('workflowEditor', window.comfyUIStores.editorStore);

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

    // Register components from separate modules
    Alpine.data('workflowModal', window.comfyUIComponents.modalComponents.workflowModal);
    Alpine.data('queueViewer', window.comfyUIComponents.modalComponents.queueViewer);
    Alpine.data('destinationSection', window.comfyUIComponents.panelComponents.destinationSection);
    Alpine.data('settingsPanel', window.comfyUIComponents.panelComponents.settingsPanel);
    
    console.log('About to register workflowEditor component...');
    console.log('Component available:', !!window.comfyUIComponents.panelComponents.workflowEditor);
    console.log('Component type:', typeof window.comfyUIComponents.panelComponents.workflowEditor);
    
    // Test the component function
    if (window.comfyUIComponents.panelComponents.workflowEditor) {
      console.log('Testing component function...');
      const testResult = window.comfyUIComponents.panelComponents.workflowEditor();
      console.log('Component function returned:', testResult);
    }
    
    Alpine.data('workflowEditor', window.comfyUIComponents.panelComponents.workflowEditor);

    // Initialize stores 
    setTimeout(() => {
      if (Alpine.store('comfyDestinations')) {
        Alpine.store('comfyDestinations').init();
      }
      if (Alpine.store('workflowEditor')) {
        Alpine.store('workflowEditor').init();
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
