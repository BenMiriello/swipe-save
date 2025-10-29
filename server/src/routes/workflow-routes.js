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
async function convertGUIToAPI(guiWorkflow) {
  if (!guiWorkflow || !guiWorkflow.nodes || !Array.isArray(guiWorkflow.nodes)) {
    throw new Error('Invalid GUI workflow format');
  }
  
  // Get available nodes from ComfyUI to validate node types
  let availableNodes = null;
  try {
    const fetch = require('node-fetch');
    const response = await fetch('http://127.0.0.1:8188/object_info');
    const objectInfo = await response.json();
    availableNodes = new Set(Object.keys(objectInfo));
    console.log(`Loaded ${availableNodes.size} available node types from ComfyUI`);
  } catch (error) {
    console.warn('Could not fetch ComfyUI object_info, proceeding without node validation:', error.message);
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
    'ImageScaleBy': ['upscale_method', 'scale_by'],
    'VHS_VideoCombine': ['frame_rate', 'loop_count', 'filename_prefix', 'format', 'pix_fmt', 'bitrate', 'megabit', 'save_metadata', 'pingpong', 'save_output', null], // last is videopreview (complex object, skip)
    'WanVideoDecode': ['enable_vae_tiling', 'tile_x', 'tile_y', 'tile_stride_x', 'tile_stride_y', 'normalization'],
    'WanVideoVAELoader': ['model_name', 'precision'],
    'WanVideoSampler': [null, 'cfg', 'shift', 'seed', null, 'force_offload', 'scheduler', 'riflex_freq_index', 'denoise_strength', 'batched_cfg', 'rope_function', 'start_step', 'end_step', 'add_noise_to_samples'], // index 0 can be steps (widget) or connection, index 4 is control_after_generate (skip)
    'WanVideoEmptyEmbeds': [null, null, 'width', 'height', 'num_frames'], // first 2 are connections, last 3 come from widgets but map to connections
    'WanVideoSetBlockSwap': [], // all inputs are connections, not widgets  
    'WanVideoTextEncodeCached': ['model_name', 'precision', 'positive_prompt', 'negative_prompt', 'quantization', 'use_disk_cache', 'device'],
    'WanVideoBlockSwap': ['blocks_to_swap', 'offload_img_emb', 'offload_txt_emb', 'use_non_blocking', 'vace_blocks_to_swap', 'prefetch_blocks', 'block_swap_debug'],
    'WanVideoModelLoader': ['model', 'base_precision', 'quantization', 'load_device', 'attention_mode'],
    'WanVideoContextOptions': ['context_schedule', 'context_frames', 'context_stride', 'context_overlap', 'freenoise', 'verbose', 'fuse_method'],
    'WanVideoLoraSelectMulti': ['lora_0', 'strength_0', 'lora_1', 'strength_1', 'lora_2', 'strength_2', 'lora_3', 'strength_3', 'lora_4', 'strength_4', 'low_mem_load', 'merge_loras'],
    'BasicScheduler': ['scheduler', 'steps', 'denoise'],
    'ttN text': ['text'],
    'easy int': ['value'],
    'INTConstant': ['value'],
    'StringToFloatList': ['string'],
    'DummyComfyWanModelObject': ['shift'],
    'CreateCFGScheduleFloatList': [null, 'cfg_scale_end', null, null, null, null], // mismatched widgets
    'Width and height from aspect ratio 🪴': ['aspect_ratio', 'target_size', 'multiple_of'],
    'WanVideoTorchCompileSettings': ['backend', 'fullgraph', 'mode', 'dynamic', 'dynamo_cache_size_limit', 'compile_transformer_blocks_only', 'dynamo_recompile_limit']
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
    'ImageScaleBy': ['image'], // image comes from connection, rest are widgets
    'VHS_VideoCombine': ['images', 'audio', 'meta_batch', 'vae'], // images connection is required, others optional
    'WanVideoDecode': ['vae', 'samples'], // both connections required
    'WanVideoVAELoader': ['compile_args'], // 1 connection
    'WanVideoSampler': ['model', 'image_embeds', 'text_embeds', 'samples', 'feta_args', 'context_options', 'cache_args', 'flowedit_args', 'slg_args', 'loop_args', 'experimental_args', 'sigmas', 'unianimate_poses', 'fantasytalking_embeds', 'uni3c_embeds', 'multitalk_embeds', 'freeinit_args', 'steps', 'end_step'], // many connections, slots 17=steps, 18=end_step
    'WanVideoEmptyEmbeds': ['control_embeds', 'extra_latents', 'width', 'height', 'num_frames'], // width, height, num_frames come from widgets but appear as connections here
    'WanVideoSetBlockSwap': ['model'], // 1 connection
    'WanVideoTextEncodeCached': ['extender_args'], // 1 optional connection
    'WanVideoBlockSwap': [], // no connections, all widgets
    'WanVideoModelLoader': ['compile_args', 'block_swap_args', 'lora'], // first 3 connections, more optional
    'WanVideoContextOptions': ['reference_latent', 'vae'], // 2 optional connections
    'WanVideoLoraSelectMulti': ['prev_lora', 'blocks'], // 2 connections
    'BasicScheduler': ['model'], // 1 connection
    'CreateCFGScheduleFloatList': ['steps'] // 1 connection
  };

  for (const node of guiWorkflow.nodes) {
    if (!node || !node.id || !node.type) {
      continue;
    }

    // Skip bypassed/disabled nodes (mode 2 = muted, mode 4 = never execute)
    // ComfyUI API doesn't support bypassed nodes, so we exclude them from execution
    if (node.mode === 2 || node.mode === 4) {
      console.log(`Excluding bypassed node ${node.id} (${node.type}) from API workflow`);
      continue;
    }

    // Skip nodes that don't exist in ComfyUI (dynamic validation)
    if (availableNodes && !availableNodes.has(node.type)) {
      console.log(`Excluding unknown node ${node.id} (${node.type}) - not available in ComfyUI`);
      continue;
    }
    
    // Skip known problematic nodes (fallback for when object_info is not available)
    const problematicNodes = ['SetNode', 'Note', 'Fast Groups Bypasser (rgthree)', 'PrimitiveNode'];
    if (!availableNodes && problematicNodes.includes(node.type)) {
      console.log(`Excluding problematic node ${node.id} (${node.type}) from API workflow`);
      continue;
    }

    const apiNode = {
      class_type: node.type,
      inputs: {}
    };
    
    // Preserve node properties for custom nodes that need them (like rgthree nodes)
    if (node.properties && Object.keys(node.properties).length > 0) {
      // Filter out internal/UI-only properties
      const filteredProperties = {};
      for (const [key, value] of Object.entries(node.properties)) {
        // Skip UI-specific properties that shouldn't be sent to ComfyUI
        if (!key.startsWith('ue_') && key !== 'version') {
          filteredProperties[key] = value;
        }
      }
      if (Object.keys(filteredProperties).length > 0) {
        apiNode.inputs = { ...apiNode.inputs, ...filteredProperties };
      }
    }

    // NOTE: Layout data (pos, size) is not preserved as ComfyUI API
    // does not accept position data during workflow execution

    // Add widget values as inputs using widget-specific mappings
    if (node.widgets_values) {
      if (Array.isArray(node.widgets_values)) {
        // Handle array format widget values (most common)
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
      } else if (typeof node.widgets_values === 'object' && node.widgets_values !== null) {
        // Handle object format widget values (rare but occurs in some custom nodes like VHS_VideoCombine)
        // In this format, property names are already the correct input names
        for (const [key, value] of Object.entries(node.widgets_values)) {
          // Skip complex objects that shouldn't be sent to ComfyUI
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            continue;
          }
          apiNode.inputs[key] = value;
        }
      }
    }

    // Special handling for nodes where widgets map to connection-style inputs
    if (node.type === 'WanVideoEmptyEmbeds' && Array.isArray(node.widgets_values) && node.widgets_values.length >= 3) {
      // For WanVideoEmptyEmbeds, widgets [0,1,2] = [width, height, num_frames] should be direct inputs
      apiNode.inputs['width'] = node.widgets_values[0];
      apiNode.inputs['height'] = node.widgets_values[1]; 
      apiNode.inputs['num_frames'] = node.widgets_values[2];
    }

    // Special handling for WanVideoSampler steps input (can be widget or connection)
    if (node.type === 'WanVideoSampler' && Array.isArray(node.widgets_values) && node.widgets_values.length > 0) {
      // Check if steps input will come from a connection (look for incoming link to slot 17 based on our connection mapping)
      const hasStepsConnection = guiWorkflow.links && guiWorkflow.links.some(link => 
        link && link[3] === node.id && link[4] === 17 // target_node_id === node.id && target_slot === 17
      );
      
      if (!hasStepsConnection) {
        // No connection for steps, use widget value from index 0
        apiNode.inputs['steps'] = node.widgets_values[0];
        // Remove the generic widget_0 since we're using it as steps
        delete apiNode.inputs['widget_0'];
      }
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

  // Clean up connections that reference excluded nodes
  const includedNodeIds = new Set(Object.keys(apiWorkflow));
  for (const [nodeId, node] of Object.entries(apiWorkflow)) {
    for (const [inputName, inputValue] of Object.entries(node.inputs)) {
      if (Array.isArray(inputValue) && inputValue.length === 2) {
        const referencedNodeId = String(inputValue[0]);
        if (!includedNodeIds.has(referencedNodeId)) {
          console.log(`Removing connection from node ${nodeId} input '${inputName}' to excluded node ${referencedNodeId}`);
          delete node.inputs[inputName];
        }
      }
    }
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
    
    // Simple file search in common ComfyUI directories
    let filePath = null;
    let foundDir = null;
    
    const searchDirs = [
      '/home/simonsays/Documents/ComfyUI/output',
      '/home/simonsays/Documents/Data/Images/Text2Img',
      '/home/simonsays/Documents/Data/Images/Text2Img/WAN/I2V'
    ];
    
    console.log(`Searching for ${filename} in ${searchDirs.length} directories`);
    
    for (const dir of searchDirs) {
      const testPath = path.join(dir, filename);
      if (fs.existsSync(testPath)) {
        filePath = testPath;
        console.log(`Found ${filename} at ${testPath}`);
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

    // Handle both workflow (GUI format) and prompt (API format) data
    let workflowData = null;
    if (metadata.prompt) {
      workflowData = metadata.prompt;
      console.log(`Using prompt data as workflow (API format) for ${filename}`);
    } else if (metadata.workflow) {
      workflowData = metadata.workflow;
      console.log(`Using workflow data (GUI format) for ${filename}`);
    }
    
    if (workflowData) {
      try {
        if (typeof workflowData === 'object') {
          res.json(workflowData);
        } else {
          const parsedWorkflow = JSON.parse(workflowData);
          res.json(parsedWorkflow);
        }
      } catch (parseError) {
        console.error('Error parsing workflow JSON:', parseError.message);
        res.status(500).json({ error: 'Invalid workflow JSON in image metadata', preview: workflowData.toString().substring(0, 100) });
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
module.exports.convertGUIToAPI = convertGUIToAPI;
module.exports.modifyWorkflowSeeds = modifyWorkflowSeeds;
module.exports.modifyControlAfterGenerate = modifyControlAfterGenerate;
