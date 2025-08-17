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
      clientId = null
    } = options;

    if (!await this.healthCheck()) {
      throw new Error('BentoML service is not available');
    }

    try {
      // Check if workflow needs conversion (GUI format)
      if (workflowData.nodes && Array.isArray(workflowData.nodes)) {
        throw new Error('GUI format workflows require conversion. Use legacy endpoint for now.');
      }

      // Prepare for direct ComfyUI submission (API format expected)
      const clientId_final = clientId || this.generateClientId();

      // Submit directly to ComfyUI's prompt endpoint (bypassing BentoML for now)
      const response = await fetch(`${this.bentomlUrl}/prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: workflowData,
          client_id: clientId || this.generateClientId()
        }),
        timeout: 30000
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`BentoML submission failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
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
  modifyWorkflowSeeds(workflowData, schema = null) {
    if (!workflowData || typeof workflowData !== 'object') {
      return workflowData;
    }

    let seedCount = 0;
    const generateRandomSeed = () => Math.floor(Math.random() * 2147483647) + 1;

    // Schema-driven approach (Phase 2 enhancement)
    if (schema && schema.seed_parameters) {
      // Use schema to identify seed parameters precisely
      for (const seedPath of schema.seed_parameters) {
        const value = this.getNestedValue(workflowData, seedPath);
        if (typeof value === 'number') {
          this.setNestedValue(workflowData, seedPath, generateRandomSeed());
          seedCount++;
        }
      }
    } else {
      // Fallback: recursive search (current approach)
      const modifySeeds = (obj) => {
        if (typeof obj !== 'object' || obj === null) return;

        for (const key in obj) {
          if (key === 'seed' && typeof obj[key] === 'number') {
            obj[key] = generateRandomSeed();
            seedCount++;
          } else if (typeof obj[key] === 'object') {
            modifySeeds(obj[key]);
          }
        }
      };
      modifySeeds(workflowData);
    }

    if (seedCount > 0) {
      console.log(`Modified ${seedCount} seed values using ${schema ? 'schema-driven' : 'fallback'} approach`);
    }

    return workflowData;
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