/**
 * Shared Queue Viewer Component
 * Creates HTML template matching exact ComfyUI queue structure
 */
window.sharedComponents = window.sharedComponents || {};

window.sharedComponents.queueViewer = {
  /**
   * Create standalone queue viewer component using HTML template
   * @param {Object} options - Configuration options
   * @returns {HTMLElement} Queue viewer element
   */
  create(options = {}) {
    const { className = 'queue-viewer' } = options;
    
    // Create container div
    const container = document.createElement('div');
    container.className = className;
    
    // Insert exact HTML structure from ComfyUI modal
    container.innerHTML = `
      <div class="comfyui-section" x-data="queueViewer()">
        <div class="comfyui-section-header" @click="toggleQueueSection()">
          <span class="comfyui-section-caret" :class="{ 'expanded': isQueueExpanded }">▶</span>
          <h3 class="comfyui-section-title">
            Active Queue
            <span x-show="!isQueueExpanded && queueItems.length === 0" class="comfyui-status-summary">empty</span>
            <span x-show="!isQueueExpanded && queueItems.length > 0" class="comfyui-queue-indicators">
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
          </h3>
          <button class="comfy-btn comfy-btn-warning comfy-btn-small" 
                  @click.stop="$store.queueViewer.showCancelAllModal = true"
                  x-show="queueItems.length > 0 && isQueueExpanded">
            Clear Queue
          </button>
        </div>

        <div class="comfyui-section-content" x-show="isQueueExpanded" x-transition>
          <template x-if="queueItems.length === 0">
            <div class="comfyui-queue-empty">No items in queue</div>
          </template>

          <template x-if="queueItems.length > 0">
            <div class="comfyui-queue-list">
              <template x-for="(item, index) in queueItems" :key="item[0]">
                <div class="comfyui-queue-item" 
                     :class="{ 'active': index === 0 }"
                     @click="openItemDetails(item)">
                  <div class="comfyui-queue-item-indicator"></div>
                  <div class="comfyui-queue-item-id" x-text="item[0]"></div>
                </div>
              </template>
            </div>
          </template>
        </div>
      </div>
    `;
    
    return container;
  }
};