/**
 * ComfyUI Queue Store
 * Manages ComfyUI queue state and operations
 */

window.comfyUIStores = window.comfyUIStores || {};

window.comfyUIStores.queueStore = {
  queueItems: [],
  isLoading: false,
  selectedItem: null,
  selectedItemJson: '',
  showItemDetails: false,
  showCancelAllModal: false,
  showCancelItemModal: false,
  autoRefreshInterval: null,
  lastQueueCount: 0,

  init() {
    console.log('Queue viewer store initialized');
  },

  startAutoRefresh() {
    if (this.autoRefreshInterval) return;
    this.autoRefreshInterval = setInterval(() => {
      this.refreshQueue();
    }, 2000); // Refresh every 2 seconds
    console.log('Queue auto-refresh started (2s interval)');
  },

  stopAutoRefresh() {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
      this.autoRefreshInterval = null;
      console.log('Queue auto-refresh stopped');
    }
  },

  // Refresh queue data from ComfyUI
  async refreshQueue() {
    if (this.isLoading) return;
    
    this.isLoading = true;
    try {
      const comfyUrl = Alpine.store('comfyDestinations').selectedDestination;
      const response = await fetch(`/api/comfyui-queue?comfyUrl=${encodeURIComponent(comfyUrl)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch queue: ${response.status}`);
      }
      
      const queueData = await response.json();
      
      // Combine running and pending queue items
      const running = queueData.queue_running || [];
      const pending = queueData.queue_pending || [];
      
      // Queue format: [id, prompt_data] for each item
      this.queueItems = [...running, ...pending];
      
      // Only log when queue count changes to reduce noise
      if (this.queueItems.length !== this.lastQueueCount) {
        console.log('Queue updated:', this.queueItems.length, 'items');
        this.lastQueueCount = this.queueItems.length;
      }
      
    } catch (error) {
      console.error('Error fetching queue:', error);
      this.queueItems = [];
    } finally {
      this.isLoading = false;
    }
  },

  // Open queue item details modal
  openItemDetails(item) {
    const [id, promptData] = item;
    console.log('Opening queue item details for ID:', id);
    
    this.selectedItem = item;
    this.selectedItemJson = JSON.stringify(item, null, 2);
    this.showItemDetails = true;
  },

  // Cancel all queue items
  async cancelAllItems() {
    try {
      const comfyUrl = Alpine.store('comfyDestinations').selectedDestination;
      
      // Get all item IDs
      const itemIds = this.queueItems.map(item => item[0]);
      console.log('Cancelling all queue items:', itemIds);
      
      const response = await fetch('/api/comfyui-queue/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          comfyUrl,
          cancel: itemIds
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to cancel queue: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Cancel all response result:', result);
      
      // Close modal first
      this.showCancelAllModal = false;
      
      // Wait a moment for ComfyUI to process the cancellation
      console.log('Waiting for ComfyUI to process cancellation...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Force refresh queue after cancellation
      await this.refreshQueue();
      
      console.log('All queue items cancelled successfully');
      
    } catch (error) {
      console.error('Error cancelling all queue items:', error);
    }
  },

  // Cancel selected queue item
  async cancelSelectedItem() {
    if (!this.selectedItem) {
      console.error('No selected item to cancel');
      return;
    }
    
    try {
      const comfyUrl = Alpine.store('comfyDestinations').selectedDestination;
      const itemId = this.selectedItem[0];
      
      console.log('Cancelling queue item:', itemId);
      
      const response = await fetch('/api/comfyui-queue/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          comfyUrl,
          cancel: [itemId]
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Cancel response error:', errorText);
        throw new Error(`Failed to cancel item: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Cancel response result:', result);
      
      // Close modals first
      this.showCancelItemModal = false;
      this.showItemDetails = false;
      
      // Wait a moment for ComfyUI to process the cancellation
      console.log('Waiting for ComfyUI to process cancellation...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Force refresh queue to see changes
      await this.refreshQueue();
      
      console.log('Queue item cancelled successfully:', itemId);
      
    } catch (error) {
      console.error('Error cancelling queue item:', error);
    }
  }
};
