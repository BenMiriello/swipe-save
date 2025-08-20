const sharp = require('sharp');
const ffmpeg = require('ffmpeg-static');
const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

/**
 * Preview Generation Service
 * Handles thumbnail generation for images and video frame extraction
 */
class PreviewService {
  constructor() {
    this.previewDir = path.join(__dirname, '../../cache/previews');
    this.thumbnailSizes = {
      small: { width: 100, height: 100 },
      medium: { width: 150, height: 150 },
      large: { width: 300, height: 300 }
    };
    this.videoPreviewSize = { width: 150, height: 150 };
    this.cacheMaxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    
    this.ensurePreviewDir();
    this.startCacheCleanup();
  }

  /**
   * Ensure preview directory exists
   */
  async ensurePreviewDir() {
    try {
      await fs.ensureDir(this.previewDir);
      await fs.ensureDir(path.join(this.previewDir, 'images'));
      await fs.ensureDir(path.join(this.previewDir, 'videos'));
    } catch (error) {
      console.error('Failed to create preview directories:', error);
    }
  }

  /**
   * Generate file hash for cache key
   */
  generateFileHash(filePath, size = 'medium') {
    const stats = fs.statSync(filePath);
    const data = `${filePath}-${stats.mtime.getTime()}-${stats.size}-${size}`;
    return crypto.createHash('md5').update(data).digest('hex');
  }

