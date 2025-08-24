/**
 * Input File Service
 * Handles file operations for ComfyUI input management with SHA deduplication
 */

window.InputManager = window.InputManager || {};
window.InputManager.core = window.InputManager.core || {};

window.InputManager.core.InputFileService = {
  
  /**
   * Add current file to ComfyUI inputs with SHA deduplication
   */
  async addToInputs(filePath) {
    const configManager = window.InputManager.utils.InputConfigManager;
    const database = window.InputManager.core.InputDatabase;
    
    try {
      // Validate file exists and is supported
      if (!configManager.isSupportedFileType(filePath)) {
        throw new Error('File type not supported for ComfyUI inputs');
      }

      // Calculate SHA256 hash of file content
      console.log('Calculating SHA256 for:', filePath);
      const sha256 = await this.calculateFileSHA(filePath);
      
      // Check if file already exists
      const existingFile = await database.findBySHA(sha256);
      if (existingFile) {
        console.log('File already exists in inputs:', existingFile.filename);
        return {
          success: true,
          isDuplicate: true,
          inputPath: existingFile.input_path,
          existingRecord: existingFile
        };
      }

      // Ensure managed directory exists
      await configManager.ensureManagedDirectory();

      // Generate unique input file path
      const filename = this.getFilename(filePath);
      const inputPath = configManager.generateInputFilePath(sha256, filename);
      
      // Copy file to inputs directory
      console.log('Copying file to inputs:', inputPath);
      await this.copyFileToInputs(filePath, inputPath);
      
      // Get file metadata
      const metadata = await this.getFileMetadata(filePath);
      
      // Insert record in database
      const record = {
        sha256: sha256,
        filename: filename,
        original_path: filePath,
        input_path: inputPath,
        mime_type: metadata.mimeType,
        file_size: metadata.size,
        width: metadata.width,
        height: metadata.height
      };
      
      const id = await database.insertInputFile(record);
      record.id = id;
      
      console.log('Successfully added to inputs:', filename);
      return {
        success: true,
        isDuplicate: false,
        inputPath: inputPath,
        newRecord: record
      };
      
    } catch (error) {
      console.error('Failed to add file to inputs:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * List all input files with optional sorting and filtering
   */
  async listInputFiles(options = {}) {
    try {
      console.log('🔍 Step 1: Starting listInputFiles...');
      
      const response = await fetch('/api/media');
      console.log('📡 Step 2: Response received:', response.status, response.statusText);
      
      if (!response.ok) {
        console.error('❌ Step 2 FAILED: Bad response status');
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📦 Step 3: Raw data keys:', Object.keys(data));
      console.log('📦 Step 3: Data.items length:', data.items ? data.items.length : 'NO ITEMS');
      
      const files = data.items || [];
      console.log('📁 Step 4: Files array length:', files.length);
      
      if (files.length === 0) {
        console.warn('⚠️ Step 4: NO FILES in API response!');
        return [];
      }
      
      console.log('📋 Step 5: First file sample:', files[0]);
      
      // Filter for image files only
      const imageFiles = files.filter(file => {
        const ext = file.name.toLowerCase();
        const isImage = ext.endsWith('.png') || ext.endsWith('.jpg') || 
                       ext.endsWith('.jpeg') || ext.endsWith('.webp') || 
                       ext.endsWith('.gif') || ext.endsWith('.bmp');
        return isImage;
      });
      
      console.log('🎯 Step 6: Filtered to', imageFiles.length, 'image files');
      
      if (imageFiles.length === 0) {
        console.warn('⚠️ Step 6: NO IMAGE FILES found after filtering!');
        return [];
      }
      
      const result = imageFiles.map((file, index) => ({
        id: index + 1,
        filename: file.name,
        input_path: file.path,
        file_size: file.size,
        created_at: file.date,
        usage_count: 0
      }));
      
      console.log('✅ Step 7: Final result length:', result.length);
      console.log('✅ Step 7: First result sample:', result[0]);
      return result;
      
    } catch (error) {
      console.error('❌ COMPLETE FAILURE in listInputFiles:', error);
      return [];
    }
  },

  /**
   * Remove input file from management (database and filesystem)
   */
  async removeInputFile(id) {
    const database = window.InputManager.core.InputDatabase;
    
    try {
      // Get file record first
      const files = await database.listAll();
      const file = files.find(f => f.id === id);
      
      if (!file) {
        throw new Error('Input file not found');
      }

      // Delete from filesystem
      await this.deleteInputFile(file.input_path);
      
      // Delete from database
      const deleted = await database.deleteById(id);
      
      if (deleted) {
        console.log('Removed input file:', file.filename);
        return { success: true };
      } else {
        throw new Error('Failed to delete database record');
      }
      
    } catch (error) {
      console.error('Failed to remove input file:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Calculate SHA256 hash of file content
   */
  async calculateFileSHA(filePath) {
    try {
      const response = await fetch('/api/files/calculate-sha256', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: filePath })
      });

      if (!response.ok) {
        throw new Error(`SHA calculation failed: ${response.status}`);
      }

      const result = await response.json();
      return result.sha256;
    } catch (error) {
      console.error('Failed to calculate SHA256:', error);
      throw error;
    }
  },

  /**
   * Copy file to inputs directory
   */
  async copyFileToInputs(sourcePath, destinationPath) {
    try {
      const response = await fetch('/api/files/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          source: sourcePath, 
          destination: destinationPath 
        })
      });

      if (!response.ok) {
        throw new Error(`File copy failed: ${response.status}`);
      }

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Failed to copy file to inputs:', error);
      throw error;
    }
  },

  /**
   * Delete input file from filesystem
   */
  async deleteInputFile(filePath) {
    try {
      const response = await fetch('/api/files/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: filePath })
      });

      if (!response.ok) {
        throw new Error(`File deletion failed: ${response.status}`);
      }

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Failed to delete input file:', error);
      throw error;
    }
  },

  /**
   * Get file metadata (size, dimensions, mime type)
   */
  async getFileMetadata(filePath) {
    try {
      const response = await fetch('/api/files/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: filePath })
      });

      if (!response.ok) {
        throw new Error(`Metadata fetch failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get file metadata:', error);
      return {
        size: 0,
        mimeType: 'unknown',
        width: null,
        height: null
      };
    }
  },

  /**
   * Extract filename from file path
   */
  getFilename(filePath) {
    return filePath.split('/').pop();
  },

  /**
   * Generate thumbnail URL for input file
   */
  getThumbnailUrl(inputFile, size = 150) {
    // Use existing thumbnail service but with larger size for input picker
    return `/api/thumbnails?file=${encodeURIComponent(inputFile.input_path)}&size=${size}`;
  }
};