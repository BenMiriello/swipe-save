document.addEventListener('DOMContentLoaded', () => {
  // Set up list view button handler
  const listViewButton = document.getElementById('listViewButton');
  if (listViewButton) {
    listViewButton.addEventListener('click', () => {
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
