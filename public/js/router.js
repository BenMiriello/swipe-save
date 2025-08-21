/**
 * Simple client-side router for swipe-save
 */
class SwipeSaveRouter {
  constructor() {
    this.routes = new Map();
    this.currentRoute = null;
    this.navigating = false;
    
    // Handle browser back/forward
    window.addEventListener('popstate', () => {
      this.handleRoute();
    });
    
    // Handle initial load
    this.handleRoute();
  }
  
  /**
   * Register a route handler
   */
  register(path, handler) {
    this.routes.set(path, handler);
  }
  
  /**
   * Navigate to a new route
   */
  navigate(path, pushState = true) {
    if (this.navigating) {
      console.warn('Navigation already in progress, ignoring navigate to:', path);
      return;
    }
    
    this.navigating = true;
    
    if (pushState) {
      window.history.pushState({}, '', path);
    }
    
    this.handleRoute();
    
    // Reset navigation flag after a short delay
    setTimeout(() => {
      this.navigating = false;
    }, 100);
  }
  
  /**
   * Handle current route
   */
  handleRoute() {
    const path = window.location.pathname;
    const search = window.location.search;
    const params = new URLSearchParams(search);
    
    console.log('Router handling:', path, search);
    
    // Prevent infinite loops by tracking if we're already navigating
    if (this.navigating) {
      console.warn('Navigation already in progress, skipping');
      return;
    }
    
    // Handle root redirect
    if (path === '/') {
      this.navigate('/list', true);
      return;
    }
    
    // Find matching route handler
    const handler = this.routes.get(path);
    if (handler) {
      this.currentRoute = path;
      handler(params);
    } else {
      console.warn('No route handler found for:', path);
      console.log('Available routes:', Array.from(this.routes.keys()));
      
      // Only fallback if we're not already trying to go to list
      if (path !== '/list') {
        this.navigate('/list', true);
      } else {
        console.error('No route handler for /list - routing system not properly initialized');
      }
    }
  }
  
  /**
   * Get current route parameters
   */
  getParams() {
    return new URLSearchParams(window.location.search);
  }
}

// Create global router instance
window.router = new SwipeSaveRouter();