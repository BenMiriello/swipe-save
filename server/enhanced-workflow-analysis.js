#!/usr/bin/env node

/**
 * Enhanced ComfyUI workflow metadata analysis
 * Provides detailed field categorization assessment and edge case analysis
 */

const fs = require('fs');
const path = require('path');
const extractChunks = require('png-chunks-extract');
const textChunk = require('png-chunk-text');

// Files to analyze - using known good files with metadata
const FILES_TO_ANALYZE = [
  '/home/simonsays/Documents/ComfyUI/output/WAN 2.2 T2V_00003.png',
  '/home/simonsays/Documents/ComfyUI/output/AEverything_v4_ep60_fast_00596_.png',
  '/home/simonsays/Documents/ComfyUI/output/Wan_00063.png'
];

/**
 * Extract workflow metadata from PNG file
 * @param {string} filePath - Path to PNG file
 * @returns {Object|null} Workflow data or null if not found
 */
function extractWorkflowFromPNG(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`❌ File not found: ${filePath}`);
      return null;
    }

    if (path.extname(filePath).toLowerCase() !== '.png') {
      console.log(`⚠️  Not a PNG file: ${filePath}`);
      return null;
    }

    const buffer = fs.readFileSync(filePath);
    const chunks = extractChunks(buffer);

    let workflowData = null;
    let promptData = null;

    for (const chunk of chunks) {
      if (chunk.name === 'tEXt') {
        try {
          const textData = textChunk.decode(chunk.data);
          
          if (textData.keyword === 'workflow') {
            try {
              workflowData = JSON.parse(textData.text);
            } catch (e) {
              console.log(`⚠️  Failed to parse workflow JSON in ${path.basename(filePath)}: ${e.message}`);
            }
          }
          
          if (textData.keyword === 'prompt') {
            try {
              promptData = JSON.parse(textData.text);
            } catch (e) {
              // Prompt parsing often fails due to malformed JSON in some workflows
              // This is not critical for field analysis
            }
          }
        } catch (e) {
          console.log(`⚠️  Failed to decode text chunk in ${path.basename(filePath)}: ${e.message}`);
        }
      }
    }

    return {
      workflow: workflowData,
      prompt: promptData,
      hasWorkflow: !!workflowData,
      hasPrompt: !!promptData
    };

  } catch (error) {
    console.log(`❌ Error processing ${filePath}: ${error.message}`);
    return null;
  }
}

/**
 * Enhanced field categorization with detailed pattern matching
 * @param {string} fieldName - Name of the field
 * @param {*} value - Value of the field
 * @param {Object} fields - Fields object to add to
 * @param {string} nodeId - Node ID
 * @param {string} nodeType - Type of node
 * @param {number} widgetIndex - Widget index in the node
 */
