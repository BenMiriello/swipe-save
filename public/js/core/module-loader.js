/**
 * Module Loader
 * Manages the loading of all application JavaScript modules in the correct dependency order
 */
const ModuleLoader = {
  /**
   * Core application modules in dependency order
   */
  moduleGroups: {
    // Core infrastructure - loads first
    core: [
      'js/error-handler.js',
      'js/config.js'
    ],
    
    // API layer - depends on config
    api: [
      'js/api/file-api.js',
      'js/api/config-api.js',
      'js/api/copy-api.js',
      'js/api-service.js',
      'js/api/directory-api.js'
    ],
    
    // Pagination system
    pagination: [
      'js/pagination/pagination-state.js',
      'js/components/list-pagination.js'
    ],
    
    // ComfyUI services layer
    comfyuiServices: [
      'js/comfyui/services/api-client.js',
      'js/comfyui/services/storage-service.js'
    ],
    
    // State stores - depends on services
    stores: [
      'js/comfyui/stores/workflow-store.js',
      'js/comfyui/stores/destination-store.js',
      'js/comfyui/stores/queue-store.js',
      'js/stores/app-state-store.js',
      'js/stores/list-view-store.js'
    ],
    
    // ComfyUI components - depends on stores
    comfyuiComponents: [
      'js/comfyui/components/section-components.js',
      'js/comfyui/components/modal-components.js',
      'js/comfyui/components/panel-components.js'
    ],
    
    // ComfyUI main modules
    comfyuiMain: [
      'js/comfyui/index.js',
      'js/comfyui/test.js'
    ],
    
    // BentoML integration - depends on ComfyUI
    bentoml: [
      'js/comfyui-bentoml/services/bentoml-client.js',
      'js/comfyui-bentoml/services/schema-service.js',
      'js/comfyui-bentoml/adapters/ui-adapter.js',
      'js/comfyui-bentoml/extractors/seed-extractor.js',
      'js/comfyui-bentoml/extractors/text-extractor.js',
      'js/comfyui-bentoml/extractors/parameter-extractor.js',
      'js/comfyui-bentoml/extractors/field-extractor.js',
      'js/comfyui-bentoml/editors/field-editor.js',
      'js/comfyui-bentoml/index.js',
      'js/comfyui-bentoml/test-only.js'
    ],
    
    // Shared UI components
    shared: [
      'js/shared/toolbar.js',
      'js/shared/navigation.js',
      'js/shared/queue-viewer.js'
    ],
    
    // UI management layer
    ui: [
      'js/ui/core-ui-manager.js',
      'js/ui/element-factory.js',
      'js/ui/modal-manager.js',
      'js/ui/directory-browser.js',
      'js/ui/sort-manager.js',
      'js/ui-manager.js',
      'js/ui/directory-manager.js'
    ],
    
    // Controllers - depends on UI
    controllers: [
      'js/controllers/state-manager.js',
      'js/controllers/action-controller.js',
      'js/controllers/navigation-controller.js'
    ],
    
    // Main application controllers
    app: [
      'js/interaction-handler.js',
      'js/app-controller.js'
    ],
    
    // View components
    views: [
      'js/simple-list-view.js',
      'js/alpine-list-view.js'
    ],
    
    // Navigation system
    navigation: [
      'js/navigation/navigation-functions.js',
      'js/navigation/view-router.js'
    ],
    
    // UI components
    components: [
      'js/components/ui/collapsible-section.js'
    ]
  },

  /**
   * Load all modules in dependency order
   */
  async loadAllModules() {
    const groupOrder = [
      'core', 'api', 'pagination', 'comfyuiServices', 'stores', 
      'comfyuiComponents', 'comfyuiMain', 'bentoml', 'shared', 
      'ui', 'controllers', 'app', 'views', 'navigation', 'components'
    ];
    
    for (const groupName of groupOrder) {
      await this.loadModuleGroup(groupName);
    }
  },

  /**
   * Load a specific group of modules
   */
  async loadModuleGroup(groupName) {
    const modules = this.moduleGroups[groupName];
    if (!modules) {
      console.warn(`Module group not found: ${groupName}`);
      return;
    }

    const promises = modules.map(modulePath => this.loadScript(modulePath));
    await Promise.all(promises);
  },

  /**
   * Load a single script file
   */
  loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = () => {
        console.error(`Failed to load script: ${src}`);
        reject(new Error(`Script load failed: ${src}`));
      };
      document.head.appendChild(script);
    });
  }
};

// Auto-initialize module loading when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await ModuleLoader.loadAllModules();
    console.log('All application modules loaded successfully');
  } catch (error) {
    console.error('Module loading failed:', error);
  }
});