/**
 * BentoML Service Integration
 * Handles ComfyUI workflow submission through BentoML comfy-pack
 */

const fetch = require('node-fetch');
const config = require('../config');

class BentoMLService {
  constructor() {
    // For now, connect directly to ComfyUI since BentoML wrapper isn't set up yet
    // Use dynamic config instead of hardcoded URLs
    this.bentomlUrl = process.env.BENTOML_URL || config.COMFYUI_URL;
    this.serviceName = process.env.BENTOML_SERVICE || 'comfyui-service';
    this.isAvailable = false;
    this.lastHealthCheck = 0;
    this.healthCheckInterval = 30000; // 30 seconds
  }

  /**
   * Check if BentoML service is available
   */
  async healthCheck() {
    const now = Date.now();
    if (now - this.lastHealthCheck < this.healthCheckInterval && this.isAvailable) {
      return this.isAvailable;
    }

    try {
      // Use ComfyUI's queue endpoint as health check since that's what we're connecting to
      const response = await fetch(`${this.bentomlUrl}/queue`, {
        method: 'GET',
        timeout: 5000
      });
      
      this.isAvailable = response.ok;
      this.lastHealthCheck = now;
      
      if (this.isAvailable) {
        console.log('BentoML service is available');
      } else {
        console.warn('BentoML service health check failed:', response.status);
      }
    } catch (error) {
      this.isAvailable = false;
      this.lastHealthCheck = now;
      console.warn('BentoML service unreachable:', error.message);
    }

    return this.isAvailable;
  }

