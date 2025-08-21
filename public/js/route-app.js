/**
 * Route-aware application controller
 * Replaces the old app.js with clean routing architecture
 */

document.addEventListener('DOMContentLoaded', () => {
  try {
    console.log('Initializing Route-Aware App');
    
    // Initialize app config and basic controllers
    initializeBaseControllers();
    
    // Wait for router to be available before setting up routes
    if (!window.router) {
      console.log('Router not yet available, waiting...');
      setTimeout(initializeRouting, 100);
    } else {
      initializeRouting();
    }
    
  } catch (error) {
    console.error('Error initializing route-aware app:', error);
  }
});

function initializeRouting() {
  try {
    console.log('Initializing routing system');
    
    // Set up routing
    setupRoutes();
    
    // Set up navigation handlers
    setupNavigationHandlers();
    
    console.log('Route-Aware App initialized successfully');
    
  } catch (error) {
    console.error('Error setting up routing:', error);
  }
}

/**
 * Initialize base controllers that both views need
 */
function initializeBaseControllers() {
  // Initialize the app controller but don't auto-load
  if (window.AppController) {
    const app = new window.AppController();
    app.initWithoutAutoLoad();
    window.app = app;
  }
}

/**
 * Set up route handlers
 */
function setupRoutes() {
  console.log('setupRoutes() called');
  console.log('window.router available:', !!window.router);
  console.log('window.listPage available:', !!window.listPage);
  console.log('window.viewPage available:', !!window.viewPage);
  
  if (!window.router) {
    console.error('Router not available in setupRoutes!');
    return;
  }
  
  // List view route
  window.router.register('/list', async (params) => {
    console.log('Handling /list route');
    await window.listPage.init();
  });
  
  // Single view route
  window.router.register('/view', async (params) => {
    console.log('Handling /view route');
    await window.viewPage.init(params);
  });
  
  console.log('Routes registered successfully');
  console.log('Registered routes:', Array.from(window.router.routes.keys()));
}

/**
 * Set up navigation handlers
 */
function setupNavigationHandlers() {
  // Back to list button
  const listViewButton = document.getElementById('listViewButton');
  if (listViewButton) {
    listViewButton.addEventListener('click', () => {
      window.router.navigate('/list');
    });
  }
  
  // Override default navigation controls to use routing
  overrideNavigationControls();
}

/**
 * Override existing navigation controls to use routing
 */
function overrideNavigationControls() {
  // Override previous/next buttons when they exist
  document.addEventListener('click', (e) => {
    if (e.target.closest('.previous-btn, .prev-btn')) {
      e.preventDefault();
      if (window.viewPage && window.viewPage.navigateToPrevious) {
        window.viewPage.navigateToPrevious();
      }
    }
    
    if (e.target.closest('.next-btn')) {
      e.preventDefault();
      if (window.viewPage && window.viewPage.navigateToNext) {
        window.viewPage.navigateToNext();
      }
    }
  });
  
  // Override keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (window.router.currentRoute === '/view') {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (window.viewPage && window.viewPage.navigateToPrevious) {
          window.viewPage.navigateToPrevious();
        }
      }
      
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (window.viewPage && window.viewPage.navigateToNext) {
          window.viewPage.navigateToNext();
        }
      }
      
      if (e.key === 'Escape') {
        e.preventDefault();
        window.router.navigate('/list');
      }
    }
  });
}