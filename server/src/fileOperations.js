const fs = require('fs-extra');
const path = require('path');
const moment = require('moment');
const config = require('./config');

/**
 * Helper function to get file creation date
 */
function getFileCreationDate(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const creationTime = stats.birthtime || stats.mtime; // Use birthtime if available, fallback to mtime
    return moment(creationTime).format('YYYYMMDD');
  } catch (error) {
    console.error('Error getting file creation date:', error);
    return moment().format('YYYYMMDD'); // Fallback to current date
  }
}

/**
 * Extract metadata from ComfyUI PNG files
 */
async function extractComfyMetadata(sourcePath, filename) {
  try {
    // Basic file stats
    const stats = fs.statSync(sourcePath);
    const metadata = {
      filename: filename,
      filesize: stats.size,
      createdAt: stats.birthtime || stats.mtime,
      modifiedAt: stats.mtime,
      absolutePath: sourcePath
    };
    
    // Skip non-PNG files
    if (!filename.toLowerCase().endsWith('.png')) {
      return metadata;
    }
    
    try {
      // Read the file
      const buffer = fs.readFileSync(sourcePath);
      
      // Convert to string to search for metadata
      // Note: PNG files can have text chunks which often contain metadata
      const fileStr = buffer.toString('binary');
      
      // Capture everything between tEXt chunks
      const pngInfoRegex = /tEXtpnginfo(.+?)(?=IDAT|IEND|tEXt)/s;
      const match = fileStr.match(pngInfoRegex);
      
      if (match && match[1]) {
        metadata.pnginfo = match[1];
      }
      
      // Try to extract ComfyUI-specific metadata
      // Look for chunks with specific keywords
      const keywords = [
        'prompt', 'workflow', 'comfy', 'parameters', 
        'seed', 'model', 'extra'
      ];
      
      // Function to extract JSON-like data
      function extractJsonData(str, keyword) {
        const regex = new RegExp(`"${keyword}"\\s*:\\s*({[^}]*(?:{[^}]*}[^}]*)*})`, 'g');
        const matches = [];
        let match;
        
        while ((match = regex.exec(str)) !== null) {
          if (match[1]) {
            matches.push(match[1]);
          }
        }
        
        return matches.length > 0 ? matches : null;
      }
      
      // Extract complete text chunks that might contain workflow or prompt
      const utf8Str = buffer.toString('utf8');
      
      // Function to extract a complete JSON object, handling nested braces
      const extractCompleteJson = (text, startKey) => {
        const keyIndex = text.indexOf(`"${startKey}"`);
        if (keyIndex === -1) return null;
        
        // Find the colon after the key
        const colonIndex = text.indexOf(':', keyIndex);
        if (colonIndex === -1) return null;
        
        // Find the start of the JSON object
        let startPos = text.indexOf('{', colonIndex);
        if (startPos === -1) return null;
        
        // Track nesting level to find the matching closing brace
        let braceLevel = 1;
        let inString = false;
        let i = startPos + 1;
        
        while (i < text.length && braceLevel > 0) {
          const char = text.charAt(i);
          
          if (char === '"' && text.charAt(i-1) !== '\\') {
            inString = !inString;
          } else if (!inString) {
            if (char === '{') {
              braceLevel++;
            } else if (char === '}') {
              braceLevel--;
            }
          }
          
          i++;
        }
        
        if (braceLevel === 0) {
          // Extract the complete JSON object including outer braces
          return text.substring(startPos, i);
        }
        
        return null;
      };
      
      // Try to extract workflow and prompt as complete JSON objects
      const workflowJson = extractCompleteJson(utf8Str, "workflow");
      if (workflowJson) {
        metadata.workflow = workflowJson;
      }
      
      const promptJson = extractCompleteJson(utf8Str, "prompt");
      if (promptJson) {
        metadata.prompt = promptJson;
      }
      
      // Extract additional ComfyUI metadata
      keywords.forEach(keyword => {
        if (keyword !== 'workflow' && keyword !== 'prompt') {
          const extracted = extractJsonData(utf8Str, keyword);
          if (extracted) {
            metadata[keyword] = extracted;
          }
        }
      });
      
      // Extract seeds (these are particularly important)
      const seedRegex = /"seed"\s*:\s*(\d+)/g;
      const seeds = [];
      let seedMatch;
      
      while ((seedMatch = seedRegex.exec(utf8Str)) !== null) {
        seeds.push(parseInt(seedMatch[1]));
      }
      
      if (seeds.length > 0) {
        metadata.seeds = seeds;
      }
      
      // Extract model names
      const modelRegex = /"model"\s*:\s*"([^"]+)"/g;
      const models = [];
      let modelMatch;
      
      while ((modelMatch = modelRegex.exec(utf8Str)) !== null) {
        models.push(modelMatch[1]);
      }
      
      if (models.length > 0) {
        metadata.models = models;
      }
      
      // Also try a basic string extraction of the raw metadata
      const pngInfoChunk = utf8Str.indexOf('parameters');
      if (pngInfoChunk !== -1) {
        const endChunk = utf8Str.indexOf('\0', pngInfoChunk);
        if (endChunk !== -1) {
          metadata.rawParameters = utf8Str.substring(pngInfoChunk, endChunk);
        }
      }
      
      // Look for text in the PNG specifically about ComfyUI
      const comfyMatch = utf8Str.match(/ComfyUI.*?(?:\0|$)/);
      if (comfyMatch) {
        metadata.comfyInfo = comfyMatch[0].replace(/\0/g, '');
      }
      
    } catch (error) {
      console.error(`Error extracting detailed metadata: ${error.message}`);
      metadata.extractionError = error.message;
    }
    
    return metadata;
  } catch (error) {
    console.error(`Error in metadata extraction: ${error.message}`);
    return {
      filename: filename,
      error: error.message
    };
  }
}