  /**
   * Submit workflow directly to BentoML (eliminates GUI-API conversion)
   */
  async submitWorkflow(workflowData, options = {}) {
    const {
      modifySeeds = false,
      controlAfterGenerate = 'increment',
      quantity = 1,
      clientId = null,
      metadataWorkflow = null
    } = options;

    if (!await this.healthCheck()) {
      throw new Error('BentoML service is not available');
    }

    try {
      // ComfyUI web GUI approach: submit API for execution + GUI for metadata
      const isGUIFormat = workflowData.nodes && Array.isArray(workflowData.nodes);
      const hasMetadata = metadataWorkflow && metadataWorkflow.nodes && Array.isArray(metadataWorkflow.nodes);
      
      console.log(`Submitting ${isGUIFormat ? 'GUI' : 'API'} format workflow for execution`);
      if (hasMetadata) {
        console.log(`Including GUI metadata workflow with ${metadataWorkflow.nodes.length} nodes for preservation`);
      }

      // Prepare for direct ComfyUI submission (accepts both GUI and API formats)
      const clientId_final = clientId || this.generateClientId();

      // Submit directly to ComfyUI's prompt endpoint (bypassing BentoML for now)
      const submissionPayload = {
        prompt: workflowData, // API format for execution
        client_id: clientId || this.generateClientId(),
        // Include complete GUI workflow for metadata embedding (like ComfyUI web GUI)
        ...(metadataWorkflow && { workflow: metadataWorkflow })
      };
      
      // Debug: Log the seed values and submission payload
      console.log('FINAL SUBMISSION - Checking seeds being sent to ComfyUI:');
      for (const [nodeId, node] of Object.entries(workflowData)) {
        if (node.inputs && typeof node.inputs.seed === 'number') {
          console.log(`  Submitting Node ${nodeId} (${node.class_type}) seed: ${node.inputs.seed}`);
        }
      }
      console.log('Submission payload keys:', Object.keys(submissionPayload));
      console.log('Workflow data has', Object.keys(workflowData).length, 'nodes');
      console.log('Client ID:', submissionPayload.client_id);
      
      const response = await fetch(`${this.bentomlUrl}/prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submissionPayload),
        timeout: 30000
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`BentoML submission failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      // Check for ComfyUI-specific errors (even with 200 status)
      if (result.error) {
        console.error('ComfyUI rejected workflow:', result.error);
        throw new Error(`ComfyUI error: ${result.error.type} - ${result.error.message}`);
      }
      
      console.log(`BentoML: Successfully submitted workflow${quantity > 1 ? ` (${quantity} times)` : ''} to ComfyUI`);
      
      return {
        success: true,
        workflowId: result.prompt_id || result.id,
        comfyUIResult: result,
        submissionCount: quantity
      };

    } catch (error) {
      console.error('BentoML workflow submission error:', error);
      throw error;
    }
  }

  /**
   * Get workflow status from BentoML
   */
  async getWorkflowStatus(workflowId) {
    if (!await this.healthCheck()) {
      throw new Error('BentoML service is not available');
    }

    try {
      const response = await fetch(`${this.bentomlUrl}/status/${workflowId}`, {
        method: 'GET',
        timeout: 10000
      });

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('BentoML status check error:', error);
      throw error;
    }
  }

  /**
   * Cancel workflow in BentoML/ComfyUI queue
   */
  async cancelWorkflow(workflowId) {
    if (!await this.healthCheck()) {
      throw new Error('BentoML service is not available');
    }

    try {
      const response = await fetch(`${this.bentomlUrl}/cancel/${workflowId}`, {
        method: 'POST',
        timeout: 10000
      });

      if (!response.ok) {
        throw new Error(`Cancel failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('BentoML workflow cancellation error:', error);
      throw error;
    }
  }

  /**
   * Get BentoML service schema for field detection
   */
  async getServiceSchema() {
    if (!await this.healthCheck()) {
      return null;
    }

    try {
      const response = await fetch(`${this.bentomlUrl}/schema`, {
        method: 'GET',
        timeout: 10000
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.warn('Failed to get BentoML schema:', error.message);
      return null;
    }
  }

  /**
   * Modify seeds in workflow using schema-driven approach
   */
  modifyWorkflowSeeds(workflowData, seedMode = 'randomize', baseSeed = null, schema = null) {
    if (!workflowData || typeof workflowData !== 'object') {
      return workflowData;
    }
    
    if (seedMode === 'original') {
      // Don't modify seeds at all
      return workflowData;
    }

    let seedCount = 0;
    const generateRandomSeed = () => Math.floor(Math.random() * 2147483647) + 1;
    const incrementSeed = (currentSeed) => {
      if (baseSeed !== null) {
        return baseSeed + seedCount + 1; // Start from baseSeed + 1 for first execution
      }
      return currentSeed + 1; // Increment existing seed
    };

    // Schema-driven approach (Phase 2 enhancement)
    if (schema && schema.seed_parameters) {
      // Use schema to identify seed parameters precisely
      for (const seedPath of schema.seed_parameters) {
        const value = this.getNestedValue(workflowData, seedPath);
        if (typeof value === 'number') {
          const newSeed = seedMode === 'randomize' ? generateRandomSeed() : incrementSeed(value);
          this.setNestedValue(workflowData, seedPath, newSeed);
          seedCount++;
        }
      }
    } else {
      // Enhanced fallback: handle both named seeds and widget-based seeds
      const modifySeeds = (obj, parentKey = '') => {
        if (typeof obj !== 'object' || obj === null) return;

        // Handle named seed properties AND widget_X properties from converted custom nodes
        for (const key in obj) {
          if ((key === 'seed' || key === 'noise_seed') && typeof obj[key] === 'number') {
            obj[key] = seedMode === 'randomize' ? generateRandomSeed() : incrementSeed(obj[key]);
            seedCount++;
          } else if (key.startsWith('widget_') && typeof obj[key] === 'number') {
            // Handle widget_0, widget_1, etc. from converted custom nodes
            // Apply same heuristics as GUI widget detection
            const value = obj[key];
            if (Number.isInteger(value) && value > 0 && value <= 2147483647) {
              // Could be a seed - randomize it
              obj[key] = seedMode === 'randomize' ? generateRandomSeed() : incrementSeed(value);
              seedCount++;
              console.log(`Modified API widget seed ${key}: ${value} → ${obj[key]}`);
            }
          } else if (typeof obj[key] === 'object') {
            modifySeeds(obj[key], key);
          }
        }

        // Handle widget-based seeds for custom nodes (like WanVideoSampler)
        if (parentKey === 'nodes' && Array.isArray(obj)) {
          // This is a nodes array
          for (const node of obj) {
            if (node && node.type && node.widgets_values && Array.isArray(node.widgets_values)) {
              const widgetSeedCount = this.modifyWidgetSeeds(node, seedMode, generateRandomSeed, incrementSeed);
              seedCount += widgetSeedCount;
            }
          }
        }
      };
      modifySeeds(workflowData);
    }

    if (seedCount > 0) {
      console.log(`Modified ${seedCount} seed values (${seedMode} mode) using ${schema ? 'schema-driven' : 'fallback'} approach`);
    }

    return workflowData;
  }

  /**
   * Modify widget-based seeds for custom nodes
   */
  modifyWidgetSeeds(node, seedMode, generateRandomSeed, incrementSeed) {
    let modifiedCount = 0;

    // Dynamic seed detection: look for seed-like values in widgets_values
    if (node.widgets_values && Array.isArray(node.widgets_values)) {
      node.widgets_values.forEach((value, index) => {
        // Enhanced heuristic: detect seed-like numbers
        // - Must be a number and integer
        // - Seeds can be small (like 6, 30) or large (like 479516935823353)
        // - Exclude obvious non-seeds: 0, 1, booleans, strings, floats
        // - Exclude tiny step counts (2, 3, 4, 5) but allow reasonable seed values
        const isInteger = Number.isInteger(value);
        const isPositive = value > 0;
        const notTinyStepCount = value < 2 || value > 10; // Exclude 2,3,4,5,6,7,8,9,10 (likely step counts)
        const inSeedRange = value <= 9999999999999999; // Reasonable max for seeds
        
        // Special case: if it's in a typical "seed position" (index 0 or 3), be more lenient
        const isInSeedPosition = index === 0 || index === 3;
        const couldBeSeed = isInSeedPosition ? (value >= 1) : (value >= 100); // Lower threshold for seed positions
        
        if (typeof value === 'number' && 
            isInteger && 
            isPositive && 
            couldBeSeed &&
            inSeedRange) {
          
          const newSeed = seedMode === 'randomize' ? generateRandomSeed() : incrementSeed(value);
          node.widgets_values[index] = newSeed;
          modifiedCount++;
          console.log(`Modified ${node.type} (ID:${node.id}) seed at widgets_values[${index}]: ${value} → ${newSeed} (position-aware detection)`);
        }
      });
    }

    return modifiedCount;
  }

  /**
   * Helper: Get nested object value by path
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Helper: Set nested object value by path
   */
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * Generate unique client ID
   */
  generateClientId() {
    return 'swipe-save-bentoml-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get service configuration info
   */
  getServiceInfo() {
    return {
      url: this.bentomlUrl,
      serviceName: this.serviceName,
      isAvailable: this.isAvailable,
      lastHealthCheck: new Date(this.lastHealthCheck).toISOString()
    };
  }
}

module.exports = new BentoMLService();