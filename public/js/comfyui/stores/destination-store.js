/**
 * ComfyUI Destinations Store
 * Manages ComfyUI server destinations
 */

window.comfyUIStores = window.comfyUIStores || {};

window.comfyUIStores.destinationStore = {
  destinations: [],
  selectedDestination: '',
  showMoreOptions: false,
  
  init() {
    if (window.location.hostname === 'localhost') {
      console.log('ComfyDestinations store initializing...');
    }
    this.loadDestinations();
  },

  getDefaultDestination() {
    // Use current hostname with port 8188
    const currentHost = window.location.hostname;
    return `http://${currentHost}:8188`;
  },
  
  loadDestinations() {
    try {
      const saved = JSON.parse(localStorage.getItem('comfyui-destinations') || '[]');
      const defaultDest = this.getDefaultDestination();
      
      if (saved.length === 0) {
        saved.push(defaultDest);
        this.saveDestinations(saved);
      }
      this.destinations = saved;
      this.selectedDestination = saved[0] || defaultDest;
    } catch (error) {
      console.error('Error loading destinations:', error);
      const defaultDest = this.getDefaultDestination();
      this.destinations = [defaultDest];
      this.selectedDestination = defaultDest;
    }
  },
  
  saveDestinations(destinations) {
    localStorage.setItem('comfyui-destinations', JSON.stringify(destinations));
  },
  
  addDestination(url) {
    if (!url || this.destinations.includes(url)) return;
    this.destinations.push(url);
    this.saveDestinations(this.destinations);
  },
  
  removeDestination(url) {
    this.destinations = this.destinations.filter(dest => dest !== url);
    if (this.destinations.length === 0) {
      const defaultDest = this.getDefaultDestination();
      this.destinations.push(defaultDest);
    }
    this.saveDestinations(this.destinations);
    
    if (this.selectedDestination === url) {
      this.selectedDestination = this.destinations[0];
    }
  },
  
  selectDestination(url) {
    this.selectedDestination = url;
  },
  
  toggleMoreOptions() {
    this.showMoreOptions = !this.showMoreOptions;
  }
};
