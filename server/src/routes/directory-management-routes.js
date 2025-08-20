const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const router = express.Router();
const DirectoryConfigService = require('../services/directory-config-service');

// Initialize service
const dirService = new DirectoryConfigService();

/**
 * Get full directory configuration
 */
router.get('/api/user/directories', (req, res) => {
  try {
    const config = dirService.loadConfig();
    res.json(config);
  } catch (error) {
    console.error('Error getting directory config:', error);
    res.status(500).json({ error: 'Failed to get directory configuration' });
  }
});

/**
 * Add new directory
 */
router.post('/api/user/directories', async (req, res) => {
  try {
    const { path: dirPath, name, groupId } = req.body;

    if (!dirPath) {
      return res.status(400).json({ error: 'Directory path is required' });
    }

    // Validate directory exists
    if (!fs.existsSync(dirPath)) {
      return res.status(404).json({ error: 'Directory not found' });
    }

    const stats = fs.statSync(dirPath);
    if (!stats.isDirectory()) {
      return res.status(400).json({ error: 'Path is not a directory' });
    }

    const config = dirService.loadConfig();
    const newDirectory = dirService.addDirectory(config, { path: dirPath, name, groupId });
    
    // Count files in directory (non-blocking estimate)
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      const fileCount = entries.filter(entry => 
        entry.isFile() && /\.(png|jpe?g|gif|bmp|webp|tiff?|svg|mp4|webm|mov|avi|mkv|flv|wmv|m4v|3gp|ogv)$/i.test(entry.name)
      ).length;
      newDirectory.fileCount = fileCount;
    } catch (error) {
      console.error('Error counting files:', error);
    }

    dirService.saveConfig(config);

    res.json({ 
      success: true, 
      directory: newDirectory,
      config 
    });
  } catch (error) {
    console.error('Error adding directory:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update directory
 */
router.put('/api/user/directories/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, enabled, groupId } = req.body;

    const config = dirService.loadConfig();
    const directory = config.sources.directories.find(d => d.id === id);
    
    if (!directory) {
      return res.status(404).json({ error: 'Directory not found' });
    }

    // Update properties
    if (name !== undefined) directory.name = name;
    if (enabled !== undefined) directory.enabled = enabled;
    if (groupId !== undefined) directory.groupId = groupId;

    dirService.saveConfig(config);

    res.json({ success: true, directory, config });
  } catch (error) {
    console.error('Error updating directory:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete directory
 */
router.delete('/api/user/directories/:id', (req, res) => {
  try {
    const { id } = req.params;
    const config = dirService.loadConfig();
    
    const dirIndex = config.sources.directories.findIndex(d => d.id === id);
    if (dirIndex === -1) {
      return res.status(404).json({ error: 'Directory not found' });
    }

    // Remove directory
    config.sources.directories.splice(dirIndex, 1);
    
    // Remove from groups
    config.sources.groups.forEach(group => {
      const index = group.directoryIds.indexOf(id);
      if (index > -1) {
        group.directoryIds.splice(index, 1);
      }
    });

    dirService.saveConfig(config);

    res.json({ success: true, config });
  } catch (error) {
    console.error('Error deleting directory:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create new group
 */
router.post('/api/user/groups', (req, res) => {
  try {
    const { name, directoryIds = [], color = '#4f46e5' } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const config = dirService.loadConfig();
    const newGroup = dirService.createGroup(config, { name, directoryIds, color });

    dirService.saveConfig(config);

    res.json({ 
      success: true, 
      group: newGroup,
      config 
    });
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update group
 */
router.put('/api/user/groups/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, directoryIds, enabled, color } = req.body;

    const config = dirService.loadConfig();
    const group = config.sources.groups.find(g => g.id === id);
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Update properties
    if (name !== undefined) group.name = name;
    if (enabled !== undefined) group.enabled = enabled;
    if (color !== undefined) group.color = color;
    
    if (directoryIds !== undefined) {
      // Remove group reference from old directories
      group.directoryIds.forEach(dirId => {
        const dir = config.sources.directories.find(d => d.id === dirId);
        if (dir) dir.groupId = null;
      });
      
      // Update group directories
      group.directoryIds = directoryIds;
      
      // Add group reference to new directories
      directoryIds.forEach(dirId => {
        const dir = config.sources.directories.find(d => d.id === dirId);
        if (dir) dir.groupId = id;
      });
    }

    dirService.saveConfig(config);

    res.json({ success: true, group, config });
  } catch (error) {
    console.error('Error updating group:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete group
 */
router.delete('/api/user/groups/:id', (req, res) => {
  try {
    const { id } = req.params;
    const config = dirService.loadConfig();
    
    const groupIndex = config.sources.groups.findIndex(g => g.id === id);
    if (groupIndex === -1) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const group = config.sources.groups[groupIndex];
    
    // Remove group reference from directories
    group.directoryIds.forEach(dirId => {
      const dir = config.sources.directories.find(d => d.id === dirId);
      if (dir) dir.groupId = null;
    });

    // Remove group
    config.sources.groups.splice(groupIndex, 1);

    dirService.saveConfig(config);

    res.json({ success: true, config });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update preferences
 */
router.put('/api/user/preferences', (req, res) => {
  try {
    const { preferences } = req.body;

    if (!preferences) {
      return res.status(400).json({ error: 'Preferences are required' });
    }

    const config = dirService.loadConfig();
    config.preferences = { ...config.preferences, ...preferences };

    dirService.saveConfig(config);

    res.json({ success: true, preferences: config.preferences });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update destination
 */
router.post('/api/user/destination', (req, res) => {
  try {
    const { path: destPath } = req.body;

    if (!destPath) {
      return res.status(400).json({ error: 'Destination path is required' });
    }

    // Validate directory exists
    if (!fs.existsSync(destPath)) {
      return res.status(404).json({ error: 'Directory not found' });
    }

    const stats = fs.statSync(destPath);
    if (!stats.isDirectory()) {
      return res.status(400).json({ error: 'Path is not a directory' });
    }

    const config = dirService.loadConfig();
    dirService.updateDestination(config, destPath);

    dirService.saveConfig(config);

    res.json({ success: true, config });
  } catch (error) {
    console.error('Error updating destination:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Scan directory for file count
 */
router.post('/api/user/directories/:id/scan', (req, res) => {
  try {
    const { id } = req.params;
    const config = dirService.loadConfig();
    
    const directory = config.sources.directories.find(d => d.id === id);
    if (!directory) {
      return res.status(404).json({ error: 'Directory not found' });
    }

    // Count files
    try {
      const entries = fs.readdirSync(directory.path, { withFileTypes: true });
      const mediaFiles = entries.filter(entry => 
        entry.isFile() && /\.(png|jpe?g|gif|bmp|webp|tiff?|svg|mp4|webm|mov|avi|mkv|flv|wmv|m4v|3gp|ogv)$/i.test(entry.name)
      );
      
      directory.fileCount = mediaFiles.length;
      
      // Get sample files for preview
      const sampleFiles = mediaFiles.slice(0, 3).map(entry => entry.name);
      
      dirService.saveConfig(config);

      res.json({ 
        success: true, 
        fileCount: mediaFiles.length,
        sampleFiles,
        directory 
      });
    } catch (error) {
      res.status(500).json({ error: `Cannot read directory: ${error.message}` });
    }
  } catch (error) {
    console.error('Error scanning directory:', error);
    res.status(500).json({ error: error.message });
  }
});

// Browse file system directories
router.get('/api/browse-directories', (req, res) => {
  try {
    const path = require('path');
    const currentPath = req.query.path || require('os').homedir();
    
    console.log(`Browsing directory: ${currentPath}`);
    
    if (!fs.existsSync(currentPath)) {
      return res.status(404).json({ error: 'Directory not found' });
    }
    
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    const directories = [];
    let fileCount = 0;
    
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        const fullPath = path.join(currentPath, entry.name);
        try {
          // Quick scan for media files
          const subEntries = fs.readdirSync(fullPath, { withFileTypes: true });
          const mediaCount = subEntries.filter(subEntry => 
            subEntry.isFile() && 
            /\.(png|jpe?g|gif|bmp|webp|tiff?|svg|mp4|webm|mov|avi|mkv|flv|wmv|m4v|3gp|ogv)$/i.test(subEntry.name)
          ).length;
          
          directories.push({
            name: entry.name,
            path: fullPath,
            isDirectory: true,
            fileCount: mediaCount
          });
        } catch (error) {
          // Skip directories we can't read
          directories.push({
            name: entry.name,
            path: fullPath,
            isDirectory: true,
            fileCount: 0
          });
        }
      } else if (entry.isFile() && 
                 /\.(png|jpe?g|gif|bmp|webp|tiff?|svg|mp4|webm|mov|avi|mkv|flv|wmv|m4v|3gp|ogv)$/i.test(entry.name)) {
        fileCount++;
      }
    }
    
    // Sort directories by name
    directories.sort((a, b) => a.name.localeCompare(b.name));
    
    res.json({
      currentPath,
      parentPath: path.dirname(currentPath),
      directories,
      currentDirFileCount: fileCount
    });
    
  } catch (error) {
    console.error('Error browsing directories:', error);
    res.status(500).json({ error: 'Error reading directory: ' + error.message });
  }
});

module.exports = router;