/**
 * Workflow Parser
 * Handles parsing of different ComfyUI workflow formats (GUI vs API)
 */

window.comfyUIBentoML = window.comfyUIBentoML || {};
window.comfyUIBentoML.core = window.comfyUIBentoML.core || {};

window.comfyUIBentoML.core.workflowParser = {
  /**
   * Detect workflow format and return normalized structure
   */
  parseWorkflow(workflowData) {
    if (!workflowData || typeof workflowData !== 'object') {
      return { format: 'invalid', nodes: [] };
    }

    // GUI format detection (has nodes array)
    if (workflowData.nodes && Array.isArray(workflowData.nodes)) {
      return {
        format: 'gui',
        nodes: this.normalizeGUINodes(workflowData.nodes),
        rawData: workflowData
      };
    }

    // API format detection (object with numeric keys and class_type properties)
    const entries = Object.entries(workflowData);
    if (entries.length > 0 && entries.every(([key, value]) => 
      value && typeof value === 'object' && (value.class_type || key.match(/^\d+$/))
    )) {
      return {
        format: 'api',
        nodes: this.normalizeAPINodes(workflowData),
        rawData: workflowData
      };
    }

    return { format: 'unknown', nodes: [], rawData: workflowData };
  },

  /**
   * Normalize GUI format nodes to standard structure
   */
  normalizeGUINodes(guiNodes) {
    return guiNodes.map(node => ({
      id: node.id,
      type: node.type,
      format: 'gui',
      widgets: node.widgets_values || [],
      properties: node.properties || {},
      pos: node.pos || [0, 0],
      size: node.size || [0, 0],
      rawNode: node
    }));
  },

  /**
   * Normalize API format nodes to standard structure
   */
  normalizeAPINodes(apiData) {
    return Object.entries(apiData)
      .filter(([key, value]) => value && typeof value === 'object' && value.class_type)
      .map(([nodeId, node]) => ({
        id: nodeId,
        type: node.class_type,
        format: 'api',
        inputs: node.inputs || {},
        rawNode: node
      }));
  },

  /**
   * Extract field candidates from normalized nodes
   */
  extractFieldCandidates(parsedWorkflow) {
    const candidates = {
      seeds: [],
      textFields: [],
      parameters: []
    };

    for (const node of parsedWorkflow.nodes) {
      if (node.format === 'gui') {
        this.extractFromGUINode(node, candidates);
      } else if (node.format === 'api') {
        this.extractFromAPINode(node, candidates);
      }
    }

    return candidates;
  },

  /**
   * Extract field candidates from GUI node
   */
  extractFromGUINode(node, candidates) {
    if (!node.widgets || !Array.isArray(node.widgets)) return;

    node.widgets.forEach((value, index) => {
      const fieldData = {
        nodeId: node.id,
        nodeType: node.type,
        fieldName: `widget_${index}`,
        value: value,
        path: `nodes.${node.id}.widgets_values.${index}`,
        sourceFormat: 'gui'
      };

      this.categorizeFieldCandidate(fieldData, candidates);
    });
  },

  /**
   * Extract field candidates from API node
   */
  extractFromAPINode(node, candidates) {
    if (!node.inputs || typeof node.inputs !== 'object') return;

    for (const [inputName, value] of Object.entries(node.inputs)) {
      const fieldData = {
        nodeId: node.id,
        nodeType: node.type,
        fieldName: inputName,
        value: value,
        path: `${node.id}.inputs.${inputName}`,
        sourceFormat: 'api'
      };

      this.categorizeFieldCandidate(fieldData, candidates);
    });
  },

  /**
   * Categorize field candidate into appropriate type
   */
  categorizeFieldCandidate(fieldData, candidates) {
    const { fieldName, value } = fieldData;

    // Seeds
    if ((fieldName === 'seed' || fieldName === 'noise_seed') && typeof value === 'number') {
      candidates.seeds.push(fieldData);
      return;
    }

    // Text fields (strings longer than basic values)
    if (typeof value === 'string' && value.length > 2) {
      // Skip metadata fields
      const metadataFields = ['title', 'class_type', '_meta'];
      if (!metadataFields.includes(fieldName)) {
        candidates.textFields.push(fieldData);
        return;
      }
    }

    // Parameters (numbers, booleans, short strings)
    if (typeof value === 'number' || typeof value === 'boolean' || 
        (typeof value === 'string' && value.length > 0 && value.length <= 100)) {
      candidates.parameters.push(fieldData);
      return;
    }
  },

  /**
   * Build field objects from candidates
   */
  buildFieldObjects(candidates) {
    const buildField = (candidate, additionalProps = {}) => ({
      path: candidate.path,
      value: candidate.value,
      currentValue: candidate.value,
      inputName: candidate.fieldName,
      fieldName: candidate.fieldName,
      nodeId: candidate.nodeId,
      nodeType: candidate.nodeType,
      sourceFormat: candidate.sourceFormat,
      ...additionalProps
    });

    return {
      seeds: candidates.seeds.map(c => buildField(c, { fieldType: 'number' })),
      textFields: candidates.textFields.map(c => {
        const isPrompt = this.isPromptField(c.fieldName, c.value);
        return buildField(c, { 
          isPrompt,
          fieldType: isPrompt ? 'textarea' : 'text'
        });
      }),
      parameters: candidates.parameters.map(c => buildField(c, {
        fieldType: this.determineParameterType(c.nodeType, c.fieldName, c.value)
      }))
    };
  },

  /**
   * Determine if a text field is a prompt
   */
  isPromptField(fieldName, value) {
    const isActualPrompt = fieldName.toLowerCase().includes('prompt') || 
                          fieldName.toLowerCase().includes('positive') || 
                          fieldName.toLowerCase().includes('negative');
    
    return isActualPrompt || (typeof value === 'string' && value.length > 50 && value.includes(' '));
  },

  /**
   * Determine parameter field type for UI rendering
   */
  determineParameterType(nodeType, fieldName, value) {
    // Check ComfyUI object_info for dropdown definitions
    if (window.comfyUIObjectInfo && nodeType && fieldName) {
      const nodeInfo = window.comfyUIObjectInfo[nodeType];
      if (nodeInfo && nodeInfo.input && nodeInfo.input.required && nodeInfo.input.required[fieldName]) {
        const fieldDef = nodeInfo.input.required[fieldName];
        if (Array.isArray(fieldDef) && fieldDef.length > 0 && Array.isArray(fieldDef[0])) {
          return {
            type: 'dropdown',
            subtype: 'combo',
            options: fieldDef[0],
            fieldName
          };
        }
      }
    }

    // File-based dropdowns
    if (typeof value === 'string') {
      if (this.looksLikeModelFile(value)) {
        return { type: 'dropdown', subtype: 'filesystem', category: 'model', fieldName };
      }
      if (this.looksLikeImageFile(value)) {
        return { type: 'dropdown', subtype: 'filesystem', category: 'image', fieldName };
      }
    }

    // Basic type detection
    if (typeof value === 'boolean') {
      return { type: 'boolean', fieldName };
    }
    if (typeof value === 'number') {
      return { type: 'number', fieldName };
    }

    // Default to dropdown for strings
    return { type: 'dropdown', subtype: 'unknown', fieldName };
  },

  /**
   * Check if value looks like a model file
   */
  looksLikeModelFile(value) {
    if (typeof value !== 'string') return false;
    const lowerValue = value.toLowerCase();
    const modelExtensions = ['.safetensors', '.ckpt', '.pt', '.pth', '.bin'];
    return modelExtensions.some(ext => lowerValue.endsWith(ext));
  },

  /**
   * Check if value looks like an image file
   */
  looksLikeImageFile(value) {
    if (typeof value !== 'string') return false;
    const lowerValue = value.toLowerCase();
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif'];
    return imageExtensions.some(ext => lowerValue.endsWith(ext));
  }
};