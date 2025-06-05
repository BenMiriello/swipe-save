/**
 * Validation Utilities for ComfyUI Module
 * Validates workflows, settings, and parameters
 */

window.comfyUIServices = window.comfyUIServices || {};

window.comfyUIServices.validation = {
  /**
   * Validate workflow object
   * @param {Object} workflow - Workflow to validate
   * @returns {Object} Validation result
   */
  validateWorkflow(workflow) {
    const errors = [];
    const warnings = [];

    if (!workflow) {
      errors.push('Workflow is null or undefined');
      return { isValid: false, errors, warnings };
    }

    if (typeof workflow !== 'object') {
      errors.push('Workflow must be an object');
      return { isValid: false, errors, warnings };
    }

    // Check if workflow has any nodes
    const nodeCount = Object.keys(workflow).length;
    if (nodeCount === 0) {
      errors.push('Workflow has no nodes');
      return { isValid: false, errors, warnings };
    }

    // Validate node structure
    for (const [nodeId, node] of Object.entries(workflow)) {
      const nodeValidation = this.validateNode(nodeId, node);
      errors.push(...nodeValidation.errors);
      warnings.push(...nodeValidation.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      nodeCount
    };
  },

  /**
   * Validate individual node
   * @param {string} nodeId - Node ID
   * @param {Object} node - Node object
   * @returns {Object} Validation result
   */
  validateNode(nodeId, node) {
    const errors = [];
    const warnings = [];

    if (!node || typeof node !== 'object') {
      errors.push(`Node ${nodeId}: Invalid node object`);
      return { errors, warnings };
    }

    if (!node.class_type) {
      errors.push(`Node ${nodeId}: Missing class_type`);
    } else if (typeof node.class_type !== 'string') {
      errors.push(`Node ${nodeId}: class_type must be a string`);
    }

    if (node.inputs && typeof node.inputs !== 'object') {
      errors.push(`Node ${nodeId}: inputs must be an object`);
    }

    return { errors, warnings };
  },

  /**
   * Validate workflow settings
   * @param {Object} settings - Settings to validate
   * @returns {Object} Validation result
   */
  validateSettings(settings) {
    const errors = [];
    const warnings = [];

    if (!settings || typeof settings !== 'object') {
      errors.push('Settings must be an object');
      return { isValid: false, errors, warnings };
    }

    // Validate quantity
    if ('quantity' in settings) {
      const quantityValidation = this.validateQuantity(settings.quantity);
      if (!quantityValidation.isValid) {
        errors.push(`Invalid quantity: ${quantityValidation.error}`);
      }
    }

    // Validate modifySeeds
    if ('modifySeeds' in settings && typeof settings.modifySeeds !== 'boolean') {
      errors.push('modifySeeds must be a boolean');
    }

    // Validate controlAfterGenerate
    if ('controlAfterGenerate' in settings) {
      const controlValidation = this.validateControlAfterGenerate(settings.controlAfterGenerate);
      if (!controlValidation.isValid) {
        errors.push(`Invalid controlAfterGenerate: ${controlValidation.error}`);
      }
    }

    // Validate ComfyUI URL
    if ('comfyUrl' in settings && settings.comfyUrl) {
      const urlValidation = this.validateComfyUIUrl(settings.comfyUrl);
      if (!urlValidation.isValid) {
        errors.push(`Invalid ComfyUI URL: ${urlValidation.error}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  },

  /**
   * Validate quantity parameter
   * @param {*} quantity - Quantity to validate
   * @returns {Object} Validation result
   */
  validateQuantity(quantity) {
    if (typeof quantity !== 'number') {
      return { isValid: false, error: 'must be a number' };
    }

    if (!Number.isInteger(quantity)) {
      return { isValid: false, error: 'must be an integer' };
    }

    if (quantity < 1) {
      return { isValid: false, error: 'must be at least 1' };
    }

    if (quantity > 99) {
      return { isValid: false, error: 'must be 99 or less' };
    }

    return { isValid: true };
  },

  /**
   * Validate control after generate parameter
   * @param {*} controlMode - Control mode to validate
   * @returns {Object} Validation result
   */
  validateControlAfterGenerate(controlMode) {
    if (typeof controlMode !== 'string') {
      return { isValid: false, error: 'must be a string' };
    }

    const validModes = ['increment', 'decrement', 'randomize', 'fixed'];
    if (!validModes.includes(controlMode)) {
      return { 
        isValid: false, 
        error: `must be one of: ${validModes.join(', ')}` 
      };
    }

    return { isValid: true };
  },

  /**
   * Validate ComfyUI URL
   * @param {*} url - URL to validate
   * @returns {Object} Validation result
   */
  validateComfyUIUrl(url) {
    if (typeof url !== 'string') {
      return { isValid: false, error: 'must be a string' };
    }

    if (url.trim() === '') {
      return { isValid: false, error: 'cannot be empty' };
    }

    // Basic URL format validation
    try {
      new URL(url);
    } catch {
      return { isValid: false, error: 'must be a valid URL' };
    }

    // Check for http/https protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return { isValid: false, error: 'must use http:// or https:// protocol' };
    }

    return { isValid: true };
  },

  /**
   * Validate seed value
   * @param {*} seed - Seed to validate
   * @returns {Object} Validation result
   */
  validateSeed(seed) {
    if (typeof seed !== 'number') {
      return { isValid: false, error: 'must be a number' };
    }

    if (!Number.isInteger(seed)) {
      return { isValid: false, error: 'must be an integer' };
    }

    if (seed < 0) {
      return { isValid: false, error: 'must be non-negative' };
    }

    // ComfyUI's maximum seed value (conservative range)
    if (seed > 2147483647) {
      return { isValid: false, error: 'exceeds maximum allowed value' };
    }

    return { isValid: true };
  },

  /**
   * Validate file object
   * @param {*} file - File to validate
   * @returns {Object} Validation result
   */
  validateFile(file) {
    if (!file || typeof file !== 'object') {
      return { isValid: false, error: 'must be a file object' };
    }

    if (!file.name || typeof file.name !== 'string') {
      return { isValid: false, error: 'must have a valid name' };
    }

    if (file.name.trim() === '') {
      return { isValid: false, error: 'name cannot be empty' };
    }

    return { isValid: true };
  }
};
