const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const router = express.Router();
const fileOps = require('../fileOperations');
const config = require('../config');

// Action history for undo functionality
const actionHistory = [];

// Helper functions for path generation based on datestamp folder setting
function getTargetBasePath(fileDate, baseDir) {
  const currentConfig = config.getCurrentConfig();
  if (currentConfig.useDatestampFolders) {
    return path.join(baseDir, fileDate);
  }
  return baseDir;
}

function getTargetSubfolderPath(fileDate, baseDir, subfolder) {
  const basePath = getTargetBasePath(fileDate, baseDir);
  if (subfolder) {
    return path.join(basePath, subfolder);
  }
  return basePath;
}

// Get list of media files
router.get('/api/files', (req, res) => {
  const mediaFiles = [];

  try {
    const entries = fs.readdirSync(config.OUTPUT_DIR, { withFileTypes: true });

    const mediaEntries = entries
      .filter(entry => !entry.isDirectory())
      .filter(file => /\.(png|jpe?g|gif|bmp|webp|tiff?|svg|mp4|webm|mov|avi|mkv|flv|wmv|m4v|3gp|ogv)$/i.test(file.name))
      .filter(file => !file.name.startsWith('._'));

    mediaEntries.forEach(file => {
      const filePath = path.join(config.OUTPUT_DIR, file.name);
      const stats = fs.statSync(filePath);

      const encodedFilename = encodeURIComponent(file.name);

      mediaFiles.push({
        name: file.name,
        path: `/media/${encodedFilename}`,
        size: stats.size,
        date: stats.mtime
      });
    });

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
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        console.error(`ERROR: Tried to serve a directory as a file: ${filePath}`);
        return res.status(400).send('Path is a directory, not a file');
      }

      res.set('Access-Control-Allow-Origin', '*');
      res.set('Cache-Control', 'no-store');

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

    if (lastAction.sourcePath && lastAction.destPath) {
      if (fs.existsSync(lastAction.destPath)) {
        if (fs.statSync(lastAction.destPath).isDirectory()) {
          fs.removeSync(lastAction.destPath);
          console.log(`Removed directory that was supposed to be a file: ${lastAction.destPath}`);
        } else {
          successfulUndo = fileOps.moveFile(lastAction.destPath, lastAction.sourcePath);
          if (successfulUndo) {
            console.log(`Moved file back from ${lastAction.destPath} to ${lastAction.sourcePath}`);
          }
        }

        if (successfulUndo && lastAction.bestCopyPath && fs.existsSync(lastAction.bestCopyPath)) {
          fs.removeSync(lastAction.bestCopyPath);
          console.log(`Removed copied file: ${lastAction.bestCopyPath}`);
        }

        if (successfulUndo && lastAction.copyPath && fs.existsSync(lastAction.copyPath)) {
          fs.removeSync(lastAction.copyPath);
          console.log(`Removed copied file: ${lastAction.copyPath}`);
        }

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
    // More robust file verification
    if (!fs.existsSync(sourcePath)) {
      return res.status(404).json({ error: `File ${filename} not found. It may have been moved or deleted.` });
    }

    let sourceStats;
    try {
      sourceStats = fs.statSync(sourcePath);
    } catch (error) {
      return res.status(404).json({ error: `Cannot access file ${filename}. It may have been moved or deleted.` });
    }

    if (sourceStats.isDirectory()) {
      return res.status(400).json({ error: `${filename} is a directory, not a file.` });
    }

    const fileMetadata = await fileOps.extractComfyMetadata(sourcePath, filename);

    const targetFilename = customFilename || filename;

    let actionRecord = {
      action,
      filename,
      sourcePath,
      targetFilename,
      timestamp: new Date().toISOString(),
      metadata: fileMetadata
    };

    const fileDate = fileOps.getFileCreationDate(sourcePath);

    let actionType = action;
    if (action === 'left') actionType = 'archive';
    if (action === 'right') actionType = 'saved';
    if (action === 'up') actionType = 'best_complete';
    if (action === 'down') actionType = 'delete';

    switch(actionType) {
      case 'archive':
      case 'archive_good':
      case 'archive_bad': {
        const targetPath = getTargetBasePath(fileDate, config.OUTPUT_DIR);
        const destPath = path.join(targetPath, targetFilename);

        // Skip move if source and destination are the same
        if (sourcePath === destPath) {
          console.log(`File ${filename} already in correct location, skipping move`);
          actionRecord.destPath = destPath;
        } else {
          if (!fs.existsSync(targetPath)) {
            fs.mkdirSync(targetPath, { recursive: true });
          }

          if (!fileOps.moveFile(sourcePath, destPath)) {
            throw new Error(`Failed to move file to ${destPath}`);
          }
          actionRecord.destPath = destPath;
        }

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
        const subfolder = actionType === 'saved_wip' ? 'wip' : null;
        const destFolder = getTargetSubfolderPath(fileDate, config.OUTPUT_DIR, subfolder);
        const destPath = path.join(destFolder, targetFilename);

        // Skip move if source and destination are the same
        if (sourcePath === destPath) {
          console.log(`File ${filename} already in correct location, skipping move`);
          actionRecord.destPath = destPath;
        } else {
          if (!fs.existsSync(destFolder)) {
            fs.mkdirSync(destFolder, { recursive: true });
          }

          if (!fileOps.moveFile(sourcePath, destPath)) {
            throw new Error(`Failed to move file to ${destPath}`);
          }
          actionRecord.destPath = destPath;
        }

        fileOps.logSimpleAction(actionType, {
          filename,
          targetFilename,
          sourcePath,
          destPath,
          fileDate,
          metadata: fileMetadata,
          action: actionType
        });

        const copySubfolder = actionType === 'saved_wip' ? 'wip' : null;
        const copyDestFolder = getTargetSubfolderPath(fileDate, config.LOCAL_COPY_DIR, copySubfolder);
        
        if (!fs.existsSync(copyDestFolder)) {
          fs.mkdirSync(copyDestFolder, { recursive: true });
        }

        const copyPath = path.join(copyDestFolder, targetFilename);

        if (!fileOps.copyFile(destPath, copyPath)) {
          throw new Error(`Failed to copy file to ${copyPath}`);
        }

        actionRecord.copyPath = copyPath;

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
        try {
          console.log(`SUPER SAVE: Processing file: ${filename} as ${actionType}`);

          const bestSubfolder = actionType === 'best_complete' ? 'best' : 'best/wip';
          const bestFolder = getTargetSubfolderPath(fileDate, config.LOCAL_COPY_DIR, bestSubfolder);
          
          if (!fs.existsSync(bestFolder)) {
            fs.mkdirSync(bestFolder, { recursive: true });
          }

          const bestDestPath = path.join(bestFolder, targetFilename);

          if (!fileOps.copyFile(sourcePath, bestDestPath)) {
            throw new Error(`Failed to copy file to: ${bestDestPath}`);
          }

          console.log(`SUPER SAVE: File copied to best folder: ${bestDestPath}`);

          const originalTargetPath = getTargetBasePath(fileDate, config.OUTPUT_DIR);
          const movedOriginal = path.join(originalTargetPath, targetFilename);

          // Skip move if source and destination are the same
          if (sourcePath !== movedOriginal) {
            if (!fs.existsSync(originalTargetPath)) {
              fs.mkdirSync(originalTargetPath, { recursive: true });
            }

            if (!fileOps.moveFile(sourcePath, movedOriginal)) {
              throw new Error(`Failed to move original file to: ${movedOriginal}`);
            }
          } else {
            console.log(`File ${filename} already in correct location for best action`);
          }

          console.log(`SUPER SAVE: Original file moved to: ${movedOriginal}`);

          actionRecord.bestCopyPath = bestDestPath;
          actionRecord.destPath = movedOriginal;

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

          fileOps.logSimpleAction(`${actionType}_error`, {
            filename,
            targetFilename,
            sourcePath,
            error: error.message,
            metadata: fileMetadata
          });

          throw error;
        }
        break;
      }

      case 'delete': {
        if (!fs.existsSync(config.DELETED_DIR)) {
          fs.mkdirSync(config.DELETED_DIR, { recursive: true });
        }

        const destPath = path.join(config.DELETED_DIR, targetFilename);

        if (!fileOps.moveFile(sourcePath, destPath)) {
          throw new Error(`Failed to move file to ${destPath}`);
        }

        actionRecord.destPath = destPath;

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

    actionHistory.push(actionRecord);

    res.json({ success: true });
  } catch (error) {
    console.error('Error handling file action:', error);

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
