const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const cors = require('cors');
const moment = require('moment');

const app = express();
app.use(cors());
app.use(express.json());

// Config
const OUTPUT_DIR = path.resolve(process.env.HOME, 'Documents/ComfyUI/output');
const LOCAL_COPY_DIR = path.resolve(process.env.HOME, 'Documents/ComfyUI/output/swipe-save');
const DELETED_DIR = path.join(OUTPUT_DIR, 'deleted');
const LOG_DIR = path.resolve(process.env.HOME, 'Documents/swipe-save/logs');

// Create a log file for each day
const currentDate = moment().format('YYYYMMDD');
const LOG_FILE = path.join(LOG_DIR, `selection_log_${currentDate}.json`);

console.log('Directory paths:');
console.log(`OUTPUT_DIR: ${OUTPUT_DIR}`);
console.log(`LOCAL_COPY_DIR: ${LOCAL_COPY_DIR}`);
console.log(`DELETED_DIR: ${DELETED_DIR}`);
console.log(`LOG_DIR: ${LOG_DIR}`);
console.log(`LOG_FILE: ${LOG_FILE}`);

// Create needed directories if they don't exist
if (!fs.existsSync(DELETED_DIR)) {
  fs.mkdirSync(DELETED_DIR, { recursive: true });
}

if (!fs.existsSync(LOCAL_COPY_DIR)) {
  fs.mkdirSync(LOCAL_COPY_DIR, { recursive: true });
}

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Initialize selection log if it doesn't exist
if (!fs.existsSync(LOG_FILE)) {
  fs.writeJsonSync(LOG_FILE, { selections: [] });
}

// Action history for undo functionality
const actionHistory = [];

// Serve static files from the output directory
app.use('/media', express.static(OUTPUT_DIR, {
  dotfiles: 'allow',
  setHeaders: (res, path) => {
    // Set proper content type based on file extension
    if (path.endsWith('.png')) {
      res.set('Content-Type', 'image/png');
    } else if (path.endsWith('.mp4')) {
      res.set('Content-Type', 'video/mp4');
    } else if (path.endsWith('.webm')) {
      res.set('Content-Type', 'video/webm');
    }
  }
}));

// Serve the frontend files from the public directory
app.use(express.static(path.join(__dirname, '..', 'public')));

// Add a route handler for the root path
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, '..', 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Index file not found. Check server configuration.');
  }
});

// Helper function to get file creation date
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

// Enhanced metadata extraction function focused on ComfyUI workflow and prompt data
async function extractMetadata(filePath) {
  try {
    const stats = fs.statSync(filePath);
    
    const basicMetadata = {
      filename: path.basename(filePath),
      filesize: stats.size,
      createdAt: stats.birthtime || stats.mtime,
      modifiedAt: stats.mtime,
      absolutePath: filePath
    };
    
    // Only extract detailed metadata for PNG files
    if (!filePath.toLowerCase().endsWith('.png')) {
      return basicMetadata;
    }
    
    try {
      // Read the PNG file
      const buffer = fs.readFileSync(filePath);
      
      // Convert buffer to string for regex matching
      // Note: This is a simplified approach - ideally we'd use a proper PNG chunk parser
      const fileText = buffer.toString();
      
      // Extract ComfyUI metadata
      const comfyMetadata = {};
      
      // Try to extract workflow data - this is the most important part
      const workflowRegex = /"workflow"\s*:\s*({.*?}(?:\s*\})+)/s;
      const workflowMatch = fileText.match(workflowRegex);
      if (workflowMatch && workflowMatch[1]) {
        try {
          // Try to extract the workflow JSON
          let workflowText = workflowMatch[1];
          // Ensure proper JSON closure if needed
          if ((workflowText.match(/{/g) || []).length > (workflowText.match(/}/g) || []).length) {
            workflowText += '}';
          }
          comfyMetadata.workflow = workflowText;
        } catch (e) {
          console.log(`Could not parse workflow JSON in ${filePath}`);
        }
      }
      
      // Try to extract prompt data
      const promptRegex = /"prompt"\s*:\s*({.*?}(?:\s*\})+)/s;
      const promptMatch = fileText.match(promptRegex);
      if (promptMatch && promptMatch[1]) {
        try {
          // Try to extract the prompt JSON
          let promptText = promptMatch[1];
          // Ensure proper JSON closure if needed
          if ((promptText.match(/{/g) || []).length > (promptText.match(/}/g) || []).length) {
            promptText += '}';
          }
          comfyMetadata.prompt = promptText;
        } catch (e) {
          console.log(`Could not parse prompt JSON in ${filePath}`);
        }
      }
      
      // Extract important values directly
      // Extract any seeds found
      const seedRegex = /"seed"\s*:\s*(\d+)/g;
      const seeds = [];
      let seedMatch;
      while ((seedMatch = seedRegex.exec(fileText)) !== null) {
        seeds.push(parseInt(seedMatch[1]));
      }
      if (seeds.length > 0) {
        comfyMetadata.seeds = seeds;
      }
      
      // Extract any model names
      const modelRegex = /"model"\s*:\s*"([^"]+)"/g;
      const models = [];
      let modelMatch;
      while ((modelMatch = modelRegex.exec(fileText)) !== null) {
        models.push(modelMatch[1]);
      }
      if (models.length > 0) {
        comfyMetadata.models = models;
      }
      
      // Add the ComfyUI metadata to the basic metadata
      basicMetadata.comfyUI = comfyMetadata;
      
    } catch (error) {
      console.error(`Error extracting ComfyUI metadata from PNG: ${error.message}`);
      basicMetadata.metadataError = error.message;
    }
    
    return basicMetadata;
  } catch (error) {
    console.error(`Error extracting metadata for ${filePath}:`, error);
    return {
      filename: path.basename(filePath),
      error: error.message
    };
  }
}

