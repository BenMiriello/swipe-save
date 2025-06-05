/**
 * Main API service coordinator - delegates to specialized modules
 * Maintains backward compatibility with existing code
 */
const apiService = {
  // File operations - delegate to fileApi
  async fetchMediaFiles() {
    return window.fileApi.fetchMediaFiles();
  },

  downloadFile(file, filename) {
    return window.fileApi.downloadFile(file, filename);
  },

  openFileInNewView(file) {
    return window.fileApi.openFileInNewView(file);
  },

  async performAction(filename, action, customFilename = null) {
    return window.fileApi.performAction(filename, action, customFilename);
  },

  async undoLastAction() {
    return window.fileApi.undoLastAction();
  },

  // Configuration operations - delegate to configApi
  async getConfig() {
    return window.configApi.getConfig();
  },

  async updateConfig(config) {
    return window.configApi.updateConfig(config);
  },

  async browseDirectory(dir) {
    return window.configApi.browseDirectory(dir);
  },

  // ComfyUI operations - delegate to comfyuiApi
  getComfyUIUrl() {
    return window.comfyuiApi.getComfyUIUrl();
  },

  async loadInComfyUI(file, modifySeeds = false, comfyUrl = null) {
    return window.comfyuiApi.loadInComfyUI(file, modifySeeds, comfyUrl);
  },

  async downloadWorkflow(workflowData, filename) {
    return window.comfyuiApi.downloadWorkflow(workflowData, filename);
  },

  downloadForMobile(content, filename) {
    return window.comfyuiApi.downloadForMobile(content, filename);
  },

  downloadForDesktop(content, filename) {
    return window.comfyuiApi.downloadForDesktop(content, filename);
  },

  copyToClipboard(content, filename) {
    return window.comfyuiApi.copyToClipboard(content, filename);
  },

  isMobile() {
    return window.comfyuiApi.isMobile();
  },

  openComfyUITab(url) {
    return window.comfyuiApi.openComfyUITab(url);
  },

  copyUrlToClipboard(url) {
    return window.comfyuiApi.copyUrlToClipboard(url);
  },

  getExistingWorkflows() {
    return window.comfyuiApi.getExistingWorkflows();
  },

  saveWorkflowRecord(filename) {
    return window.comfyuiApi.saveWorkflowRecord(filename);
  },

  generateClientId() {
    return window.comfyuiApi.generateClientId();
  },

  async getWorkflowFromImage(file) {
    return window.comfyuiApi.getWorkflowFromImage(file);
  },

  async queueInComfyUI(file, modifySeeds = false, controlAfterGenerate = 'increment', comfyUrl = null) {
    return window.comfyuiApi.queueInComfyUI(file, modifySeeds, controlAfterGenerate, comfyUrl);
  },

  modifyWorkflowSeeds(workflow) {
    return window.comfyuiApi.modifyWorkflowSeeds(workflow);
  },

  modifyControlAfterGenerate(workflow, controlMode) {
    return window.comfyuiApi.modifyControlAfterGenerate(workflow, controlMode);
  }
};

// Export as a global variable
window.apiService = apiService;
