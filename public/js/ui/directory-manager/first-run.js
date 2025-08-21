/**
 * Directory Manager First Run Experience
 * Handles the initial setup flow for new users
 */
const DirectoryFirstRun = {
  /**
   * Show first run experience
   */
  async showFirstRunExperience() {
    // Auto-open options menu
    const optionsDropdown = document.querySelector('.options-dropdown');
    if (optionsDropdown) {
      optionsDropdown.classList.add('show');
    } else {
      console.log('Options dropdown not ready for first run experience');
    }

    // Show one-time popup after a brief delay
    setTimeout(() => {
      this.showFirstRunPopup();
    }, 2000);
  },

  /**
   * Show first run popup
   */
  showFirstRunPopup() {
    const existingPopup = document.getElementById('firstRunPopup');
    if (existingPopup) {
      existingPopup.remove();
    }

    const popup = document.createElement('div');
    popup.id = 'firstRunPopup';
    popup.className = 'first-run-popup';
    popup.innerHTML = `
      <div class="first-run-content">
        <h3>Welcome to Swipe-Save!</h3>
        <p>Let's get you set up. Please:</p>
        <ol>
          <li>📁 <strong>Add your source folders</strong> - Where your media files are stored</li>
          <li>📍 <strong>Set your destination</strong> - Where you want to save selected files</li>
          <li>⚙️ <strong>Configure settings</strong> as needed</li>
        </ol>
        <p>The options menu above will stay open to help you get started.</p>
        <div class="first-run-buttons">
          <button class="btn-first-run-close" onclick="directoryFirstRun.dismissFirstRunPopup(event)">
            Got it, let's begin!
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(popup);

    // Auto-dismiss after 15 seconds
    setTimeout(() => {
      if (document.getElementById('firstRunPopup')) {
        this.dismissFirstRunPopup();
      }
    }, 15000);
  },

  /**
   * Dismiss first run popup
   */
  async dismissFirstRunPopup(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const popup = document.getElementById('firstRunPopup');
    if (popup) {
      popup.remove();
    }

    // Mark first run as complete
    try {
      await window.DirectoryConfigManager.markFirstRunComplete();
    } catch (error) {
      console.error('Failed to mark first run complete:', error);
    }
  }
};

// Export for global access
window.DirectoryFirstRun = DirectoryFirstRun;