  /**
   * Get preview for any media file
   */
  async getPreview(filePath, size = 'medium') {
    try {
      const ext = path.extname(filePath).toLowerCase();
      
      if (this.isImage(ext)) {
        return await this.getImageThumbnail(filePath, size);
      } else if (this.isVideo(ext)) {
        return await this.getVideoPreview(filePath);
      } else {
        return null;
      }
    } catch (error) {
      console.error(`Failed to generate preview for ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Check if file is an image
   */
  isImage(ext) {
    return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.tif'].includes(ext);
  }

  /**
   * Check if file is a video
   */
  isVideo(ext) {
    return ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v', '.wmv', '.flv'].includes(ext);
  }

  /**
   * Generate image thumbnail
   */
  async getImageThumbnail(imagePath, size = 'medium') {
    const hash = this.generateFileHash(imagePath, size);
    const cacheFile = path.join(this.previewDir, 'images', `${hash}.webp`);
    
    // Return cached version if exists
    if (await fs.pathExists(cacheFile)) {
      const stats = await fs.stat(cacheFile);
      if (Date.now() - stats.mtime.getTime() < this.cacheMaxAge) {
        return `/api/preview/image/${hash}.webp`;
      }
    }

    try {
      const dimensions = this.thumbnailSizes[size] || this.thumbnailSizes.medium;
      
      await sharp(imagePath)
        .resize(dimensions.width, dimensions.height, { 
          fit: 'cover',
          position: 'center'
        })
        .webp({ 
          quality: 80,
          effort: 4
        })
        .toFile(cacheFile);

      return `/api/preview/image/${hash}.webp`;
    } catch (error) {
      console.error(`Failed to generate thumbnail for ${imagePath}:`, error);
      return null;
    }
  }

  /**
   * Generate video preview (first frame)
   */
  async getVideoPreview(videoPath) {
    const hash = this.generateFileHash(videoPath, 'video');
    const cacheFile = path.join(this.previewDir, 'videos', `${hash}.webp`);
    
    // Return cached version if exists
    if (await fs.pathExists(cacheFile)) {
      const stats = await fs.stat(cacheFile);
      if (Date.now() - stats.mtime.getTime() < this.cacheMaxAge) {
        return `/api/preview/video/${hash}.webp`;
      }
    }

    try {
      await this.extractVideoFrame(videoPath, cacheFile);
      return `/api/preview/video/${hash}.webp`;
    } catch (error) {
      console.error(`Failed to generate video preview for ${videoPath}:`, error);
      return null;
    }
  }

  /**
   * Extract first frame from video using ffmpeg
   */
  extractVideoFrame(videoPath, outputPath) {
    return new Promise((resolve, reject) => {
      const args = [
        '-i', videoPath,
        '-vf', `scale=${this.videoPreviewSize.width}:${this.videoPreviewSize.height}:force_original_aspect_ratio=decrease,pad=${this.videoPreviewSize.width}:${this.videoPreviewSize.height}:(ow-iw)/2:(oh-ih)/2`,
        '-frames:v', '1',
        '-f', 'webp',
        '-quality', '80',
        '-y', // Overwrite output file
        outputPath
      ];

      const ffmpegProcess = spawn(ffmpeg, args);
      
      let stderr = '';
      ffmpegProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpegProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`));
        }
      });

      ffmpegProcess.on('error', (error) => {
        reject(error);
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        ffmpegProcess.kill();
        reject(new Error('Video preview generation timed out'));
      }, 30000);
    });
  }

  /**
   * Serve preview file
   */
  async servePreview(type, filename, res) {
    try {
      const previewPath = path.join(this.previewDir, type, filename);
      
      if (!(await fs.pathExists(previewPath))) {
        return res.status(404).json({ error: 'Preview not found' });
      }

      const stats = await fs.stat(previewPath);
      
      res.set({
        'Content-Type': 'image/webp',
        'Content-Length': stats.size,
        'Cache-Control': 'public, max-age=604800', // 7 days
        'ETag': `"${stats.mtime.getTime()}-${stats.size}"`
      });

      const stream = fs.createReadStream(previewPath);
      stream.pipe(res);
    } catch (error) {
      console.error(`Failed to serve preview ${type}/${filename}:`, error);
      res.status(500).json({ error: 'Failed to serve preview' });
    }
  }

  /**
   * Generate previews for multiple files
   */
  async generatePreviews(files, size = 'medium') {
    const results = await Promise.allSettled(
      files.map(async (file) => {
        const preview = await this.getPreview(file.fullPath, size);
        return {
          ...file,
          preview
        };
      })
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error(`Preview generation failed for ${files[index].fullPath}:`, result.reason);
        return {
          ...files[index],
          preview: null
        };
      }
    });
  }

  /**
   * Clean old cache files
   */
  async cleanCache() {
    try {
      const now = Date.now();
      const directories = ['images', 'videos'];
      
      for (const dir of directories) {
        const dirPath = path.join(this.previewDir, dir);
        if (!(await fs.pathExists(dirPath))) continue;
        
        const files = await fs.readdir(dirPath);
        
        for (const file of files) {
          const filePath = path.join(dirPath, file);
          const stats = await fs.stat(filePath);
          
          if (now - stats.mtime.getTime() > this.cacheMaxAge) {
            await fs.remove(filePath);
            console.log(`Removed expired preview: ${file}`);
          }
        }
      }
    } catch (error) {
      console.error('Failed to clean preview cache:', error);
    }
  }

  /**
   * Start automatic cache cleanup
   */
  startCacheCleanup() {
    // Clean cache every 6 hours
    setInterval(() => {
      this.cleanCache();
    }, 6 * 60 * 60 * 1000);
    
    // Initial cleanup
    setTimeout(() => {
      this.cleanCache();
    }, 60000); // After 1 minute
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    try {
      const stats = {
        images: { count: 0, sizeMB: 0 },
        videos: { count: 0, sizeMB: 0 },
        totalSizeMB: 0
      };

      const directories = ['images', 'videos'];
      
      for (const dir of directories) {
        const dirPath = path.join(this.previewDir, dir);
        if (!(await fs.pathExists(dirPath))) continue;
        
        const files = await fs.readdir(dirPath);
        
        for (const file of files) {
          const filePath = path.join(dirPath, file);
          const fileStat = await fs.stat(filePath);
          
          stats[dir].count++;
          stats[dir].sizeMB += fileStat.size / (1024 * 1024);
        }
      }
      
      stats.totalSizeMB = stats.images.sizeMB + stats.videos.sizeMB;
      
      // Round to 2 decimal places
      stats.images.sizeMB = Math.round(stats.images.sizeMB * 100) / 100;
      stats.videos.sizeMB = Math.round(stats.videos.sizeMB * 100) / 100;
      stats.totalSizeMB = Math.round(stats.totalSizeMB * 100) / 100;
      
      return stats;
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return { images: { count: 0, sizeMB: 0 }, videos: { count: 0, sizeMB: 0 }, totalSizeMB: 0 };
    }
  }

  /**
   * Clear all cached previews
   */
  async clearCache() {
    try {
      await fs.remove(this.previewDir);
      await this.ensurePreviewDir();
      console.log('Preview cache cleared');
    } catch (error) {
      console.error('Failed to clear preview cache:', error);
    }
  }
}

module.exports = PreviewService;