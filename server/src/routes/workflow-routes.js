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
        } else {
          // For unmapped nodes, use generic widget names to preserve values
          // This ensures custom node widgets don't get lost during conversion
          const fallbackName = `widget_${index}`;
          apiNode.inputs[fallbackName] = value;
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
            const fallbackInputName = getFallbackInputName(node.type, targetSlot, link[5]);
            if (fallbackInputName) {
              apiNode.inputs[fallbackInputName] = [String(sourceNodeId), sourceSlot];
            } else {
              apiNode.inputs[`input_${targetSlot}`] = [String(sourceNodeId), sourceSlot];
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

  return apiWorkflow;
}

/**
 * Get default ComfyUI URL based on request
 */
function getDefaultComfyUIUrl(req) {
  // Use dynamic config instead of hardcoded URL
  return config.COMFYUI_URL;
}

/**
 * Modify seed values in workflow with random numbers
 */
function modifyWorkflowSeeds(workflow) {
  if (!workflow || typeof workflow !== 'object') return workflow;

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
        obj[key] = generateRandomSeed();
        seedCount++;
      } else if (key === 'inputs' && typeof obj[key] === 'object') {
        modifySeeds(obj[key]);
      } else if (typeof obj[key] === 'object') {
        modifySeeds(obj[key]);
      }
    }
  };

  modifySeeds(workflow);
  if (seedCount > 0) {
    console.log(`Modified ${seedCount} seed values`);
  }

  return workflow;
}

/**
 * Modify control_after_generate values in workflow
 */
function modifyControlAfterGenerate(workflow, controlMode = 'increment') {
  if (!workflow || typeof workflow !== 'object') return workflow;

  let controlCount = 0;

  const modifyControls = (obj, path = '') => {
    if (typeof obj !== 'object' || obj === null) return;

    for (const key in obj) {
      const currentPath = path ? `${path}.${key}` : key;

      if (key === 'control_after_generate') {
        obj[key] = controlMode;
        controlCount++;
      } else if (key === 'inputs' && typeof obj[key] === 'object') {
        modifyControls(obj[key], currentPath);
      } else if (typeof obj[key] === 'object') {
        modifyControls(obj[key], currentPath);
      }
    }
  };

  modifyControls(workflow);
  if (controlCount > 0) {
    console.log(`Modified ${controlCount} control_after_generate values to '${controlMode}'`);
  }

  return workflow;
}

// Queue workflow with pre-edited workflow data (preserves formatting)
router.post('/api/queue-workflow-with-edits', async (req, res) => {
  try {
    const { filename, workflow, modifySeeds, controlAfterGenerate, comfyUrl } = req.body;


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
    if (workflowData.nodes && Array.isArray(workflowData.nodes)) {
      try {
        workflowData = convertGUIToAPI(workflowData);
      } catch (error) {
        console.error('GUI to API conversion failed:', error);
        return res.status(400).json({ error: 'Failed to convert workflow format: ' + error.message });
      }
    }

    if (modifySeeds) {
      workflowData = modifyWorkflowSeeds(workflowData);
    }

    if (controlAfterGenerate) {
      workflowData = modifyControlAfterGenerate(workflowData, controlAfterGenerate);
    }

    const clientId = 'swipe-save-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

    let targetUrl = comfyUrl || getDefaultComfyUIUrl(req);
    
    // Normalize URL to ensure reliable connection
    targetUrl = config.normalizeComfyUIUrl(targetUrl);

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
    console.log('Workflow queued successfully');

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
      workflowData = metadata.prompt;
    } else if (metadata.workflow) {
      workflowData = metadata.workflow;
    } else {
      return res.status(404).json({ error: 'No workflow found in image metadata' });
    }

    // Check workflow format and convert if needed
    if (workflowData.nodes && Array.isArray(workflowData.nodes)) {
      try {
        workflowData = convertGUIToAPI(workflowData);
      } catch (error) {
        console.error('GUI to API conversion failed:', error);
        return res.status(400).json({ error: 'Failed to convert workflow format: ' + error.message });
      }
    }

    if (modifySeeds) {
      workflowData = modifyWorkflowSeeds(workflowData);
    }

    if (controlAfterGenerate) {
      workflowData = modifyControlAfterGenerate(workflowData, controlAfterGenerate);
    }

    const clientId = 'swipe-save-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

    let targetUrl = comfyUrl || getDefaultComfyUIUrl(req);
    
    // Normalize URL to ensure reliable connection
    targetUrl = config.normalizeComfyUIUrl(targetUrl);

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
    console.log('Workflow queued successfully');

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
    let targetUrl = comfyUrl || getDefaultComfyUIUrl(req);
    
    // Normalize URL to ensure reliable connection
    targetUrl = config.normalizeComfyUIUrl(targetUrl);

    const fetch = require('node-fetch');
    console.log(`Fetching ComfyUI queue from: ${targetUrl}/queue`);
    const response = await fetch(`${targetUrl}/queue`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ComfyUI API error: ${response.status} - ${errorText}`);
    }

    const queueData = await response.json();
    console.log(`ComfyUI queue data: ${queueData.queue_running?.length || 0} running, ${queueData.queue_pending?.length || 0} pending`);

    res.json(queueData);

  } catch (error) {
    console.error('Error fetching ComfyUI queue:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get node definition from ComfyUI
router.get('/api/comfyui-node-info/:nodeType', async (req, res) => {
  try {
    const { nodeType } = req.params;
    const { comfyUrl } = req.query;
    const targetUrl = comfyUrl || getDefaultComfyUIUrl(req);

    const fetch = require('node-fetch');
    const response = await fetch(`${targetUrl}/object_info/${encodeURIComponent(nodeType)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ComfyUI node info request failed: ${response.status} - ${errorText}`);
    }

    const nodeInfo = await response.json();
    res.json(nodeInfo);
  } catch (error) {
    console.error('Error fetching node info:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cancel ComfyUI queue items
router.post('/api/comfyui-queue/cancel', async (req, res) => {
  try {
    const { comfyUrl, cancel } = req.body;
    let targetUrl = comfyUrl || getDefaultComfyUIUrl(req);
    
    // Normalize URL to ensure reliable connection
    targetUrl = config.normalizeComfyUIUrl(targetUrl);

    const fetch = require('node-fetch');

    // ComfyUI currently doesn't support individual item deletion by ID
    // The 'clear' parameter clears ALL pending items regardless of the ID provided
    const requestBody = { clear: cancel };

    try {
      response = await fetch(`${targetUrl}/queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
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
    } else {
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        // Non-JSON response, but HTTP status was OK
        result = { success: true, message: 'Queue items cancelled', raw: responseText };
      }
    }

    res.json(result);

  } catch (error) {
    console.error('Error cancelling queue items:', error);
    res.status(500).json({ error: error.message });
  }
});

