/**
 * Simple List View - Alpine.js Integration
 * Replaces the vanilla JS implementation with Alpine.js components
 */
window.simpleListView = {
  isActive: false,
  
  /**
   * Initialize and show the Alpine.js list view
   */
  init() {
    if (this.isActive) return;
    
    this.isActive = true;
    
    if (window.alpineListView) {
      window.alpineListView.init();
    } else {
      console.error('window.alpineListView not found!');
    }
  },
  
  /**
   * Exit list view and return to single view
   */
  exit() {
    if (!this.isActive) return;
    
    this.isActive = false;
    Alpine.store('listView').exitListView();
    Alpine.store('appState').switchToSingleView();
  },
  
  /**
   * Toggle between list and single view
   */
  toggle() {
    if (this.isActive) {
      this.exit();
    } else {
      this.init();
    }
  }
};

// Maintain compatibility with existing code that might call these methods
window.simpleListView.openFileGrid = () => {
  if (Alpine.store('listView')) {
    Alpine.store('listView').openFileGrid();
  }
};

window.simpleListView.hideFileGrid = () => {
  if (Alpine.store('listView')) {
    Alpine.store('listView').hideFileGrid();
  }
};

window.simpleListView.togglePreviews = () => {
  if (Alpine.store('listView')) {
    Alpine.store('listView').togglePreviews();
  }
};