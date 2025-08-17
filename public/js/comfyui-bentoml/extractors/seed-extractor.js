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
   * Extract seed from GUI format node
   */
  extractFromGUINode(node) {
    if (!this.isSeedNode(node.type) || !node.widgets_values) return null;

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
   * Check if node type handles seeds
   */
  isSeedNode(nodeType) {
    return [
      'Seed Generator',
      'KSampler',
      'KSamplerAdvanced',
      'RandomSeed',
      'SeedControl'
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