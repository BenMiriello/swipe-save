document.addEventListener('DOMContentLoaded', () => {
  // Set up title click handler to return to list view
  const appTitle = document.getElementById('appTitle');
  if (appTitle) {
    appTitle.addEventListener('click', () => {
      if (window.views?.fileListViewer) {
        window.views.fileListViewer.show();
      }
    });
  }
  
  // Initialize and start the application
  const app = new window.AppController();
  app.init();
  
  // After app loads, switch to list view by default
  setTimeout(() => {
    if (window.views?.fileListViewer) {
      window.views.fileListViewer.init();
    }
  }, 500);
});
