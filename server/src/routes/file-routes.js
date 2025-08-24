const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const router = express.Router();
const fileOps = require('../fileOperations');
const config = require('../config');
const PreviewService = require('../services/preview-service');
const FilterService = require('../services/filter-service');

// Initialize services
const previewService = new PreviewService();
const filterService = new FilterService();

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

// Helper function to create backup copy when toggle is enabled
function createBackupCopy(sourcePath, filename, fileDate, actionType, saveCopiesEnabled) {
  if (!saveCopiesEnabled) {
    return null; // No backup needed
  }

  try {
    const currentConfig = config.getCurrentConfig();
    
    // Create backup structure: SOURCE/copies/YYYY-MM-DD/action_folder/filename
    const backupBaseDir = path.join(currentConfig.sourceDir, 'copies');
    const backupDateDir = currentConfig.useDatestampFolders ? 
      path.join(backupBaseDir, fileDate) : backupBaseDir;
    
    let backupActionDir;
    switch(actionType) {
      case 'archive':
      case 'archive_good':
      case 'archive_bad':
        backupActionDir = path.join(backupDateDir, 'archive');
        break;
      case 'saved':
      case 'saved_wip':
        backupActionDir = path.join(backupDateDir, 'saved');
        break;
      case 'best_complete':
      case 'best_wip':
        backupActionDir = path.join(backupDateDir, 'best');
        break;
      case 'delete':
        return null; // No backup for delete operations (files go to trash)
      default:
        backupActionDir = path.join(backupDateDir, 'other');
    }

    const backupPath = path.join(backupActionDir, filename);

    // Create backup directory structure
    if (!fs.existsSync(backupActionDir)) {
      fs.mkdirSync(backupActionDir, { recursive: true });
    }

    // Copy file to backup location
    if (fileOps.copyFile(sourcePath, backupPath)) {
      console.log(`BACKUP: Created backup copy at ${backupPath}`);
      return backupPath;
    } else {
      console.error(`BACKUP: Failed to create backup copy at ${backupPath}`);
      return null;
    }
  } catch (error) {
    console.error(`BACKUP ERROR: ${error.message}`);
    return null;
  }
}

