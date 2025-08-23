/**
 * Global App State Store for Cross-View Communication
 */
document.addEventListener('alpine:init', () => {
  Alpine.store('appState', {
    // Current file tracking for cross-view navigation
    currentFileIndex: 0,
    totalFiles: 0,
    
    // View state
    currentView: 'single', // 'single' | 'list'
    
    // Methods
    setCurrentFile(index) {
      this.currentFileIndex = index;
    },
    
    setTotalFiles(total) {
      this.totalFiles = total;
    },
    
    switchToListView() {
      this.currentView = 'list';
      
      // Hide single view elements
      const mediaContainer = document.querySelector('.media-container');
      if (mediaContainer) {
        mediaContainer.style.display = 'none';
      }
      
      // Show list view container
      const listViewContainer = document.getElementById('list-view-container');
      if (listViewContainer) {
        listViewContainer.style.display = 'block';
      }
      
      // Hide list view button
      const listViewButton = document.getElementById('listViewButton');
      if (listViewButton) {
        listViewButton.style.display = 'none';
      }
      
      // Hide bottom controls (only for single view)
      const bottomControls = document.querySelector('.bottom-controls');
      if (bottomControls) {
        bottomControls.style.display = 'none';
      }
    },
    
    switchToSingleView() {
      this.currentView = 'single';
      
      // Show single view elements
      const mediaContainer = document.querySelector('.media-container');
      if (mediaContainer) {
        mediaContainer.style.display = 'block';
      }
      
      // Hide list view container
      const listViewContainer = document.getElementById('list-view-container');
      if (listViewContainer) {
        listViewContainer.style.display = 'none';
      }
      
      // Show list view button
      const listViewButton = document.getElementById('listViewButton');
      if (listViewButton) {
        listViewButton.style.display = 'block';
      }
      
      // Show bottom controls
      const bottomControls = document.querySelector('.bottom-controls');
      if (bottomControls) {
        bottomControls.style.display = 'flex';
      }
    }
  });
});