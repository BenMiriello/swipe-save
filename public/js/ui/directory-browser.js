/**
 * Manages directory browsing functionality
 */
const directoryBrowser = {
  currentBrowserPath: null,
  currentBrowserType: null,

  /**
   * Open directory browser
   * @param {string} type - 'source' or 'destination'
   */
  async openDirectoryBrowser(type) {
    this.currentBrowserType = type;
    const directoryBrowser = document.getElementById('directoryBrowser');
    directoryBrowser.style.display = 'block';

    const title = document.getElementById('browserTitle');
    title.textContent = type === 'source' ? 'Select Source Directory' : 'Select Destination Directory';

    try {
      const config = await window.apiService.getConfig();
      const startPath = type === 'source' ? config.sourceDir : config.destinationDir;
      await this.browseDirectory(startPath);
    } catch (error) {
      // Start from root directory if config fails, let user navigate
      await this.browseDirectory('/home');
    }

    this.setupDirectoryBrowserHandlers();
  },

  /**
   * Browse a directory
   * @param {string} path - Directory path to browse
   */
  async browseDirectory(path) {
    const directoryList = document.getElementById('directoryList');
    const currentPath = document.getElementById('currentPath');
    const upButton = document.getElementById('upButton');

    try {
      directoryList.innerHTML = 'Loading...';
      const result = await window.apiService.browseDirectory(path);

      this.currentBrowserPath = result.currentPath;
      currentPath.value = result.currentPath;

      upButton.disabled = !result.parentPath;

      directoryList.innerHTML = '';

      if (result.directories.length === 0) {
        directoryList.innerHTML = '<div class="no-directories">No subdirectories found</div>';
        return;
      }

      result.directories.forEach(dir => {
        const dirItem = document.createElement('div');
        dirItem.className = 'directory-item';
        dirItem.innerHTML = `
          <span class="folder-icon">📁</span>
          <span class="dir-name">${dir.name}</span>
        `;
        dirItem.addEventListener('click', () => {
          this.browseDirectory(dir.path);
        });
        directoryList.appendChild(dirItem);
      });
    } catch (error) {
      directoryList.innerHTML = `<div style="color: red;">Error: ${error.message}</div>`;
    }
  },

  /**
   * Setup directory browser event handlers
   */
  setupDirectoryBrowserHandlers() {
    const upButton = document.getElementById('upButton');
    upButton.onclick = async () => {
      if (this.currentBrowserPath) {
        const parentPath = this.currentBrowserPath.split('/').slice(0, -1).join('/') || '/';
        await this.browseDirectory(parentPath);
      }
    };

    const currentPath = document.getElementById('currentPath');
    currentPath.addEventListener('keypress', async (e) => {
      if (e.key === 'Enter') {
        const path = currentPath.value.trim();
        if (path) {
          await this.browseDirectory(path);
        }
      }
    });

    const selectButton = document.getElementById('selectDirectory');
    selectButton.onclick = async () => {
      if (this.currentBrowserPath) {
        await this.selectDirectory(this.currentBrowserPath, this.currentBrowserType);
      }
    };

    const useDefaultButton = document.getElementById('useDefaultDirectory');
    if (useDefaultButton) {
      useDefaultButton.onclick = async () => {
        await this.useDefaultDirectory(this.currentBrowserType);
        // Don't close modal - just update the display
      };
    }
  },

  /**
   * Select a directory and update config
   * @param {string} path - Selected directory path
   * @param {string} type - 'source' or 'destination'
   */
  async selectDirectory(path, type) {
    try {
      const updateData = {};
      updateData[type + 'Dir'] = path;

      const result = await window.apiService.updateConfig(updateData);

      if (result.success) {
        window.coreUIManager.updateConfigDisplay(result.config);
        document.getElementById('directoryBrowser').style.display = 'none';

        if (type === 'source' && window.appController) {
          window.appController.fetchMediaFiles();
        }
      }
    } catch (error) {
      alert('Failed to update directory: ' + error.message);
    }
  },

  /**
   * Use default directory for source or destination - gets defaults from server
   * @param {string} type - 'source' or 'destination'
   */
  async useDefaultDirectory(type) {
    try {
      // Get dynamic defaults from the server instead of hardcoding
      const response = await fetch(`${window.appConfig.getApiUrl()}/api/default-paths`);
      const defaults = await response.json();
      
      const updateData = {};
      updateData[type + 'Dir'] = defaults[type] || '/home'; // Fallback to /home

      const result = await window.apiService.updateConfig(updateData);

      if (result.success) {
        window.coreUIManager.updateConfigDisplay(result.config);

        if (type === 'source' && window.appController) {
          window.appController.fetchMediaFiles();
        }
      }
    } catch (error) {
      alert('Failed to set default directory: ' + error.message);
    }
  }
};

window.directoryBrowser = directoryBrowser;
