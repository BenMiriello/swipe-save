const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const router = express.Router();
const fileOps = require('./fileOperations');
const config = require('./config');

// Action history for undo functionality
const actionHistory = [];

/**
 * Get default ComfyUI URL based on request
 */
function getDefaultComfyUIUrl(req) {
  const protocol = req.protocol || 'http';
  const hostname = req.get('host').split(':')[0]; // Remove port if present
  return `${protocol}://${hostname}:8188`;
}

/**
 * Modify seed values in workflow by appending zero
 */
function modifyWorkflowSeeds(workflow) {
  if (!workflow || typeof workflow !== 'object') return workflow;
  
  console.log('Modifying seeds in workflow...');
  let seedCount = 0;
  
  const modifySeeds = (obj) => {
    if (typeof obj !== 'object' || obj === null) return;
    
    for (const key in obj) {
      if (key === 'seed' && typeof obj[key] === 'number') {
        const oldSeed = obj[key];
        obj[key] = parseInt(obj[key].toString() + '0');
        console.log(`Modified seed: ${oldSeed} -> ${obj[key]}`);
        seedCount++;
      } else if (key === 'inputs' && typeof obj[key] === 'object') {
        // Check inputs object specifically for KSampler nodes
        modifySeeds(obj[key]);
      } else if (typeof obj[key] === 'object') {
        modifySeeds(obj[key]);
      }
    }
  };
  
  modifySeeds(workflow);
  console.log(`Total seeds modified: ${seedCount}`);
  
  return workflow;
}

// Get current configuration
router.get('/api/config', (req, res) => {
  try {
    const currentConfig = config.getCurrentConfig();
    res.json({
      sourceDir: currentConfig.sourceDir,
      destinationDir: currentConfig.destinationDir
    });
  } catch (error) {
    console.error('Error getting config:', error);
    res.status(500).json({ error: 'Failed to get configuration' });
  }
});