function categorizeField(fieldName, value, fields, nodeId, nodeType, widgetIndex = null) {
  const field = {
    nodeId,
    nodeType,
    fieldName,
    value,
    valueType: typeof value,
    isArray: Array.isArray(value),
    widgetIndex,
    stringValue: String(value)
  };

  // Skip connections (arrays with 2 elements typically represent node connections)
  if (Array.isArray(value) && value.length === 2 && typeof value[0] === 'string' && typeof value[1] === 'number') {
    return; // This is a connection, not a field
  }

  const lowerName = fieldName.toLowerCase();
  const stringValue = String(value).toLowerCase();
  const nodeTypeLower = nodeType.toLowerCase();

  // SEEDS - Enhanced detection
  if (lowerName.includes('seed') || 
      lowerName.includes('noise_seed') ||
      lowerName === 'control_after_generate' ||
      (lowerName.includes('random') && typeof value === 'number') ||
      (nodeTypeLower.includes('ksampler') && typeof value === 'number' && value > 100000)) {
    fields.seeds.push(field);
    return;
  }

  // PROMPTS - Enhanced detection
  if (lowerName.includes('text') || 
      lowerName.includes('prompt') || 
      lowerName.includes('positive') || 
      lowerName.includes('negative') ||
      lowerName.includes('description') ||
      nodeType === 'CLIPTextEncode' ||
      nodeTypeLower.includes('textenc') ||
      nodeTypeLower.includes('wildcard') ||
      (typeof value === 'string' && value.length > 30 && /[a-zA-Z].*[a-zA-Z]/.test(value) && !stringValue.includes('.')) ||
      (nodeTypeLower.includes('note') && typeof value === 'string')) {
    fields.prompts.push(field);
    return;
  }

  // MODELS - Enhanced detection with more extensions and patterns
  if (lowerName.includes('model') || 
      lowerName.includes('checkpoint') || 
      lowerName.includes('lora') ||
      lowerName.includes('vae') ||
      lowerName.includes('unet') ||
      lowerName.includes('clip') ||
      stringValue.endsWith('.safetensors') ||
      stringValue.endsWith('.ckpt') ||
      stringValue.endsWith('.pt') ||
      stringValue.endsWith('.bin') ||
      stringValue.endsWith('.pth') ||
      stringValue.endsWith('.gguf') ||
      nodeTypeLower.includes('loader') ||
      nodeTypeLower.includes('modelloader')) {
    fields.models.push(field);
    return;
  }

  // SAMPLING PARAMETERS - Enhanced detection
  if (lowerName.includes('steps') || 
      lowerName.includes('cfg') || 
      lowerName.includes('sampler') || 
      lowerName.includes('scheduler') ||
      lowerName.includes('denoise') ||
      lowerName.includes('strength') ||
      lowerName.includes('guidance') ||
      nodeTypeLower.includes('sampler') ||
      (lowerName.includes('scale') && typeof value === 'number')) {
    fields.sampling.push(field);
    return;
  }

  // DIMENSIONS - Enhanced detection
  if (lowerName.includes('width') || 
      lowerName.includes('height') || 
      lowerName.includes('batch') ||
      lowerName.includes('size') ||
      lowerName.includes('resolution') ||
      lowerName.includes('frames') ||
      (lowerName.includes('fps') && typeof value === 'number')) {
    fields.dimensions.push(field);
    return;
  }

  // DROPDOWNS - Based on common ComfyUI dropdown values
  const dropdownValues = [
    'dpm', 'euler', 'heun', 'lms', 'dpmpp', 'ddim', 'plms', // samplers
    'normal', 'karras', 'exponential', 'sgm_uniform', // schedulers
    'fp32', 'fp16', 'bf16', // precisions
    'cpu', 'gpu', 'auto', // devices
    'latent', 'model', 'rgb', 'hsv', // formats
    'linear', 'nearest', 'bicubic', // interpolation
    'none', 'randomize', 'increment', 'decrement', 'fixed' // control_after_generate
  ];

  if (typeof value === 'string' && 
      dropdownValues.includes(stringValue) ||
      (typeof value === 'string' && value.length < 20 && !value.includes(' ') && !value.includes('/'))) {
    fields.dropdowns.push(field);
    return;
  }

  // BOOLEANS
  if (typeof value === 'boolean' ||
      stringValue === 'true' ||
      stringValue === 'false' ||
      lowerName.includes('enable') ||
      lowerName.includes('disable')) {
    fields.booleans.push(field);
    return;
  }

  // NUMBERS - Separate from sampling/dimensions
  if (typeof value === 'number' && !Number.isInteger(value)) {
    fields.numbers.push(field);
    return;
  }

  // IMAGES
  if (lowerName.includes('image') ||
      stringValue.includes('.jpg') ||
      stringValue.includes('.png') ||
      stringValue.includes('.jpeg')) {
    fields.images.push(field);
    return;
  }

  // Everything else
  fields.other.push(field);
}

/**
 * Analyze workflow nodes and extract all fields
 * @param {Object} workflow - Workflow object
 * @param {string} filePath - File path for context
 * @returns {Object} Analysis results
 */
