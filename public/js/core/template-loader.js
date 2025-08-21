/**
 * Template Loader
 * Simple utility to load HTML templates into the page
 */
const TemplateLoader = {
  cache: new Map(),
  
  /**
   * Load a template file and inject it into a container
   * @param {string} templatePath - Path to the template file
   * @param {string} containerId - ID of the container element
   */
  async loadTemplate(templatePath, containerId) {
    try {
      // Check cache first
      if (this.cache.has(templatePath)) {
        const html = this.cache.get(templatePath);
        document.getElementById(containerId).innerHTML = html;
        return true;
      }
      
      // Fetch template
      const response = await fetch(templatePath);
      if (!response.ok) {
        throw new Error(`Failed to load template: ${response.statusText}`);
      }
      
      const html = await response.text();
      this.cache.set(templatePath, html);
      
      // Inject into container
      const container = document.getElementById(containerId);
      if (container) {
        container.innerHTML = html;
        return true;
      } else {
        console.error(`Container element not found: ${containerId}`);
        return false;
      }
    } catch (error) {
      console.error('Error loading template:', error);
      return false;
    }
  },

  /**
   * Load ComfyUI modal template
   * Called when the page loads to maintain existing functionality
   */
  async loadComfyUIModal() {
    return this.loadTemplate('templates/modals/comfyui-modal.html', 'comfyui-modal-container');
  },

  /**
   * Load options dropdown component template
   */
  async loadOptionsDropdown() {
    return this.loadTemplate('templates/components/options-dropdown.html', 'options-dropdown-container');
  }
};

// Auto-load templates when DOM is ready to maintain existing functionality
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM Content Loaded - starting template loading');
  
  // Add a small delay to ensure DOM is fully ready
  setTimeout(async () => {
    try {
      const comfyResult = await TemplateLoader.loadComfyUIModal();
      console.log('ComfyUI modal loaded:', comfyResult);
      
      const optionsResult = await TemplateLoader.loadOptionsDropdown();
      console.log('Options dropdown loaded:', optionsResult);
      
      // Dispatch event to signal templates are loaded
      document.dispatchEvent(new CustomEvent('templatesLoaded'));
      console.log('Templates loaded and ready');
    } catch (error) {
      console.error('Template loading failed:', error);
    }
  }, 100);
});