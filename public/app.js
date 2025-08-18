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
  
  // Start with list view immediately, don't load single view first
  if (window.simpleListView) {
    window.simpleListView.init();
  }
  
  // Initialize the app controller but don't auto-load files in single view
  const app = new window.AppController();
  app.initWithoutAutoLoad();
});