async function extractComfyMetadata(sourcePath, filename) {
  try {
    // Read the PNG file for metadata
    const buffer = fs.readFileSync(sourcePath);
    const fileText = buffer.toString();
    
    const metadata = {
      filename: filename,
      filesize: fs.statSync(sourcePath).size,
      seeds: [],
      models: []
    };
    
    // Extract complete text chunks that might contain workflow or prompt
    // Look for chunks starting with "workflow" and "prompt"
    const extractChunk = (startKey) => {
      // Find the start of the key
      const keyIndex = fileText.indexOf(`"${startKey}"`);
      if (keyIndex === -1) return null;
      
      // Start after the key and colon
      let startPos = fileText.indexOf(':', keyIndex);
      if (startPos === -1) return null;
      startPos++;
      
      // Now we need to find the matching closing bracket/brace
      let openBraces = 0;
      let inString = false;
      let chunk = '';
      
      // Skip whitespace
      while (startPos < fileText.length && /\s/.test(fileText[startPos])) {
        startPos++;
      }
      
      // Make sure we're starting with an object
      if (fileText[startPos] !== '{') return null;
      
      // Extract the full object
      for (let i = startPos; i < fileText.length; i++) {
        const char = fileText[i];
        
        // Handle string boundaries
        if (char === '"' && (i === 0 || fileText[i-1] !== '\\')) {
          inString = !inString;
        }
        
        // Count braces only when not in a string
        if (!inString) {
          if (char === '{') openBraces++;
          else if (char === '}') {
            openBraces--;
            if (openBraces === 0) {
              // We've found the end of the object
              chunk = fileText.substring(startPos, i + 1);
              break;
            }
          }
        }
        
        // Safety check
        if (i - startPos > 1000000) { // Prevent infinite loop
          console.log(`Chunk extraction exceeded maximum length for ${startKey}`);
          break;
        }
      }
      
      return chunk;
    };
    
    // Extract workflow and prompt chunks
    const workflowChunk = extractChunk('workflow');
    const promptChunk = extractChunk('prompt');
    
    if (workflowChunk) {
      metadata.workflow = workflowChunk;
    }
    
    if (promptChunk) {
      metadata.prompt = promptChunk;
    }
    
    // Extract seeds
    const seedPattern = /seed\"\s*:\s*(\d+)/g;
    let seedMatch;
    while ((seedMatch = seedPattern.exec(fileText)) !== null) {
      metadata.seeds.push(parseInt(seedMatch[1]));
    }
    
    // Extract models
    const modelPattern = /model\"\s*:\s*\"([^\"]+)/g;
    let modelMatch;
    while ((modelMatch = modelPattern.exec(fileText)) !== null) {
      metadata.models.push(modelMatch[1]);
    }
    
    return metadata;
  } catch (error) {
    console.error(`Error extracting metadata: ${error.message}`);
    return { 
      error: `Failed to extract metadata: ${error.message}`,
      filename: filename
    };
  }
}

