const fs = require('fs-extra');
const path = require('path');
const config = require('../config');

/**
 * Multi-Directory Scanner Service
 * Handles flat scanning across multiple source directories
 */
class MultiDirectoryScanner {
  constructor() {
    this.mediaExtensions = /\.(png|jpe?g|gif|bmp|webp|tiff?|svg|mp4|webm|mov|avi|mkv|flv|wmv|m4v|3gp|ogv)$/i;
  }

  /**
   * Check if file is a media file
   */
  isMediaFile(filename) {
    return this.mediaExtensions.test(filename) && !filename.startsWith('._');
  }

  /**
   * Scan single directory (flat, no recursion)
   */
  scanSingleDirectory(dirPath, sourceInfo, limit = config.FILE_LIMIT || Number.MAX_SAFE_INTEGER) {
    const files = [];
    
    try {
      console.log(`Scanning directory: ${dirPath} (${sourceInfo.name})`);
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (files.length >= limit) {
          console.log(`Reached limit of ${limit} files in ${dirPath}`);
          break;
        }
        
        // Only process files, no subdirectories
        if (entry.isFile() && this.isMediaFile(entry.name)) {
          const fullPath = path.join(dirPath, entry.name);
          const stats = fs.statSync(fullPath);
          
          // Create relative path for URL encoding
          const relativePath = path.relative(dirPath, fullPath);
          const encodedPath = relativePath.split(path.sep).map(encodeURIComponent).join('/');
          
          files.push({
            name: entry.name,
            relativePath: relativePath,
            path: `/media/${encodedPath}`,
            fullPath: fullPath,
            size: stats.size,
            date: stats.mtime,
            sourceDirectory: dirPath,
            sourceName: sourceInfo.name,
            sourceId: sourceInfo.id,
            sourceGroup: sourceInfo.groupId
          });
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dirPath}:`, error);
    }
    
    return files;
  }

  /**
   * Scan multiple directories from configuration
   */
  scanEnabledDirectories(directories, options = {}) {
    const { limit, sortBy = 'date', order = 'desc' } = options;
    const allFiles = [];
    
    console.log(`Scanning ${directories.length} enabled directories with limit ${limit}`);
    
    for (const directory of directories) {
      if (!directory.enabled) {
        console.log(`Skipping disabled directory: ${directory.name}`);
        continue;
      }
      
      const sourceInfo = {
        id: directory.id,
        name: directory.name,
        groupId: directory.groupId
      };
      
      // Scan ALL files in directory (no limit), then sort and limit globally
      const files = this.scanSingleDirectory(directory.path, sourceInfo, 99999);
      allFiles.push(...files);
    }
    
    console.log(`Found ${allFiles.length} total files before sorting and limiting`);
    
    // Sort ALL files first
    this.sortFiles(allFiles, sortBy, order);
    
    // Apply limit only if specified, otherwise return all files
    const finalFiles = limit ? allFiles.slice(0, limit) : allFiles;
    
    console.log(`Multi-directory scan complete: returning ${finalFiles.length} files ${limit ? `(limited from ${allFiles.length})` : '(unlimited)'} sorted by ${sortBy} ${order}`);
    return finalFiles;
  }

  /**
   * Sort files by specified criteria
   */
  sortFiles(files, sortBy, order) {
    const sortFunctions = {
      date: (a, b) => new Date(a.date) - new Date(b.date),
      created: (a, b) => new Date(a.date) - new Date(b.date), // Use same as date for now (mtime)
      name: (a, b) => a.name.localeCompare(b.name),
      size: (a, b) => a.size - b.size,
      source: (a, b) => a.sourceName.localeCompare(b.sourceName)
    };
    
    const sortFn = sortFunctions[sortBy] || sortFunctions.date;
    files.sort(sortFn);
    
    if (order === 'desc') {
      files.reverse();
    }
  }

  /**
   * Get files from specific directories
   */
  getFilesFromDirectories(allDirectories, directoryIds, options = {}) {
    const targetDirectories = allDirectories.filter(dir => 
      directoryIds.includes(dir.id) && dir.enabled
    );
    
    return this.scanEnabledDirectories(targetDirectories, options);
  }

  /**
   * Get files from specific groups
   */
  getFilesFromGroups(allDirectories, groups, groupIds, options = {}) {
    const targetGroups = groups.filter(group => 
      groupIds.includes(group.id) && group.enabled
    );
    
    const directoryIds = [];
    targetGroups.forEach(group => {
      directoryIds.push(...group.directoryIds);
    });
    
    // Remove duplicates
    const uniqueDirectoryIds = [...new Set(directoryIds)];
    
    return this.getFilesFromDirectories(allDirectories, uniqueDirectoryIds, options);
  }

  /**
   * Count files in directory (lightweight)
   */
  countFilesInDirectory(dirPath) {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      return entries.filter(entry => 
        entry.isFile() && this.isMediaFile(entry.name)
      ).length;
    } catch (error) {
      console.error(`Error counting files in ${dirPath}:`, error);
      return 0;
    }
  }

  /**
   * Update file counts for directories
   */
  updateDirectoryFileCounts(directories) {
    directories.forEach(directory => {
      try {
        directory.fileCount = this.countFilesInDirectory(directory.path);
        directory.lastScanned = new Date().toISOString();
      } catch (error) {
        console.error(`Error updating file count for ${directory.path}:`, error);
        directory.fileCount = 0;
      }
    });
  }

  /**
   * Validate directory paths
   */
  validateDirectories(directories) {
    const results = [];
    
    directories.forEach(directory => {
      const result = {
        id: directory.id,
        name: directory.name,
        path: directory.path,
        valid: false,
        error: null,
        exists: false,
        accessible: false
      };
      
      try {
        if (fs.existsSync(directory.path)) {
          result.exists = true;
          const stats = fs.statSync(directory.path);
          
          if (stats.isDirectory()) {
            // Test if we can read the directory
            fs.readdirSync(directory.path);
            result.accessible = true;
            result.valid = true;
          } else {
            result.error = 'Path is not a directory';
          }
        } else {
          result.error = 'Directory does not exist';
        }
      } catch (error) {
        result.error = `Access denied: ${error.message}`;
      }
      
      results.push(result);
    });
    
    return results;
  }
}

module.exports = MultiDirectoryScanner;