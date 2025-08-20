/**
 * BentoML Integration Routes
 * Direct workflow submission without GUI-API conversion
 */

const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const router = express.Router();
const fileOps = require('../fileOperations');
const config = require('../config');
const bentomlService = require('../services/bentoml-service');

/**
 * Feature flags for safe rollout
 */
const FEATURE_FLAGS = {
  USE_BENTOML_SUBMISSION: process.env.BENTOML_ENABLED === 'true' || false,
  USE_BENTOML_SEEDS: process.env.BENTOML_SEEDS_ENABLED === 'true' || false,
  BENTOML_DEBUG: process.env.BENTOML_DEBUG === 'true' || false
};

/**
 * Queue workflow via BentoML (Phase 1: Direct submission)
 * Eliminates GUI-API conversion complexity
 */
router.post('/api/bentoml/queue-workflow', async (req, res) => {
  try {
    const { filename, modifySeeds, seedMode, controlAfterGenerate, quantity } = req.body;

    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    if (!FEATURE_FLAGS.USE_BENTOML_SUBMISSION) {
      return res.status(503).json({ 
        error: 'BentoML submission not enabled',
        fallback: 'Use /api/queue-workflow instead'
      });
    }

    // Check if BentoML service is available
    const isServiceAvailable = await bentomlService.healthCheck();
    if (!isServiceAvailable) {
      return res.status(503).json({ 
        error: 'BentoML service unavailable',
        fallback: 'Use /api/queue-workflow instead'
      });
    }

    const filePath = path.join(config.OUTPUT_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Extract workflow metadata (same as legacy system)
    const metadata = await fileOps.extractComfyMetadata(filePath, filename);
    
    let workflowData;
    if (metadata.prompt) {
      workflowData = metadata.prompt;
    } else if (metadata.workflow) {
      workflowData = metadata.workflow;
    } else {
      return res.status(404).json({ error: 'No workflow found in image metadata' });
    }

    // Phase 2: Schema-driven seed modification with mode support
    const actualSeedMode = seedMode || (modifySeeds ? 'randomize' : 'original');
    
    if (actualSeedMode !== 'original' && FEATURE_FLAGS.USE_BENTOML_SEEDS) {
      try {
        const schema = await bentomlService.getServiceSchema();
        workflowData = bentomlService.modifyWorkflowSeeds(workflowData, actualSeedMode, null, schema);
      } catch (schemaError) {
        console.warn('Schema-based seed modification failed, using fallback:', schemaError.message);
        workflowData = bentomlService.modifyWorkflowSeeds(workflowData, actualSeedMode);
      }
    } else if (actualSeedMode !== 'original') {
      // Fallback seed modification
      workflowData = bentomlService.modifyWorkflowSeeds(workflowData, actualSeedMode);
    }

    // Check workflow format and convert if needed
    if (workflowData.nodes && Array.isArray(workflowData.nodes)) {
      console.log('Converting GUI format workflow to API format...');
      // For now, let the BentoML service handle conversion or use fallback
      // TODO: Implement conversion or use BentoML's built-in conversion
    }

    // Submit to ComfyUI (via BentoML service)
    const result = await bentomlService.submitWorkflow(workflowData, {
      modifySeeds,
      controlAfterGenerate,
      quantity: quantity || 1,
      clientId: req.headers['x-client-id']
    });

    if (FEATURE_FLAGS.BENTOML_DEBUG) {
      console.log('BentoML submission result:', result);
    }

    res.json({
      success: true,
      method: 'bentoml',
      workflowId: result.workflowId,
      submissionCount: result.submissionCount,
      modifiedSeeds: modifySeeds,
      controlAfterGenerate: controlAfterGenerate,
      bentomlInfo: {
        serviceUrl: bentomlService.getServiceInfo().url,
        usedSchema: FEATURE_FLAGS.USE_BENTOML_SEEDS
      }
    });

  } catch (error) {
    console.error('BentoML workflow submission error:', error);
    res.status(500).json({ 
      error: error.message,
      method: 'bentoml',
      fallback: 'Consider using /api/queue-workflow'
    });
  }
});

/**
 * Get workflow status from BentoML
 */
router.get('/api/bentoml/status/:workflowId', async (req, res) => {
  try {
    const { workflowId } = req.params;

    if (!FEATURE_FLAGS.USE_BENTOML_SUBMISSION) {
      return res.status(503).json({ error: 'BentoML not enabled' });
    }

    const status = await bentomlService.getWorkflowStatus(workflowId);
    res.json(status);

  } catch (error) {
    console.error('BentoML status check error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Cancel workflow in BentoML queue
 */
router.post('/api/bentoml/cancel/:workflowId', async (req, res) => {
  try {
    const { workflowId } = req.params;

    if (!FEATURE_FLAGS.USE_BENTOML_SUBMISSION) {
      return res.status(503).json({ error: 'BentoML not enabled' });
    }

    const result = await bentomlService.cancelWorkflow(workflowId);
    res.json({
      success: true,
      workflowId,
      result
    });

  } catch (error) {
    console.error('BentoML workflow cancellation error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * BentoML service health check
 */
router.get('/api/bentoml/health', async (req, res) => {
  try {
    const isHealthy = await bentomlService.healthCheck();
    const serviceInfo = bentomlService.getServiceInfo();

    res.json({
      healthy: isHealthy,
      serviceInfo,
      featureFlags: FEATURE_FLAGS,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({ 
      healthy: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get BentoML service schema for field detection
 */
router.get('/api/bentoml/schema', async (req, res) => {
  try {
    if (!FEATURE_FLAGS.USE_BENTOML_SUBMISSION) {
      return res.status(503).json({ error: 'BentoML not enabled' });
    }

    const schema = await bentomlService.getServiceSchema();
    
    if (!schema) {
      return res.status(503).json({ error: 'Schema not available' });
    }

    res.json(schema);

  } catch (error) {
    console.error('BentoML schema fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Feature flag management (for testing)
 */
router.get('/api/bentoml/flags', (req, res) => {
  res.json(FEATURE_FLAGS);
});

router.post('/api/bentoml/flags', (req, res) => {
  const { flag, value } = req.body;
  
  if (FEATURE_FLAGS.hasOwnProperty(flag)) {
    FEATURE_FLAGS[flag] = Boolean(value);
    console.log(`Feature flag ${flag} set to ${value}`);
    res.json({ 
      success: true, 
      flag, 
      value: FEATURE_FLAGS[flag],
      allFlags: FEATURE_FLAGS 
    });
  } else {
    res.status(400).json({ 
      error: 'Invalid feature flag', 
      availableFlags: Object.keys(FEATURE_FLAGS) 
    });
  }
});

module.exports = router;