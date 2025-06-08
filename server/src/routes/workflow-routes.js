const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const router = express.Router();
const fileOps = require('../fileOperations');
const config = require('../config');

/**
 * Get fallback input name based on node type and data type
 */
function getFallbackInputName(nodeType, slotIndex, dataType) {
  // Common input patterns based on data types
  const dataTypeMapping = {
    'MODEL': 'model',
    'CLIP': 'clip', 
    'VAE': 'vae',
    'CONDITIONING': slotIndex === 0 ? 'positive' : 'negative',
    'LATENT': 'latent_image',
    'IMAGE': 'image',
    'MASK': 'mask',
    'STRING': 'text',
    'CONTROL_NET': 'control_net'
  };

  if (dataType && dataTypeMapping[dataType]) {
    return dataTypeMapping[dataType];
  }

  // Node-specific fallbacks
  const nodeTypePatterns = {
    'KSampler': ['model', 'positive', 'negative', 'latent_image'],
    'VAEDecode': ['samples', 'vae'],
    'VAEEncode': ['pixels', 'vae'],
    'SaveImage': ['images'],
    'PreviewImage': ['images'],
    'LoadImage': ['image', 'upload'],
    'CLIPTextEncode': ['text', 'clip'],
    'ControlNetApply': ['conditioning', 'control_net', 'image'],
    'LoraLoader': ['model', 'clip'],
    'PerturbedAttention': ['model'],
    'ImageScaleBy': ['image']
  };

  const pattern = nodeTypePatterns[nodeType];
  if (pattern && pattern[slotIndex] !== undefined) {
    return pattern[slotIndex];
  }

  return null;
}

/**
 * Convert GUI format workflow to API format for ComfyUI queuing
 */
