const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const router = express.Router();
const fileOps = require('./fileOperations');
const config = require('./config');

// Action history for undo functionality
const actionHistory = [];

// Get list of media files
router.get('/api/files', (req, res) => {
  const mediaFiles = [];

  try {
    const entries = fs.readdirSync(config.OUTPUT_DIR, { withFileTypes: true });

    const mediaEntries = entries
      .filter(entry => !entry.isDirectory()) // Skip directories
      .filter(file => /\.(png|mp4|webm)$/i.test(file.name)) // Only media files
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
router.get('/api/history', (req, res) => {
  res.json(actionHistory);
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