// Flat directory scanning - no recursion for performance
function scanDirectoryFlat(dirPath, limit = config.FILE_LIMIT || Number.MAX_SAFE_INTEGER) {
  const mediaFiles = [];
  
  try {
    console.log(`Flat scanning directory: ${dirPath}`);
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      // Stop if we've reached limit
      if (mediaFiles.length >= limit) {
        console.log(`Reached limit of ${limit} files, stopping scan`);
        break;
      }
      
      // Only process files, no subdirectories
      if (entry.isFile()) {
        // Check if it's a media file
        if (/\.(png|jpe?g|gif|bmp|webp|tiff?|svg|mp4|webm|mov|avi|mkv|flv|wmv|m4v|3gp|ogv)$/i.test(entry.name) && 
            !entry.name.startsWith('._')) {
          
          const fullPath = path.join(dirPath, entry.name);
          const stats = fs.statSync(fullPath);
          
          mediaFiles.push({
            name: entry.name,
            relativePath: entry.name, // Just filename for flat scan
            path: `/media/${encodeURIComponent(entry.name)}`,
            size: stats.size,
            date: stats.mtime
          });
        }
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
  }
  
  console.log(`Flat scan found ${mediaFiles.length} media files`);
  return mediaFiles;
}

// Recursive function to scan directories for media files (DEPRECATED - causes performance issues)
function scanDirectoryRecursive(dirPath, relativePath = '') {
  const mediaFiles = [];
  
  // Directories to exclude from scanning (created by the app)
  const excludedDirs = [
    'archive',    // Archived files (left swipe)
    'deleted',    // Deleted files (down swipe)
    'copies',     // Backup copies when sorting
    'best',       // Best files (up swipe)
    'wip',        // Work in progress files
    'swipe-save'  // Destination directory if it exists in source
  ];
  
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relativeFilePath = path.join(relativePath, entry.name);
      
      if (entry.isDirectory()) {
        // Skip excluded directories
        if (excludedDirs.includes(entry.name.toLowerCase())) {
          console.log(`Skipping excluded directory: ${relativeFilePath}`);
          continue;
        }
        
        // Recursively scan subdirectories
        const subFiles = scanDirectoryRecursive(fullPath, relativeFilePath);
        mediaFiles.push(...subFiles);
      } else if (entry.isFile()) {
        // Check if it's a media file
        if (/\.(png|jpe?g|gif|bmp|webp|tiff?|svg|mp4|webm|mov|avi|mkv|flv|wmv|m4v|3gp|ogv)$/i.test(entry.name) && 
            !entry.name.startsWith('._')) {
          
          const stats = fs.statSync(fullPath);
          const encodedRelativePath = relativeFilePath.split(path.sep).map(encodeURIComponent).join('/');
          
          mediaFiles.push({
            name: entry.name,
            relativePath: relativeFilePath,
            path: `/media/${encodedRelativePath}`,
            size: stats.size,
            date: stats.mtime
          });
        }
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
  }
  
  return mediaFiles;
}

// Get list of media files using multi-directory system with pagination
router.get('/api/media', async (req, res) => {
  try {
    // Use unlimited when no limit specified, or use provided limit
    const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
    const offset = parseInt(req.query.offset) || 0;
    let sortBy = req.query.sortBy || 'date';
    let order = req.query.order || 'desc';
    
    // If no sorting params provided, try to load from saved state
    if (!req.query.sortBy && !req.query.order) {
      try {
        const os = require('os');
        const savedStatePath = path.join(os.homedir(), '.config', 'swipe-save', 'filters', 'current-state.json');
        if (await fs.pathExists(savedStatePath)) {
          const savedState = await fs.readJson(savedStatePath);
          if (savedState && savedState.appliedSorting) {
            sortBy = savedState.appliedSorting.field || 'date';
            order = savedState.appliedSorting.direction || 'desc';
            console.log('Using saved sorting:', { sortBy, order });
          }
        }
      } catch (error) {
        console.error('Error loading saved sorting state:', error);
      }
    }
    const includePreviews = req.query.includePreviews === 'true';
    const sources = req.query.sources; // 'enabled', 'all', or specific IDs
    const directories = req.query.directories; // Specific directory IDs
    const groups = req.query.groups; // Specific group IDs
    
    // Load directory configuration
    const DirectoryConfigService = require('../services/directory-config-service');
    const MultiDirectoryScanner = require('../services/multi-directory-scanner');
    
    const dirService = new DirectoryConfigService();
    const scanner = new MultiDirectoryScanner();
    const dirConfig = dirService.loadConfig();
    
    let allFiles = [];
    
    if (groups) {
      // Get files from specific groups
      const groupIds = groups.split(',');
      allFiles = scanner.getFilesFromGroups(
        dirConfig.sources.directories, 
        dirConfig.sources.groups, 
        groupIds, 
        { limit: Number.MAX_SAFE_INTEGER, sortBy, order } // Get all files first
      );
    } else if (directories) {
      // Get files from specific directories
      const directoryIds = directories.split(',');
      allFiles = scanner.getFilesFromDirectories(
        dirConfig.sources.directories, 
        directoryIds, 
        { limit: Number.MAX_SAFE_INTEGER, sortBy, order } // Get all files first
      );
    } else {
      // Default: get files from all enabled directories
      const enabledDirectories = dirService.getEnabledDirectories(dirConfig);
      console.log(`Found ${enabledDirectories.length} enabled directories:`, enabledDirectories.map(d => d.path));
      allFiles = scanner.scanEnabledDirectories(enabledDirectories, { limit: null, sortBy, order });
    }
    
    // Apply filters if provided, or load saved state if no explicit filters
    let filterConfig = null;
    let usedSavedState = false;
    
    if (req.query.filters) {
      try {
        filterConfig = JSON.parse(req.query.filters);
      } catch (error) {
        console.error('Error parsing filters:', error);
      }
    } else {
      // Load saved filter state if no explicit filters provided
      try {
        const os = require('os');
        const savedStatePath = path.join(os.homedir(), '.config', 'swipe-save', 'filters', 'current-state.json');
        if (await fs.pathExists(savedStatePath)) {
          const savedState = await fs.readJson(savedStatePath);
          if (savedState && savedState.appliedFilters) {
            // Check if there are any meaningful filters to apply
            const hasFilters = !!(
              savedState.appliedFilters.filename ||
              savedState.appliedFilters.metadata ||
              savedState.appliedFilters.date ||
              savedState.appliedFilters.size ||
              (savedState.appliedMediaTypes && savedState.appliedMediaTypes.length > 0)
            );
            
            if (hasFilters) {
              filterConfig = { ...savedState.appliedFilters };
              if (savedState.appliedMediaTypes && savedState.appliedMediaTypes.length > 0) {
                filterConfig.mediaTypes = savedState.appliedMediaTypes;
              }
              usedSavedState = true;
              console.log('Using saved filter state:', filterConfig);
            }
          }
        }
      } catch (error) {
        console.error('Error loading saved filter state:', error);
      }
    }
    
    if (filterConfig) {
      allFiles = filterService.applyFilters(allFiles, filterConfig);
      console.log(`Applied ${usedSavedState ? 'saved' : 'provided'} filters, ${allFiles.length} files remaining`);
    }
    
    // Apply sorting if filters were applied (may have changed order) or use saved sorting
    if ((req.query.filters || usedSavedState) && req.query.sortBy) {
      const sortConfig = { field: sortBy, direction: order };
      allFiles = filterService.applySorting(allFiles, sortConfig);
    }
    
    // Apply pagination
    const totalItems = allFiles.length;
    // Handle unlimited vs paginated requests
    let totalPages, currentPage, mediaFiles;
    if (limit) {
      // Paginated request
      totalPages = Math.ceil(totalItems / limit);
      currentPage = Math.floor(offset / limit) + 1;
      mediaFiles = allFiles.slice(offset, offset + limit);
    } else {
      // Unlimited request - return all files
      totalPages = 1;
      currentPage = 1;
      mediaFiles = allFiles;
    }
    
    // Generate previews if requested
    let processedFiles = mediaFiles;
    if (includePreviews) {
      console.log(`Generating previews for ${mediaFiles.length} files...`);
      processedFiles = await previewService.generatePreviews(mediaFiles);
    }
    
    const response = {
      items: processedFiles,
      pagination: {
        currentPage,
        totalPages,
        itemsPerPage: limit || totalItems,
        totalItems,
        offset,
        hasNext: limit ? (offset + limit < totalItems) : false,
        hasPrev: offset > 0
      }
    };
    
    console.log(`Returning ${processedFiles.length} files (page ${currentPage}/${totalPages}) from multi-directory scan`);
    res.json(response);
  } catch (error) {
    console.error('Error scanning media files:', error);
    res.status(500).json({ error: 'Failed to scan directories: ' + error.message });
  }
});

// Legacy API endpoint for backward compatibility
router.get('/api/files', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : (config.FILE_LIMIT || null);
    const offset = parseInt(req.query.offset) || 0;
    const sortBy = req.query.sortBy || 'date';
    const order = req.query.order || 'desc';
    const sources = req.query.sources;
    const directories = req.query.directories;
    const groups = req.query.groups;
    
    // Load directory configuration
    const DirectoryConfigService = require('../services/directory-config-service');
    const MultiDirectoryScanner = require('../services/multi-directory-scanner');
    
    const dirService = new DirectoryConfigService();
    const scanner = new MultiDirectoryScanner();
    const dirConfig = dirService.loadConfig();
    
    let allFiles = [];
    
    if (groups) {
      const groupIds = groups.split(',');
      allFiles = scanner.getFilesFromGroups(
        dirConfig.sources.directories, 
        dirConfig.sources.groups, 
        groupIds, 
        { limit: Number.MAX_SAFE_INTEGER, sortBy, order }
      );
    } else if (directories) {
      const directoryIds = directories.split(',');
      allFiles = scanner.getFilesFromDirectories(
        dirConfig.sources.directories, 
        directoryIds, 
        { limit: Number.MAX_SAFE_INTEGER, sortBy, order }
      );
    } else {
      const enabledDirectories = dirService.getEnabledDirectories(dirConfig);
      allFiles = scanner.scanEnabledDirectories(enabledDirectories, { limit: null, sortBy, order });
    }
    
    // Apply pagination if requested
    const startIndex = offset;
    const endIndex = offset + limit;
    const paginatedFiles = allFiles.slice(startIndex, endIndex);
    
    console.log(`Legacy API: Returning ${paginatedFiles.length} files (${startIndex}-${endIndex} of ${allFiles.length})`);
    res.json(paginatedFiles);
  } catch (error) {
    console.error('Error in legacy files API:', error);
    res.status(500).json({ error: 'Failed to load files: ' + error.message });
  }
});