// Update configuration
router.post('/api/config', (req, res) => {
  try {
    const { sourceDir, destinationDir } = req.body;
    
    if (!sourceDir && !destinationDir) {
      return res.status(400).json({ error: 'No configuration provided' });
    }
    
    const updateData = {};
    if (sourceDir) updateData.sourceDir = path.resolve(sourceDir);
    if (destinationDir) updateData.destinationDir = path.resolve(destinationDir);
    
    const success = config.updateConfig(updateData);
    
    if (success) {
      res.json({ success: true, config: config.getCurrentConfig() });
    } else {
      res.status(500).json({ error: 'Failed to save configuration' });
    }
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

// Browse directories
router.get('/api/browse', (req, res) => {
  try {
    const { dir } = req.query;
    
    if (!dir) {
      return res.status(400).json({ error: 'Directory path required' });
    }
    
    const fullPath = path.resolve(dir);
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Directory not found' });
    }
    
    const stats = fs.statSync(fullPath);
    if (!stats.isDirectory()) {
      return res.status(400).json({ error: 'Path is not a directory' });
    }
    
    const entries = fs.readdirSync(fullPath, { withFileTypes: true });
    const directories = entries
      .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
      .map(entry => ({
        name: entry.name,
        path: path.join(fullPath, entry.name)
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    
    const parent = path.dirname(fullPath);
    
    res.json({
      currentPath: fullPath,
      parentPath: parent !== fullPath ? parent : null,
      directories
    });
  } catch (error) {
    console.error('Error browsing directory:', error);
    res.status(500).json({ error: 'Failed to browse directory' });
  }
});

// Get list of media files
router.get('/api/files', (req, res) => {
  const mediaFiles = [];

  try {
    const entries = fs.readdirSync(config.OUTPUT_DIR, { withFileTypes: true });

    const mediaEntries = entries
      .filter(entry => !entry.isDirectory()) // Skip directories
      .filter(file => /\.(png|jpe?g|gif|bmp|webp|tiff?|svg|mp4|webm|mov|avi|mkv|flv|wmv|m4v|3gp|ogv)$/i.test(file.name)) // Media files
      .filter(file => !file.name.startsWith('._')); // Skip dot-underscore files

    mediaEntries.forEach(file => {
      const filePath = path.join(config.OUTPUT_DIR, file.name);
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
router.get('/media/:filename', (req, res) => {
  try {
    const filename = decodeURIComponent(req.params.filename);
    const filePath = path.join(config.OUTPUT_DIR, filename);
    
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
      } else if (filename.toLowerCase().endsWith('.jpg') || filename.toLowerCase().endsWith('.jpeg')) {
        res.set('Content-Type', 'image/jpeg');
      } else if (filename.toLowerCase().endsWith('.gif')) {
        res.set('Content-Type', 'image/gif');
      } else if (filename.toLowerCase().endsWith('.webp')) {
        res.set('Content-Type', 'image/webp');
      } else if (filename.toLowerCase().endsWith('.mp4') || filename.toLowerCase().endsWith('.m4v')) {
        res.set('Content-Type', 'video/mp4');
      } else if (filename.toLowerCase().endsWith('.webm')) {
        res.set('Content-Type', 'video/webm');
      } else if (filename.toLowerCase().endsWith('.mov')) {
        res.set('Content-Type', 'video/quicktime');
      } else if (filename.toLowerCase().endsWith('.avi')) {
        res.set('Content-Type', 'video/x-msvideo');
      } else if (filename.toLowerCase().endsWith('.mkv')) {
        res.set('Content-Type', 'video/x-matroska');
      } else if (filename.toLowerCase().endsWith('.ogv')) {
        res.set('Content-Type', 'video/ogg');
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
router.get('/api/history', (req, res) => {
  res.json(actionHistory);
});

// Queue workflow in ComfyUI
router.post('/api/queue-workflow', async (req, res) => {
  try {
    const { filename, modifySeeds, comfyUrl } = req.body;
    
    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }
    
    const filePath = path.join(config.OUTPUT_DIR, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Extract workflow from image
    const metadata = await fileOps.extractComfyMetadata(filePath, filename);
    
    // Try prompt first (API format), then workflow (GUI format)
    let workflowData;
    if (metadata.prompt) {
      console.log('Using prompt (API format) for queuing');
      workflowData = metadata.prompt;
    } else if (metadata.workflow) {
      console.log('Using workflow (GUI format) for queuing');
      workflowData = metadata.workflow;
    } else {
      return res.status(404).json({ error: 'No workflow found in image metadata' });
    }
    
    // Debug: Log workflow structure
    console.log('Workflow type:', typeof workflowData);
    console.log('Workflow keys:', Object.keys(workflowData).slice(0, 10));
    
    // Check if this looks like API format (numbered keys with class_type)
    const firstKey = Object.keys(workflowData)[0];
    const firstValue = workflowData[firstKey];
    console.log('First key:', firstKey, 'First value type:', typeof firstValue);
    if (firstValue && typeof firstValue === 'object' && firstValue.class_type) {
      console.log('Detected API format workflow');
    } else {
      console.log('Detected GUI format workflow - this may cause issues');
    }
    
    // Modify seeds if requested
    if (modifySeeds) {
      workflowData = modifyWorkflowSeeds(workflowData);
      console.log('Seeds modified for queuing');
    }
    
    // Generate client ID
    const clientId = 'swipe-save-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    // Determine ComfyUI URL
    const targetUrl = comfyUrl || getDefaultComfyUIUrl(req);
    
    // Queue the workflow
    const fetch = require('node-fetch');
    const response = await fetch(`${targetUrl}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: workflowData,
        client_id: clientId
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ComfyUI API error: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Workflow queued successfully:', result);
    
    res.json({ 
      success: true, 
      result: result,
      comfyUrl: targetUrl,
      modifiedSeeds: modifySeeds
    });
    
  } catch (error) {
    console.error('Error queueing workflow:', error);
    res.status(500).json({ error: error.message });
  }
});

// Extract workflow from image
router.get('/api/workflow/:filename', async (req, res) => {
  try {
    const filename = decodeURIComponent(req.params.filename);
    const filePath = path.join(config.OUTPUT_DIR, filename);
    
    console.log(`Extracting workflow from: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    if (fs.statSync(filePath).isDirectory()) {
      return res.status(400).json({ error: 'Path is a directory, not a file' });
    }
    
    // Extract metadata including workflow
    const metadata = await fileOps.extractComfyMetadata(filePath, filename);
    console.log(`Metadata extracted:`, Object.keys(metadata));
    
    // Check if workflow was found
    if (metadata.workflow) {
      try {
        // If it's already an object, return it directly
        if (typeof metadata.workflow === 'object') {
          res.json(metadata.workflow);
        } else {
          // Log what we're trying to parse
          console.log(`Attempting to parse workflow string: ${metadata.workflow.substring(0, 100)}...`);
          // Try to parse the workflow JSON
          const workflowData = JSON.parse(metadata.workflow);
          res.json(workflowData);
        }
      } catch (parseError) {
        console.error('Error parsing workflow JSON:', parseError.message);
        console.error('First 200 chars of workflow data:', metadata.workflow.substring(0, 200));
        res.status(500).json({ error: 'Invalid workflow JSON in image metadata', preview: metadata.workflow.substring(0, 100) });
      }
    } else {
      console.log(`Available metadata keys: ${Object.keys(metadata)}`);
      res.status(404).json({ error: 'No workflow found in image metadata' });
    }
  } catch (error) {
    console.error('Error extracting workflow:', error);
    res.status(500).json({ error: 'Failed to extract workflow from image' });
  }
});

// Undo last action
router.post('/api/undo', (req, res) => {
  try {
    if (actionHistory.length === 0) {
      return res.status(400).json({ error: 'No actions to undo' });
    }
    
    const lastAction = actionHistory.pop();
    let successfulUndo = false;
    
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
          successfulUndo = fileOps.moveFile(lastAction.destPath, lastAction.sourcePath);
          if (successfulUndo) {
            console.log(`Moved file back from ${lastAction.destPath} to ${lastAction.sourcePath}`);
          }
        }
        
        // If there was a copy made (e.g., in super save or right swipe)
        if (successfulUndo && lastAction.bestCopyPath && fs.existsSync(lastAction.bestCopyPath)) {
          fs.removeSync(lastAction.bestCopyPath);
          console.log(`Removed copied file: ${lastAction.bestCopyPath}`);
        }
        
        if (successfulUndo && lastAction.copyPath && fs.existsSync(lastAction.copyPath)) {
          fs.removeSync(lastAction.copyPath);
          console.log(`Removed copied file: ${lastAction.copyPath}`);
        }
        
        // Log the undo action
        if (successfulUndo) {
          fileOps.logSimpleAction('undo', {
            filename: lastAction.filename,
            sourcePath: lastAction.destPath,
            destPath: lastAction.sourcePath
          });
        }
      } else {
        console.log(`Destination file not found for undo: ${lastAction.destPath}`);
        return res.status(404).json({ error: 'File not found for undo operation' });
      }
    }
    
    res.json({ success: true, undoneAction: lastAction, message: 'Reload needed' });
  } catch (error) {
    console.error('Error undoing action:', error);
    res.status(500).json({ error: error.message });
  }
});

// Handle file operations (swipe actions)
router.post('/api/files/action', async (req, res) => {
  const { filename, action, customFilename } = req.body;
  const sourcePath = path.join(config.OUTPUT_DIR, filename);
  
  try {
    // First check if sourcePath is a file, not a directory
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Source file does not exist: ${sourcePath}`);
    }
    
    if (fs.statSync(sourcePath).isDirectory()) {
      throw new Error(`Source is a directory, not a file: ${sourcePath}`);
    }
    
    // Extract metadata BEFORE moving the file
    const fileMetadata = await fileOps.extractComfyMetadata(sourcePath, filename);
    
    // Determine target filename
    const targetFilename = customFilename || filename;
    
    let actionRecord = {
      action,
      filename,
      sourcePath,
      targetFilename,
      timestamp: new Date().toISOString(),
      metadata: fileMetadata  // Store metadata directly in the action record
    };

    // Get file creation date for organizing
    const fileDate = fileOps.getFileCreationDate(sourcePath);

    // Determine action type (normalize swipe directions to specific action types)
    let actionType = action;
    if (action === 'left') actionType = 'archive';
    if (action === 'right') actionType = 'saved';
    if (action === 'up') actionType = 'best_complete';
    if (action === 'down') actionType = 'delete';

    switch(actionType) {
      case 'archive':
      case 'archive_good':
      case 'archive_bad': {
        // Create date folder based on file creation date
        const dateFolderPath = path.join(config.OUTPUT_DIR, fileDate);
        
        if (!fs.existsSync(dateFolderPath)) {
          fs.mkdirSync(dateFolderPath, { recursive: true });
        }
        
        // Move to date folder
        const destPath = path.join(dateFolderPath, targetFilename);
        
        // Move file with proper checking
        if (!fileOps.moveFile(sourcePath, destPath)) {
          throw new Error(`Failed to move file to ${destPath}`);
        }
        
        actionRecord.destPath = destPath;
        
        // Log the action with the pre-extracted metadata
        fileOps.logSimpleAction(actionType, {
          filename,
          targetFilename,
          sourcePath,
          destPath,
          fileDate,
          metadata: fileMetadata,
          action: actionType
        });
        
        break;
      }
      
      case 'saved':
      case 'saved_wip': {
        // Create date folder for saved files
        const dateFolderPath = path.join(config.OUTPUT_DIR, fileDate);
        if (!fs.existsSync(dateFolderPath)) {
          fs.mkdirSync(dateFolderPath, { recursive: true });
        }
        
        // For work-in-progress, create a "wip" subfolder
        let destFolder = dateFolderPath;
        if (actionType === 'saved_wip') {
          destFolder = path.join(dateFolderPath, 'wip');
          if (!fs.existsSync(destFolder)) {
            fs.mkdirSync(destFolder, { recursive: true });
          }
        }
        
        // Move to appropriate folder
        const destPath = path.join(destFolder, targetFilename);
        
        // Move file with proper checking
        if (!fileOps.moveFile(sourcePath, destPath)) {
          throw new Error(`Failed to move file to ${destPath}`);
        }
        
        actionRecord.destPath = destPath;
        
        // Log the move action
        fileOps.logSimpleAction(actionType, {
          filename,
          targetFilename,
          sourcePath,
          destPath,
          fileDate,
          metadata: fileMetadata,
          action: actionType
        });
        
        // Also copy to local save directory
        const copyDateFolder = path.join(config.LOCAL_COPY_DIR, fileDate);
        if (!fs.existsSync(copyDateFolder)) {
          fs.mkdirSync(copyDateFolder, { recursive: true });
        }
        
        // For work-in-progress, create a "wip" subfolder in the copy location too
        let copyDestFolder = copyDateFolder;
        if (actionType === 'saved_wip') {
          copyDestFolder = path.join(copyDateFolder, 'wip');
          if (!fs.existsSync(copyDestFolder)) {
            fs.mkdirSync(copyDestFolder, { recursive: true });
          }
        }
        
        // Define copy path
        const copyPath = path.join(copyDestFolder, targetFilename);
        
        // Copy the file
        if (!fileOps.copyFile(destPath, copyPath)) {
          throw new Error(`Failed to copy file to ${copyPath}`);
        }
        
        actionRecord.copyPath = copyPath;
        
        // Log the copy action
        fileOps.logSimpleAction(`${actionType}_copy`, {
          filename,
          targetFilename,
          sourcePath: destPath,
          destPath: copyPath,
          fileDate,
          metadata: fileMetadata,
          action: actionType
        });
        
        break;
      }
      
      case 'best_complete':
      case 'best_wip': {
        // "Super save" - Copy to best subfolder within the date folder
        try {
          console.log(`SUPER SAVE: Processing file: ${filename} as ${actionType}`);
          
          // Create date folder in local copy directory
          const copyDateFolder = path.join(config.LOCAL_COPY_DIR, fileDate);
          if (!fs.existsSync(copyDateFolder)) {
            fs.mkdirSync(copyDateFolder, { recursive: true });
          }
          
          // Create the appropriate best folder based on action
          // Updated path for best_wip to be under the best folder (best/wip)
          let bestFolder;
          if (actionType === 'best_complete') {
            bestFolder = path.join(copyDateFolder, 'best');
          } else { // best_wip
            bestFolder = path.join(copyDateFolder, 'best', 'wip');
          }
          
          if (!fs.existsSync(bestFolder)) {
            fs.mkdirSync(bestFolder, { recursive: true });
          }
          
          // Define the destination path
          const bestDestPath = path.join(bestFolder, targetFilename);
          
          // Copy the file
          if (!fileOps.copyFile(sourcePath, bestDestPath)) {
            throw new Error(`Failed to copy file to: ${bestDestPath}`);
          }
          
          console.log(`SUPER SAVE: File copied to best folder: ${bestDestPath}`);
          
          // Also move original to dated folder in output dir
          const dateFolderPath = path.join(config.OUTPUT_DIR, fileDate);
          if (!fs.existsSync(dateFolderPath)) {
            fs.mkdirSync(dateFolderPath, { recursive: true });
          }
          
          // Set the destination path for the original file
          const movedOriginal = path.join(dateFolderPath, targetFilename);
          
          // Move the original file to the date folder
          if (!fileOps.moveFile(sourcePath, movedOriginal)) {
            throw new Error(`Failed to move original file to: ${movedOriginal}`);
          }
          
          console.log(`SUPER SAVE: Original file moved to: ${movedOriginal}`);
          
          actionRecord.bestCopyPath = bestDestPath;
          actionRecord.destPath = movedOriginal;
          
          // Log the super save action
          fileOps.logSimpleAction(actionType, {
            filename,
            targetFilename,
            sourcePath,
            bestDestPath,
            movedOriginal,
            fileDate,
            metadata: fileMetadata,
            action: actionType
          });
          
          console.log(`SUPER SAVE: Completed successfully as ${actionType}`);
        } catch (error) {
          console.error(`SUPER SAVE ERROR: ${error.message}`);
          console.error(error.stack);
          
          // Log the error
          fileOps.logSimpleAction(`${actionType}_error`, {
            filename,
            targetFilename,
            sourcePath,
            error: error.message,
            metadata: fileMetadata
          });
          
          throw error; // Re-throw to be caught by the outer try/catch
        }
        break;
      }
      
      case 'delete': {
        // Move to deleted folder
        // Check if deleted directory exists
        if (!fs.existsSync(config.DELETED_DIR)) {
          fs.mkdirSync(config.DELETED_DIR, { recursive: true });
        }
        
        const destPath = path.join(config.DELETED_DIR, targetFilename);
        
        // Move file with proper checking
        if (!fileOps.moveFile(sourcePath, destPath)) {
          throw new Error(`Failed to move file to ${destPath}`);
        }
        
        actionRecord.destPath = destPath;
        
        // Log the delete action
        fileOps.logSimpleAction('delete', {
          filename,
          targetFilename,
          sourcePath,
          destPath,
          fileDate,
          metadata: fileMetadata,
          action: actionType
        });
        break;
      }
      
      default:
        throw new Error(`Unknown action: ${action} (normalized to ${actionType})`);
    }
    
    // Add action to history
    actionHistory.push(actionRecord);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error handling file action:', error);
    
    // Log the error
    fileOps.logSimpleAction('error', {
      filename: filename || 'unknown',
      sourcePath: sourcePath || 'unknown',
      error: error.message,
      action
    });
    
    res.status(500).json({ error: error.message });
  }
});

module.exports = { router, actionHistory };
