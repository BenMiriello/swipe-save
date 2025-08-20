const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const router = express.Router();
const config = require('../config');

// Get current configuration
router.get('/api/config', (req, res) => {
  try {
    const currentConfig = config.getCurrentConfig();
    res.json({
      sourceDir: currentConfig.sourceDir,
      destinationDir: currentConfig.destinationDir,
      useDatestampFolders: currentConfig.useDatestampFolders,
      enableLogging: currentConfig.enableLogging !== false,
      fileLimit: currentConfig.fileLimit || 2500,
      pagination: {
        itemsPerPage: currentConfig.itemsPerPage || 100,
        maxCachedPages: currentConfig.maxCachedPages || 5,
        maxCachedFiles: currentConfig.maxCachedFiles || 10,
        memoryLimitMB: currentConfig.memoryLimitMB || 100,
        preloadPages: currentConfig.preloadPages || 1,
        fileEvictionTimeoutMinutes: currentConfig.fileEvictionTimeoutMinutes || 5
      }
    });
  } catch (error) {
    console.error('Error getting config:', error);
    res.status(500).json({ error: 'Failed to get configuration' });
  }
});

// Update configuration
router.post('/api/config', (req, res) => {
  try {
    const { sourceDir, destinationDir, useDatestampFolders, enableLogging, fileLimit, pagination } = req.body;

    if (!sourceDir && !destinationDir && useDatestampFolders === undefined && enableLogging === undefined && fileLimit === undefined && !pagination) {
      return res.status(400).json({ error: 'No configuration provided' });
    }

    const updateData = {};
    if (sourceDir) updateData.sourceDir = path.resolve(sourceDir);
    if (destinationDir) updateData.destinationDir = path.resolve(destinationDir);
    if (useDatestampFolders !== undefined) updateData.useDatestampFolders = Boolean(useDatestampFolders);
    if (enableLogging !== undefined) updateData.enableLogging = Boolean(enableLogging);
    if (fileLimit !== undefined) updateData.fileLimit = parseInt(fileLimit) || 2500;
    
    // Handle pagination settings
    if (pagination) {
      if (pagination.itemsPerPage !== undefined) updateData.itemsPerPage = parseInt(pagination.itemsPerPage) || 100;
      if (pagination.maxCachedPages !== undefined) updateData.maxCachedPages = parseInt(pagination.maxCachedPages) || 5;
      if (pagination.maxCachedFiles !== undefined) updateData.maxCachedFiles = parseInt(pagination.maxCachedFiles) || 10;
      if (pagination.memoryLimitMB !== undefined) updateData.memoryLimitMB = parseInt(pagination.memoryLimitMB) || 100;
      if (pagination.preloadPages !== undefined) updateData.preloadPages = parseInt(pagination.preloadPages) || 1;
      if (pagination.fileEvictionTimeoutMinutes !== undefined) updateData.fileEvictionTimeoutMinutes = parseInt(pagination.fileEvictionTimeoutMinutes) || 5;
    }

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

module.exports = router;
