const path = require('path');
const moment = require('moment');
const os = require('os');
const url = require('url');

// Get the home directory in a platform-agnostic way
const homeDir = os.homedir();

// Helper function to parse and validate paths
function validatePath(pathStr) {
  try {
    // Convert ~ to home directory
    if (pathStr.startsWith('~')) {
      pathStr = path.join(homeDir, pathStr.slice(1));
    }
    
    // Return resolved absolute path
    return path.resolve(pathStr);
  } catch (error) {
    console.error(`Error validating path ${pathStr}:`, error);
    return null;
  }
}

// Configuration
const config = {
  // Default directory paths
  DEFAULT_OUTPUT_DIR: path.resolve(homeDir, 'Documents/ComfyUI/output'),
  DEFAULT_SORTED_DIR: path.resolve(homeDir, 'Documents/sorted'),
  
  // Current paths (can be modified at runtime)
  _currentFromPath: null,
  _currentToPath: null,
  
  // Get/Set the current from path
  get OUTPUT_DIR() {
    return this._currentFromPath || this.DEFAULT_OUTPUT_DIR;
  },
  
  set OUTPUT_DIR(value) {
    const validPath = validatePath(value);
    if (validPath) {
      this._currentFromPath = validPath;
      console.log(`FROM path set to: ${validPath}`);
    } else {
      console.error(`Invalid FROM path: ${value}, using default`);
      this._currentFromPath = this.DEFAULT_OUTPUT_DIR;
    }
  },
  
  // Get/Set the current to path
  get LOCAL_COPY_DIR() {
    return this._currentToPath || this.DEFAULT_SORTED_DIR;
  },
  
  set LOCAL_COPY_DIR(value) {
    const validPath = validatePath(value);
    if (validPath) {
      this._currentToPath = validPath;
      console.log(`TO path set to: ${validPath}`);
    } else {
      console.error(`Invalid TO path: ${value}, using default`);
      this._currentToPath = this.DEFAULT_SORTED_DIR;
    }
  },
  
  // Set paths from URL query parameters
  setPathsFromUrl(reqUrl) {
    if (!reqUrl) return;
    
    try {
      // Parse the URL
      const parsedUrl = url.parse(reqUrl, true);
      const { fromPath, toPath } = parsedUrl.query;
      
      // Set FROM path if provided
      if (fromPath) {
        this.OUTPUT_DIR = fromPath;
      }
      
      // Set TO path if provided
      if (toPath) {
        this.LOCAL_COPY_DIR = toPath;
      }
    } catch (error) {
      console.error('Error parsing URL parameters:', error);
    }
  },
  
  // Directory for logs
  LOG_DIR: path.resolve(homeDir, 'Documents/swipe-save/logs'),
  
  // Generate paths based on the base paths
  get DELETED_DIR() {
    return path.join(this.OUTPUT_DIR, 'deleted');
  },
  
  get LOG_FILE() {
    const currentDate = moment().format('YYYYMMDD');
    return path.join(this.LOG_DIR, `selection_log_${currentDate}.json`);
  },
  
  // Folder Structure
  bestWipFolder: 'best/wip',  // Updated path for best_wip folder
  
  // Server Configuration
  PORT: process.env.PORT || 8081
};

// Initialize with defaults
config.OUTPUT_DIR = config.DEFAULT_OUTPUT_DIR;
config.LOCAL_COPY_DIR = config.DEFAULT_SORTED_DIR;

// Log the configuration paths
console.log('Directory paths:');
console.log(`OUTPUT_DIR (FROM): ${config.OUTPUT_DIR}`);
console.log(`LOCAL_COPY_DIR (TO): ${config.LOCAL_COPY_DIR}`);
console.log(`DELETED_DIR: ${config.DELETED_DIR}`);
console.log(`LOG_DIR: ${config.LOG_DIR}`);
console.log(`LOG_FILE: ${config.LOG_FILE}`);

module.exports = config;