/**
 * UI Updater for Directory Manager
 * Handles updating the UI with current directory configuration
 */
const DirectoryUIUpdater = {
  /**
   * Refresh the options UI with current configuration
   */
  async refreshOptionsUI() {
    if (!window.directoryManager?.config) {
      return;
    }

    this.updateSourceDirectoryDisplay();
    this.updateDestinationDisplay();
    this.updateGroupDisplay();
  },

  /**
   * Update source directory display in options
   */
  updateSourceDirectoryDisplay() {
    const sourcePathEl = document.getElementById('sourcePathClickable');
    if (!sourcePathEl) return;

    const config = window.directoryManager.config;
    const enabledDirectories = config.sources.directories.filter(d => d.enabled);
    
    if (enabledDirectories.length === 0) {
      sourcePathEl.textContent = 'Click to add source directory';
      sourcePathEl.title = 'No source directories configured';
    } else if (enabledDirectories.length === 1) {
      const dir = enabledDirectories[0];
      sourcePathEl.textContent = this.shortenPath(dir.path);
      sourcePathEl.title = `Source: ${dir.path}`;
    } else {
      sourcePathEl.textContent = `${enabledDirectories.length} directories`;
      sourcePathEl.title = `Multiple source directories:\n${enabledDirectories.map(d => d.path).join('\n')}`;
    }
  },

  /**
   * Update destination display in options
   */
  updateDestinationDisplay() {
    const destPathEl = document.getElementById('destPathClickable');
    if (!destPathEl) return;

    const config = window.directoryManager.config;
    
    if (config.destination.current) {
      destPathEl.textContent = this.shortenPath(config.destination.current);
      destPathEl.title = `Destination: ${config.destination.current}`;
    } else {
      destPathEl.textContent = 'Click to set destination';
      destPathEl.title = 'No destination directory configured';
    }
  },

  /**
   * Update group display (if group management UI exists)
   */
  updateGroupDisplay() {
    const groupDisplayEl = document.getElementById('groupDisplay');
    if (!groupDisplayEl) return;

    const config = window.directoryManager.config;
    const groups = Object.keys(config.sources.groups);
    
    if (groups.length === 0) {
      groupDisplayEl.textContent = 'No groups';
    } else {
      groupDisplayEl.textContent = `${groups.length} group${groups.length === 1 ? '' : 's'}`;
    }
  },

  /**
   * Shorten path for display
   */
  shortenPath(path) {
    if (!path || path.length <= 40) return path;
    const parts = path.split('/');
    return '.../' + parts.slice(-2).join('/');
  },

  /**
   * Show first run experience
   */
  showFirstRunExperience() {
    const optionsDropdown = document.querySelector('.options-dropdown');
    if (optionsDropdown) {
      optionsDropdown.classList.add('show');
    }

    setTimeout(() => {
      const sourcePathEl = document.getElementById('sourcePathClickable');
      if (sourcePathEl) {
        sourcePathEl.style.animation = 'pulse 2s infinite';
        sourcePathEl.title = 'Click here to configure your first source directory';
      }
    }, 1000);
  },

  /**
   * Update preview name in directory picker
   */
  updatePreviewName(name) {
    const previewEl = document.getElementById('directoryPreview');
    if (previewEl) {
      previewEl.textContent = `Directory: ${name}`;
    }
  }
};

window.DirectoryUIUpdater = DirectoryUIUpdater;