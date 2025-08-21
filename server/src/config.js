const path = require('path');
const moment = require('moment');
const fs = require('fs-extra');

// Config file path
const CONFIG_FILE = path.resolve(process.env.HOME, 'Documents/swipe-save/app-config.json');

// Smart directory fallback logic
function findValidDirectory(preferredPaths, fallback = process.env.HOME || '/') {
  for (const dirPath of preferredPaths) {
    if (fs.existsSync(dirPath)) {
      return dirPath;
    }
  }
  return fallback;
}

// Dynamic ComfyUI URL detection
function getComfyUIUrl() {
  // Check environment variable first
  if (process.env.COMFYUI_URL) {
    return process.env.COMFYUI_URL;
  }
  
  // Always use reliable IPv4 localhost
  return 'http://127.0.0.1:8188';
}

// Ensure ComfyUI URL uses IPv4 localhost for reliability
function normalizeComfyUIUrl(url) {
  if (!url) return url;
  
  // Replace any hostname with 127.0.0.1 to force IPv4 localhost and avoid DNS resolution issues
  return url.replace(/localhost/g, '127.0.0.1')
            .replace(/debian/g, '127.0.0.1')
            .replace(/http:\/\/[^:]+:8188/, 'http://127.0.0.1:8188');
}

// Default configuration with smart fallbacks
const defaultConfig = {
  sourceDir: findValidDirectory([
    path.resolve(process.env.HOME, 'Documents/Data/Images/Text2Img'),
    path.resolve(process.env.HOME, 'Documents/ComfyUI/output'),
    path.resolve(process.env.HOME, 'Documents'),
    path.resolve(process.env.HOME, 'Desktop'),
    process.env.HOME
  ], process.env.HOME || '/'),
  
  destinationDir: findValidDirectory([
    path.resolve(process.env.HOME, 'Documents/ComfyUI/output/swipe-save'),
    path.resolve(process.env.HOME, 'Documents/swipe-save'),
    path.resolve(process.env.HOME, 'Desktop/swipe-save'),
    path.resolve(process.env.HOME, 'swipe-save')
  ], process.env.HOME || '/'),
  
  useDatestampFolders: true, // Default to current behavior (using datestamp folders)
  
  // File Loading Configuration
  fileLimit: null, // No limit on files to load
  
  // Pagination Configuration
  itemsPerPage: 100, // Default items per page in list view
  maxCachedPages: 5, // Maximum pages to keep in memory
  maxCachedFiles: 10, // Maximum full files to cache
  memoryLimitMB: 100, // Memory limit for caches in MB
  preloadPages: 1, // Number of adjacent pages to preload
  fileEvictionTimeoutMinutes: 5 // Minutes before evicting unused files
};

// Load saved config or use defaults
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const saved = fs.readJsonSync(CONFIG_FILE);
      return { ...defaultConfig, ...saved };
    }
  } catch (error) {
    console.error('Error loading config, using defaults:', error);
  }
  return defaultConfig;
}

// Save config to file
function saveConfig(newConfig) {
  try {
    const configDir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    const toSave = { ...currentConfig, ...newConfig };
    fs.writeJsonSync(CONFIG_FILE, toSave, { spaces: 2 });
    Object.assign(currentConfig, toSave);
    return true;
  } catch (error) {
    console.error('Error saving config:', error);
    return false;
  }
}

// Current configuration
let currentConfig = loadConfig();

// Configuration object
const config = {
  // Dynamic directory paths
  get OUTPUT_DIR() {
    return currentConfig.sourceDir;
  },

  get LOCAL_COPY_DIR() {
    return currentConfig.destinationDir;
  },

  get LOG_DIR() {
    return path.resolve(process.env.HOME, 'Documents/swipe-save/logs');
  },

  // Generate paths based on the base paths
  get DELETED_DIR() {
    return path.join(this.OUTPUT_DIR, 'deleted');
  },

  get LOG_FILE() {
    const currentDate = moment().format('YYYYMMDD');
    return path.join(this.LOG_DIR, `selection_log_${currentDate}.json`);
  },

  // Folder Structure
  bestWipFolder: 'best/wip',

  // Server Configuration
  PORT: process.env.PORT || 8081,

  // ComfyUI Configuration
  get COMFYUI_URL() {
    return getComfyUIUrl();
  },
  
  // ComfyUI URL normalization
  normalizeComfyUIUrl,

  // Logging Configuration
  get ENABLE_LOGGING() {
    return currentConfig.enableLogging !== false; // Default to true
  },

  // File Loading Configuration
  get FILE_LIMIT() {
    return currentConfig.fileLimit || null;
  },

  // Config management
  getCurrentConfig: () => ({ ...currentConfig }),
  updateConfig: saveConfig
};

// Log the configuration paths
console.log('Directory paths:');
console.log(`OUTPUT_DIR: ${config.OUTPUT_DIR}`);
console.log(`LOCAL_COPY_DIR: ${config.LOCAL_COPY_DIR}`);
console.log(`DELETED_DIR: ${config.DELETED_DIR}`);
console.log(`LOG_DIR: ${config.LOG_DIR}`);
console.log(`LOG_FILE: ${config.LOG_FILE}`);

module.exports = config;
