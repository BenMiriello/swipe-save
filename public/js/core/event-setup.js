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
      () => window.actionController?.showPreviousImage?.(),
      'nav-previous'
    );

    // Next/forward navigation
    this.eventManager.registerClick(
      '.btn-secondary:last-child, .btn-nav:last-child',
      () => window.actionController?.showNextImage?.(),
      'nav-next'
    );

    // Undo button
    this.eventManager.registerClick(
      '.btn-undo',
      () => window.actionController?.undoLastAction?.(),
      'nav-undo'
    );

    // Save/download button
    this.eventManager.registerClick(
      '.save-icon',
      () => window.actionController?.downloadCurrentFile?.(),
      'action-save'
    );

    // Reload/refresh buttons
    this.eventManager.registerClick(
      '.reload-icon, .refresh-icon',
      () => window.appController?.fetchMediaFiles?.(),
      'action-refresh'
    );

    // ComfyUI modal trigger
    this.eventManager.registerClick(
      '.comfyui-icon',
      () => window.appController?.openComfyUIModal?.(),
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
      () => window.actionController?.showPreviousImage?.(),
      'kb-nav-left'
    );

    this.eventManager.registerKeyboard(
      'ArrowRight',
      () => window.actionController?.showNextImage?.(),
      'kb-nav-right'
    );

    // Command combinations
    this.eventManager.registerKeyboard(
      'Cmd+z',
      () => window.actionController?.undoLastAction?.(),
      'kb-undo'
    );

    this.eventManager.registerKeyboard(
      'Cmd+s',
      () => window.actionController?.downloadCurrentFile?.(),
      'kb-save'
    );

    this.eventManager.registerKeyboard(
      'Cmd+r',
      () => window.appController?.fetchMediaFiles?.(),
      'kb-refresh'
    );

    this.eventManager.registerKeyboard(
      'Cmd+o',
      () => window.appController?.toggleOptionsMenu?.(),
      'kb-options'
    );

    // Command + Arrow combinations for actions
    this.eventManager.registerKeyboard(
      'Cmd+ArrowLeft',
      () => window.actionController?.performAction?.('archive'),
      'kb-action-archive'
    );

    this.eventManager.registerKeyboard(
      'Cmd+ArrowRight',
      () => window.actionController?.performAction?.('saved'),
      'kb-action-save'
    );

    this.eventManager.registerKeyboard(
      'Cmd+ArrowUp',
      () => window.actionController?.performAction?.('best_complete'),
      'kb-action-best'
    );

    this.eventManager.registerKeyboard(
      'Cmd+ArrowDown',
      () => window.actionController?.performAction?.('delete'),
      'kb-action-delete'
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
            () => window.actionController?.performAction?(action),
            `kb-dynamic-${key}-${action}`
          );
        }
      });
    };

    setupKeys();
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