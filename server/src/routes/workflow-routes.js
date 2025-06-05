const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const router = express.Router();
const fileOps = require('../fileOperations');
const config = require('../config');

/**
 * Get default ComfyUI URL based on request
 */
function getDefaultComfyUIUrl(req) {
  const protocol = req.protocol || 'http';
  const hostname = req.get('host').split(':')[0];
  return `${protocol}://${hostname}:8188`;
}

/**
 * Modify seed values in workflow by appending zero
 */
function modifyWorkflowSeeds(workflow) {
  if (!workflow || typeof workflow !== 'object') return workflow;

  console.log('Modifying seeds in workflow...');
  let seedCount = 0;

  const modifySeeds = (obj) => {
    if (typeof obj !== 'object' || obj === null) return;

    for (const key in obj) {
      if (key === 'seed' && typeof obj[key] === 'number') {
        const oldSeed = obj[key];
        obj[key] = parseInt(obj[key].toString() + '0');
        console.log(`Modified seed: ${oldSeed} -> ${obj[key]}`);
        seedCount++;
      } else if (key === 'inputs' && typeof obj[key] === 'object') {
        modifySeeds(obj[key]);
      } else if (typeof obj[key] === 'object') {
        modifySeeds(obj[key]);
      }
    }
  };

  modifySeeds(workflow);
  console.log(`Total seeds modified: ${seedCount}`);

  return workflow;
}

// Queue workflow in ComfyUI
router.post('/api/queue-workflow', async (req, res) => {
  try {
    const { filename, modifySeeds, comfyUrl } = req.body;

    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    const filePath = path.join(config.OUTPUT_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const metadata = await fileOps.extractComfyMetadata(filePath, filename);

    let workflowData;
    if (metadata.prompt) {
      console.log('Using prompt (API format) for queuing');
      workflowData = metadata.prompt;
    } else if (metadata.workflow) {
      console.log('Using workflow (GUI format) for queuing');
      workflowData = metadata.workflow;
    } else {
      return res.status(404).json({ error: 'No workflow found in image metadata' });
    }

    console.log('Workflow type:', typeof workflowData);
    console.log('Workflow keys:', Object.keys(workflowData).slice(0, 10));

    const firstKey = Object.keys(workflowData)[0];
    const firstValue = workflowData[firstKey];
    console.log('First key:', firstKey, 'First value type:', typeof firstValue);
    if (firstValue && typeof firstValue === 'object' && firstValue.class_type) {
      console.log('Detected API format workflow');
    } else {
      console.log('Detected GUI format workflow - this may cause issues');
    }

    if (modifySeeds) {
      workflowData = modifyWorkflowSeeds(workflowData);
      console.log('Seeds modified for queuing');
    }

    const clientId = 'swipe-save-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

    const targetUrl = comfyUrl || getDefaultComfyUIUrl(req);

    console.log('Queue Debug - Received comfyUrl:', comfyUrl);
    console.log('Queue Debug - Using targetUrl:', targetUrl);
    console.log('Queue Debug - Request hostname:', req.get('host'));

    const fetch = require('node-fetch');
    console.log('Queue Debug - Attempting to connect to:', `${targetUrl}/prompt`);
    const response = await fetch(`${targetUrl}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: workflowData,
        client_id: clientId
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ComfyUI API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Workflow queued successfully:', result);

    res.json({ 
      success: true, 
      result: result,
      comfyUrl: targetUrl,
      modifiedSeeds: modifySeeds
    });

  } catch (error) {
    console.error('Error queueing workflow:', error);
    res.status(500).json({ error: error.message });
  }
});

// Extract workflow from image
router.get('/api/workflow/:filename', async (req, res) => {
  try {
    const filename = decodeURIComponent(req.params.filename);
    const filePath = path.join(config.OUTPUT_DIR, filename);

    console.log(`Extracting workflow from: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (fs.statSync(filePath).isDirectory()) {
      return res.status(400).json({ error: 'Path is a directory, not a file' });
    }

    const metadata = await fileOps.extractComfyMetadata(filePath, filename);
    console.log(`Metadata extracted:`, Object.keys(metadata));

    if (metadata.workflow) {
      try {
        if (typeof metadata.workflow === 'object') {
          res.json(metadata.workflow);
        } else {
          console.log(`Attempting to parse workflow string: ${metadata.workflow.substring(0, 100)}...`);
          const workflowData = JSON.parse(metadata.workflow);
          res.json(workflowData);
        }
      } catch (parseError) {
        console.error('Error parsing workflow JSON:', parseError.message);
        console.error('First 200 chars of workflow data:', metadata.workflow.substring(0, 200));
        res.status(500).json({ error: 'Invalid workflow JSON in image metadata', preview: metadata.workflow.substring(0, 100) });
      }
    } else {
      console.log(`Available metadata keys: ${Object.keys(metadata)}`);
      res.status(404).json({ error: 'No workflow found in image metadata' });
    }
  } catch (error) {
    console.error('Error extracting workflow:', error);
    res.status(500).json({ error: 'Failed to extract workflow from image' });
  }
});

module.exports = router;
