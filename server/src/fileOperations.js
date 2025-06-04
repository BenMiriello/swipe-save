const fs = require('fs-extra');
const path = require('path');
const moment = require('moment');
const config = require('./config');
const extractChunks = require('png-chunks-extract');
const textChunk = require('png-chunk-text');

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
 * Extract metadata from ComfyUI PNG files using proper PNG chunk extraction
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
      // Read the PNG file
      const buffer = fs.readFileSync(sourcePath);

      // Extract PNG chunks
      const chunks = extractChunks(buffer);
      console.log(`Found ${chunks.length} PNG chunks in ${filename}`);
      console.log(`Chunk types:`, chunks.map(c => c.name));

      // Look for text chunks containing ComfyUI data
      for (const chunk of chunks) {
        if (chunk.name === 'tEXt') {
          try {
            // Parse the text chunk
            const textData = textChunk.decode(chunk.data);
            console.log(`Found tEXt chunk with keyword: '${textData.keyword}'`);

            // Check for ComfyUI-specific metadata
            if (textData.keyword === 'workflow') {
              try {
                metadata.workflow = JSON.parse(textData.text);
                console.log(`Found workflow metadata in ${filename}`);
              } catch (parseError) {
                console.log(`Workflow found but JSON parse failed in ${filename}:`, parseError.message);
                metadata.workflowRaw = textData.text;
              }
            } else if (textData.keyword === 'prompt') {
              try {
                metadata.prompt = JSON.parse(textData.text);
                console.log(`Found prompt metadata in ${filename}`);
              } catch (parseError) {
                console.log(`Prompt found but JSON parse failed in ${filename}:`, parseError.message);
                metadata.promptRaw = textData.text;
              }
            } else if (textData.keyword === 'parameters') {
              metadata.parameters = textData.text;
              console.log(`Found parameters metadata in ${filename}`);
            } else if (textData.keyword.toLowerCase().includes('comfy')) {
              metadata[textData.keyword] = textData.text;
              console.log(`Found ComfyUI metadata key '${textData.keyword}' in ${filename}`);
            }
          } catch (textParseError) {
            console.log(`Error parsing text chunk in ${filename}:`, textParseError.message);
          }
        }
      }

      // Log what we found
      const foundKeys = Object.keys(metadata).filter(key => 
        !['filename', 'filesize', 'createdAt', 'modifiedAt', 'absolutePath'].includes(key)
      );

      if (foundKeys.length > 0) {
        console.log(`Extracted metadata keys from ${filename}:`, foundKeys);
      } else {
        console.log(`No ComfyUI metadata found in ${filename}`);
      }

    } catch (error) {
      console.error(`Error extracting PNG chunks from ${filename}:`, error.message);
      metadata.extractionError = error.message;
    }

    return metadata;
  } catch (error) {
    console.error(`Error in metadata extraction for ${filename}:`, error.message);
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