function convertGUIToAPI(guiWorkflow) {
  if (!guiWorkflow || !guiWorkflow.nodes || !Array.isArray(guiWorkflow.nodes)) {
    throw new Error('Invalid GUI workflow format');
  }

  console.log(`Converting GUI workflow: ${guiWorkflow.nodes.length} nodes, ${guiWorkflow.links ? guiWorkflow.links.length : 0} links`);

  const apiWorkflow = {};

  // Widget-only input mappings - these map widgets_values[index] to input names
  // Only includes inputs that come from widgets (not connections)
  // IMPORTANT: Based on actual GUI widget_values order, not API input_order
  const widgetMappings = {
    'CLIPTextEncode': [], // both text and clip come from connections
    'CheckpointLoaderSimple': ['ckpt_name'],
    'KSampler': ['seed', null, 'steps', 'cfg', 'sampler_name', 'scheduler', 'denoise'], // index 1 is control_after_generate (skip)
    'VAEDecode': [], // both inputs come from connections
    'SaveImage': ['filename_prefix'], // images comes from connection
    'ImpactWildcardEncode': ['wildcard_text', 'populated_text', 'mode', 'Select to add LoRA', 'Select to add Wildcard', 'seed', null], // last is control_after_generate
    'JWStringMultiline': ['text'],
    'EmptyLatentImage': ['width', 'height', 'batch_size'],
    'LoraLoader': ['lora_name', 'strength_model', 'strength_clip'], // model, clip come from connections
    'ControlNetLoader': ['control_net_name'],
    'ControlNetApply': ['strength'], // conditioning, control_net, image come from connections
    'VAEEncode': [], // both inputs come from connections
    'UpscaleModelLoader': ['model_name'],
    'ImageUpscaleWithModel': [], // both inputs come from connections
    'LoadImage': ['image', 'upload'],
    'PreviewImage': [], // images comes from connection
    'PerturbedAttention': ['scale', 'adaptive_scale', 'unet_block', 'unet_block_id', 'sigma_start', 'sigma_end', 'rescale', 'rescale_mode'],
    'ImageScaleBy': ['upscale_method', 'scale_by']
  };

  // Full input mappings for connection handling - maps slot index to input name
  // IMPORTANT: This maps GUI slot numbers to API input names
  const connectionMappings = {
    'CLIPTextEncode': ['text', 'clip'],
    'CheckpointLoaderSimple': [],
    'KSampler': ['model', 'positive', 'negative', 'latent_image'],
    'VAEDecode': ['samples', 'vae'],
    'VAEEncode': ['pixels', 'vae'],
    'SaveImage': ['images'],
    'PreviewImage': ['images'],
    'LoadImage': [],
    'ImpactWildcardEncode': ['model', 'clip'],
    'JWStringMultiline': [],
    'EmptyLatentImage': [],
    'LoraLoader': ['model', 'clip'],
    'ControlNetLoader': [],
    'ControlNetApply': ['conditioning', 'control_net', 'image'],
    'UpscaleModelLoader': [],
    'ImageUpscaleWithModel': ['upscale_model', 'image'],
    'LatentUpscale': ['samples'],
    'LatentUpscaleBy': ['samples'],
    'ImageScale': ['image'],
    'ImageScaleBy': ['image'],
    'CLIPSetLastLayer': ['clip'],
    'ConditioningCombine': ['conditioning_1', 'conditioning_2'],
    'ConditioningConcat': ['conditioning_1', 'conditioning_2'],
    'ConditioningSetArea': ['conditioning'],
    'ConditioningSetAreaPercentage': ['conditioning'],
    'ConditioningSetMask': ['conditioning', 'mask'],
    'ControlNetApplyAdvanced': ['positive', 'negative', 'control_net', 'image'],
    'FreeU': ['model'],
    'FreeU_V2': ['model'],
    'ModelMergeSimple': ['model1', 'model2'],
    'CLIPMergeSimple': ['clip1', 'clip2'],
    'PerturbedAttention': ['model'], // model comes from connection, rest are widgets
    'ImageScaleBy': ['image'] // image comes from connection, rest are widgets
  };

  for (const node of guiWorkflow.nodes) {
    if (!node || !node.id || !node.type) {
      continue;
    }

    const apiNode = {
      class_type: node.type,
      inputs: {}
    };

    // NOTE: Layout data (pos, size) is not preserved as ComfyUI API
    // does not accept position data during workflow execution

    // Add widget values as inputs using widget-specific mappings
    if (node.widgets_values && Array.isArray(node.widgets_values)) {
      const widgetNames = widgetMappings[node.type] || [];

      node.widgets_values.forEach((value, index) => {
        const inputName = widgetNames[index];
        if (inputName && inputName !== null) {
          apiNode.inputs[inputName] = value;
        } else if (inputName !== null) {
          console.warn(`Missing widget mapping for ${node.type} widget ${index} (value: ${value})`);
        }
      });
    }

    // Add node connections from links
    if (guiWorkflow.links && Array.isArray(guiWorkflow.links)) {
      for (const link of guiWorkflow.links) {
        if (link && Array.isArray(link) && link.length >= 6 && link[3] === node.id) {
          // link format: [link_id, source_node_id, source_slot, target_node_id, target_slot, data_type]
          const sourceNodeId = link[1];
          const sourceSlot = link[2];
          const targetSlot = link[4];


          // Get input name for target slot
          const connectionNames = connectionMappings[node.type] || [];
          const inputName = connectionNames[targetSlot];

          if (inputName && inputName !== null) {
            // Special handling for CLIPTextEncode to fix connection type mismatches
            if (node.type === 'CLIPTextEncode') {
              // Detect the actual data type and route accordingly
              if (link[5] === 'CLIP') {
                apiNode.inputs['clip'] = [String(sourceNodeId), sourceSlot];
              } else if (link[5] === 'STRING') {
                apiNode.inputs['text'] = [String(sourceNodeId), sourceSlot];
              } else {
                // Fallback to slot-based mapping
                apiNode.inputs[inputName] = [String(sourceNodeId), sourceSlot];
              }
            } else {
              apiNode.inputs[inputName] = [String(sourceNodeId), sourceSlot];
            }
          } else if (inputName === null) {
            // Explicitly ignored slot (widget input, not connection)
          } else {
            // Fallback: try to determine input name from ComfyUI convention or use generic name
            console.warn(`Unknown connection mapping for ${node.type} slot ${targetSlot}, attempting fallback`);

            // Try to get input name from the original workflow analysis
            const fallbackInputName = getFallbackInputName(node.type, targetSlot, link[5]);
            if (fallbackInputName) {
              apiNode.inputs[fallbackInputName] = [String(sourceNodeId), sourceSlot];
            } else {
              apiNode.inputs[`input_${targetSlot}`] = [String(sourceNodeId), sourceSlot];
              console.warn(`Using generic mapping input_${targetSlot} for ${node.type} slot ${targetSlot}`);
            }
          }
        }
      }
    }

    // Handle special cases for nodes that need connections but might not have widget mappings
    if (node.type === 'SaveImage' && !apiNode.inputs.images) {
      // SaveImage requires 'images' connection - check if it should come from a link
      console.warn(`SaveImage node ${node.id} missing required 'images' input`);
    }

    if (node.type === 'PreviewImage' && !apiNode.inputs.images) {
      // PreviewImage requires 'images' connection
      console.warn(`PreviewImage node ${node.id} missing required 'images' input`);
    }

    apiWorkflow[String(node.id)] = apiNode;
  }

  const connectionCount = Object.values(apiWorkflow).reduce((total, node) => total + Object.keys(node.inputs).length, 0);
  console.log(`Converted ${Object.keys(apiWorkflow).length} nodes with ${connectionCount} total connections`);

  return apiWorkflow;
}

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

    // Check workflow format and convert if needed
    const firstValue = workflowData[Object.keys(workflowData)[0]];
    if (firstValue && typeof firstValue === 'object' && firstValue.class_type) {
      console.log('Queuing API format workflow');
    } else if (workflowData.nodes && Array.isArray(workflowData.nodes)) {
      console.log('Converting GUI format workflow to API format');
      try {
        workflowData = convertGUIToAPI(workflowData);
      } catch (error) {
        console.error('GUI to API conversion failed:', error);
        return res.status(400).json({ error: 'Failed to convert workflow format: ' + error.message });
      }
    } else {
      console.warn('Unknown workflow format, attempting to queue as-is');
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

    // Check workflow format and convert if needed
    const firstValue = workflowData[Object.keys(workflowData)[0]];
    if (firstValue && typeof firstValue === 'object' && firstValue.class_type) {
      console.log('Queuing API format workflow from PNG metadata');
    } else if (workflowData.nodes && Array.isArray(workflowData.nodes)) {
      console.log('Converting GUI format workflow from PNG metadata');
      try {
        workflowData = convertGUIToAPI(workflowData);
      } catch (error) {
        console.error('GUI to API conversion failed:', error);
        return res.status(400).json({ error: 'Failed to convert workflow format: ' + error.message });
      }
    } else {
      console.warn('Unknown workflow format in PNG metadata');
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

    console.log('Queuing workflow to:', targetUrl);

    const fetch = require('node-fetch');
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