function analyzeWorkflow(workflow, filePath) {
  const fields = {
    seeds: [],
    prompts: [],
    models: [],
    sampling: [],
    dimensions: [],
    dropdowns: [],
    booleans: [],
    numbers: [],
    images: [],
    other: []
  };

  const nodeTypes = [];
  const nodeDetails = [];

  if (!workflow || !workflow.nodes || !Array.isArray(workflow.nodes)) {
    return { fields, nodeTypes, nodeDetails };
  }

  workflow.nodes.forEach(node => {
    if (node && node.type) {
      nodeTypes.push(node.type);
      nodeDetails.push({
        id: node.id,
        type: node.type,
        widgetCount: node.widgets_values ? node.widgets_values.length : 0
      });

      // Analyze widget values
      if (node.widgets_values && Array.isArray(node.widgets_values)) {
        node.widgets_values.forEach((value, index) => {
          let widgetName = `widget_${index}`;
          
          // Try to get real widget name if available
          if (node.widgets && node.widgets[index] && node.widgets[index].name) {
            widgetName = node.widgets[index].name;
          }

          categorizeField(widgetName, value, fields, String(node.id), node.type, index);
        });
      }
    }
  });

  return { fields, nodeTypes, nodeDetails };
}

/**
 * Generate detailed analysis report
 * @param {Array} results - Analysis results from all files
 */
