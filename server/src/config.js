const path = require('path');
const moment = require('moment');

// Configuration
const config = {
  // Directory Paths
  OUTPUT_DIR: path.resolve(process.env.HOME, 'Documents/ComfyUI/output'),
  LOCAL_COPY_DIR: path.resolve(process.env.HOME, 'Documents/ComfyUI/output/swipe-save'),
  LOG_DIR: path.resolve(process.env.HOME, 'Documents/swipe-save/logs'),
  
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

// Log the configuration paths
console.log('Directory paths:');
console.log(`OUTPUT_DIR: ${config.OUTPUT_DIR}`);
console.log(`LOCAL_COPY_DIR: ${config.LOCAL_COPY_DIR}`);
console.log(`DELETED_DIR: ${config.DELETED_DIR}`);
console.log(`LOG_DIR: ${config.LOG_DIR}`);
console.log(`LOG_FILE: ${config.LOG_FILE}`);

module.exports = config;