// Preview serving endpoints
router.get('/api/preview/image/:filename', (req, res) => {
  previewService.servePreview('images', req.params.filename, res);
});

router.get('/api/preview/video/:filename', (req, res) => {
  previewService.servePreview('videos', req.params.filename, res);
});

// Preview cache management
router.get('/api/preview/stats', async (req, res) => {
  try {
    const stats = await previewService.getCacheStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get cache stats' });
  }
});

router.delete('/api/preview/cache', async (req, res) => {
  try {
    await previewService.clearCache();
    res.json({ success: true, message: 'Preview cache cleared' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

// Media file handler - supports multi-directory system
router.get('/media/*', (req, res) => {
  try {
    // Get the full path after /media/
    const relativePath = req.params[0];
    const decodedPath = decodeURIComponent(relativePath);
    
    let filePath = null;
    let sourceDirectory = null;
    
    // Try multi-directory system - only check ENABLED directories
    try {
      const DirectoryConfigService = require('../services/directory-config-service');
      const dirService = new DirectoryConfigService();
      const dirConfig = dirService.loadConfig();
      
      // Search through only ENABLED source directories for the file
      for (const directory of dirConfig.sources.directories) {
        // Skip disabled directories - this is the key fix
        if (!directory.enabled) {
          continue;
        }
        
        const testPath = path.join(directory.path, decodedPath);
        if (fs.existsSync(testPath)) {
          filePath = testPath;
          sourceDirectory = directory;
          console.log(`Found file in enabled directory ${directory.name}: ${filePath}`);
          break;
        }
      }
      
      // Also search through feature directories (input picker, etc)
      if (!filePath && dirConfig.sources.featureDirectories) {
        // Check input picker directories
        const inputPickerDirs = dirConfig.sources.featureDirectories.inputPicker || [];
        for (const directory of inputPickerDirs) {
          if (!directory.enabled) {
            continue;
          }
          
          const testPath = path.join(directory.path, decodedPath);
          if (fs.existsSync(testPath)) {
            filePath = testPath;
            sourceDirectory = directory;
            console.log(`Found file in input picker directory ${directory.name}: ${filePath}`);
            break;
          }
        }
      }
      
      // If file not found in enabled directories, don't fall back to legacy path
      if (!filePath) {
        console.log(`File ${decodedPath} not found in any enabled source directories`);
        return res.status(404).send('File not found in enabled source directories');
      }
    } catch (error) {
      console.log('Multi-directory system error:', error);
      return res.status(500).send('Directory configuration error');
    }

    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        console.error(`ERROR: Tried to serve a directory as a file: ${filePath}`);
        return res.status(400).send('Path is a directory, not a file');
      }

      res.set('Access-Control-Allow-Origin', '*');
      
      const filename = path.basename(decodedPath);
      const isVideo = /\.(mp4|m4v|webm|mov|avi|mkv|ogv)$/i.test(filename);
      
      if (isVideo) {
        // Handle video streaming with proper range support
        const range = req.headers.range;
        const videoSize = stats.size;
        
        // Set appropriate content type
        if (filename.toLowerCase().endsWith('.mp4') || filename.toLowerCase().endsWith('.m4v')) {
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
        
        res.set('Accept-Ranges', 'bytes');
        
        if (range) {
          // Parse range header
          const parts = range.replace(/bytes=/, "").split("-");
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : videoSize - 1;
          const chunksize = (end - start) + 1;
          
          // Create read stream with range
          const readStream = fs.createReadStream(filePath, { start, end });
          
          // Set partial content headers
          res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${videoSize}`,
            'Content-Length': chunksize,
          });
          
          readStream.pipe(res);
        } else {
          // No range requested - send full file
          res.set('Content-Length', videoSize);
          fs.createReadStream(filePath).pipe(res);
        }
      } else {
        // Handle images normally
        res.set('Cache-Control', 'no-store');
        
        if (filename.toLowerCase().endsWith('.png')) {
          res.set('Content-Type', 'image/png');
        } else if (filename.toLowerCase().endsWith('.jpg') || filename.toLowerCase().endsWith('.jpeg')) {
          res.set('Content-Type', 'image/jpeg');
        } else if (filename.toLowerCase().endsWith('.gif')) {
          res.set('Content-Type', 'image/gif');
        } else if (filename.toLowerCase().endsWith('.webp')) {
          res.set('Content-Type', 'image/webp');
        }
        
        fs.createReadStream(filePath).pipe(res);
      }
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
  console.log('=== UNDO ENDPOINT HIT ===');
  try {
    console.log(`UNDO: Undo called, history length: ${actionHistory.length}`);
    if (actionHistory.length === 0) {
      return res.status(400).json({ error: 'No actions to undo' });
    }

    const lastAction = actionHistory.pop();
    let successfulUndo = false;

    console.log(`UNDO: Attempting to undo action:`, {
      action: lastAction.action,
      sourcePath: lastAction.sourcePath,
      destPath: lastAction.destPath,
      bestCopyPath: lastAction.bestCopyPath,
      copyPath: lastAction.copyPath
    });

    if (lastAction.sourcePath && lastAction.destPath) {
      if (fs.existsSync(lastAction.destPath)) {
        if (fs.statSync(lastAction.destPath).isDirectory()) {
          fs.removeSync(lastAction.destPath);
          console.log(`Removed directory that was supposed to be a file: ${lastAction.destPath}`);
          successfulUndo = true;
        } else {
          successfulUndo = fileOps.moveFile(lastAction.destPath, lastAction.sourcePath);
          if (successfulUndo) {
            console.log(`UNDO: Moved file back from ${lastAction.destPath} to ${lastAction.sourcePath}`);
          } else {
            console.error(`UNDO: Failed to move file back from ${lastAction.destPath} to ${lastAction.sourcePath}`);
          }
        }
      } else {
        console.log(`UNDO: Destination file not found: ${lastAction.destPath}`);
        return res.status(404).json({ error: 'File not found for undo operation' });
      }

      // Clean up best copy if it exists (for best actions)
      if (lastAction.bestCopyPath && fs.existsSync(lastAction.bestCopyPath)) {
        try {
          fs.removeSync(lastAction.bestCopyPath);
          console.log(`UNDO: Removed best copy: ${lastAction.bestCopyPath}`);
        } catch (error) {
          console.error(`UNDO: Failed to remove best copy: ${error.message}`);
        }
      }

      // Clean up backup copy if it exists (for copy system)
      if (lastAction.copyPath && fs.existsSync(lastAction.copyPath)) {
        try {
          fs.removeSync(lastAction.copyPath);
          console.log(`UNDO: Removed backup copy: ${lastAction.copyPath}`);
        } catch (error) {
          console.error(`UNDO: Failed to remove backup copy: ${error.message}`);
        }
      }

      if (successfulUndo) {
        fileOps.logSimpleAction('undo', {
          filename: lastAction.filename,
          sourcePath: lastAction.destPath,
          destPath: lastAction.sourcePath
        });
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
  console.log('=== ACTION ENDPOINT HIT ===');
  const { filename, action, customFilename, saveCopiesWhenSorting } = req.body;
  const baseFilename = path.basename(filename);
  
  // Find the file in enabled source directories
  let sourcePath = null;
  try {
    const DirectoryConfigService = require('../services/directory-config-service');
    const dirService = new DirectoryConfigService();
    const dirConfig = dirService.loadConfig();
    
    // Search through only ENABLED source directories for the file
    for (const directory of dirConfig.sources.directories) {
      if (!directory.enabled) continue;
      
      const testPath = path.join(directory.path, filename);
      if (fs.existsSync(testPath)) {
        sourcePath = testPath;
        console.log(`Found file for action in directory ${directory.name}: ${sourcePath}`);
        break;
      }
    }
    
    if (!sourcePath) {
      console.log(`File ${filename} not found in any enabled source directories`);
      return res.status(404).json({ error: `File ${filename} not found in enabled source directories. It may have been moved or the source directory may be disabled.` });
    }
  } catch (error) {
    console.error('Error resolving file path with multi-directory system:', error);
    return res.status(500).json({ error: 'Directory configuration error' });
  }

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

    const fileMetadata = await fileOps.extractComfyMetadata(sourcePath, baseFilename);

    const targetFilename = customFilename || baseFilename;

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
        // Create backup copy if enabled
        const backupPath = createBackupCopy(sourcePath, targetFilename, fileDate, actionType, saveCopiesWhenSorting);
        if (backupPath) {
          actionRecord.copyPath = backupPath;
        }

        // Archive goes to SOURCE/archive/, not destination
        const archiveBaseDir = path.join(config.OUTPUT_DIR, 'archive');
        const targetPath = getTargetBasePath(fileDate, archiveBaseDir);
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
        // Create backup copy if enabled
        const backupPath = createBackupCopy(sourcePath, targetFilename, fileDate, actionType, saveCopiesWhenSorting);
        if (backupPath) {
          actionRecord.copyPath = backupPath;
        }

        const subfolder = actionType === 'saved_wip' ? 'wip' : null;
        const destFolder = getTargetSubfolderPath(fileDate, config.LOCAL_COPY_DIR, subfolder);
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

        // Removed redundant copy operation - saved action now just moves file to destination

        break;
      }

      case 'best_complete':
      case 'best_wip': {
        try {
          console.log(`SUPER SAVE: Processing file: ${filename} as ${actionType}`);

          // Create backup copy if enabled
          const backupPath = createBackupCopy(sourcePath, targetFilename, fileDate, actionType, saveCopiesWhenSorting);
          if (backupPath) {
            actionRecord.copyPath = backupPath;
          }

          const bestSubfolder = actionType === 'best_complete' ? 'best' : 'best/wip';
          const bestFolder = getTargetSubfolderPath(fileDate, config.LOCAL_COPY_DIR, bestSubfolder);
          
          if (!fs.existsSync(bestFolder)) {
            fs.mkdirSync(bestFolder, { recursive: true });
          }

          const bestDestPath = path.join(bestFolder, targetFilename);

          if (!fileOps.moveFile(sourcePath, bestDestPath)) {
            throw new Error(`Failed to move file to: ${bestDestPath}`);
          }

          console.log(`SUPER SAVE: File moved to best folder: ${bestDestPath}`);

          actionRecord.destPath = bestDestPath;

          fileOps.logSimpleAction(actionType, {
            filename,
            targetFilename,
            sourcePath,
            destPath: bestDestPath,
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

    console.log(`ACTION: Recorded action:`, {
      action: actionRecord.action,
      sourcePath: actionRecord.sourcePath,
      destPath: actionRecord.destPath,
      bestCopyPath: actionRecord.bestCopyPath,
      copyPath: actionRecord.copyPath
    });

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

// Save file copy to ComfyUI inputs directory
router.post('/api/save-to-inputs', async (req, res) => {
  console.log('=== SAVE TO INPUTS ENDPOINT HIT ===');
  const { sourceFile, destinationPath } = req.body;
  
  if (!sourceFile || !destinationPath) {
    return res.status(400).json({ 
      error: 'Missing required parameters: sourceFile and destinationPath' 
    });
  }

  try {
    // Find the source file in enabled directories
    let sourcePath = null;
    const DirectoryConfigService = require('../services/directory-config-service');
    const dirService = new DirectoryConfigService();
    const dirConfig = dirService.loadConfig();
    
    // Search through only ENABLED source directories for the file
    for (const directory of dirConfig.sources.directories) {
      if (!directory.enabled) continue;
      
      const testPath = path.join(directory.path, sourceFile);
      if (fs.existsSync(testPath)) {
        sourcePath = testPath;
        console.log(`Found source file in directory ${directory.name}: ${sourcePath}`);
        break;
      }
    }
    
    if (!sourcePath) {
      return res.status(404).json({ 
        error: `Source file ${sourceFile} not found in enabled directories` 
      });
    }

    // Verify source file exists and is a file
    if (!fs.existsSync(sourcePath)) {
      return res.status(404).json({ 
        error: `Source file ${sourceFile} not found` 
      });
    }

    const sourceStats = fs.statSync(sourcePath);
    if (sourceStats.isDirectory()) {
      return res.status(400).json({ 
        error: `Source path is a directory, not a file` 
      });
    }

    // Ensure destination directory exists
    if (!fs.existsSync(destinationPath)) {
      try {
        fs.mkdirSync(destinationPath, { recursive: true });
        console.log(`Created destination directory: ${destinationPath}`);
      } catch (error) {
        return res.status(500).json({ 
          error: `Failed to create destination directory: ${error.message}` 
        });
      }
    }

    // Verify destination is a directory
    const destStats = fs.statSync(destinationPath);
    if (!destStats.isDirectory()) {
      return res.status(400).json({ 
        error: `Destination path is not a directory` 
      });
    }

    // Generate destination file path
    const filename = path.basename(sourceFile);
    const destFilePath = path.join(destinationPath, filename);

    // Check if destination file already exists
    if (fs.existsSync(destFilePath)) {
      // Generate unique filename by adding timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const ext = path.extname(filename);
      const nameWithoutExt = path.basename(filename, ext);
      const uniqueFilename = `${nameWithoutExt}_${timestamp}${ext}`;
      const uniqueDestPath = path.join(destinationPath, uniqueFilename);
      
      console.log(`Destination file exists, using unique name: ${uniqueFilename}`);
      
      // Copy file with unique name
      try {
        fs.copySync(sourcePath, uniqueDestPath);
        console.log(`Saved copy to inputs: ${uniqueDestPath}`);
        
        res.json({ 
          success: true, 
          savedPath: uniqueDestPath,
          originalRequested: destFilePath,
          actualSaved: uniqueDestPath
        });
      } catch (error) {
        return res.status(500).json({ 
          error: `Failed to copy file: ${error.message}` 
        });
      }
    } else {
      // Copy file to destination
      try {
        fs.copySync(sourcePath, destFilePath);
        console.log(`Saved copy to inputs: ${destFilePath}`);
        
        res.json({ 
          success: true, 
          savedPath: destFilePath 
        });
      } catch (error) {
        return res.status(500).json({ 
          error: `Failed to copy file: ${error.message}` 
        });
      }
    }
  } catch (error) {
    console.error('Error in save-to-inputs:', error);
    res.status(500).json({ 
      error: `Server error: ${error.message}` 
    });
  }
});

// Dedicated endpoint for input picker files
router.get('/api/media/input-picker', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
    const offset = parseInt(req.query.offset) || 0;
    const sortBy = req.query.sortBy || 'date';
    const order = req.query.order || 'desc';

    // Load directory configuration
    const DirectoryConfigService = require('../services/directory-config-service');
    
    const dirService = new DirectoryConfigService();
    const dirConfig = dirService.loadConfig();
    
    // Get input picker directories only
    const inputDirectories = dirConfig.sources?.featureDirectories?.inputPicker || [];
    const enabledInputDirs = inputDirectories.filter(dir => dir.enabled);
    
    if (enabledInputDirs.length === 0) {
      return res.json({ files: [], totalFiles: 0 });
    }

    console.log(`Input picker scanning ${enabledInputDirs.length} directories:`, enabledInputDirs.map(d => d.path));
    
    let allFiles = [];
    for (const dir of enabledInputDirs) {
      try {
        const files = scanDirectoryFlat(dir.path, limit);
        // Add directory info to each file
        const filesWithDir = files.map(file => ({
          ...file,
          directoryId: dir.id,
          directoryName: dir.name,
          directoryPath: dir.path
        }));
        allFiles.push(...filesWithDir);
      } catch (error) {
        console.error(`Error scanning input directory ${dir.path}:`, error);
      }
    }

    // Sort all files
    allFiles.sort((a, b) => {
      if (sortBy === 'name') {
        return order === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      } else if (sortBy === 'size') {
        return order === 'asc' ? a.size - b.size : b.size - a.size;
      } else { // date
        return order === 'asc' ? new Date(a.date) - new Date(b.date) : new Date(b.date) - new Date(a.date);
      }
    });

    // Apply pagination
    const totalFiles = allFiles.length;
    const startIndex = offset;
    const endIndex = limit ? offset + limit : allFiles.length;
    const paginatedFiles = allFiles.slice(startIndex, endIndex);

    console.log(`Input picker API: Returning ${paginatedFiles.length} files (${startIndex}-${endIndex} of ${totalFiles})`);
    
    res.json({
      files: paginatedFiles,
      totalFiles: totalFiles,
      currentPage: limit ? Math.floor(offset / limit) + 1 : 1,
      totalPages: limit ? Math.ceil(totalFiles / limit) : 1,
      hasMore: endIndex < totalFiles
    });
  } catch (error) {
    console.error('Error in input picker files API:', error);
    res.status(500).json({ error: 'Failed to get input picker files' });
  }
});

module.exports = { router, actionHistory };
