/**
 * ComfyUI Workflow Store
 * Core workflow state management
 */

window.comfyUIStores = window.comfyUIStores || {};

window.comfyUIStores.workflowStore = {
  // Core workflow state
  currentFile: null,
  isModalOpen: false,
  settings: {
    quantity: 1,
    seedMode: 'randomize', // 'original', 'randomize', 'increment'
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
};
