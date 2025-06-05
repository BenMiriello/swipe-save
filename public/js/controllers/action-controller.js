/**
 * Handles file actions and operations
 */
const actionController = {

  /**
   * Perform an action on the current image
   * @param {string} action - Action to perform
   */
  async performAction(action) {
    const state = window.stateManager.getState();
    if (state.allFiles.length === 0) return;

    const file = state.allFiles[state.currentIndex];
    const filename = file.name;
    const mediaItem = document.querySelector('.media-item');

    if (!mediaItem) return;

    window.uiManager.showActionFeedback(mediaItem, action);

    try {
      await window.apiService.performAction(filename, action, state.customFilename);

      setTimeout(() => {
        window.stateManager.removeCurrentFile();

        if (state.allFiles.length === 0) {
          window.uiManager.showEmptyState();
          window.uiManager.updateImageCounter(0, 0);
          return;
        }

        window.navigationController.displayCurrentImage();
      }, 300);
    } catch (error) {
      console.error('Error performing action:', error);
      window.uiManager.hideActionFeedback(mediaItem, action);
    }
  },

  /**
   * Undo the last action
   */
  async undoLastAction() {
    try {
      const result = await window.apiService.undoLastAction();

      if (result.undoneAction) {
        const undoneFilename = result.undoneAction.filename;
        const state = window.stateManager.getState();
        const currentFilename = state.allFiles[state.currentIndex]?.name;

        const files = await window.apiService.fetchMediaFiles();
        window.stateManager.setFiles(files);

        if (files.length === 0) {
          window.uiManager.showEmptyState();
          window.uiManager.updateImageCounter(0, 0);
          return;
        }

        if (undoneFilename) {
          const undoneIndex = files.findIndex(file => file.name === undoneFilename);
          if (undoneIndex !== -1) {
            window.stateManager.updateState({ currentIndex: undoneIndex });
          } else if (currentFilename) {
            const currentFileIndex = files.findIndex(file => file.name === currentFilename);
            if (currentFileIndex !== -1) {
              window.stateManager.updateState({ currentIndex: currentFileIndex });
            } else {
              window.stateManager.updateState({ currentIndex: 0 });
            }
          } else {
            window.stateManager.updateState({ currentIndex: 0 });
          }
        }

        window.navigationController.displayCurrentImage();
      }
    } catch (error) {
      console.error('Error performing undo:', error);
      alert('Failed to undo the last action: ' + error.message);
    }
  },

  /**
   * Download the current file
   */
  downloadCurrentFile() {
    const state = window.stateManager.getState();
    if (state.allFiles.length === 0) return;

    const currentFile = state.allFiles[state.currentIndex];
    window.apiService.downloadFile(currentFile, state.customFilename);
  },

  /**
   * Open current file in new tab/window
   */
  openFileInNewView() {
    const state = window.stateManager.getState();
    if (state.allFiles.length === 0) return;

    const currentFile = state.allFiles[state.currentIndex];
    window.apiService.openFileInNewView(currentFile);
  },

  /**
   * Save the custom filename
   * @param {string} filename - New filename
   */
  saveCustomFilename(filename) {
    window.stateManager.updateState({ customFilename: filename });
    window.navigationController.displayCurrentImage();
  }
};

window.actionController = actionController;
