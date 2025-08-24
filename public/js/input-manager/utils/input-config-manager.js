/**
 * Input Configuration Manager
 * Handles configurable paths and settings for input management
 */

window.InputManager = window.InputManager || {};
window.InputManager.utils = window.InputManager.utils || {};

window.InputManager.utils.InputConfigManager = {
  
  /**
   * Get the configured ComfyUI input directory path
   */
  getInputPath() {
    const config = window.AppConfig?.comfyui_input_path;
    return config || '/home/simonsays/Documents/Data/Packages/ComfyUI/input';
  },

  /**
   * Get the managed input subdirectory path
   */
  getManagedInputPath() {
    return `${this.getInputPath()}/managed`;
  },

  /**
   * Update the input path configuration
   */
  async setInputPath(newPath) {
    if (!window.AppConfig) {
      console.error('AppConfig not available');
      return false;
    }

    try {
      window.AppConfig.comfyui_input_path = newPath;
      // Save configuration if there's a save method
      if (typeof window.AppConfig.save === 'function') {
        await window.AppConfig.save();
      }
      console.log('Updated ComfyUI input path:', newPath);
      return true;
    } catch (error) {
      console.error('Failed to update input path:', error);
      return false;
    }
  },

  /**
   * Validate that the input path exists and is accessible
   */
  async validateInputPath(path = null) {
    const inputPath = path || this.getInputPath();
    
    try {
      // Use the existing file operations to check path
      const response = await fetch('/api/files/validate-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: inputPath })
      });

      if (response.ok) {
        const result = await response.json();
        return result.exists && result.isDirectory;
      }
      return false;
    } catch (error) {
      console.error('Failed to validate input path:', error);
      return false;
    }
  },

  /**
   * Ensure managed input directory exists
   */
  async ensureManagedDirectory() {
    const managedPath = this.getManagedInputPath();
    
    try {
      const response = await fetch('/api/files/ensure-directory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: managedPath })
      });

      if (response.ok) {
        const result = await response.json();
        return result.success;
      }
      return false;
    } catch (error) {
      console.error('Failed to ensure managed directory:', error);
      return false;
    }
  },

  /**
   * Get default configuration for input management
   */
  getDefaultConfig() {
    return {
      input_path: '/home/simonsays/Documents/Data/Packages/ComfyUI/input',
      managed_subfolder: 'managed',
      thumbnail_size: 150,
      pagination_size: 100,
      auto_cleanup: true,
      cleanup_days: 30
    };
  },

  /**
   * Generate input file path with SHA-based naming
   */
  generateInputFilePath(sha256, originalFilename) {
    const managedPath = this.getManagedInputPath();
    const extension = this.getFileExtension(originalFilename);
    const shortSHA = sha256.substring(0, 16);
    return `${managedPath}/${shortSHA}.${extension}`;
  },

  /**
   * Extract file extension from filename
   */
  getFileExtension(filename) {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1) return '';
    return filename.substring(lastDot + 1).toLowerCase();
  },

  /**
   * Check if file type is supported for input management
   */
  isSupportedFileType(filename) {
    const extension = this.getFileExtension(filename);
    const supportedImages = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff'];
    const supportedVideos = ['mp4', 'mov', 'avi', 'mkv', 'webm'];
    
    return supportedImages.includes(extension) || supportedVideos.includes(extension);
  }
};