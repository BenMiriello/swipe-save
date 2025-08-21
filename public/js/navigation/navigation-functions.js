/**
 * Navigation Functions
 * Handles view switching and navigation button management
 */
const NavigationFunctions = {
  /**
   * Navigate to list view
   */
  goToListView() {
    window.location.href = '/list';
  },

  /**
   * Navigate to single view
   * Uses current file path or falls back to first file
   */
  goToSingleView() {
    if (window.globalState.currentFilePath) {
      const encodedPath = encodeURIComponent(window.globalState.currentFilePath);
      window.location.href = `/view?file=${encodedPath}`;
    } else {
      // Fallback to first file
      window.location.href = `/view?index=0`;
    }
  },

  /**
   * Update navigation buttons based on current view
   */
  updateNavButtons() {
    const currentPath = window.location.pathname;
    const listBtn = document.getElementById('navListBtn');
    const singleBtn = document.getElementById('navSingleBtn');
    
    if (currentPath === '/' || currentPath === '/list') {
      // List view - show single view button
      if (listBtn) listBtn.style.display = 'none';
      if (singleBtn) singleBtn.style.display = 'block';
    } else {
      // Single view - show list view button  
      if (listBtn) listBtn.style.display = 'block';
      if (singleBtn) singleBtn.style.display = 'none';
    }
  }
};

// Export functions globally for backward compatibility
window.goToListView = NavigationFunctions.goToListView;
window.goToSingleView = NavigationFunctions.goToSingleView;
window.updateNavButtons = NavigationFunctions.updateNavButtons;