// Extract workflow from image - Search across all enabled directories
router.get('/api/workflow/:filename', async (req, res) => {
  try {
    const filename = decodeURIComponent(req.params.filename);
    
    // Get enabled directories from multi-directory configuration
    const DirectoryConfigService = require('../services/directory-config-service');
    const directoryConfigService = new DirectoryConfigService();
    const config = directoryConfigService.loadConfig();
    const enabledDirs = directoryConfigService.getEnabledDirectories(config);
    
    let filePath = null;
    let foundDir = null;
    
    // Search for file across all enabled directories
    for (const dir of enabledDirs) {
      const testPath = path.join(dir.path, filename);
      if (fs.existsSync(testPath) && fs.statSync(testPath).isFile()) {
        filePath = testPath;
        foundDir = dir;
        break;
      }
      
      // Also search subdirectories recursively for the filename
      const findFileRecursively = (dirPath, targetFilename) => {
        try {
          const items = fs.readdirSync(dirPath, { withFileTypes: true });
          
          for (const item of items) {
            const fullPath = path.join(dirPath, item.name);
            
            if (item.isFile() && item.name === targetFilename) {
              return fullPath;
            } else if (item.isDirectory()) {
              const found = findFileRecursively(fullPath, targetFilename);
              if (found) return found;
            }
          }
        } catch (err) {
          // Skip inaccessible directories
        }
        return null;
      };
      
      const foundPath = findFileRecursively(dir.path, filename);
      if (foundPath) {
        filePath = foundPath;
        foundDir = dir;
        break;
      }
    }
    
    // Fallback to old method if not found in enabled directories
    if (!filePath) {
      const fallbackPath = path.join(config.OUTPUT_DIR, filename);
      if (fs.existsSync(fallbackPath)) {
        filePath = fallbackPath;
      }
    }

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found in any enabled directory' });
    }

    if (fs.statSync(filePath).isDirectory()) {
      return res.status(400).json({ error: 'Path is a directory, not a file' });
    }

    console.log(`Found workflow file: ${filePath} in directory: ${foundDir ? foundDir.name : 'fallback'}`);
    const metadata = await fileOps.extractComfyMetadata(filePath, filename);

    if (metadata.workflow) {
      try {
        if (typeof metadata.workflow === 'object') {
          res.json(metadata.workflow);
        } else {
          const workflowData = JSON.parse(metadata.workflow);
          res.json(workflowData);
        }
      } catch (parseError) {
        console.error('Error parsing workflow JSON:', parseError.message);
        res.status(500).json({ error: 'Invalid workflow JSON in image metadata', preview: metadata.workflow.substring(0, 100) });
      }
    } else {
      res.status(404).json({ error: 'No workflow found in image metadata' });
    }
  } catch (error) {
    console.error('Error extracting workflow:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Failed to extract workflow from image', details: error.message });
  }
});

module.exports = router;
