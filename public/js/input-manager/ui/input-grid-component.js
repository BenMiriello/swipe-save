/**
 * Input Grid Component  
 * Alpine.js component for thumbnail grid with touch interactions
 */

window.InputManager = window.InputManager || {};
window.InputManager.ui = window.InputManager.ui || {};

window.InputManager.ui.createInputGrid = function() {
  return {
    // Grid configuration
    thumbnailSize: 150,
    
    // Touch interaction state
    longPressTimer: null,
    previewFile: null,
    showPreview: false,
    touchStartTime: 0,
    
    // Grid layout responsive settings
    get gridColumns() {
      const width = window.innerWidth;
      if (width >= 1024) return 6; // Desktop: 6 columns
      if (width >= 768) return 5;  // Tablet: 5 columns  
      return 4; // Mobile: 4 columns
    },

    get thumbnailDisplaySize() {
      const width = window.innerWidth;
      if (width >= 1024) return 130; // Desktop: smaller thumbs
      if (width >= 768) return 140;  // Tablet: medium thumbs
      return 150; // Mobile: larger touch targets
    },

    // Touch event handlers
    handleTouchStart(file, event) {
      this.touchStartTime = Date.now();
      
      // Start long press timer
      this.longPressTimer = setTimeout(() => {
        this.handleLongPress(file, event);
      }, 500);
    },

    handleTouchMove(event) {
      // Cancel long press if finger moves
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
    },

    handleTouchEnd(file, event) {
      const touchDuration = Date.now() - this.touchStartTime;
      
      // Cancel long press timer
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
        
        // If short touch (< 500ms), treat as selection
        if (touchDuration < 500) {
          this.handleFileSelect(file);
        }
      }
    },

    // Mouse event handlers (desktop)
    handleMouseClick(file, event) {
      this.handleFileSelect(file);
    },

    handleMouseEnter(file, event) {
      // Desktop hover effects handled by CSS
    },

    // Long press handler
    handleLongPress(file, event) {
      console.log('Long press detected for:', file.filename);
      this.showFilePreview(file, event);
      
      // Provide haptic feedback on mobile
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    },

    // File selection handler
    handleFileSelect(file) {
      // Delegate to parent modal component
      if (this.$parent && typeof this.$parent.selectFile === 'function') {
        this.$parent.selectFile(file);
      }
      console.log('Selected file:', file.filename);
    },

    // Preview handlers
    showFilePreview(file, event) {
      this.previewFile = file;
      this.showPreview = true;
      
      // Position preview overlay
      if (event && event.target) {
        const rect = event.target.getBoundingClientRect();
        this.positionPreview(rect);
      }
    },

    closeFilePreview() {
      this.showPreview = false;
      this.previewFile = null;
    },

    positionPreview(targetRect) {
      // Position preview overlay relative to tapped thumbnail
      this.$nextTick(() => {
        const preview = this.$refs.previewOverlay;
        if (!preview) return;
        
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const previewWidth = 300;
        const previewHeight = 300;
        
        let left = targetRect.left + targetRect.width / 2 - previewWidth / 2;
        let top = targetRect.top - previewHeight - 20;
        
        // Keep within viewport bounds
        left = Math.max(20, Math.min(left, viewportWidth - previewWidth - 20));
        top = Math.max(20, Math.min(top, viewportHeight - previewHeight - 20));
        
        preview.style.left = `${left}px`;
        preview.style.top = `${top}px`;
      });
    },

    // Utility methods
    getThumbnailUrl(file) {
      // For input directory files, serve directly from the filesystem
      // Use the filename since the media endpoint will resolve the path
      return `/media/${encodeURIComponent(file.filename)}`;
    },

    getFileDisplayName(file) {
      // Truncate long filenames for display
      if (file.filename.length > 20) {
        return file.filename.substring(0, 17) + '...';
      }
      return file.filename;
    },

    isSelected(file) {
      // Check if file is currently selected
      return this.$parent?.selectedFile?.id === file.id;
    },

    formatFileSize(bytes) {
      if (!bytes) return '';
      
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    },

    formatDate(dateString) {
      if (!dateString) return '';
      
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      
      return date.toLocaleDateString();
    },

    // Lifecycle
    init() {
      // Handle window resize for responsive grid
      this.handleResize = () => {
        this.$nextTick(() => {
          // Force grid recalculation
          this.$el.style.gridTemplateColumns = `repeat(${this.gridColumns}, 1fr)`;
        });
      };
      
      window.addEventListener('resize', this.handleResize);
      this.handleResize(); // Initial setup
    },

    destroy() {
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
      }
      window.removeEventListener('resize', this.handleResize);
    }
  };
};