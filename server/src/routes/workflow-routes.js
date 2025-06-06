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
 * Modify seed values in workflow with random numbers
 */
function modifyWorkflowSeeds(workflow) {
  if (!workflow || typeof workflow !== 'object') return workflow;

  console.log('Modifying seeds in workflow...');
  let seedCount = 0;

  const generateRandomSeed = () => {
    // Use a conservative range: 1 to 2147483647 (2^31 - 1)
    // This is well within ComfyUI's limits and commonly used for seeds
    return Math.floor(Math.random() * 2147483647) + 1;
  };

  const modifySeeds = (obj) => {
    if (typeof obj !== 'object' || obj === null) return;

    for (const key in obj) {
      if (key === 'seed' && typeof obj[key] === 'number') {
        const oldSeed = obj[key];
        obj[key] = generateRandomSeed();
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

/**
 * Modify control_after_generate values in workflow
 */
function modifyControlAfterGenerate(workflow, controlMode = 'increment') {
  if (!workflow || typeof workflow !== 'object') return workflow;

  console.log(`Modifying control_after_generate values to: ${controlMode}`);
  let controlCount = 0;

  const modifyControls = (obj, path = '') => {
    if (typeof obj !== 'object' || obj === null) return;

    for (const key in obj) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (key === 'control_after_generate') {
        const oldControl = obj[key];
        obj[key] = controlMode;
        console.log(`Modified control_after_generate at ${currentPath}: ${oldControl} -> ${obj[key]}`);
        controlCount++;
      } else if (key === 'inputs' && typeof obj[key] === 'object') {
        modifyControls(obj[key], currentPath);
      } else if (typeof obj[key] === 'object') {
        modifyControls(obj[key], currentPath);
      }
    }
  };

  modifyControls(workflow);
  console.log(`Total control_after_generate values modified: ${controlCount}`);
  
  if (controlCount === 0) {
    console.warn('No control_after_generate fields found in workflow');
  }

  return workflow;
}

// Queue workflow with pre-edited workflow data (preserves formatting)
router.post('/api/queue-workflow-with-edits', async (req, res) => {
  try {
    const { filename, workflow, modifySeeds, controlAfterGenerate, comfyUrl } = req.body;

    console.log('Queue with edits request received:', { filename, hasWorkflow: !!workflow, modifySeeds, controlAfterGenerate, comfyUrl });

    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    if (!workflow) {
      return res.status(400).json({ error: 'Pre-edited workflow is required' });
    }

    // Use the provided workflow directly (preserves formatting and text edits)
    let workflowData = workflow;

    console.log('Using pre-edited workflow data');
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

    if (controlAfterGenerate) {
      workflowData = modifyControlAfterGenerate(workflowData, controlAfterGenerate);
      console.log(`Control after generate set to: ${controlAfterGenerate}`);
    }

    const clientId = 'swipe-save-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

    const targetUrl = comfyUrl || getDefaultComfyUIUrl(req);

    console.log('Queue Debug - Using targetUrl:', targetUrl);

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
    console.log('Workflow with edits queued successfully:', result);

    res.json({ 
      success: true, 
      result: result,
      comfyUrl: targetUrl,
      modifiedSeeds: modifySeeds,
      controlAfterGenerate: controlAfterGenerate,
      preservedFormatting: true
    });

  } catch (error) {
    console.error('Error queueing workflow with edits:', error);
    res.status(500).json({ error: error.message });
  }
});

// Queue workflow in ComfyUI (legacy method)
router.post('/api/queue-workflow', async (req, res) => {
  try {
    const { filename, modifySeeds, controlAfterGenerate, comfyUrl } = req.body;

    console.log('Queue request received:', { filename, modifySeeds, controlAfterGenerate, comfyUrl });

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

    if (controlAfterGenerate) {
      workflowData = modifyControlAfterGenerate(workflowData, controlAfterGenerate);
      console.log(`Control after generate set to: ${controlAfterGenerate}`);
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
      modifiedSeeds: modifySeeds,
      controlAfterGenerate: controlAfterGenerate
    });

  } catch (error) {
    console.error('Error queueing workflow:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get ComfyUI queue status
router.get('/api/comfyui-queue', async (req, res) => {
  try {
    const { comfyUrl } = req.query;
    const targetUrl = comfyUrl || getDefaultComfyUIUrl(req);
    
    console.log('Fetching ComfyUI queue from:', `${targetUrl}/queue`);
    
    const fetch = require('node-fetch');
    const response = await fetch(`${targetUrl}/queue`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ComfyUI API error: ${response.status} - ${errorText}`);
    }
    
    const queueData = await response.json();
    console.log('Queue data fetched successfully');
    
    res.json(queueData);
    
  } catch (error) {
    console.error('Error fetching ComfyUI queue:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cancel ComfyUI queue items
router.post('/api/comfyui-queue/cancel', async (req, res) => {
  try {
    const { comfyUrl, cancel } = req.body;
    const targetUrl = comfyUrl || getDefaultComfyUIUrl(req);
    
    console.log('Cancelling ComfyUI queue items:', cancel);
    console.log('Target URL for cancel:', `${targetUrl}/prompt`);
    
    const fetch = require('node-fetch');
    
    // ComfyUI currently doesn't support individual item deletion by ID
    // The 'clear' parameter clears ALL pending items regardless of the ID provided
    console.log('Note: ComfyUI will clear ALL pending items, not just the specified ID');
    
    const requestBody = { clear: cancel };
    console.log('Using clear method (clears all pending items):', JSON.stringify(requestBody));
    
    try {
      response = await fetch(`${targetUrl}/queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      console.log('Clear response status:', response.status);
    } catch (error) {
      console.error('Error clearing queue:', error);
      throw error;
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ComfyUI API error: ${response.status} - ${errorText}`);
    }
    
    // ComfyUI cancel endpoint may return empty response or non-JSON
    let result;
    const responseText = await response.text();
    
    if (responseText.trim() === '') {
      // Empty response is considered success for ComfyUI cancel
      result = { success: true, message: 'Queue items cancelled' };
      console.log('Queue items cancelled successfully (empty response)');
    } else {
      try {
        result = JSON.parse(responseText);
        console.log('Queue items cancelled successfully:', result);
      } catch (parseError) {
        // Non-JSON response, but HTTP status was OK
        result = { success: true, message: 'Queue items cancelled', raw: responseText };
        console.log('Queue items cancelled successfully (non-JSON response):', responseText);
      }
    }
    
    res.json(result);
    
  } catch (error) {
    console.error('Error cancelling queue items:', error);
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
