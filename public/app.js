document.addEventListener('DOMContentLoaded', () => {
  // Set up title click handler to return to list view
  const appTitle = document.getElementById('appTitle');
  if (appTitle) {
    appTitle.addEventListener('click', () => {
      if (window.simpleListView) {
        window.simpleListView.show();
      }
    });
  }
  
  // Initialize and start the application
  const app = new window.AppController();
  app.init();
  
  // After app loads, switch to simple list view by default
  setTimeout(() => {
    if (window.simpleListView) {
      window.simpleListView.init();
    }
  }, 1000);
});
