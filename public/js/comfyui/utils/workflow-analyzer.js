/**
 * Workflow Analysis Utilities
 * Foundation for future text field detection and workflow parsing
 */

window.comfyUIServices = window.comfyUIServices || {};

window.comfyUIServices.workflowAnalyzer = {
  // Cache for node definitions from ComfyUI
  nodeDefinitionCache: new Map(),

  /**
   * Fetch node definition from ComfyUI via our server proxy
   * @param {string} nodeType - Node type to fetch
   * @returns {Promise<Object|null>} Node definition or null if failed
   */
  async fetchNodeDefinition(nodeType) {
    // Check cache first
    if (this.nodeDefinitionCache.has(nodeType)) {
      return this.nodeDefinitionCache.get(nodeType);
    }

    try {
      const response = await fetch(`/api/comfyui-node-info/${encodeURIComponent(nodeType)}`);
      if (!response.ok) {
        // Cache the failure so we don't keep retrying
        this.nodeDefinitionCache.set(nodeType, null);
        return null;
      }

      const nodeInfo = await response.json();

      // Cache the result
      this.nodeDefinitionCache.set(nodeType, nodeInfo);
      return nodeInfo;
    } catch (error) {
      // Cache the failure so we don't keep retrying
      this.nodeDefinitionCache.set(nodeType, null);
      return null;
    }
  },

  /**
   * Get widget names for a node type using ComfyUI's input_order
   * Only returns inputs that are widgets (not connections)
   * @param {string} nodeType - Node type
   * @returns {Promise<Array<string>>} Array of widget names in order
   */
  async getWidgetNames(nodeType) {
    const nodeInfo = await this.fetchNodeDefinition(nodeType);
    if (!nodeInfo || !nodeInfo[nodeType]) {
      return [];
    }

    const def = nodeInfo[nodeType];
    if (!def.input || !def.input_order) {
      return [];
    }

    const widgetNames = [];

    // Get all inputs in order
    const allInputs = [];
    if (def.input_order.required) {
      allInputs.push(...def.input_order.required);
    }
    if (def.input_order.optional) {
      allInputs.push(...def.input_order.optional);
    }

    // Filter out connection inputs - only keep widget inputs
    for (const inputName of allInputs) {
      const inputDef = def.input.required?.[inputName] || def.input.optional?.[inputName];
      if (inputDef && this.isWidgetInput(inputDef)) {
        widgetNames.push(inputName);
      }
    }

    return widgetNames;
  },

  /**
   * Check if an input definition represents a widget (not a connection)
   * @param {Array} inputDef - Input definition from ComfyUI
   * @returns {boolean} True if this is a widget input
   */
  isWidgetInput(inputDef) {
    if (!Array.isArray(inputDef) || inputDef.length === 0) {
      return false;
    }

    const inputType = inputDef[0];

    // These are typically connection types
    const connectionTypes = [
      'MODEL', 'CLIP', 'VAE', 'CONDITIONING', 'LATENT', 'IMAGE', 'MASK',
      'CONTROL_NET', 'UPSCALE_MODEL', 'NOISE'
    ];

    // If it's a connection type and has no options, it's likely a connection
    if (connectionTypes.includes(inputType) && inputDef.length === 1) {
      return false;
    }

    // If it has options/config (length > 1), it's likely a widget
    if (inputDef.length > 1) {
      return true;
    }

    // String, int, float inputs without config are usually widgets
    if (['STRING', 'INT', 'FLOAT', 'BOOLEAN'].includes(inputType)) {
      return true;
    }

    // Arrays of choices are dropdown widgets
    if (Array.isArray(inputType)) {
      return true;
    }

    return false;
  },
  /**
   * Analyze workflow structure
   * @param {Object} workflow - ComfyUI workflow object
   * @returns {Promise<Object>} Analysis results
   */
  async analyzeWorkflow(workflow) {
    if (!workflow || typeof workflow !== 'object') {
      return {
        nodes: [],
        connections: {},
        textFields: [],
        hasValidStructure: false
      };
    }

    const nodes = this.extractNodes(workflow);
    const connections = this.extractConnections(workflow);
    const textFields = await this.identifyTextFields(workflow);

    return {
      nodes,
      connections,
      textFields,
      hasValidStructure: nodes.length > 0
    };
  },

  /**
   * Extract node information from workflow
   * @param {Object} workflow - ComfyUI workflow object
   * @returns {Array} Array of node objects
   */
  extractNodes(workflow) {
    const nodes = [];

    // Check if this is GUI format (has nodes array) or API format (direct node mapping)
    if (workflow.nodes && Array.isArray(workflow.nodes)) {
      // GUI format - nodes are in an array
      for (const node of workflow.nodes) {
        if (node && node.type) {
          nodes.push({
            id: String(node.id),
            type: node.type,
            inputs: this.extractGUINodeInputs(node),
            meta: node.meta || {},
            widgets: node.widgets_values || []
          });
        }
      }
    } else {
      // API format - each key is a node ID
      for (const [nodeId, node] of Object.entries(workflow)) {
        if (node && typeof node === 'object' && node.class_type) {
          nodes.push({
            id: nodeId,
            type: node.class_type,
            inputs: node.inputs || {},
            meta: node._meta || {}
          });
        }
      }
    }

    return nodes;
  },

  /**
   * Extract inputs from GUI format node
   * @param {Object} node - GUI format node
   * @returns {Object} Inputs object
   */
  extractGUINodeInputs(node) {
    const inputs = {};

    // Extract widget values as inputs - but we'll handle this in the text field identification
    // Don't create generic widget mappings here as they lose context

    return inputs;
  },

  /**
   * Extract connection information from workflow
   * @param {Object} workflow - ComfyUI workflow object
   * @returns {Object} Connection mapping
   */
  extractConnections(workflow) {
    const connections = {};

    for (const [nodeId, node] of Object.entries(workflow)) {
      if (!node || !node.inputs) continue;

      connections[nodeId] = {};

      for (const [inputName, inputValue] of Object.entries(node.inputs)) {
        if (Array.isArray(inputValue) && inputValue.length === 2) {
          // This is a connection: [sourceNodeId, outputIndex]
          connections[nodeId][inputName] = {
            sourceNode: inputValue[0],
            outputIndex: inputValue[1]
          };
        }
      }
    }

    return connections;
  },

  /**
   * Identify potential text fields in workflow (foundation for future feature)
   * @param {Object} workflow - ComfyUI workflow object
   * @returns {Promise<Array>} Array of text field objects
   */
  async identifyTextFields(workflow) {
    const textFields = [];
    const nodes = this.extractNodes(workflow);

    for (const node of nodes) {

      // Check widget values for GUI format (from original workflow nodes)
      if (workflow.nodes && Array.isArray(workflow.nodes)) {
        const originalNode = workflow.nodes.find(n => String(n.id) === String(node.id));
        if (originalNode && originalNode.widgets_values && Array.isArray(originalNode.widgets_values)) {

          // Get widget names from the node's widgets array if available
          const widgetNames = originalNode.widgets ? originalNode.widgets.map(w => w.name) : [];

          // Get real widget names from ComfyUI
          const realWidgetNames = await this.getWidgetNames(node.type);
          
          // Cache widget mapping in editor store for edit application
          if (realWidgetNames.length > 0 && window.Alpine && Alpine.store('workflowEditor')) {
            Alpine.store('workflowEditor').widgetMappings.set(node.type, realWidgetNames);
          }

          for (let index = 0; index < originalNode.widgets_values.length; index++) {
            const value = originalNode.widgets_values[index];

            // Use real widget name from ComfyUI if available, fallback to existing logic
            let widgetName;
            if (realWidgetNames && realWidgetNames[index]) {
              widgetName = realWidgetNames[index];
            } else if (widgetNames[index] && widgetNames[index] !== 'widget') {
              widgetName = widgetNames[index];
            } else {
              widgetName = `widget_${index}`;
            }

            // Identify known text widgets by node type and widget name
            const isKnownTextWidget = this.isKnownTextWidget(node.type, widgetName, index);

            // Always include known text widgets, even if empty
            if (isKnownTextWidget || this.isTextFieldCandidate(node, widgetName, value)) {

              textFields.push({
                nodeId: node.id,
                nodeType: node.type,
                fieldName: widgetName,
                currentValue: value || '', // Ensure we have a string value
                isPromptLike: isKnownTextWidget || this.isPromptLikeField(node, widgetName, value)
              });

              // Text field detected and added
            }
          }
        }
      }

      // Check inputs for both formats
      if (node.inputs && typeof node.inputs === 'object') {
        for (const [inputName, inputValue] of Object.entries(node.inputs)) {
          if (this.isTextFieldCandidate(node, inputName, inputValue)) {
            textFields.push({
              nodeId: node.id,
              nodeType: node.type,
              fieldName: inputName,
              currentValue: inputValue,
              isPromptLike: this.isPromptLikeField(node, inputName, inputValue)
            });
          }
        }
      }
    }

    return textFields;
  },

  /**
   * Check if a field is a text field candidate
   * @param {Object} node - Node object
   * @param {string} inputName - Input field name
   * @param {*} inputValue - Input field value
   * @returns {boolean} True if this could be a text field
   */
  isTextFieldCandidate(node, inputName, inputValue) {
    // Handle null/undefined values
    if (inputValue === null || inputValue === undefined) {
      return false;
    }

    // Convert to string if needed
    const stringValue = String(inputValue);

    // Skip arrays (connections)
    if (Array.isArray(inputValue)) {
      return false;
    }

    // Allow empty strings for known prompt fields
    const isKnownPromptNode = node.type === 'CLIPTextEncode' || 
                             (node.class_type && node.class_type === 'CLIPTextEncode');

    // For prompt nodes, always accept string values (including empty)
    if (isKnownPromptNode && typeof inputValue === 'string') {
      return true;
    }

    // For other nodes, skip very short values that are likely technical parameters
    if (stringValue.length < 3) {
      return false;
    }

    // Skip obvious configuration fields
    if (this.isConfigurationField(inputName, stringValue)) {
      return false;
    }

    return true;
  },

  /**
   * Check if a field is a configuration field (paths, model names, etc.)
   * @param {string} inputName - Input field name
   * @param {string} inputValue - Input field value
   * @returns {boolean} True if this is likely a configuration field
   */
  isConfigurationField(inputName, inputValue) {
    const lowerName = inputName.toLowerCase();
    const lowerValue = inputValue.toLowerCase();

    // Skip file paths
    if (inputValue.includes('/') || inputValue.includes('\\') || inputValue.includes('.')) {
      // But allow certain extensions that might be in prompts
      const promptAllowedExtensions = ['.jpg', '.png', '.jpeg'];
      if (!promptAllowedExtensions.some(ext => lowerValue.includes(ext))) {
        return true;
      }
    }

    // Skip model files
    if (lowerValue.endsWith('.safetensors') || lowerValue.endsWith('.ckpt') || 
        lowerValue.endsWith('.pt') || lowerValue.endsWith('.bin')) {
      return true;
    }

    // Skip technical field names
    const configFieldNames = [
      'model', 'checkpoint', 'lora', 'sampler', 'scheduler', 'cfg', 'steps', 
      'width', 'height', 'batch', 'seed', 'denoise', 'control_after_generate',
      'filename', 'path', 'url', 'method', 'mode', 'format', 'quality'
    ];

    if (configFieldNames.some(name => lowerName.includes(name))) {
      return true;
    }

    // Skip boolean-like values
    if (['true', 'false', 'yes', 'no', 'enable', 'disable'].includes(lowerValue)) {
      return true;
    }

    // Skip numeric strings
    if (/^\d+(\.\d+)?$/.test(inputValue.trim())) {
      return true;
    }

    // Skip short technical identifiers
    if (inputValue.length <= 10 && /^[a-z_]+$/.test(lowerValue)) {
      return true;
    }

    return false;
  },

  /**
   * Check if a widget is a known text widget based on node type and widget name
   * @param {string} nodeType - Node type
   * @param {string} widgetName - Widget name
   * @param {number} index - Widget index
   * @returns {boolean} True if this is a known text widget
   */
  isKnownTextWidget(nodeType, widgetName, index) {
    // CLIPTextEncode: first widget is text
    if (nodeType === 'CLIPTextEncode' && index === 0) {
      return true;
    }

    // String (Multiline) nodes: text widget
    if (nodeType === 'String (Multiline)' || nodeType === 'JWStringMultiline') {
      return true;
    }

    // ImpactWildcardEncode: first two widgets (0=wildcard_text, 1=populated_text)
    if (nodeType === 'ImpactWildcardEncode') {
      return index === 0 || index === 1;
    }

    // Generic text field names
    const textWidgetNames = [
      'text', 'prompt', 'positive', 'negative', 'description', 'string',
      'wildcard_text', 'populated_text', 'input_text', 'content'
    ];

    return textWidgetNames.includes(widgetName.toLowerCase());
  },

  /**
   * Check if a field appears to be prompt-related (simplified MVP version)
   * @param {Object} node - Node object
   * @param {string} inputName - Input field name
   * @param {string} inputValue - Input field value
   * @returns {boolean} True if this appears to be a prompt field
   */
  isPromptLikeField(node, inputName, inputValue) {
    // Check field name patterns - primary detection method
    const promptFieldNames = ['text', 'prompt', 'positive', 'negative', 'description', 'string'];
    if (promptFieldNames.some(name => inputName.toLowerCase().includes(name))) {
      return true;
    }

    // Check node type patterns - secondary detection method
    const promptNodeTypes = [
      'CLIPTextEncode', 'TextInput', 'StringConstant', 'String', 
      'Text', 'Prompt', 'Wildcard', 'MultilineString'
    ];
    const nodeType = node.class_type || node.type;
    if (nodeType && promptNodeTypes.some(type => nodeType.includes(type))) {
      return true;
    }

    // Skip natural language patterns for MVP - too complex and can have false positives
    // Future: implement this for better detection
    // if (this.hasNaturalLanguageCharacteristics(inputValue)) {
    //   return true;
    // }

    return false;
  },

  /**
   * Check if text has natural language characteristics (future feature)
   * Currently disabled for MVP to avoid false positives
   * @param {string} text - Text to analyze
   * @returns {boolean} True if text appears to be natural language
   */
  hasNaturalLanguageCharacteristics(text) {
    // Future implementation: Check for common prompt keywords
    // const promptKeywords = [
    //   'masterpiece', 'high quality', 'detailed', 'realistic', 'portrait',
    //   'landscape', 'beautiful', 'art', 'style', 'painting', 'photo'
    // ];

    // Future implementation: Check for sentence-like structure
    // const words = text.split(/\s+/);
    // if (words.length > 3 && text.includes(' ')) {
    //   return true;
    // }

    // For MVP: Return false to rely on field names and node types only
    return false;
  },

  /**
   * Order nodes for editing (foundation for future feature)
   * @param {Array} nodes - Array of node objects
   * @param {Object} connections - Connection mapping
   * @returns {Array} Ordered array of nodes
   */
  orderNodesForEditing(nodes, connections) {
    // Simple ordering by node ID for now
    // Future implementation will use topological sorting based on connections
    return nodes.sort((a, b) => {
      const aNum = parseInt(a.id);
      const bNum = parseInt(b.id);
      return aNum - bNum;
    });
  },

  /**
   * Get workflow format (API vs GUI)
   * @param {Object} workflow - ComfyUI workflow object
   * @returns {string} 'api' or 'gui' or 'unknown'
   */
  getWorkflowFormat(workflow) {
    if (!workflow || typeof workflow !== 'object') {
      return 'unknown';
    }

    // Check if keys are numeric (API format)
    const keys = Object.keys(workflow);
    const hasNumericKeys = keys.some(key => /^\d+$/.test(key));

    if (hasNumericKeys) {
      // Verify it has class_type properties
      const firstNode = workflow[keys.find(key => /^\d+$/.test(key))];
      if (firstNode && firstNode.class_type) {
        return 'api';
      }
    }

    // Check for GUI format characteristics
    if (workflow.nodes && Array.isArray(workflow.nodes)) {
      return 'gui';
    }

    return 'unknown';
  },

  /**
   * Note: GUI to API conversion is handled server-side for comprehensive 
   * connection mapping and better error handling. This analyzer focuses
   * on text field detection and workflow structure analysis.
   */
};