/**
 * Simplified logging function that uses daily log files
 */
function logSimpleAction(actionType, data) {
  try {
    // Make sure we're using today's log file
    const todayDate = moment().format('YYYYMMDD');
    const currentLogFile = path.join(config.LOG_DIR, `selection_log_${todayDate}.json`);
    
    // Create the log entry
    const logEntry = {
      timestamp: new Date().toISOString(),
      action: actionType,
      ...data
    };
    
    // Read existing log
    let logData = { selections: [] };
    if (fs.existsSync(currentLogFile)) {
      try {
        logData = fs.readJsonSync(currentLogFile);
      } catch (error) {
        console.error('Error reading log file, creating new log:', error);
      }
    }
    
    // Add new entry
    logData.selections.push(logEntry);
    
    // Write updated log
    fs.writeJsonSync(currentLogFile, logData, { spaces: 2 });
    
    return true;
  } catch (error) {
    console.error('Error logging action:', error);
    return false;
  }
}

/**
 * Create necessary directories if they don't exist
 */
function createRequiredDirectories() {
  const directories = [
    config.DELETED_DIR,
    config.LOCAL_COPY_DIR,
    config.LOG_DIR
  ];
  
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  });
  
  // Initialize selection log if it doesn't exist
  if (!fs.existsSync(config.LOG_FILE)) {
    fs.writeJsonSync(config.LOG_FILE, { selections: [] });
    console.log(`Created log file: ${config.LOG_FILE}`);
  }
}

/**
 * Move a file with proper checking
 * @param {string} sourcePath - Path to source file
 * @param {string} destPath - Path to destination
 * @returns {boolean} - True if successful, false otherwise
 */
function moveFile(sourcePath, destPath) {
  try {
    // Check if source exists and is a file
    if (!fs.existsSync(sourcePath)) {
      console.error(`Source file does not exist: ${sourcePath}`);
      return false;
    }
    
    if (fs.statSync(sourcePath).isDirectory()) {
      console.error(`Source is a directory, not a file: ${sourcePath}`);
      return false;
    }
    
    // Create destination directory if it doesn't exist
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    
    // Check if destination already exists
    if (fs.existsSync(destPath)) {
      console.log(`Destination already exists, removing: ${destPath}`);
      fs.removeSync(destPath);
    }
    
    // Move the file
    fs.moveSync(sourcePath, destPath, { overwrite: true });
    
    // Verify the move was successful
    if (!fs.existsSync(destPath)) {
      console.error(`Failed to move file to ${destPath}`);
      return false;
    }
    
    if (fs.statSync(destPath).isDirectory()) {
      console.error(`Moved a directory instead of a file: ${destPath}`);
      fs.removeSync(destPath); // Clean up the erroneously created directory
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error moving file:', error);
    return false;
  }
}

/**
 * Copy a file with proper checking
 * @param {string} sourcePath - Path to source file
 * @param {string} destPath - Path to destination
 * @returns {boolean} - True if successful, false otherwise
 */
function copyFile(sourcePath, destPath) {
  try {
    // Check if source exists and is a file
    if (!fs.existsSync(sourcePath)) {
      console.error(`Source file does not exist: ${sourcePath}`);
      return false;
    }
    
    if (fs.statSync(sourcePath).isDirectory()) {
      console.error(`Source is a directory, not a file: ${sourcePath}`);
      return false;
    }
    
    // Create destination directory if it doesn't exist
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    
    // Check if destination already exists
    if (fs.existsSync(destPath)) {
      console.log(`Copy destination already exists, removing: ${destPath}`);
      fs.removeSync(destPath);
    }
    
    // Copy the file
    fs.copyFileSync(sourcePath, destPath);
    
    // Verify the copy was successful
    if (!fs.existsSync(destPath)) {
      console.error(`Failed to copy file to ${destPath}`);
      return false;
    }
    
    if (fs.statSync(destPath).isDirectory()) {
      console.error(`Copied a directory instead of a file: ${destPath}`);
      fs.removeSync(destPath); // Clean up the erroneously created directory
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error copying file:', error);
    return false;
  }
}

module.exports = {
  getFileCreationDate,
  extractComfyMetadata,
  logSimpleAction,
  createRequiredDirectories,
  moveFile,
  copyFile
};