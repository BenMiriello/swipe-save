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
  collapsedNodes: new Map(), // Changed from Set to Map to store explicit states
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
      console.log('Starting workflow analysis...');
      
      this.analysisResult = window.comfyUIServices.workflowAnalyzer.analyzeWorkflow(workflowData);
      
      // Load saved edits for this file
      this.loadSavedEdits(file.name);
      
      console.log(`Workflow loaded: ${this.analysisResult.nodes.length} nodes, ${this.analysisResult.textFields.length} text fields, ${this.analysisResult.textFields.filter(f => f.isPromptLike).length} prompt fields`);
      
      // Trigger component update
      this.triggerComponentUpdate();
      
    } catch (error) {
      console.error('Error loading workflow for editing:', error);
      this.reset();
    }
  },
  
  // Reset editor state
  reset() {
    console.log('Resetting workflow editor state');
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
    console.log('=== updateFieldEdit called ===');
    console.log('nodeId:', nodeId, 'fieldName:', fieldName, 'value:', value);
    
    if (!this.nodeEdits[nodeId]) {
      this.nodeEdits[nodeId] = {};
    }
    
    // Remove edit if value matches original
    const originalField = this.analysisResult?.textFields.find(
      f => f.nodeId === nodeId && f.fieldName === fieldName
    );
    
    console.log('originalField:', originalField);
    
    if (originalField && value === originalField.currentValue) {
      delete this.nodeEdits[nodeId][fieldName];
      if (Object.keys(this.nodeEdits[nodeId]).length === 0) {
        delete this.nodeEdits[nodeId];
      }
      console.log('Edit removed (matches original)');
    } else {
      this.nodeEdits[nodeId][fieldName] = value;
      console.log('Edit stored:', this.nodeEdits);
    }
    
    this.hasUnsavedChanges = Object.keys(this.nodeEdits).length > 0;
    console.log('hasUnsavedChanges:', this.hasUnsavedChanges);
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
    console.log('=== getModifiedWorkflow called ===');
    console.log('currentWorkflow exists:', !!this.currentWorkflow);
    console.log('nodeEdits:', this.nodeEdits);
    console.log('nodeEdits count:', Object.keys(this.nodeEdits).length);
    
    if (!this.currentWorkflow || Object.keys(this.nodeEdits).length === 0) {
      console.log('Returning original workflow (no edits or no workflow)');
      return this.currentWorkflow;
    }
    
    // Create a deep copy to preserve original formatting metadata (pos, size, etc.)
    const modifiedWorkflow = JSON.parse(JSON.stringify(this.currentWorkflow));
    
    // Detect workflow format
    const isGUIFormat = modifiedWorkflow.nodes && Array.isArray(modifiedWorkflow.nodes);
    console.log('Workflow format detected:', isGUIFormat ? 'GUI' : 'API');
    
    if (isGUIFormat) {
      // Handle GUI format workflows - apply edits to widgets_values arrays
      console.log('Applying edits to GUI workflow...');
      this.applyEditsToGUIWorkflow(modifiedWorkflow);
    } else {
      // Handle API format workflows - apply edits to inputs objects
      console.log('Applying edits to API workflow...');
      this.applyEditsToAPIWorkflow(modifiedWorkflow);
    }
    
    console.log('Modified workflow created');
    return modifiedWorkflow;
  },

  // Apply edits to GUI format workflow
  applyEditsToGUIWorkflow(workflow) {
    console.log('=== applyEditsToGUIWorkflow ===');
    for (const [nodeId, edits] of Object.entries(this.nodeEdits)) {
      console.log(`Processing node ${nodeId} with edits:`, edits);
      const node = workflow.nodes.find(n => String(n.id) === String(nodeId));
      if (!node || !node.widgets_values || !Array.isArray(node.widgets_values)) {
        console.log(`Node ${nodeId} not found or has no widgets_values`);
        continue;
      }
      
      console.log(`Node ${nodeId} (${node.type}) current widgets_values:`, node.widgets_values);
      
      for (const [fieldName, newValue] of Object.entries(edits)) {
        const widgetIndex = this.getWidgetIndexForField(node.type, fieldName);
        console.log(`Field ${fieldName} maps to widget index ${widgetIndex}`);
        
        if (widgetIndex !== -1 && widgetIndex < node.widgets_values.length) {
          console.log(`Updating widget ${widgetIndex}: "${node.widgets_values[widgetIndex]}" -> "${newValue}"`);
          node.widgets_values[widgetIndex] = newValue;
        } else {
          console.log(`Cannot update widget: index ${widgetIndex} invalid for array length ${node.widgets_values.length}`);
        }
      }
      
      console.log(`Node ${nodeId} updated widgets_values:`, node.widgets_values);
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
    console.log(`getWidgetIndexForField: nodeType=${nodeType}, fieldName=${fieldName}`);
    
    // Handle generic widget_N field names first
    const widgetMatch = fieldName.match(/^widget_(\d+)$/);
    if (widgetMatch) {
      const index = parseInt(widgetMatch[1]);
      console.log(`Generic widget name detected: ${fieldName} -> index ${index}`);
      return index;
    }
    
    // Widget mappings for different node types
    // These are the reverse of the mappings used in server conversion
    const widgetMappings = {
      'KSampler': {
        'seed': 0,
        'steps': 2,
        'cfg': 3,
        'sampler_name': 4,
        'scheduler': 5,
        'denoise': 6
      },
      'CLIPTextEncode': {
        'text': 0
      },
      'SaveImage': {
        'filename_prefix': 0
      },
      'ImpactWildcardEncode': {
        'wildcard_text': 0,
        'populated_text': 1,
        'mode': 2,
        'Select to add LoRA': 3,
        'Select to add Wildcard': 4,
        'seed': 5
      },
      'JWStringMultiline': {
        'text': 0
      }
    };
    
    const nodeMapping = widgetMappings[nodeType];
    if (!nodeMapping) {
      // For unknown node types, try to match by widget name directly
      // This handles cases where the widget name matches the field name
      if (fieldName === 'text' || fieldName === 'prompt') {
        console.log(`Fallback mapping for ${fieldName} -> index 0`);
        return 0; // Most text nodes have text as the first widget
      }
      console.log(`No mapping found for ${nodeType}.${fieldName}`);
      return -1;
    }
    
    const index = nodeMapping[fieldName];
    if (index !== undefined) {
      console.log(`Mapped ${nodeType}.${fieldName} -> index ${index}`);
      return index;
    } else {
      console.log(`Field ${fieldName} not found in ${nodeType} mapping`);
      return -1;
    }
  },
  
  // Trigger component update by incrementing counter
  triggerComponentUpdate() {
    this.updateCounter++;
  },
  
  // Helper method to truncate text for display
  truncateText(text, maxLength) {
    if (!text || typeof text !== 'string') {
      return '';
    }
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength) + '...';
  }
};
