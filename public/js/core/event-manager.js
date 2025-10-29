/**
 * Centralized Event Management System
 * Handles all vanilla JS event delegation to prevent duplicates and improve performance
 */
class EventManager {
  static instance = null;

  constructor() {
    if (EventManager.instance) return EventManager.instance;

    this.handlers = new Map();
    this.keyboardHandlers = new Map();
    this.isInitialized = false;

    EventManager.instance = this;
  }

  /**
   * Initialize the event manager with document-level delegation
   */
  init() {
    if (this.isInitialized) return;

    document.addEventListener('click', this.handleClick.bind(this), true);
    document.addEventListener('keydown', this.handleKeyboard.bind(this), true);

    this.isInitialized = true;
    console.log('EventManager initialized with document-level delegation');
  }

  /**
   * Register a click handler for elements matching the selector
   * @param {string} selector - CSS selector for target elements
   * @param {Function} handler - Event handler function
   * @param {string} id - Unique identifier for this handler
   */
  registerClick(selector, handler, id) {
    if (this.handlers.has(id)) {
      console.warn(`Handler with id "${id}" already registered, skipping`);
      return;
    }

    this.handlers.set(id, { selector, handler, type: 'click' });
  }

  /**
   * Register a keyboard handler
   * @param {string} key - Key combination (e.g., 'ArrowLeft', 'Cmd+s')
   * @param {Function} handler - Event handler function
   * @param {string} id - Unique identifier for this handler
   */
  registerKeyboard(key, handler, id) {
    if (this.keyboardHandlers.has(id)) {
      console.warn(`Keyboard handler with id "${id}" already registered, skipping`);
      return;
    }

    this.keyboardHandlers.set(id, { key, handler });
  }

  /**
   * Handle all click events through delegation
   * @param {Event} event - Click event
   */
  handleClick(event) {
    for (const [id, config] of this.handlers) {
      if (config.type === 'click' && event.target.matches(config.selector)) {
        event.preventDefault();
        config.handler(event);
        return;
      }

      // Also check if any parent matches (for nested elements)
      const parent = event.target.closest(config.selector);
      if (parent && config.type === 'click') {
        event.preventDefault();
        config.handler(event);
        return;
      }
    }
  }

  /**
   * Handle all keyboard events
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleKeyboard(event) {
    // Skip if typing in input fields
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
      return;
    }

    const key = this.getKeyCombo(event);

    for (const [id, config] of this.keyboardHandlers) {
      if (config.key === key) {
        event.preventDefault();
        config.handler(event);
        return;
      }
    }
  }

  /**
   * Get normalized key combination string
   * @param {KeyboardEvent} event - Keyboard event
   * @returns {string} Key combination
   */
  getKeyCombo(event) {
    const parts = [];

    if (event.metaKey) parts.push('Cmd');
    if (event.ctrlKey) parts.push('Ctrl');
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey) parts.push('Shift');

    parts.push(event.key);

    return parts.join('+');
  }

  /**
   * Unregister a handler
   * @param {string} id - Handler id to remove
   */
  unregister(id) {
    this.handlers.delete(id);
    this.keyboardHandlers.delete(id);
  }

  /**
   * Clean up all event handlers
   */
  cleanup() {
    if (!this.isInitialized) return;

    document.removeEventListener('click', this.handleClick.bind(this), true);
    document.removeEventListener('keydown', this.handleKeyboard.bind(this), true);

    this.handlers.clear();
    this.keyboardHandlers.clear();
    this.isInitialized = false;

    EventManager.instance = null;
  }

  /**
   * Get singleton instance
   * @returns {EventManager} Singleton instance
   */
  static getInstance() {
    if (!EventManager.instance) {
      new EventManager();
    }
    return EventManager.instance;
  }
}

// Export as global
window.EventManager = EventManager;