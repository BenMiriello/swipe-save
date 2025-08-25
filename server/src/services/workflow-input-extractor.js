/**
 * Workflow Input Extractor Service
 * Extracts input file references from ComfyUI workflows
 */

class WorkflowInputExtractor {
  
  /**
   * Extract input file references from workflow JSON
   * @param {Object|String} workflowData - Workflow data in GUI or API format
   * @returns {Array} Array of input file references
   */
  extractInputFiles(workflowData) {
    if (!workflowData) return [];

    try {
      // Parse string to object if needed
      let workflow = workflowData;
      if (typeof workflowData === 'string') {
        workflow = JSON.parse(workflowData);
      }

      const inputFiles = [];

      // Handle GUI format (has nodes array)
      if (workflow.nodes && Array.isArray(workflow.nodes)) {
        inputFiles.push(...this.extractFromGUIFormat(workflow));
      }
      // Handle API format (object with node IDs as keys)
      else if (typeof workflow === 'object') {
        inputFiles.push(...this.extractFromAPIFormat(workflow));
      }

      // Remove duplicates and return
      return [...new Set(inputFiles)];
    } catch (error) {
      console.error('Error extracting input files from workflow:', error);
      return [];
    }
  }

  /**
   * Extract input files from GUI format workflow
   * @param {Object} workflow - GUI format workflow
   * @returns {Array} Array of input file paths
   */
  extractFromGUIFormat(workflow) {
    const inputFiles = [];

    for (const node of workflow.nodes) {
      if (!node || !node.type) continue;

      // Look for LoadImage nodes
      if (node.type === 'LoadImage') {
        const imagePath = this.extractLoadImagePath(node);
        if (imagePath) {
          inputFiles.push(imagePath);
        }
      }
    }

    return inputFiles;
  }

  /**
   * Extract input files from API format workflow
   * @param {Object} workflow - API format workflow
   * @returns {Array} Array of input file paths
   */
  extractFromAPIFormat(workflow) {
    const inputFiles = [];

    for (const nodeId in workflow) {
      const node = workflow[nodeId];
      if (!node || !node.class_type) continue;

      // Look for LoadImage nodes
      if (node.class_type === 'LoadImage') {
        const imagePath = this.extractLoadImagePathFromAPI(node);
        if (imagePath) {
          inputFiles.push(imagePath);
        }
      }
    }

    return inputFiles;
  }

  /**
   * Extract image path from GUI format LoadImage node
   * @param {Object} node - GUI format node
   * @returns {String|null} Image file path or null
   */
  extractLoadImagePath(node) {
    // In GUI format, widget values contain the image filename
    // LoadImage typically has widget_values with the filename
    if (node.widgets_values && Array.isArray(node.widgets_values) && node.widgets_values.length > 0) {
      const imageName = node.widgets_values[0];
      if (imageName && typeof imageName === 'string') {
        return imageName;
      }
    }
    return null;
  }

  /**
   * Extract image path from API format LoadImage node
   * @param {Object} node - API format node
   * @returns {String|null} Image file path or null
   */
  extractLoadImagePathFromAPI(node) {
    // In API format, inputs contain the image reference
    if (node.inputs && node.inputs.image) {
      const imageName = node.inputs.image;
      if (typeof imageName === 'string') {
        return imageName;
      }
    }
    return null;
  }

  /**
   * Resolve input file path relative to ComfyUI input directory
   * @param {String} fileName - Input file name
   * @returns {String} Full path to input file
   */
  resolveInputFilePath(fileName) {
    if (!fileName) return null;
    
    const path = require('path');
    const os = require('os');
    
    // Default ComfyUI input directory paths to try
    const possiblePaths = [
      // User's Documents/ComfyUI/input
      path.join(os.homedir(), 'Documents', 'ComfyUI', 'input', fileName),
      // User's Documents/Data/Packages/ComfyUI/input (our configured path)
      path.join(os.homedir(), 'Documents', 'Data', 'Packages', 'ComfyUI', 'input', fileName),
      // System ComfyUI installation paths
      path.join(os.homedir(), 'ComfyUI', 'input', fileName),
      // Relative to current working directory
      path.join(process.cwd(), 'ComfyUI', 'input', fileName)
    ];

    const fs = require('fs-extra');
    
    // Find the first path that exists
    for (const fullPath of possiblePaths) {
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }

    // If no file found, return the most likely path for caching purposes
    return possiblePaths[1]; // Use our configured ComfyUI path
  }

  /**
   * Cache for input file metadata to avoid repeated file system access
   */
  inputFileCache = new Map();

  /**
   * Extract metadata from input files and cache results
   * @param {Array} inputFiles - Array of input file names from workflow
   * @returns {Array} Array of input file metadata objects
   */
  async extractInputFileMetadata(inputFiles) {
    if (!inputFiles || inputFiles.length === 0) return [];

    const fileOps = require('../fileOperations');
    const results = [];

    for (const fileName of inputFiles) {
      // Skip empty/null filenames
      if (!fileName || typeof fileName !== 'string') continue;
      
      // Check cache first
      if (this.inputFileCache.has(fileName)) {
        results.push(this.inputFileCache.get(fileName));
        continue;
      }

      // Resolve full file path
      const fullPath = this.resolveInputFilePath(fileName);
      
      try {
        // Check if file exists
        if (!fullPath || !fs.existsSync(fullPath)) {
          const notFoundMetadata = {
            filename: fileName,
            fullPath: fullPath || 'unknown',
            exists: false,
            error: 'Input file not found in ComfyUI directories',
            isInputFile: true
          };
          this.inputFileCache.set(fileName, notFoundMetadata);
          results.push(notFoundMetadata);
          continue;
        }

        // Extract metadata using existing utility
        const metadata = await fileOps.extractComfyMetadata(fullPath, fileName);
        
        // Add input file specific properties
        metadata.isInputFile = true;
        metadata.exists = true;
        metadata.fullPath = fullPath;
        
        // Add searchable content for filtering
        metadata.searchableContent = JSON.stringify({
          filename: fileName,
          size: metadata.filesize,
          workflow: metadata.workflow,
          prompt: metadata.prompt,
          parameters: metadata.parameters
        });
        
        // Cache the result
        this.inputFileCache.set(fileName, metadata);
        results.push(metadata);
        
      } catch (error) {
        console.error(`Error extracting metadata for input file ${fileName}:`, error);
        const errorMetadata = {
          filename: fileName,
          fullPath: fullPath || 'unknown',
          exists: fs.existsSync(fullPath || ''),
          error: error.message,
          isInputFile: true,
          searchableContent: JSON.stringify({ filename: fileName, error: error.message })
        };
        this.inputFileCache.set(fileName, errorMetadata);
        results.push(errorMetadata);
      }
    }

    console.log(`Extracted metadata for ${results.length} input files from workflow`);
    return results;
  }

  /**
   * Clear the input file metadata cache
   */
  clearCache() {
    this.inputFileCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.inputFileCache.size,
      keys: Array.from(this.inputFileCache.keys())
    };
  }
}

module.exports = WorkflowInputExtractor;