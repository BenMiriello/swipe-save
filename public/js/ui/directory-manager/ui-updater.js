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
    const container = document.getElementById('sourceDirectoriesContainer');
    if (!container) return;

    const config = window.directoryManager.config;
    const enabledDirectories = config.sources.directories.filter(d => d.enabled);
    const groups = config.sources.groups || [];
    
    if (enabledDirectories.length === 0 && groups.length === 0) {
      container.innerHTML = `
        <div class="directory-item">
          <span class="dir-name">No source directories configured</span>
          <button class="btn btn-small" onclick="directoryManager.showSourcePicker()">+ Add Source</button>
        </div>
      `;
    } else {
      let html = '';
      
      // Show enabled directories
      enabledDirectories.forEach(dir => {
        html += `
          <div class="directory-item">
            <span class="dir-icon">📁</span>
            <span class="dir-name" title="${dir.path}">${this.shortenPath(dir.path)}</span>
            <button class="btn btn-small" onclick="directoryManager.removeDirectory('${dir.id}')">Remove</button>
          </div>
        `;
      });
      
      // Show groups
      groups.forEach(group => {
        html += `
          <div class="directory-item group">
            <span class="dir-icon">📂</span>
            <span class="dir-name">${group.name} (${group.directories.length} folders)</span>
            <button class="btn btn-small" onclick="directoryManager.editGroup('${group.id}')">Edit</button>
          </div>
        `;
      });
      
      container.innerHTML = html;
    }
  },

  /**
   * Update destination display in options
   */
  updateDestinationDisplay() {
    const destPathEl = document.getElementById('currentDestinationPath');
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
      const sourceContainer = document.getElementById('sourceDirectoriesContainer');
      if (sourceContainer) {
        sourceContainer.style.animation = 'pulse 2s infinite';
        sourceContainer.title = 'Configure your first source directory';
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