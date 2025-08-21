/**
 * Directory Manager First Run Experience
 * Handles the initial setup flow for new users
 */
const DirectoryFirstRun = {
  /**
   * Show first run experience - just open options menu
   */
  async showFirstRunExperience() {
    // Auto-open options menu and highlight source path
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
  }
};

// Export for global access
window.DirectoryFirstRun = DirectoryFirstRun;