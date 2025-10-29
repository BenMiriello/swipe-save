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
 * Queue workflow with edited workflow data via BentoML
 */
router.post('/api/bentoml/queue-workflow-with-edits', async (req, res) => {
  try {
    const { filename, workflow, seedMode = 'original', modifySeeds, controlAfterGenerate = 'increment', quantity = 1 } = req.body;
    
    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }
    
    if (!workflow) {
      return res.status(400).json({ error: 'Pre-edited workflow is required' });
    }
    
    
    const actualSeedMode = seedMode !== 'original' ? seedMode : (modifySeeds ? 'randomize' : 'original');
    
    // Use the provided workflow directly (preserves formatting and text edits)
    let workflowData = workflow;
    
    // ComfyUI accepts both GUI and API formats - preserve original format
    const isGUIFormat = workflowData.nodes && Array.isArray(workflowData.nodes);
    console.log(`Using ${isGUIFormat ? 'GUI' : 'API'} format workflow - preserving structure`);
    
    const results = [];
    
    // Submit workflow multiple times based on quantity, each with unique seeds
    for (let i = 0; i < quantity; i++) {
      let currentWorkflow = JSON.parse(JSON.stringify(workflowData)); // Deep copy
      
      // Apply seed modification using BentoML service
      if (actualSeedMode !== 'original') {
        try {
          currentWorkflow = bentomlService.modifyWorkflowSeeds(currentWorkflow, actualSeedMode);
        } catch (error) {
          console.warn('BentoML seed modification failed, using fallback:', error.message);
          // Fallback to legacy seed modification
          const { modifyWorkflowSeeds } = require('./workflow-routes');
          currentWorkflow = modifyWorkflowSeeds(currentWorkflow);
        }
      }
      
      if (controlAfterGenerate && controlAfterGenerate !== 'increment') {
        const { modifyControlAfterGenerate } = require('./workflow-routes');
        currentWorkflow = modifyControlAfterGenerate(currentWorkflow, controlAfterGenerate);
      }
      
      // Generate unique client ID
      const clientId = 'swipe-save-bentoml-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9) + '-' + i;
      
      // Submit via ComfyUI directly (same as legacy but with BentoML client ID)
      const config = require('../config');
      const targetUrl = config.normalizeComfyUIUrl(config.COMFYUI_URL);
      const fetch = require('node-fetch');
      
      const response = await fetch(`${targetUrl}/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: currentWorkflow,
          client_id: clientId
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ComfyUI API error on submission ${i+1}/${quantity}: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      results.push(result);
      console.log(`BentoML edited workflow queued successfully (${i+1}/${quantity})`);
    }
    
    res.json({
      success: true,
      method: 'bentoml-edited',
      results: results,
      quantity: quantity,
      seedMode: actualSeedMode,
      controlAfterGenerate: controlAfterGenerate,
      preservedFormatting: true
    });
    
  } catch (error) {
    console.error('BentoML edited workflow error:', error);
    res.status(500).json({ error: error.message });
  }
});

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


    // Check if BentoML service is available
    const isServiceAvailable = await bentomlService.healthCheck();
    if (!isServiceAvailable) {
      return res.status(503).json({ 
        error: 'BentoML service unavailable'
      });
    }

    const filePath = path.join(config.OUTPUT_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Extract workflow metadata (prefer prompt/API format over GUI format)
    const metadata = await fileOps.extractComfyMetadata(filePath, filename);
    
    let workflowData;
    let workflowFormat = 'unknown';
    
    // Prefer workflow (GUI format) over prompt (API format) to preserve node layout, bypassed nodes, and subgraphs
    if (metadata.workflow) {
      workflowData = metadata.workflow;
      workflowFormat = 'gui';
      console.log(`Using workflow data (GUI format) - preserves layout and node states. Nodes: ${metadata.workflow.nodes?.length}, WanVideoSampler nodes: ${metadata.workflow.nodes?.filter(n => n.type === 'WanVideoSampler').length}`);
    } else if (metadata.prompt) {
      workflowData = metadata.prompt;
      workflowFormat = 'api';
      console.log(`Using prompt data (API format) - fallback. Nodes: ${Object.keys(metadata.prompt).length}`);
    } else {
      return res.status(404).json({ error: 'No workflow found in image metadata' });
    }

    // Phase 2: Schema-driven seed modification with mode support  
    const actualSeedMode = seedMode || (modifySeeds ? 'randomize' : 'original');
    console.log(`Seed mode: ${actualSeedMode}, format: ${workflowFormat}`);

    // Apply ComfyUI web GUI approach: submit both formats for complete preservation
    let executionWorkflow = workflowData;
    let metadataWorkflow = workflowData;
    
    if (workflowFormat === 'gui') {
      // Convert GUI to API for execution (filters bypassed nodes)
      console.log('Converting GUI workflow to API format for execution...');
      try {
        const { convertGUIToAPI } = require('./workflow-routes');
        executionWorkflow = await convertGUIToAPI(workflowData);
        metadataWorkflow = workflowData; // Keep original GUI for metadata
        console.log(`Converted ${workflowData.nodes.length} GUI nodes to ${Object.keys(executionWorkflow).length} API nodes for execution`);
        
        // CRITICAL: Apply seed modification to the converted API workflow
        if (actualSeedMode !== 'original') {
          console.log('Applying seed modification to converted API workflow...');
          console.log('BEFORE seed modification - checking workflow seeds:');
          for (const [nodeId, node] of Object.entries(executionWorkflow)) {
            if (node.inputs && typeof node.inputs.seed === 'number') {
              console.log(`  Node ${nodeId} (${node.class_type}) seed: ${node.inputs.seed}`);
            }
          }
          
          // Modify both standard "seed" properties AND widget_X properties from custom nodes
          executionWorkflow = bentomlService.modifyWorkflowSeeds(executionWorkflow, actualSeedMode);
          
          console.log('AFTER seed modification - checking workflow seeds:');
          for (const [nodeId, node] of Object.entries(executionWorkflow)) {
            if (node.inputs && typeof node.inputs.seed === 'number') {
              console.log(`  Node ${nodeId} (${node.class_type}) seed: ${node.inputs.seed}`);
            }
          }
          console.log('API workflow seed modification completed');
        }
        
      } catch (error) {
        console.error('GUI to API conversion failed:', error);
        return res.status(400).json({ 
          error: 'Failed to convert workflow format: ' + error.message,
          suggestion: 'This workflow may contain custom nodes not supported in API conversion'
        });
      }
    }

    // Apply seed modification to API format workflows (if not already done above for GUI→API conversion)
    if (workflowFormat === 'api' && actualSeedMode !== 'original') {
      console.log('Applying seed modification to API workflow...');
      console.log('BEFORE seed modification - checking workflow seeds:');
      for (const [nodeId, node] of Object.entries(executionWorkflow)) {
        if (node.inputs && (node.inputs.seed !== undefined || node.inputs.noise_seed !== undefined)) {
          console.log(`  Node ${nodeId} (${node.class_type}):`, 
            node.inputs.seed !== undefined ? `seed: ${node.inputs.seed}` : '',
            node.inputs.noise_seed !== undefined ? `noise_seed: ${node.inputs.noise_seed}` : ''
          );
        }
      }
      
      executionWorkflow = bentomlService.modifyWorkflowSeeds(executionWorkflow, actualSeedMode);
      
      console.log('AFTER seed modification - checking workflow seeds:');
      for (const [nodeId, node] of Object.entries(executionWorkflow)) {
        if (node.inputs && (node.inputs.seed !== undefined || node.inputs.noise_seed !== undefined)) {
          console.log(`  Node ${nodeId} (${node.class_type}):`,
            node.inputs.seed !== undefined ? `seed: ${node.inputs.seed}` : '',
            node.inputs.noise_seed !== undefined ? `noise_seed: ${node.inputs.noise_seed}` : ''
          );
        }
      }
      console.log('API workflow seed modification completed');
    }

    // Submit to ComfyUI (via BentoML service)
    const result = await bentomlService.submitWorkflow(executionWorkflow, {
      modifySeeds,
      controlAfterGenerate,
      quantity: quantity || 1,
      clientId: req.headers['x-client-id'],
      metadataWorkflow: metadataWorkflow // Include original GUI workflow for metadata embedding
    });

    if (false) { // Debug disabled
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
        usedSchema: true
      }
    });

  } catch (error) {
    console.error('BentoML workflow submission error:', error);
    res.status(500).json({ 
      error: error.message,
      method: 'bentoml'
    });
  }
});

/**
 * Get workflow status from BentoML
 */
router.get('/api/bentoml/status/:workflowId', async (req, res) => {
  try {
    const { workflowId } = req.params;


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


module.exports = router;