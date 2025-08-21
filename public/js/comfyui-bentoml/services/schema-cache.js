/**
 * Schema Cache Module
 * Handles BentoML schema caching and retrieval
 */
const SchemaCache = {
  // Cached schema data
  cachedSchema: null,
  lastSchemaFetch: 0,
  schemaTimeout: 300000, // 5 minutes

  /**
   * Get schema with caching from BentoML service
   */
  async getSchema() {
    const now = Date.now();
    
    // Return cached schema if fresh
    if (this.cachedSchema && (now - this.lastSchemaFetch) < this.schemaTimeout) {
      return this.cachedSchema;
    }

    try {
      // Get schema from BentoML service
      const schema = await window.comfyUIBentoML.client.getServiceSchema();
      
      if (schema) {
        this.cachedSchema = schema;
        this.lastSchemaFetch = now;
        console.log('BentoML schema updated from service');
        return schema;
      } else {
        throw new Error('BentoML service returned empty schema');
      }
    } catch (error) {
      console.error('Failed to fetch BentoML schema:', error.message);
      throw error;
    }
  },

  /**
   * Clear cached schema (for testing)
   */
  clearCache() {
    this.cachedSchema = null;
    this.lastSchemaFetch = 0;
  }
};

window.comfyUIBentoML = window.comfyUIBentoML || {};
window.comfyUIBentoML.SchemaCache = SchemaCache;