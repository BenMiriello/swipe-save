/**
 * ComfyUI Destinations Store
 * Manages ComfyUI server destinations
 */

window.comfyUIStores = window.comfyUIStores || {};

window.comfyUIStores.destinationStore = {
  destinations: ['http://localhost:8188'],
  selectedDestination: 'http://localhost:8188',
  showMoreOptions: false,
  
  init() {
    if (window.location.hostname === 'localhost') {
      console.log('ComfyDestinations store initializing...');
    }
    this.loadDestinations();
  },
  
  loadDestinations() {
    try {
      const saved = JSON.parse(localStorage.getItem('comfyui-destinations') || '[]');
      if (saved.length === 0) {
        saved.push('http://localhost:8188');
        this.saveDestinations(saved);
      }
      this.destinations = saved;
      this.selectedDestination = saved[0] || '';
    } catch (error) {
      console.error('Error loading destinations:', error);
      this.destinations = ['http://localhost:8188'];
      this.selectedDestination = 'http://localhost:8188';
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
      this.destinations.push('http://localhost:8188');
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
