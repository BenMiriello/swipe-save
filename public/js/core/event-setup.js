/**
 * Core Event Setup System
 * Centralizes all vanilla JS event handling using EventManager
 */
const CoreEventSetup = {
  eventManager: null,

  /**
   * Initialize all core application events
   */
  init() {
    this.eventManager = EventManager.getInstance();
    this.eventManager.init();

    this.setupCoreNavigation();
    this.setupKeyboardShortcuts();
    this.setupUIControls();

    console.log('CoreEventSetup: All events initialized');
  },

  /**
   * Setup core navigation button events
   */
  setupCoreNavigation() {
    // Previous/back navigation
    this.eventManager.registerClick(
      '.btn-secondary:first-child, .btn-nav:first-child',
      () => this.callSafely('actionController', 'showPreviousImage'),
      'nav-previous'
    );

    // Next/forward navigation
    this.eventManager.registerClick(
      '.btn-secondary:last-child, .btn-nav:last-child',
      () => this.callSafely('actionController', 'showNextImage'),
      'nav-next'
    );

    // Undo button
    this.eventManager.registerClick(
      '.btn-undo',
      () => this.callSafely('actionController', 'undoLastAction'),
      'nav-undo'
    );

    // Save/download button
    this.eventManager.registerClick(
      '.save-icon',
      () => this.callSafely('actionController', 'downloadCurrentFile'),
      'action-save'
    );

    // Reload/refresh buttons
    this.eventManager.registerClick(
      '.reload-icon, .refresh-icon',
      () => this.callSafely('appController', 'fetchMediaFiles'),
      'action-refresh'
    );

    // ComfyUI modal trigger
    this.eventManager.registerClick(
      '.comfyui-icon',
      () => this.callSafely('appController', 'openComfyUIModal'),
      'modal-comfyui'
    );
  },

  /**
   * Setup keyboard shortcuts
   */
  setupKeyboardShortcuts() {
    // Arrow navigation
    this.eventManager.registerKeyboard(
      'ArrowLeft',
      () => this.callSafely('actionController', 'showPreviousImage'),
      'kb-nav-left'
    );

    this.eventManager.registerKeyboard(
      'ArrowRight',
      () => this.callSafely('actionController', 'showNextImage'),
      'kb-nav-right'
    );

    // Command combinations
    this.eventManager.registerKeyboard(
      'Cmd+z',
      () => this.callSafely('actionController', 'undoLastAction'),
      'kb-undo'
    );

    this.eventManager.registerKeyboard(
      'Cmd+s',
      () => this.callSafely('actionController', 'downloadCurrentFile'),
      'kb-save'
    );

    this.eventManager.registerKeyboard(
      'Cmd+r',
      () => this.callSafely('appController', 'fetchMediaFiles'),
      'kb-refresh'
    );

    this.eventManager.registerKeyboard(
      'Cmd+o',
      () => this.callSafely('appController', 'toggleOptionsMenu'),
      'kb-options'
    );

    // Command + Arrow combinations for actions
    this.eventManager.registerKeyboard(
      'Cmd+ArrowLeft',
      () => this.callSafely('actionController', 'performAction', 'archive'),
      'kb-action-archive'
    );

    this.eventManager.registerKeyboard(
      'Cmd+ArrowRight',
      () => this.callSafely('actionController', 'performAction', 'saved'),
      'kb-action-save'
    );

    this.eventManager.registerKeyboard(
      'Cmd+ArrowUp',
      () => this.callSafely('actionController', 'performAction', 'best_complete'),
      'kb-action-best'
    );

    this.eventManager.registerKeyboard(
      'Cmd+ArrowDown',
      () => this.callSafely('actionController', 'performAction', 'delete'),
      'kb-action-delete'
    );

    // Additional keyboard shortcuts (Command+A/J for previous, Command+D/L for next)
    this.eventManager.registerKeyboard(
      'Cmd+a',
      () => this.callSafely('actionController', 'showPreviousImage'),
      'kb-nav-a'
    );

    this.eventManager.registerKeyboard(
      'Cmd+j',
      () => this.callSafely('actionController', 'showPreviousImage'),
      'kb-nav-j'
    );

    this.eventManager.registerKeyboard(
      'Cmd+d',
      () => this.callSafely('actionController', 'showNextImage'),
      'kb-nav-d'
    );

    this.eventManager.registerKeyboard(
      'Cmd+l',
      () => this.callSafely('actionController', 'showNextImage'),
      'kb-nav-l'
    );
  },

  /**
   * Setup additional UI control events
   */
  setupUIControls() {
    // Handle dynamic action keys from config
    this.setupDynamicActionKeys();
  },

  /**
   * Setup dynamic action keys from config
   */
  setupDynamicActionKeys() {
    // Wait for appConfig to be available
    const setupKeys = () => {
      if (!window.appConfig?.keyboardMap) {
        setTimeout(setupKeys, 100);
        return;
      }

      Object.entries(window.appConfig.keyboardMap).forEach(([key, action]) => {
        if (key && action) {
          this.eventManager.registerKeyboard(
            key,
            () => this.callSafely('actionController', 'performAction', action),
            `kb-dynamic-${key}-${action}`
          );
        }
      });
    };

    setupKeys();
  },

  /**
   * Safely call methods on window objects that may not exist yet
   * @param {string} objectName - Name of the window object
   * @param {string} methodName - Name of the method to call
   * @param {...any} args - Arguments to pass to the method
   */
  callSafely(objectName, methodName, ...args) {
    const obj = window[objectName];
    if (obj && typeof obj[methodName] === 'function') {
      return obj[methodName](...args);
    } else {
      console.warn(`${objectName}.${methodName} not available yet`);
    }
  },

  /**
   * Cleanup all registered events
   */
  cleanup() {
    if (this.eventManager) {
      this.eventManager.cleanup();
    }
  }
};

// Initialize events when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  CoreEventSetup.init();
});

// Export globally
window.CoreEventSetup = CoreEventSetup;