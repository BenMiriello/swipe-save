/**
 * Shared Queue Viewer Component
 * Extracted from ComfyUI modal for reuse in file list viewer
 */
window.sharedComponents = window.sharedComponents || {};

window.sharedComponents.queueViewer = {
  /**
   * Create standalone queue viewer component
   * @param {Object} options - Configuration options
   * @returns {HTMLElement} Queue viewer element
   */
  create(options = {}) {
    const {
      expandable = true,
      showClearButton = true,
      className = 'queue-viewer'
    } = options;
    
    const container = document.createElement('div');
    container.className = className;
    
    // Create Alpine.js data structure
    container.setAttribute('x-data', 'queueViewer()');
    
    const section = document.createElement('div');
    section.className = 'comfyui-section';
    
    // Header
    const header = this.createHeader(expandable, showClearButton);
    section.appendChild(header);
    
    // Content
    const content = this.createContent(expandable);
    section.appendChild(content);
    
    container.appendChild(section);
    return container;
  },
  
  /**
   * Create queue viewer header
   */
  createHeader(expandable, showClearButton) {
    const header = document.createElement('div');
    header.className = 'comfyui-section-header';
    
    if (expandable) {
      header.setAttribute('@click', 'toggleQueueSection()');
    }
    
    // Caret (if expandable)
    if (expandable) {
      const caret = document.createElement('span');
      caret.className = 'comfyui-section-caret';
      caret.setAttribute(':class', "{ 'expanded': isQueueExpanded }");
      caret.textContent = '▶';
      header.appendChild(caret);
    }
    
    // Title with indicators
    const title = document.createElement('h3');
    title.className = 'comfyui-section-title';
    title.innerHTML = `
      Active Queue
      <span x-show="${expandable ? '!isQueueExpanded && ' : ''}queueItems.length === 0" class="comfyui-status-summary">empty</span>
      <span x-show="${expandable ? '!isQueueExpanded && ' : ''}queueItems.length > 0" class="comfyui-queue-indicators">
        <span class="comfyui-header-dot active"></span>
        <template x-for="index in Math.min(3, queueItems.length - 1)" :key="index">
          <span class="comfyui-header-dot"></span>
        </template>
        <span class="comfyui-queue-overflow"
              x-text="(() => {
                const running = 1;
                const queued = queueItems.length - 1;
                const hasOverflow = queued > 3;
                const prefix = hasOverflow ? '... ' : '';
                if (queued === 0) {
                  return prefix + running + ' running';
                } else {
                  return prefix + running + ' running and ' + queued + ' queued';
                }
              })()">
        </span>
      </span>
    `;
    header.appendChild(title);
    
    // Clear button
    if (showClearButton) {
      const clearButton = document.createElement('button');
      clearButton.className = 'comfy-btn comfy-btn-warning comfy-btn-small';
      clearButton.setAttribute('@click.stop', '$store.queueViewer.showCancelAllModal = true');
      clearButton.setAttribute('x-show', `queueItems.length > 0${expandable ? ' && isQueueExpanded' : ''}`);
      clearButton.textContent = 'Clear Queue';
      header.appendChild(clearButton);
    }
    
    return header;
  },
  
  /**
   * Create queue viewer content
   */
  createContent(expandable) {
    const content = document.createElement('div');
    content.className = 'comfyui-section-content';
    
    if (expandable) {
      content.setAttribute('x-show', 'isQueueExpanded');
      content.setAttribute('x-transition', '');
    }
    
    // Empty state
    const emptyTemplate = document.createElement('template');
    emptyTemplate.setAttribute('x-if', 'queueItems.length === 0');
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'comfyui-queue-empty';
    emptyDiv.textContent = 'No items in queue';
    emptyTemplate.content.appendChild(emptyDiv);
    content.appendChild(emptyTemplate);
    
    // Queue items
    const itemsTemplate = document.createElement('template');
    itemsTemplate.setAttribute('x-if', 'queueItems.length > 0');
    const itemsDiv = document.createElement('div');
    itemsDiv.className = 'comfyui-queue-list';
    
    const itemTemplate = document.createElement('template');
    itemTemplate.setAttribute('x-for', '(item, index) in queueItems');
    itemTemplate.setAttribute(':key', 'item[0]');
    
    const itemDiv = document.createElement('div');
    itemDiv.className = 'comfyui-queue-item';
    itemDiv.setAttribute(':class', "{ 'active': index === 0 }");
    itemDiv.setAttribute('@click', 'openItemDetails(item)');
    
    const indicator = document.createElement('div');
    indicator.className = 'comfyui-queue-item-indicator';
    itemDiv.appendChild(indicator);
    
    const itemId = document.createElement('div');
    itemId.className = 'comfyui-queue-item-id';
    itemId.setAttribute('x-text', 'item[0]');
    itemDiv.appendChild(itemId);
    
    itemTemplate.content.appendChild(itemDiv);
    itemsDiv.appendChild(itemTemplate);
    itemsTemplate.content.appendChild(itemsDiv);
    content.appendChild(itemsTemplate);
    
    return content;
  },
  
  /**
   * Get the Alpine.js component data function
   * @returns {string} Component function name
   */
  getComponentFunction() {
    return 'queueViewer()';
  }
};