async function logAction(action, sourcePath, destinationPath, success = true, details = {}) {
  try {
    // Make sure we're using today's log file
    const todayDate = moment().format('YYYYMMDD');
    const currentLogFile = path.join(LOG_DIR, `selection_log_${todayDate}.json`);
    
    // Extract metadata only from the source file (original file)
    let fileMetadata = {};
    
    if (fs.existsSync(sourcePath) && !fs.statSync(sourcePath).isDirectory()) {
      fileMetadata = await extractMetadata(sourcePath);
    } else {
      fileMetadata = { 
        filename: path.basename(sourcePath),
        error: 'Source path does not exist or is a directory' 
      };
    }
    
    // Create the log entry with focused metadata and destination info
    const logEntry = {
      timestamp: new Date().toISOString(),
      action: action,
      success: success,
      filename: path.basename(sourcePath),
      sourcePath: sourcePath,
      destinationPath: destinationPath || null,
      fileMetadata: fileMetadata,
      details: details
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

// Get list of media files
app.get('/api/files', (req, res) => {
  const mediaFiles = [];

  try {
    const entries = fs.readdirSync(OUTPUT_DIR, { withFileTypes: true });

    const mediaEntries = entries
      .filter(entry => !entry.isDirectory()) // Skip directories
      .filter(file => /\.(png|mp4|webm)$/i.test(file.name)) // Only media files
      .filter(file => !file.name.startsWith('._')); // Skip dot-underscore files

    mediaEntries.forEach(file => {
      const filePath = path.join(OUTPUT_DIR, file.name);
      const stats = fs.statSync(filePath);

      // Use encodeURIComponent to handle special characters in filenames
      const encodedFilename = encodeURIComponent(file.name);

      mediaFiles.push({
        name: file.name,
        path: `/media/${encodedFilename}`,
        size: stats.size,
        date: stats.mtime
      });
    });

    // Sort by most recent first
    mediaFiles.sort((a, b) => b.date - a.date);
  } catch (error) {
    console.error('Error reading directory:', error);
  }
  
  res.json(mediaFiles);
});

// Media file handler
app.get('/media/:filename', (req, res) => {
  try {
    const filename = decodeURIComponent(req.params.filename);
    const filePath = path.join(OUTPUT_DIR, filename);
    
    if (fs.existsSync(filePath)) {
      // Check if it's actually a file and not a directory
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        console.error(`ERROR: Tried to serve a directory as a file: ${filePath}`);
        return res.status(400).send('Path is a directory, not a file');
      }
      
      // Set headers to prevent caching issues
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Cache-Control', 'no-store');
      
      // Set content type based on file extension
      if (filename.toLowerCase().endsWith('.png')) {
        res.set('Content-Type', 'image/png');
      } else if (filename.toLowerCase().endsWith('.mp4')) {
        res.set('Content-Type', 'video/mp4');
      } else if (filename.toLowerCase().endsWith('.webm')) {
        res.set('Content-Type', 'video/webm');
      }
      
      // Stream the file
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.status(404).send('File not found');
    }
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).send('Server error');
  }
});

// Get action history for undo
app.get('/api/history', (req, res) => {
  res.json(actionHistory);
});

// Undo last action
app.post('/api/undo', (req, res) => {
  try {
    if (actionHistory.length === 0) {
      return res.status(400).json({ error: 'No actions to undo' });
    }
    
    const lastAction = actionHistory.pop();
    
    // Reverse the last action
    if (lastAction.sourcePath && lastAction.destPath) {
      // Check if destination file still exists
      if (fs.existsSync(lastAction.destPath)) {
        // Check if it's actually a file, not a directory
        if (fs.statSync(lastAction.destPath).isDirectory()) {
          // Try to remove the directory
          fs.removeSync(lastAction.destPath);
          console.log(`Removed directory that was supposed to be a file: ${lastAction.destPath}`);
        } else {
          // Move the file back to its original location
          fs.moveSync(lastAction.destPath, lastAction.sourcePath, { overwrite: true });
          console.log(`Moved file back from ${lastAction.destPath} to ${lastAction.sourcePath}`);
        }
        
        // If there was a copy made (e.g., in super save or right swipe)
        if (lastAction.bestCopyPath && fs.existsSync(lastAction.bestCopyPath)) {
          fs.removeSync(lastAction.bestCopyPath);
          console.log(`Removed copied file: ${lastAction.bestCopyPath}`);
        }
        
        if (lastAction.copyPath && fs.existsSync(lastAction.copyPath)) {
          fs.removeSync(lastAction.copyPath);
          console.log(`Removed copied file: ${lastAction.copyPath}`);
        }
        
        // Log the undo action
        logAction('undo', lastAction.destPath, lastAction.sourcePath);
      } else {
        console.log(`Destination file not found for undo: ${lastAction.destPath}`);
      }
    }
    
    res.json({ success: true, undoneAction: lastAction });
  } catch (error) {
    console.error('Error undoing action:', error);
    res.status(500).json({ error: error.message });
  }
});

// Handle file operations (swipe actions)
app.post('/api/files/action', async (req, res) => {
  const { filename, action } = req.body;
  const sourcePath = path.join(OUTPUT_DIR, filename);
  
  try {
    // First check if sourcePath is a file, not a directory
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Source file does not exist: ${sourcePath}`);
    }
    
    if (fs.statSync(sourcePath).isDirectory()) {
      throw new Error(`Source is a directory, not a file: ${sourcePath}`);
    }
    
    // Extract metadata BEFORE moving the file
    const fileMetadata = await extractComfyMetadata(sourcePath, filename);
    
    let actionRecord = {
      action,
      filename,
      sourcePath,
      timestamp: new Date().toISOString(),
      metadata: fileMetadata  // Store metadata directly in the action record
    };

    // Get file creation date for organizing
    const fileDate = getFileCreationDate(sourcePath);

    switch(action) {
      case 'left':
      case 'right': {
        // Create date folder based on file creation date
        const dateFolderPath = path.join(OUTPUT_DIR, fileDate);
        
        if (!fs.existsSync(dateFolderPath)) {
          fs.mkdirSync(dateFolderPath, { recursive: true });
        }
        
        // Move to date folder
        const destPath = path.join(dateFolderPath, filename);
        
        // Check if destination already exists
        if (fs.existsSync(destPath)) {
          console.log(`Destination already exists, removing: ${destPath}`);
          fs.removeSync(destPath);
        }
        
        // Use moveSync with specific options to prevent directory creation
        fs.moveSync(sourcePath, destPath, { overwrite: true });
        
        // Verify the move worked
        if (!fs.existsSync(destPath) || fs.statSync(destPath).isDirectory()) {
          throw new Error(`Failed to properly move file to ${destPath}`);
        }
        
        actionRecord.destPath = destPath;
        
        // Log the action with the pre-extracted metadata
        logSimpleAction('move_to_date', {
          filename,
          sourcePath,
          destPath,
          fileDate,
          metadata: fileMetadata,
          action
        });
        
        // If swiped right, also copy to local directory
        if (action === 'right') {
          // Create date folder in local copy directory
          const copyDateFolder = path.join(LOCAL_COPY_DIR, fileDate);
          if (!fs.existsSync(copyDateFolder)) {
            fs.mkdirSync(copyDateFolder, { recursive: true });
          }
          
          // Copy with the same filename
          const copyPath = path.join(copyDateFolder, filename);
          
          // Check if copy destination already exists
          if (fs.existsSync(copyPath)) {
            console.log(`Copy destination already exists, removing: ${copyPath}`);
            fs.removeSync(copyPath);
          }
          
          // Use copyFileSync to ensure we're copying a file, not creating a directory
          fs.copyFileSync(destPath, copyPath);
          
          // Verify the copy worked
          if (!fs.existsSync(copyPath) || fs.statSync(copyPath).isDirectory()) {
            throw new Error(`Failed to properly copy file to ${copyPath}`);
          }
          
          actionRecord.copyPath = copyPath;
          
          // Log the copy action with the same metadata
          logSimpleAction('copy_to_local', {
            filename,
            sourcePath: destPath,
            destPath: copyPath,
            fileDate,
            metadata: fileMetadata,
            action
          });
        }
        break;
      }
      
      case 'up': {
        // "Super save" - Copy to best subfolder within the date folder
        try {
          console.log(`SUPER SAVE: Processing file: ${filename}`);
          
          // Create date folder in local copy directory
          const copyDateFolder = path.join(LOCAL_COPY_DIR, fileDate);
          if (!fs.existsSync(copyDateFolder)) {
            fs.mkdirSync(copyDateFolder, { recursive: true });
          }
          
          // Create best subfolder within the date folder
          const bestFolder = path.join(copyDateFolder, 'best');
          if (!fs.existsSync(bestFolder)) {
            fs.mkdirSync(bestFolder, { recursive: true });
          }
          
          // Define the destination path
          const bestDestPath = path.join(bestFolder, filename);
          
          // Check if destination already exists
          if (fs.existsSync(bestDestPath)) {
            console.log(`SUPER SAVE: Destination already exists, removing: ${bestDestPath}`);
            fs.removeSync(bestDestPath);
          }
          
          // Use copyFileSync to ensure we're copying a file, not creating a directory
          fs.copyFileSync(sourcePath, bestDestPath);
          
          // Verify the copy succeeded and is a file
          if (!fs.existsSync(bestDestPath)) {
            throw new Error(`Failed to copy file to: ${bestDestPath}`);
          }
          
          if (fs.statSync(bestDestPath).isDirectory()) {
            fs.removeSync(bestDestPath);
            throw new Error(`Copied a directory instead of a file: ${bestDestPath}`);
          }
          
          console.log(`SUPER SAVE: File copied to best folder: ${bestDestPath}`);
          
          // Also move original to dated folder in output dir
          const dateFolderPath = path.join(OUTPUT_DIR, fileDate);
          if (!fs.existsSync(dateFolderPath)) {
            fs.mkdirSync(dateFolderPath, { recursive: true });
          }
          
          // Set the destination path for the original file
          const movedOriginal = path.join(dateFolderPath, filename);
          
          // Check if move destination already exists
          if (fs.existsSync(movedOriginal)) {
            console.log(`SUPER SAVE: Move destination already exists, removing: ${movedOriginal}`);
            fs.removeSync(movedOriginal);
          }
          
          // Move the original file to the date folder
          fs.moveSync(sourcePath, movedOriginal, { overwrite: true });
          
          // Verify the move succeeded
          if (!fs.existsSync(movedOriginal)) {
            throw new Error(`Failed to move original file to: ${movedOriginal}`);
          }
          
          if (fs.statSync(movedOriginal).isDirectory()) {
            fs.removeSync(movedOriginal);
            throw new Error(`Moved a directory instead of a file: ${movedOriginal}`);
          }
          
          console.log(`SUPER SAVE: Original file moved to: ${movedOriginal}`);
          
          actionRecord.bestCopyPath = bestDestPath;
          actionRecord.destPath = movedOriginal;
          
          // Log the super save action
          logSimpleAction('super_save', {
            filename,
            sourcePath,
            bestDestPath,
            movedOriginal,
            fileDate,
            metadata: fileMetadata,
            action
          });
          
          console.log(`SUPER SAVE: Completed successfully`);
        } catch (error) {
          console.error(`SUPER SAVE ERROR: ${error.message}`);
          console.error(error.stack);
          
          // Log the error
          logSimpleAction('super_save_error', {
            filename,
            sourcePath,
            error: error.message,
            metadata: fileMetadata
          });
          
          throw error; // Re-throw to be caught by the outer try/catch
        }
        break;
      }
      
      case 'down': {
        // Move to deleted folder
        // Check if deleted directory exists
        if (!fs.existsSync(DELETED_DIR)) {
          fs.mkdirSync(DELETED_DIR, { recursive: true });
        }
        
        const destPath = path.join(DELETED_DIR, filename);
        
        // Check if destination already exists
        if (fs.existsSync(destPath)) {
          console.log(`Delete destination already exists, removing: ${destPath}`);
          fs.removeSync(destPath);
        }
        
        fs.moveSync(sourcePath, destPath, { overwrite: true });
        
        // Verify the move worked
        if (!fs.existsSync(destPath) || fs.statSync(destPath).isDirectory()) {
          throw new Error(`Failed to properly move file to ${destPath}`);
        }
        
        actionRecord.destPath = destPath;
        
        // Log the delete action
        logSimpleAction('move_to_deleted', {
          filename,
          sourcePath,
          destPath,
          fileDate,
          metadata: fileMetadata,
          action
        });
        break;
      }
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
    // Add action to history
    actionHistory.push(actionRecord);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error handling file action:', error);
    
    // Log the error
    logSimpleAction('error', {
      filename: filename || 'unknown',
      sourcePath: sourcePath || 'unknown',
      error: error.message,
      action
    });
    
    res.status(500).json({ error: error.message });
  }
});

// Simplified logging function that uses daily log files
function logSimpleAction(actionType, data) {
  try {
    // Make sure we're using today's log file
    const todayDate = moment().format('YYYYMMDD');
    const currentLogFile = path.join(LOG_DIR, `selection_log_${todayDate}.json`);
    
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

const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
