#!/usr/bin/env node

/**
 * Analyze ComfyUI workflow metadata from PNG files
 * This script extracts and analyzes workflow data to assess field categorization
 */

const fs = require('fs');
const path = require('path');
const extractChunks = require('png-chunks-extract');
const textChunk = require('png-chunk-text');

// Files to analyze - found a file with actual metadata!
const FILES_TO_ANALYZE = [
  '/home/simonsays/Documents/ComfyUI/output/WAN 2.2 T2V_00003.png',
  '/home/simonsays/Documents/ComfyUI/output/AEverything_v4_ep60_fast_00596_.png',
  '/home/simonsays/Documents/ComfyUI/output/AnimateDiff_00264.png',
  '/home/simonsays/Documents/ComfyUI/output/AnimateDiff_00265.png',
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

    // Look for workflow data in text chunks
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
              console.log(`⚠️  Failed to parse prompt JSON in ${path.basename(filePath)}: ${e.message}`);
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
 * Analyze field types in a workflow node
 * @param {Object} node - Node object from workflow
 * @param {string} nodeId - Node ID
 * @param {string} format - Workflow format ('api' or 'gui')
 * @returns {Object} Field analysis results
 */
function analyzeNodeFields(node, nodeId, format) {
  const fields = {
    seeds: [],
    prompts: [],
    models: [],
    sampling: [],
    dimensions: [],
    booleans: [],
    images: [],
    other: []
  };

  if (format === 'api') {
    // API format analysis
    if (node.inputs) {
      for (const [key, value] of Object.entries(node.inputs)) {
        categorizeField(key, value, fields, nodeId, node.class_type);
      }
    }
  } else if (format === 'gui') {
    // GUI format analysis
    if (node.widgets_values && Array.isArray(node.widgets_values)) {
      node.widgets_values.forEach((value, index) => {
        const fieldName = node.widgets && node.widgets[index] ? node.widgets[index].name : `widget_${index}`;
        categorizeField(fieldName, value, fields, nodeId, node.type);
      });
    }
  }

  return fields;
}

/**
 * Categorize a field based on its name, value, and context
 * @param {string} fieldName - Name of the field
 * @param {*} value - Value of the field
 * @param {Object} fields - Fields object to add to
 * @param {string} nodeId - Node ID
 * @param {string} nodeType - Type of node
 */
function categorizeField(fieldName, value, fields, nodeId, nodeType) {
  const field = {
    nodeId,
    nodeType,
    fieldName,
    value,
    valueType: typeof value,
    isArray: Array.isArray(value)
  };

  // Skip connections (arrays with 2 elements typically represent node connections)
  if (Array.isArray(value) && value.length === 2 && typeof value[0] === 'string' && typeof value[1] === 'number') {
    return; // This is a connection, not a field
  }

  const lowerName = fieldName.toLowerCase();
  const stringValue = String(value).toLowerCase();

  // Seeds - random number fields
  if (lowerName.includes('seed') || 
      lowerName.includes('noise_seed') ||
      (lowerName.includes('random') && typeof value === 'number')) {
    fields.seeds.push(field);
    return;
  }

  // Prompts - text content fields
  if (lowerName.includes('text') || 
      lowerName.includes('prompt') || 
      lowerName.includes('positive') || 
      lowerName.includes('negative') ||
      lowerName.includes('description') ||
      nodeType === 'CLIPTextEncode' ||
      (typeof value === 'string' && value.length > 20 && /[a-zA-Z]/.test(value))) {
    fields.prompts.push(field);
    return;
  }

  // Models - file references
  if (lowerName.includes('model') || 
      lowerName.includes('checkpoint') || 
      lowerName.includes('lora') ||
      lowerName.includes('vae') ||
      stringValue.endsWith('.safetensors') ||
      stringValue.endsWith('.ckpt') ||
      stringValue.endsWith('.pt') ||
      stringValue.endsWith('.bin')) {
    fields.models.push(field);
    return;
  }

  // Sampling parameters
  if (lowerName.includes('steps') || 
      lowerName.includes('cfg') || 
      lowerName.includes('sampler') || 
      lowerName.includes('scheduler') ||
      lowerName.includes('denoise') ||
      lowerName.includes('strength')) {
    fields.sampling.push(field);
    return;
  }

  // Dimensions
  if (lowerName.includes('width') || 
      lowerName.includes('height') || 
      lowerName.includes('batch') ||
      lowerName.includes('size')) {
    fields.dimensions.push(field);
    return;
  }

  // Booleans
  if (typeof value === 'boolean' ||
      stringValue === 'true' ||
      stringValue === 'false' ||
      lowerName.includes('enable') ||
      lowerName.includes('disable')) {
    fields.booleans.push(field);
    return;
  }

  // Images
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
 * Determine workflow format
 * @param {Object} workflow - Workflow object
 * @returns {string} 'api', 'gui', or 'unknown'
 */
function getWorkflowFormat(workflow) {
  if (!workflow) return 'unknown';
  
  if (workflow.nodes && Array.isArray(workflow.nodes)) {
    return 'gui';
  }
  
  const keys = Object.keys(workflow);
  if (keys.some(key => /^\d+$/.test(key))) {
    return 'api';
  }
  
  return 'unknown';
}

/**
 * Generate analysis report
 * @param {Array} results - Analysis results from all files
 */
function generateReport(results) {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 COMFYUI WORKFLOW METADATA ANALYSIS REPORT');
  console.log('='.repeat(80));

  // Summary of files analyzed
  console.log('\n📁 FILES ANALYZED:');
  results.forEach((result, index) => {
    const fileName = path.basename(result.filePath);
    const status = result.metadata ? 
      (result.metadata.hasWorkflow ? '✅ Has workflow' : '⚠️  No workflow') : 
      '❌ No metadata';
    console.log(`   ${index + 1}. ${fileName} - ${status}`);
  });

  // Field categorization analysis
  const allFields = {
    seeds: [],
    prompts: [],
    models: [],
    sampling: [],
    dimensions: [],
    booleans: [],
    images: [],
    other: []
  };

  const workflowCounts = { api: 0, gui: 0, unknown: 0 };
  const nodeTypeCounts = {};

  results.forEach(result => {
    if (result.analysis) {
      const { format, fields, nodeTypes } = result.analysis;
      workflowCounts[format]++;
      
      // Aggregate fields
      Object.keys(allFields).forEach(category => {
        allFields[category].push(...fields[category]);
      });

      // Count node types
      nodeTypes.forEach(type => {
        nodeTypeCounts[type] = (nodeTypeCounts[type] || 0) + 1;
      });
    }
  });

  console.log('\n📊 FIELD CATEGORIZATION ANALYSIS:');
  Object.entries(allFields).forEach(([category, fields]) => {
    console.log(`   ${category.toUpperCase()}: ${fields.length} fields`);
    if (fields.length > 0 && fields.length <= 5) {
      fields.forEach(field => {
        console.log(`     • ${field.nodeType}/${field.fieldName}: ${JSON.stringify(field.value).substring(0, 50)}...`);
      });
    } else if (fields.length > 5) {
      console.log(`     • Sample: ${fields[0].nodeType}/${fields[0].fieldName}`);
      console.log(`     • ${fields.length} total fields in this category`);
    }
  });

  console.log('\n🏗️  WORKFLOW FORMATS:');
  console.log(`   API format: ${workflowCounts.api} files`);
  console.log(`   GUI format: ${workflowCounts.gui} files`);
  console.log(`   Unknown/No workflow: ${workflowCounts.unknown} files`);

  console.log('\n🔧 TOP NODE TYPES:');
  const sortedNodeTypes = Object.entries(nodeTypeCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10);
  sortedNodeTypes.forEach(([type, count]) => {
    console.log(`   ${type}: ${count} instances`);
  });

  console.log('\n💡 CATEGORIZATION ASSESSMENT:');
  console.log('   ✅ Seeds: Fields containing numeric values for randomization');
  console.log('   ✅ Prompts: Text content fields (typically long descriptive text)');
  console.log('   ✅ Models: File references (.safetensors, .ckpt, etc.)');
  console.log('   ✅ Sampling: Steps, CFG, sampler names, denoise strength');
  console.log('   ✅ Dimensions: Width, height, batch size');
  console.log('   ✅ Booleans: True/false toggle fields');
  console.log('   ✅ Images: Image file references');
  console.log('   ⚠️  Other: Fields not fitting standard categories');

  if (allFields.other.length > 0) {
    console.log('\n🔍 EDGE CASES IN "OTHER" CATEGORY:');
    allFields.other.slice(0, 5).forEach(field => {
      console.log(`   • ${field.nodeType}/${field.fieldName} = ${JSON.stringify(field.value)} (${field.valueType})`);
    });
    if (allFields.other.length > 5) {
      console.log(`   ... and ${allFields.other.length - 5} more fields`);
    }
  }
}

/**
 * Main analysis function
 */
async function main() {
  console.log('🚀 Starting ComfyUI workflow metadata analysis...\n');
  
  const results = [];
  
  for (const filePath of FILES_TO_ANALYZE) {
    console.log(`📄 Analyzing: ${path.basename(filePath)}`);
    
    const metadata = extractWorkflowFromPNG(filePath);
    let analysis = null;
    
    if (metadata && metadata.workflow) {
      const format = getWorkflowFormat(metadata.workflow);
      const allFields = { seeds: [], prompts: [], models: [], sampling: [], dimensions: [], booleans: [], images: [], other: [] };
      const nodeTypes = [];
      
      if (format === 'api') {
        Object.entries(metadata.workflow).forEach(([nodeId, node]) => {
          if (node && node.class_type) {
            nodeTypes.push(node.class_type);
            const nodeFields = analyzeNodeFields(node, nodeId, format);
            Object.keys(allFields).forEach(category => {
              allFields[category].push(...nodeFields[category]);
            });
          }
        });
      } else if (format === 'gui') {
        metadata.workflow.nodes.forEach(node => {
          if (node && node.type) {
            nodeTypes.push(node.type);
            const nodeFields = analyzeNodeFields(node, String(node.id), format);
            Object.keys(allFields).forEach(category => {
              allFields[category].push(...nodeFields[category]);
            });
          }
        });
      }
      
      analysis = {
        format,
        fields: allFields,
        nodeTypes,
        nodeCount: nodeTypes.length
      };
      
      console.log(`   Format: ${format}, Nodes: ${nodeTypes.length}`);
    }
    
    results.push({
      filePath,
      metadata,
      analysis
    });
  }
  
  generateReport(results);
}

// Run the analysis
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  });
}

module.exports = {
  extractWorkflowFromPNG,
  analyzeNodeFields,
  categorizeField,
  getWorkflowFormat
};