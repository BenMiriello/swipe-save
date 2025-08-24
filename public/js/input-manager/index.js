/**
 * Input Manager Module
 * Coordinate and initialize all input management components
 */

window.InputManager = window.InputManager || {
  core: {},
  ui: {},
  utils: {},
  initialized: false
};

window.InputManager.initialize = async function() {
  if (this.initialized) {
    console.log('InputManager already initialized');
    return;
  }

  try {
    console.log('Initializing InputManager...');
    
    // Initialize database schema
    await this.core.InputDatabase.initializeSchema();
    
    // Validate and ensure input directory structure
    const configManager = this.utils.InputConfigManager;
    const inputPathValid = await configManager.validateInputPath();
    
    if (!inputPathValid) {
      console.warn('ComfyUI input path not valid, using default');
    }
    
    await configManager.ensureManagedDirectory();
    
    this.initialized = true;
    console.log('InputManager initialized successfully');
    
    // Dispatch initialization event
    window.dispatchEvent(new CustomEvent('inputManagerReady', {
      detail: { inputManager: this }
    }));
    
  } catch (error) {
    console.error('Failed to initialize InputManager:', error);
    throw error;
  }
};

// Auto-initialize when DOM is ready and dependencies are available
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', checkInitialize);
} else {
  checkInitialize();
}

let initializationAttempts = 0;
const MAX_ATTEMPTS = 50; // Stop after 5 seconds

function checkInitialize() {
  initializationAttempts++;
  
  // Check multiple possible database systems
  const hasSQLite = typeof window.openDatabase === 'function';
  const hasIndexedDB = typeof window.indexedDB === 'object';
  
  console.log('InputManager checking for dependencies (attempt ' + initializationAttempts + '):', { 
    AppDatabase: !!window.AppDatabase, 
    AppConfig: !!window.AppConfig,
    SQLite: hasSQLite,
    IndexedDB: hasIndexedDB
  });
  
  // Try to initialize without AppDatabase dependency
  if (hasSQLite || hasIndexedDB || window.AppDatabase) {
    console.log('Starting InputManager initialization...');
    window.InputManager.initialize().catch(error => {
      console.warn('InputManager initialization failed:', error);
    });
  } else if (initializationAttempts < MAX_ATTEMPTS) {
    console.log('Dependencies not available, retrying in 100ms...');
    setTimeout(checkInitialize, 100);
  } else {
    console.warn('InputManager initialization stopped after', MAX_ATTEMPTS, 'attempts. Will initialize on-demand.');
  }
}

// Export for external access
window.InputManager.version = '1.0.0';