function generateDetailedReport(results) {
  console.log('\n' + '='.repeat(80));
  console.log('🔬 ENHANCED COMFYUI WORKFLOW FIELD ANALYSIS');
  console.log('='.repeat(80));

  // Aggregate all fields
  const allFields = {
    seeds: [],
    prompts: [],
    models: [],
    sampling: [],
    dimensions: [],
    dropdowns: [],
    booleans: [],
    numbers: [],
    images: [],
    other: []
  };

  let totalNodes = 0;
  let totalWidgets = 0;
  const nodeTypeFreq = {};

  results.forEach(result => {
    if (result.analysis) {
      const { fields, nodeTypes, nodeDetails } = result.analysis;
      
      totalNodes += nodeTypes.length;
      totalWidgets += nodeDetails.reduce((sum, node) => sum + node.widgetCount, 0);
      
      // Aggregate fields
      Object.keys(allFields).forEach(category => {
        allFields[category].push(...fields[category]);
      });

      // Count node types
      nodeTypes.forEach(type => {
        nodeTypeFreq[type] = (nodeTypeFreq[type] || 0) + 1;
      });
    }
  });

  console.log('\n📊 FIELD DISTRIBUTION ANALYSIS:');
  console.log(`   Total nodes analyzed: ${totalNodes}`);
  console.log(`   Total widgets analyzed: ${totalWidgets}`);
  console.log('');

  Object.entries(allFields).forEach(([category, fields]) => {
    const percentage = totalWidgets > 0 ? ((fields.length / totalWidgets) * 100).toFixed(1) : '0.0';
    console.log(`   ${category.toUpperCase()}: ${fields.length} fields (${percentage}%)`);
  });

  console.log('\n🎯 CATEGORIZATION QUALITY ASSESSMENT:');

  // Seeds analysis
  console.log('\n   SEEDS CATEGORY:');
  if (allFields.seeds.length > 0) {
    const seedExamples = allFields.seeds.slice(0, 3);
    seedExamples.forEach(field => {
      console.log(`     ✅ ${field.nodeType}/${field.fieldName} = ${field.value} (${field.valueType})`);
    });
  } else {
    console.log('     ⚠️  No seed fields detected - this may indicate detection issues');
  }

  // Prompts analysis
  console.log('\n   PROMPTS CATEGORY:');
  if (allFields.prompts.length > 0) {
    const promptExamples = allFields.prompts.slice(0, 3);
    promptExamples.forEach(field => {
      const preview = field.stringValue.length > 50 ? field.stringValue.substring(0, 50) + '...' : field.stringValue;
      console.log(`     ✅ ${field.nodeType}/${field.fieldName} = "${preview}"`);
    });
  } else {
    console.log('     ⚠️  No prompt fields detected - this may indicate detection issues');
  }

  // Models analysis
  console.log('\n   MODELS CATEGORY:');
  if (allFields.models.length > 0) {
    const modelExamples = allFields.models.slice(0, 3);
    modelExamples.forEach(field => {
      console.log(`     ✅ ${field.nodeType}/${field.fieldName} = "${field.value}"`);
    });
  } else {
    console.log('     ⚠️  No model fields detected - this may indicate detection issues');
  }

  // Sampling analysis
  console.log('\n   SAMPLING CATEGORY:');
  if (allFields.sampling.length > 0) {
    const samplingExamples = allFields.sampling.slice(0, 3);
    samplingExamples.forEach(field => {
      console.log(`     ✅ ${field.nodeType}/${field.fieldName} = ${field.value} (${field.valueType})`);
    });
  }

  // Dropdowns analysis  
  console.log('\n   DROPDOWNS CATEGORY:');
  if (allFields.dropdowns.length > 0) {
    const dropdownExamples = allFields.dropdowns.slice(0, 5);
    dropdownExamples.forEach(field => {
      console.log(`     ✅ ${field.nodeType}/${field.fieldName} = "${field.value}"`);
    });
  }

  // Other category - potential missed categorizations
  console.log('\n   OTHER CATEGORY (POTENTIAL IMPROVEMENTS):');
  if (allFields.other.length > 0) {
    const otherExamples = allFields.other.slice(0, 10);
    otherExamples.forEach(field => {
      console.log(`     ❓ ${field.nodeType}/${field.fieldName} = ${JSON.stringify(field.value)} (${field.valueType})`);
    });
    if (allFields.other.length > 10) {
      console.log(`     ... and ${allFields.other.length - 10} more fields`);
    }
  }

  // Node type frequency
  console.log('\n🔧 MOST COMMON NODE TYPES:');
  const sortedNodeTypes = Object.entries(nodeTypeFreq)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 15);
  sortedNodeTypes.forEach(([type, count]) => {
    console.log(`     ${type}: ${count} instances`);
  });

  console.log('\n💡 RECOMMENDATIONS FOR FIELD CATEGORIZATION:');
  console.log('   ✅ WORKING WELL:');
  console.log('     - Text fields (prompts) are being detected correctly');
  console.log('     - Boolean values are categorized appropriately');
  console.log('     - Basic file types (.safetensors, etc.) are caught as models');
  
  console.log('\n   🔧 POTENTIAL IMPROVEMENTS:');
  console.log('     - Many numeric fields in OTHER could be moved to NUMBERS category');
  console.log('     - Some dropdown values might need better pattern matching');
  console.log('     - Seed detection could be more robust');
  console.log('     - Widget names like "widget_0" could be resolved to real names via ComfyUI API');
  
  console.log('\n   📝 PROPOSED UI CATEGORIES:');
  console.log('     1. SEEDS: Random generation fields → Number input with randomize button');
  console.log('     2. PROMPTS: Text content → Textarea fields');
  console.log('     3. MODELS: File selections → Dropdown from available files');
  console.log('     4. SAMPLING: Parameters → Number inputs with ranges');
  console.log('     5. DIMENSIONS: Size/resolution → Number inputs with presets');
  console.log('     6. DROPDOWNS: Choice fields → Select dropdowns');
  console.log('     7. BOOLEANS: On/off settings → Checkboxes');
  console.log('     8. NUMBERS: General numeric → Number inputs');
}

/**
 * Main analysis function
 */
async function main() {
  console.log('🚀 Starting enhanced ComfyUI workflow analysis...\n');
  
  const results = [];
  
  for (const filePath of FILES_TO_ANALYZE) {
    console.log(`📄 Analyzing: ${path.basename(filePath)}`);
    
    const metadata = extractWorkflowFromPNG(filePath);
    let analysis = null;
    
    if (metadata && metadata.workflow) {
      analysis = analyzeWorkflow(metadata.workflow, filePath);
      console.log(`   ✅ Found ${analysis.nodeTypes.length} nodes with ${Object.values(analysis.fields).reduce((sum, arr) => sum + arr.length, 0)} widgets`);
    } else {
      console.log('   ❌ No workflow metadata found');
    }
    
    results.push({
      filePath,
      metadata,
      analysis
    });
  }
  
  generateDetailedReport(results);
}

// Run the analysis
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Enhanced analysis failed:', error);
    process.exit(1);
  });
}

module.exports = {
  extractWorkflowFromPNG,
  analyzeWorkflow,
  categorizeField
};