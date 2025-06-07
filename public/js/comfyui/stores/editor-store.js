/**
 * ComfyUI Workflow Editor Store
 * Centralized state management for text field editing
 */

window.comfyUIStores = window.comfyUIStores || {};

window.comfyUIStores.editorStore = {
  // Core workflow data
  currentWorkflow: null,
  originalWorkflow: null, // For diff tracking and formatting preservation
  analysisResult: null,
  
  // Text field editing state
  nodeEdits: {}, // { nodeId: { fieldName: newValue } }
  hasUnsavedChanges: false,
  
  // UI state
  showPromptsOnly: JSON.parse(localStorage.getItem('workflowEditorShowPromptsOnly') || 'true'),
  collapsedNodes: new Set(),
  collapsedFields: new Set(),
  isEditorExpanded: JSON.parse(localStorage.getItem('workflowEditorExpanded') || 'false'),
  updateCounter: 0, // Used to trigger component reactivity
  
  // Initialization
  init() {
    console.log('Workflow editor store initialized');
    console.log('Initial state:', {
      currentWorkflow: this.currentWorkflow,
      analysisResult: this.analysisResult,
      showPromptsOnly: this.showPromptsOnly,
      isEditorExpanded: this.isEditorExpanded
    });
  },
  
  // Load workflow for editing
  async loadWorkflow(file) {
    console.log('=== WORKFLOW EDITOR: loadWorkflow called ===');
    console.log('File:', file);
    
    if (!file) {
      console.log('No file provided, resetting');
      this.reset();
      return;
    }
    
    try {
      console.log('Loading workflow for editing:', file.name);
      
      // Fetch workflow data from server
      const response = await fetch(`/api/workflow/${encodeURIComponent(file.name)}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch workflow: ${response.status}`);
      }
      
      const workflowData = await response.json();
      
      // Store original workflow for formatting preservation
      this.originalWorkflow = JSON.parse(JSON.stringify(workflowData));
      this.currentWorkflow = workflowData;
      
      // Analyze workflow for text fields
      console.log('About to analyze workflow...');
      console.log('workflowAnalyzer available:', !!window.comfyUIServices?.workflowAnalyzer);
      console.log('Workflow data keys:', Object.keys(workflowData).slice(0, 5));
      
      this.analysisResult = window.comfyUIServices.workflowAnalyzer.analyzeWorkflow(workflowData);
      console.log('Analysis result:', this.analysisResult);
      
      // Load saved edits for this file
      this.loadSavedEdits(file.name);
      
      console.log('Workflow loaded:', {
        nodes: this.analysisResult.nodes.length,
        textFields: this.analysisResult.textFields.length,
        promptFields: this.analysisResult.textFields.filter(f => f.isPromptLike).length
      });
      
      // Manually trigger component update
      console.log('Triggering component update...');
      this.triggerComponentUpdate();
      
    } catch (error) {
      console.error('Error loading workflow for editing:', error);
      this.reset();
    }
  },
  
  // Reset editor state
  reset() {
    this.currentWorkflow = null;
    this.originalWorkflow = null;
    this.analysisResult = null;
    this.nodeEdits = {};
    this.hasUnsavedChanges = false;
    this.collapsedNodes.clear();
    this.collapsedFields.clear();
  },
  
  // Get filtered nodes based on show prompts only setting
  getFilteredNodes() {
    console.log('=== getFilteredNodes called ===');
    console.log('analysisResult:', this.analysisResult);
    console.log('showPromptsOnly:', this.showPromptsOnly);
    
    if (!this.analysisResult || !this.analysisResult.nodes) {
      console.log('No analysis result or nodes, returning empty array');
      return [];
    }
    
    const nodesWithFields = this.analysisResult.nodes.map(node => {
      const fields = this.analysisResult.textFields.filter(field => field.nodeId === node.id);
      return { ...node, fields };
    }).filter(node => node.fields.length > 0);
    
    console.log('Nodes with fields:', nodesWithFields);
    
    if (this.showPromptsOnly) {
      const promptNodes = nodesWithFields.filter(node => 
        node.fields.some(field => field.isPromptLike)
      );
      console.log('Filtered to prompt nodes only:', promptNodes);
      return promptNodes;
    }
    
    console.log('Returning all nodes with text fields:', nodesWithFields);
    return nodesWithFields;
  },
  
  // Update field edit
  updateFieldEdit(nodeId, fieldName, value) {
    if (!this.nodeEdits[nodeId]) {
      this.nodeEdits[nodeId] = {};
    }
    
    // Remove edit if value matches original
    const originalField = this.analysisResult?.textFields.find(
      f => f.nodeId === nodeId && f.fieldName === fieldName
    );
    
    if (originalField && value === originalField.currentValue) {
      delete this.nodeEdits[nodeId][fieldName];
      if (Object.keys(this.nodeEdits[nodeId]).length === 0) {
        delete this.nodeEdits[nodeId];
      }
    } else {
      this.nodeEdits[nodeId][fieldName] = value;
    }
    
    this.hasUnsavedChanges = Object.keys(this.nodeEdits).length > 0;
    this.saveEditsToStorage();
  },
  
  // Get current value for field (edited or original)
  getFieldValue(nodeId, fieldName) {
    const editedValue = this.nodeEdits[nodeId]?.[fieldName];
    if (editedValue !== undefined) {
      return editedValue;
    }
    
    const originalField = this.analysisResult?.textFields.find(
      f => f.nodeId === nodeId && f.fieldName === fieldName
    );
    
    return originalField?.currentValue || '';
  },
  
  // Check if field has been edited
  hasFieldEdit(nodeId, fieldName) {
    return Boolean(this.nodeEdits[nodeId]?.[fieldName] !== undefined);
  },
  
  // UI state management
  togglePromptsOnly() {
    this.showPromptsOnly = !this.showPromptsOnly;
    localStorage.setItem('workflowEditorShowPromptsOnly', JSON.stringify(this.showPromptsOnly));
    this.triggerComponentUpdate();
  },
  
  toggleEditorSection() {
    this.isEditorExpanded = !this.isEditorExpanded;
    localStorage.setItem('workflowEditorExpanded', JSON.stringify(this.isEditorExpanded));
  },
  
  toggleNode(nodeId) {
    if (this.collapsedNodes.has(nodeId)) {
      this.collapsedNodes.delete(nodeId);
    } else {
      this.collapsedNodes.add(nodeId);
    }
  },
  
  isNodeCollapsed(nodeId) {
    return this.collapsedNodes.has(nodeId);
  },
  
  // Persistence
  saveEditsToStorage() {
    const filename = Alpine.store('comfyWorkflow').currentFile?.name;
    if (!filename) return;
    
    const key = `workflow-edits-${filename}`;
    const data = {
      timestamp: Date.now(),
      edits: this.nodeEdits
    };
    localStorage.setItem(key, JSON.stringify(data));
  },
  
  loadSavedEdits(filename) {
    const key = `workflow-edits-${filename}`;
    const saved = localStorage.getItem(key);
    
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this.nodeEdits = data.edits || {};
        this.hasUnsavedChanges = Object.keys(this.nodeEdits).length > 0;
      } catch (e) {
        console.warn('Failed to load saved edits:', e);
        this.nodeEdits = {};
      }
    } else {
      this.nodeEdits = {};
    }
  },
  
  // Apply edits to workflow (for queueing) - preserves original structure
  getModifiedWorkflow() {
    if (!this.currentWorkflow || Object.keys(this.nodeEdits).length === 0) {
      return this.currentWorkflow;
    }
    
    // Create a deep copy to preserve original formatting metadata (pos, size, etc.)
    const modifiedWorkflow = JSON.parse(JSON.stringify(this.currentWorkflow));
    
    // Apply text field edits while preserving all other node metadata
    for (const [nodeId, edits] of Object.entries(this.nodeEdits)) {
      if (modifiedWorkflow[nodeId] && modifiedWorkflow[nodeId].inputs) {
        for (const [fieldName, newValue] of Object.entries(edits)) {
          modifiedWorkflow[nodeId].inputs[fieldName] = newValue;
        }
      }
    }
    
    return modifiedWorkflow;
  },
  
  // Trigger component update by incrementing counter
  triggerComponentUpdate() {
    this.updateCounter++;
    console.log('Update counter incremented to:', this.updateCounter);
  }
};
