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
  widgetMappings: new Map(), // Cache for nodeType -> widget names mapping
  
  // UI state
  showPromptsOnly: JSON.parse(localStorage.getItem('workflowEditorShowPromptsOnly') || 'true'),
  collapsedNodes: new Map(), // Changed from Set to Map to store explicit states
  collapsedFields: new Set(),
  isEditorExpanded: JSON.parse(localStorage.getItem('workflowEditorExpanded') || 'false'),
  updateCounter: 0, // Used to trigger component reactivity
  
  // Initialization
  init() {
    console.log('Workflow editor store initialized');
  },
  
  // Load workflow for editing
  async loadWorkflow(file) {
    if (!file) {
      this.reset();
      return;
    }
    
    try {
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
      this.analysisResult = await window.comfyUIServices.workflowAnalyzer.analyzeWorkflow(workflowData);
      
      // Load saved edits for this file
      this.loadSavedEdits(file.name);
      
      // Trigger component update
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
    // Trigger component update to refresh UI
    this.triggerComponentUpdate();
  },
  
  // Get filtered nodes based on show prompts only setting
  getFilteredNodes() {
    if (!this.analysisResult || !this.analysisResult.nodes) {
      return [];
    }
    
    const nodesWithFields = this.analysisResult.nodes.map(node => {
      const fields = this.analysisResult.textFields.filter(field => field.nodeId === node.id);
      return { ...node, fields };
    }).filter(node => node.fields.length > 0);
    
    if (this.showPromptsOnly) {
      return nodesWithFields.filter(node => 
        node.fields.some(field => field.isPromptLike)
      );
    }
    
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
    this.triggerComponentUpdate();
  },
  
  // Get current value for field (edited or original)
  getFieldValue(nodeId, fieldName) {
    // Access updateCounter to make this reactive
    this.updateCounter;
    
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
    const currentState = this.isNodeCollapsed(nodeId);
    this.collapsedNodes.set(nodeId, !currentState);
  },
  
  // Toggle all nodes to expanded or collapsed
  toggleAllNodes() {
    const filteredNodes = this.getFilteredNodes();
    if (filteredNodes.length === 0) return;
    
    // Check if all nodes are currently collapsed
    const allCollapsed = filteredNodes.every(node => this.isNodeCollapsed(node.id));
    
    // If all are collapsed, expand all; otherwise collapse all
    const newState = !allCollapsed;
    for (const node of filteredNodes) {
      this.collapsedNodes.set(node.id, newState);
    }
  },
  
  // Get button text based on current state
  getCollapseButtonText() {
    const filteredNodes = this.getFilteredNodes();
    if (filteredNodes.length === 0) return 'Collapse All';
    
    const allCollapsed = filteredNodes.every(node => this.isNodeCollapsed(node.id));
    return allCollapsed ? 'Expand All' : 'Collapse All';
  },
  
  isNodeCollapsed(nodeId) {
    // Default to collapsed (true) for new nodes
    return this.collapsedNodes.has(nodeId) ? this.collapsedNodes.get(nodeId) : true;
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
    
    // Create a deep copy to preserve original formatting metadata
    // NOTE: Visual node layout preservation (pos, size) is not implemented because
    // ComfyUI's API does not accept position data during workflow execution.
    // This will require a ComfyUI extension for proper implementation.
    const modifiedWorkflow = JSON.parse(JSON.stringify(this.currentWorkflow));
    
    // Detect workflow format
    const isGUIFormat = modifiedWorkflow.nodes && Array.isArray(modifiedWorkflow.nodes);
    
    if (isGUIFormat) {
      // Handle GUI format workflows - apply edits to widgets_values arrays
      this.applyEditsToGUIWorkflow(modifiedWorkflow);
    } else {
      // Handle API format workflows - apply edits to inputs objects
      this.applyEditsToAPIWorkflow(modifiedWorkflow);
    }
    
    return modifiedWorkflow;
  },
  

  // Apply edits to GUI format workflow
  applyEditsToGUIWorkflow(workflow) {
    for (const [nodeId, edits] of Object.entries(this.nodeEdits)) {
      const node = workflow.nodes.find(n => String(n.id) === String(nodeId));
      if (!node || !node.widgets_values || !Array.isArray(node.widgets_values)) {
        continue;
      }
      
      for (const [fieldName, newValue] of Object.entries(edits)) {
        const widgetIndex = this.getWidgetIndexForField(node.type, fieldName);
        if (widgetIndex !== -1 && widgetIndex < node.widgets_values.length) {
          node.widgets_values[widgetIndex] = newValue;
        }
      }
    }
  },

  // Apply edits to API format workflow
  applyEditsToAPIWorkflow(workflow) {
    for (const [nodeId, edits] of Object.entries(this.nodeEdits)) {
      if (workflow[nodeId] && workflow[nodeId].inputs) {
        for (const [fieldName, newValue] of Object.entries(edits)) {
          workflow[nodeId].inputs[fieldName] = newValue;
        }
      }
    }
  },

  // Get widget index for a field name based on node type
  getWidgetIndexForField(nodeType, fieldName) {
    // Handle generic widget_N field names first
    const widgetMatch = fieldName.match(/^widget_(\d+)$/);
    if (widgetMatch) {
      return parseInt(widgetMatch[1]);
    }

    // Use cached widget mappings from ComfyUI
    const widgetNames = this.widgetMappings.get(nodeType);
    if (widgetNames) {
      const index = widgetNames.indexOf(fieldName);
      if (index !== -1) {
        return index;
      }
    }
    
    // Fallback for unknown node types
    if (fieldName === 'text' || fieldName === 'prompt') {
      return 0; // Most text nodes have text as the first widget
    }
    return -1;
  },
  
  // Trigger component update by incrementing counter
  triggerComponentUpdate() {
    this.updateCounter++;
  }
};
