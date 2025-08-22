const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const yaml = require('js-yaml');
const router = express.Router();

// Supported model file extensions
const SUPPORTED_EXTENSIONS = ['.ckpt', '.safetensors', '.pt', '.pth', '.bin', '.pkl', '.sft', '.gguf'];

/**
 * Get ComfyUI installation path
 */
function getComfyUIPath() {
  const possiblePaths = [
    '/home/simonsays/Documents/Data/Packages/ComfyUI',
    '/home/simonsays/Documents/ComfyUI',
    '/usr/local/lib/ComfyUI',
    process.env.COMFYUI_PATH
  ].filter(Boolean);
  
  for (const comfyPath of possiblePaths) {
    if (fs.existsSync(comfyPath)) {
      return comfyPath;
    }
  }
  
  throw new Error('ComfyUI installation not found. Set COMFYUI_PATH environment variable.');
}

/**
 * Parse extra_model_paths.yaml configuration
 */
function parseExtraModelPaths(comfyPath) {
  const extraPathsFile = path.join(comfyPath, 'extra_model_paths.yaml');
  const modelPaths = new Map();
  
  // Default ComfyUI model directories
  const defaultPaths = {
    checkpoints: path.join(comfyPath, 'models/checkpoints'),
    vae: path.join(comfyPath, 'models/vae'),
    loras: path.join(comfyPath, 'models/loras'),
    controlnet: path.join(comfyPath, 'models/controlnet'),
    clip: path.join(comfyPath, 'models/clip'),
    clip_vision: path.join(comfyPath, 'models/clip_vision'),
    embeddings: path.join(comfyPath, 'models/embeddings'),
    diffusion_models: path.join(comfyPath, 'models/diffusion_models'),
    upscale_models: path.join(comfyPath, 'models/upscale_models'),
    hypernetworks: path.join(comfyPath, 'models/hypernetworks'),
    input: path.join(comfyPath, 'input')
  };
  
  // Add default paths first
  for (const [type, defaultPath] of Object.entries(defaultPaths)) {
    if (!modelPaths.has(type)) {
      modelPaths.set(type, []);
    }
    modelPaths.get(type).push(defaultPath);
  }
  
  // Try to parse extra_model_paths.yaml
  try {
    if (fs.existsSync(extraPathsFile)) {
      console.log('Loading extra_model_paths.yaml from:', extraPathsFile);
      const yamlContent = fs.readFileSync(extraPathsFile, 'utf8');
      const config = yaml.load(yamlContent);
      
      // Process each configuration section
      if (config && typeof config === 'object') {
        for (const [sectionName, section] of Object.entries(config)) {
          if (section && typeof section === 'object' && section.base_path) {
            const basePath = section.base_path;
            console.log(`Processing section '${sectionName}' with base_path:`, basePath);
            
            // Map field names to model types
            const fieldMappings = {
              checkpoints: 'checkpoints',
              vae: 'vae', 
              loras: 'loras',
              lora: 'loras', // Alternative name
              controlnet: 'controlnet',
              clip: 'clip',
              clip_vision: 'clip_vision',
              embeddings: 'embeddings',
              diffusion_models: 'diffusion_models',
              upscale_models: 'upscale_models',
              hypernetworks: 'hypernetworks'
            };
            
            for (const [fieldName, modelType] of Object.entries(fieldMappings)) {
              if (section[fieldName]) {
                const relativePath = section[fieldName];
                const fullPath = path.resolve(basePath, relativePath);
                
                if (!modelPaths.has(modelType)) {
                  modelPaths.set(modelType, []);
                }
                modelPaths.get(modelType).push(fullPath);
                console.log(`Added ${modelType} path:`, fullPath);
              }
            }
          }
        }
      }
    } else {
      console.log('No extra_model_paths.yaml found, using default paths only');
    }
  } catch (error) {
    console.warn('Error parsing extra_model_paths.yaml:', error.message);
  }
  
  return modelPaths;
}

/**
 * Scan directory for model files
 */
async function scanModelDirectory(dirPath) {
  const files = [];
  
  if (!fs.existsSync(dirPath)) {
    console.warn(`Model directory not found: ${dirPath}`);
    return files;
  }
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (SUPPORTED_EXTENSIONS.includes(ext)) {
          files.push({
            name: entry.name,
            basename: path.basename(entry.name, ext),
            extension: ext,
            size: (await fs.stat(path.join(dirPath, entry.name))).size
          });
        }
      } else if (entry.isDirectory()) {
        // Scan subdirectories recursively
        const subDir = path.join(dirPath, entry.name);
        const subFiles = await scanModelDirectory(subDir);
        
        // Add subfolder prefix to file names
        subFiles.forEach(file => {
          file.name = `${entry.name}/${file.name}`;
          files.push(file);
        });
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error);
  }
  
  return files.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Cache for model files to avoid repeated filesystem scans
 */
const modelCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getCachedModels(modelType) {
  const cached = modelCache.get(modelType);
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    return cached.data;
  }
  return null;
}

function setCachedModels(modelType, data) {
  modelCache.set(modelType, {
    data,
    timestamp: Date.now()
  });
}

// Get models of specific type
router.get('/api/comfyui/models/:modelType', async (req, res) => {
  try {
    const { modelType } = req.params;
    
    // Check cache first
    const cachedData = getCachedModels(modelType);
    if (cachedData) {
      return res.json({
        modelType,
        files: cachedData,
        cached: true
      });
    }
    
    // Get ComfyUI path and parse model paths
    const comfyPath = getComfyUIPath();
    const modelPaths = parseExtraModelPaths(comfyPath);
    
    if (!modelPaths.has(modelType)) {
      return res.status(400).json({
        error: `Invalid model type: ${modelType}`,
        supportedTypes: Array.from(modelPaths.keys())
      });
    }
    
    // Scan all directories for this model type
    const directories = modelPaths.get(modelType);
    const allFiles = [];
    const scannedPaths = [];
    
    for (const dirPath of directories) {
      if (fs.existsSync(dirPath)) {
        console.log(`Scanning ${modelType} directory:`, dirPath);
        const files = await scanModelDirectory(dirPath);
        
        // Add source directory information to each file
        files.forEach(file => {
          file.sourceDirectory = dirPath;
        });
        
        allFiles.push(...files);
        scannedPaths.push(dirPath);
      } else {
        console.log(`${modelType} directory does not exist:`, dirPath);
      }
    }
    
    // Remove duplicates (same filename from different directories - keep first one)
    const uniqueFiles = [];
    const seenNames = new Set();
    
    for (const file of allFiles) {
      if (!seenNames.has(file.name)) {
        seenNames.add(file.name);
        uniqueFiles.push(file);
      }
    }
    
    // Sort by name
    uniqueFiles.sort((a, b) => a.name.localeCompare(b.name));
    
    // Cache results
    setCachedModels(modelType, uniqueFiles);
    
    res.json({
      modelType,
      files: uniqueFiles,
      paths: scannedPaths,
      cached: false
    });
    
  } catch (error) {
    console.error('Error getting models:', error);
    res.status(500).json({ 
      error: error.message,
      modelType: req.params.modelType
    });
  }
});

// Get all available model types
router.get('/api/comfyui/models', async (req, res) => {
  try {
    const comfyPath = getComfyUIPath();
    const modelPaths = parseExtraModelPaths(comfyPath);
    const modelTypes = {};
    
    for (const [type, paths] of modelPaths.entries()) {
      modelTypes[type] = {
        paths: paths,
        existing: paths.filter(p => fs.existsSync(p)),
        count: paths.filter(p => fs.existsSync(p)).length
      };
    }
    
    res.json({
      comfyuiPath: comfyPath,
      modelTypes: modelTypes,
      supportedExtensions: SUPPORTED_EXTENSIONS,
      hasExtraModelPaths: fs.existsSync(path.join(comfyPath, 'extra_model_paths.yaml'))
    });
    
  } catch (error) {
    console.error('Error getting model info:', error);
    res.status(500).json({ error: error.message });
  }
});

// Clear model cache
router.delete('/api/comfyui/models/cache', (req, res) => {
  modelCache.clear();
  res.json({ 
    message: 'Model cache cleared',
    timestamp: new Date().toISOString()
  });
});

// Get cache status
router.get('/api/comfyui/models/cache', (req, res) => {
  const cacheInfo = {};
  
  for (const [type, data] of modelCache.entries()) {
    cacheInfo[type] = {
      fileCount: data.data.length,
      age: Date.now() - data.timestamp,
      expires: Math.max(0, CACHE_DURATION - (Date.now() - data.timestamp))
    };
  }
  
  res.json({
    cache: cacheInfo,
    cacheDuration: CACHE_DURATION
  });
});

// Proxy ComfyUI object_info to get real dropdown options
router.get('/api/comfyui/object_info', async (req, res) => {
  try {
    const fetch = require('node-fetch');
    const response = await fetch('http://127.0.0.1:8188/object_info');
    
    if (!response.ok) {
      throw new Error(`ComfyUI object_info failed: ${response.status}`);
    }
    
    const objectInfo = await response.json();
    res.json(objectInfo);
    
  } catch (error) {
    console.error('Error fetching ComfyUI object_info:', error);
    res.status(500).json({ 
      error: 'Failed to fetch ComfyUI object_info: ' + error.message 
    });
  }
});

module.exports = router;