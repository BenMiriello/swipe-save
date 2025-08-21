/**
 * Collapsible Section Component
 * Reusable collapsible container for options menu sections
 */
const CollapsibleSection = {
  /**
   * Initialize collapsible functionality for all sections
   */
  initAll() {
    // Sort Options Section
    this.initSortSection();
  },

  /**
   * Initialize the sort options collapsible section
   */
  initSortSection() {
    const sortToggle = document.querySelector('.sort-section-toggle');
    const sortContainer = document.getElementById('sortOptionsContainer');
    const sortCaret = document.getElementById('sortSectionCaret');

    if (sortToggle && sortContainer && sortCaret) {
      // Set initial state
      sortContainer.style.display = 'none';
      sortCaret.textContent = '▶';
      sortCaret.classList.remove('expanded');

      // Add click handler
      window.toggleSortSection = () => {
        const isVisible = sortContainer.style.display !== 'none';
        
        if (isVisible) {
          sortContainer.style.display = 'none';
          sortCaret.textContent = '▶';
          sortCaret.classList.remove('expanded');
        } else {
          sortContainer.style.display = 'block';
          sortCaret.textContent = '▼';
          sortCaret.classList.add('expanded');
        }
      };
    }
  },

  /**
   * Create a new collapsible section programmatically
   * @param {Object} config - Configuration for the section
   * @param {string} config.title - Section title
   * @param {string} config.id - Unique ID for the section
   * @param {HTMLElement} config.content - Content element
   * @param {boolean} config.expanded - Initial expanded state
   */
  create(config) {
    const sectionHeader = document.createElement('li');
    sectionHeader.className = 'section-header';
    
    const sectionToggle = document.createElement('span');
    sectionToggle.className = 'section-title section-toggle';
    sectionToggle.style.cursor = 'pointer';
    sectionToggle.innerHTML = `
      <span class="section-caret">${config.expanded ? '▼' : '▶'}</span>
      ${config.title}
    `;

    const contentContainer = document.createElement('li');
    contentContainer.className = 'section-content';
    contentContainer.id = config.id;
    contentContainer.style.display = config.expanded ? 'block' : 'none';
    contentContainer.appendChild(config.content);

    // Add toggle functionality
    sectionToggle.addEventListener('click', () => {
      const isVisible = contentContainer.style.display !== 'none';
      const caret = sectionToggle.querySelector('.section-caret');
      
      if (isVisible) {
        contentContainer.style.display = 'none';
        caret.textContent = '▶';
        caret.classList.remove('expanded');
      } else {
        contentContainer.style.display = 'block';
        caret.textContent = '▼';
        caret.classList.add('expanded');
      }
    });

    sectionHeader.appendChild(sectionToggle);
    
    return {
      header: sectionHeader,
      content: contentContainer
    };
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  CollapsibleSection.initAll();
});