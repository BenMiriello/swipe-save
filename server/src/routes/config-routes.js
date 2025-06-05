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

module.exports = router;
