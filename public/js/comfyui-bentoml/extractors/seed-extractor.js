/**
 * Seed Extractor Service
 * Focused extraction of seed values from workflows
 */

window.comfyUIBentoML = window.comfyUIBentoML || {};
window.comfyUIBentoML.extractors = window.comfyUIBentoML.extractors || {};

window.comfyUIBentoML.extractors.seedExtractor = {
  /**
   * Extract all seed fields from workflow
   */
  extractSeeds(workflowData) {
    const seeds = [];

    if (workflowData.nodes && Array.isArray(workflowData.nodes)) {
      // GUI format
      for (const node of workflowData.nodes) {
        const seedField = this.extractFromGUINode(node);
        if (seedField) seeds.push(seedField);
      }
    } else {
      // API format
      for (const [nodeId, node] of Object.entries(workflowData)) {
        if (node && typeof node === 'object' && node.class_type) {
          const seedFields = this.extractFromAPINode(nodeId, node);
          seeds.push(...seedFields);
        }
      }
    }

    return seeds;
  },

  /**
   * Extract seed from GUI format node using generic pattern detection
   */
  extractFromGUINode(node) {
    if (!node.widgets_values) return null;

    // Generic pattern-based detection
    for (let i = 0; i < node.widgets_values.length; i++) {
      const value = node.widgets_values[i];
      if (this.isSeedValue(node, i, value)) {
        return {
          nodeId: node.id,
          nodeType: node.type,
          fieldName: 'seed',
          currentValue: value,
          controlMode: node.widgets_values[i + 1] || 'increment',
          source: 'gui',
          detectionMethod: 'pattern'
        };
      }
    }

    // Fallback to hardcoded detection for legacy compatibility
    if (this.isSeedNode(node.type)) {
      const legacyResult = this.extractFromGUINodeLegacy(node);
      if (legacyResult) {
        legacyResult.detectionMethod = 'legacy';
        return legacyResult;
      }
    }

    return null;
  },

  /**
   * Legacy hardcoded extraction for fallback
   */
  extractFromGUINodeLegacy(node) {
    switch (node.type) {
      case 'Seed Generator':
        return {
          nodeId: node.id,
          nodeType: node.type,
          fieldName: 'seed',
          currentValue: node.widgets_values[0],
          controlMode: node.widgets_values[1] || 'increment',
          source: 'gui'
        };

      case 'easy seed':
        if (node.widgets_values && node.widgets_values[0] !== undefined) {
          return {
            nodeId: node.id,
            nodeType: node.type,
            fieldName: 'seed',
            currentValue: node.widgets_values[0],
            controlMode: node.widgets_values[1] || 'increment',
            source: 'gui'
          };
        }
        break;

      case 'KSampler':
      case 'KSamplerAdvanced':
        const seedIndex = this.getSeedWidgetIndex(node.type);
        if (seedIndex !== -1 && node.widgets_values[seedIndex] !== undefined) {
          return {
            nodeId: node.id,
            nodeType: node.type,
            fieldName: 'seed',
            currentValue: node.widgets_values[seedIndex],
            source: 'gui'
          };
        }
        break;
    }
    return null;
  },

  /**
   * Extract seeds from API format node
   */
  extractFromAPINode(nodeId, node) {
    const seeds = [];
    if (!node.inputs) return seeds;

    for (const [inputName, value] of Object.entries(node.inputs)) {
      if (this.isSeedInput(inputName, value)) {
        seeds.push({
          nodeId: nodeId,
          nodeType: node.class_type,
          fieldName: inputName,
          currentValue: value,
          source: 'api'
        });
      }
    }

    return seeds;
  },

  /**
   * Generic pattern-based seed value detection
   */
  isSeedValue(node, widgetIndex, value) {
    // Must be integer
    if (!Number.isInteger(value)) return false;
    
    // Seed range check (ComfyUI seed range)
    if (value < 0 || value >= Math.pow(2, 31)) return false;
    
    // Semantic clues from node type and title
    const nodeTypeLower = node.type.toLowerCase();
    const titleLower = (node.title || '').toLowerCase();
    
    // Strong indicators
    if (nodeTypeLower.includes('seed') || titleLower.includes('seed')) {
      return true;
    }
    
    // Sampling nodes often have seeds as large integers
    if (nodeTypeLower.includes('sampl') && value > 1000) {
      return true;
    }
    
    // Random/noise related
    if (nodeTypeLower.includes('random') || nodeTypeLower.includes('noise')) {
      return true;
    }
    
    return false;
  },

  /**
   * Check if node type handles seeds (legacy hardcoded detection)
   */
  isSeedNode(nodeType) {
    return [
      'Seed Generator',
      'KSampler', 
      'KSamplerAdvanced',
      'RandomSeed',
      'SeedControl',
      'easy seed'
    ].includes(nodeType);
  },

  /**
   * Check if API input is a seed
   */
  isSeedInput(inputName, value) {
    if (typeof value !== 'number') return false;
    
    return [
      'seed',
      'noise_seed', 
      'random_seed'
    ].includes(inputName);
  },

  /**
   * Get seed widget index for node type
   */
  getSeedWidgetIndex(nodeType) {
    const indexMap = {
      'KSampler': 0,
      'KSamplerAdvanced': 1
    };
    return indexMap[nodeType] ?? -1;
  },

  /**
   * Generate random seed value
   */
  generateRandomSeed() {
    return Math.floor(Math.random() * 2147483647) + 1;
  }
};