const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

/**
 * Directory Configuration Service
 * Manages multi-source directories, groups, and destinations
 */
class DirectoryConfigService {
  constructor() {
    this.configPath = path.resolve(process.env.HOME, '.config/swipe-save/user-directories.json');
    this.ensureConfigDir();
  }

  /**
   * Ensure config directory exists
   */
  ensureConfigDir() {
    const configDir = path.dirname(this.configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return crypto.randomUUID();
  }

  /**
   * Auto-suggest group name from directory path
   */
  suggestGroupName(folderPath) {
    if (folderPath.includes('ComfyUI/output')) return 'ComfyUI';
    
    // Use top-level meaningful directory name
    const parts = folderPath.split('/').filter(p => p);
    const meaningful = parts.find(part => 
      !['home', 'Documents', 'Desktop', 'Downloads', 'Pictures'].includes(part)
    );
    
    return meaningful ? this.toTitleCase(meaningful) : 'Home';
  }

  /**
   * Convert string to title case
   */
  toTitleCase(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  /**
   * Get default configuration
   */
  getDefaultConfig() {
    const homeDir = process.env.HOME;
    const comfyUIPath = path.join(homeDir, 'Documents/ComfyUI/output');
    const hasComfyUI = fs.existsSync(comfyUIPath);
    
    const defaultSourcePath = hasComfyUI ? comfyUIPath : homeDir;
    const defaultDestPath = path.join(homeDir, 'Documents');
    
    const defaultDirId = this.generateId();
    const defaultGroupId = this.generateId();
    
    return {
      sources: {
        directories: [{
          id: defaultDirId,
          name: this.suggestGroupName(defaultSourcePath),
          path: defaultSourcePath,
          enabled: true,
          lastUsed: new Date().toISOString(),
          fileCount: 0,
          addedDate: new Date().toISOString(),
          groupId: defaultGroupId
        }],
        groups: [{
          id: defaultGroupId,
          name: this.suggestGroupName(defaultSourcePath),
          directoryIds: [defaultDirId],
          enabled: true,
          color: '#4f46e5'
        }]
      },
      destination: {
        current: defaultDestPath,
        recent: [defaultDestPath]
      },
      recent: {
        directories: [],
        groups: []
      },
      preferences: {
        useDatestampFolders: false,
        enableLogging: false,
        maxRecentDirs: 5,
        maxRecentGroups: 3,
        showFileCount: true,
        isFirstRun: true
      }
    };
  }

  /**
   * Load configuration from file or create default
   */
  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const saved = fs.readJsonSync(this.configPath);
        return { ...this.getDefaultConfig(), ...saved };
      }
    } catch (error) {
      console.error('Error loading directory config:', error);
    }
    return this.getDefaultConfig();
  }

  /**
   * Save configuration to file
   */
  saveConfig(config) {
    try {
      fs.writeJsonSync(this.configPath, config, { spaces: 2 });
      return true;
    } catch (error) {
      console.error('Error saving directory config:', error);
      return false;
    }
  }

  /**
   * Add new directory
   */
  addDirectory(config, directoryData) {
    const { path: dirPath, name, groupId } = directoryData;
    
    // Check if directory already exists
    const existing = config.sources.directories.find(d => d.path === dirPath);
    if (existing) {
      throw new Error('Directory already added');
    }

    const newDir = {
      id: this.generateId(),
      name: name || this.suggestGroupName(dirPath),
      path: dirPath,
      enabled: true,
      lastUsed: new Date().toISOString(),
      fileCount: 0,
      addedDate: new Date().toISOString(),
      groupId: groupId || null
    };

    config.sources.directories.push(newDir);
    
    // Add to group if specified
    if (groupId) {
      const group = config.sources.groups.find(g => g.id === groupId);
      if (group && !group.directoryIds.includes(newDir.id)) {
        group.directoryIds.push(newDir.id);
      }
    }

    return newDir;
  }

  /**
   * Create new group
   */
  createGroup(config, groupData) {
    const { name, directoryIds = [], color = '#4f46e5' } = groupData;
    
    const newGroup = {
      id: this.generateId(),
      name,
      directoryIds,
      enabled: true,
      color
    };

    config.sources.groups.push(newGroup);
    
    // Update directories to reference this group
    directoryIds.forEach(dirId => {
      const dir = config.sources.directories.find(d => d.id === dirId);
      if (dir) {
        dir.groupId = newGroup.id;
      }
    });

    return newGroup;
  }

  /**
   * Get enabled directories for scanning
   */
  getEnabledDirectories(config) {
    return config.sources.directories.filter(dir => dir.enabled);
  }

  /**
   * Get enabled feature directories by type
   */
  getEnabledFeatureDirectories(config, featureType) {
    const featureDirectories = config.sources?.featureDirectories?.[featureType] || [];
    return featureDirectories.filter(dir => dir.enabled);
  }

  /**
   * Update recent directories
   */
  updateRecentDirectory(config, dirPath) {
    const recent = config.recent.directories;
    const index = recent.indexOf(dirPath);
    
    // Remove if already exists
    if (index > -1) {
      recent.splice(index, 1);
    }
    
    // Add to front
    recent.unshift(dirPath);
    
    // Limit size
    if (recent.length > config.preferences.maxRecentDirs) {
      recent.splice(config.preferences.maxRecentDirs);
    }
  }

  /**
   * Update recent groups
   */
  updateRecentGroup(config, groupId) {
    const recent = config.recent.groups;
    const index = recent.indexOf(groupId);
    
    // Remove if already exists
    if (index > -1) {
      recent.splice(index, 1);
    }
    
    // Add to front
    recent.unshift(groupId);
    
    // Limit size
    if (recent.length > config.preferences.maxRecentGroups) {
      recent.splice(config.preferences.maxRecentGroups);
    }
  }

  /**
   * Update destination with recent tracking
   */
  updateDestination(config, destPath) {
    config.destination.current = destPath;
    
    const recent = config.destination.recent;
    const index = recent.indexOf(destPath);
    
    // Remove if already exists
    if (index > -1) {
      recent.splice(index, 1);
    }
    
    // Add to front
    recent.unshift(destPath);
    
    // Limit to 5 recent destinations
    if (recent.length > 5) {
      recent.splice(5);
    }
  }

  /**
   * Migrate from old single-directory config
   */
  migrateFromLegacyConfig(legacyConfig) {
    const newConfig = this.getDefaultConfig();
    
    if (legacyConfig.sourceDir) {
      // Update default directory with legacy path
      newConfig.sources.directories[0].path = legacyConfig.sourceDir;
      newConfig.sources.directories[0].name = this.suggestGroupName(legacyConfig.sourceDir);
      newConfig.sources.groups[0].name = this.suggestGroupName(legacyConfig.sourceDir);
    }
    
    if (legacyConfig.destinationDir) {
      newConfig.destination.current = legacyConfig.destinationDir;
      newConfig.destination.recent = [legacyConfig.destinationDir];
    }
    
    if (legacyConfig.useDatestampFolders !== undefined) {
      newConfig.preferences.useDatestampFolders = legacyConfig.useDatestampFolders;
    }
    
    if (legacyConfig.enableLogging !== undefined) {
      newConfig.preferences.enableLogging = legacyConfig.enableLogging;
    }
    
    return newConfig;
  }
}

module.exports = DirectoryConfigService;