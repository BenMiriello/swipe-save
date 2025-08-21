/**
 * Event Handlers for Directory Manager
 * Manages event binding and interaction handling
 */
const DirectoryEventHandlers = {
  /**
   * Setup all event handlers for directory management
   */
  setupEventHandlers() {
    this.setupDirectoryClickHandlers();
    this.setupModalEventHandlers();
    this.setupFormHandlers();
  },

  /**
   * Setup directory option click handlers
   */
  setupDirectoryClickHandlers() {
    const sourcePathEl = document.getElementById('sourcePathClickable');
    if (sourcePathEl) {
      sourcePathEl.addEventListener('click', () => {
        if (window.directoryManager) {
          window.directoryManager.openDirectoryPicker();
        }
      });
    }

    const destPathEl = document.getElementById('destPathClickable');
    if (destPathEl) {
      destPathEl.addEventListener('click', () => {
        if (window.directoryManager) {
          window.directoryManager.openDestinationPicker();
        }
      });
    }
  },

  /**
   * Setup modal-specific event handlers
   */
  setupModalEventHandlers() {
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) {
        e.target.style.display = 'none';
      }
    });

    const groupOption = document.getElementsByName('groupOption');
    groupOption.forEach(radio => {
      radio.addEventListener('change', () => {
        const newGroupInput = document.getElementById('newGroupName');
        const existingGroupsSelect = document.getElementById('existingGroups');
        
        if (radio.value === 'new') {
          newGroupInput.disabled = false;
          existingGroupsSelect.disabled = true;
        } else {
          newGroupInput.disabled = true;
          existingGroupsSelect.disabled = false;
        }
      });
    });
  },

  /**
   * Setup form input handlers
   */
  setupFormHandlers() {
    const sourceBrowserPath = document.getElementById('sourceBrowserPath');
    if (sourceBrowserPath) {
      sourceBrowserPath.addEventListener('change', () => {
        if (window.directoryManager) {
          window.directoryManager.browsePath(sourceBrowserPath.value, 'source');
        }
      });
    }

    const destBrowserPath = document.getElementById('destBrowserPath');
    if (destBrowserPath) {
      destBrowserPath.addEventListener('change', () => {
        if (window.directoryManager) {
          window.directoryManager.browsePath(destBrowserPath.value, 'destination');
        }
      });
    }

    const directoryName = document.getElementById('directoryName');
    if (directoryName) {
      directoryName.addEventListener('input', (e) => {
        const value = e.target.value.trim();
        if (value && window.directoryManager) {
          window.directoryManager.updatePreviewName(value);
        }
      });
    }
  }
};

window.DirectoryEventHandlers = DirectoryEventHandlers;