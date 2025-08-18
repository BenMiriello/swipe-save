document.addEventListener('DOMContentLoaded', () => {
  // Initialize file list viewer first
  if (window.views?.fileListViewer) {
    window.views.fileListViewer.init();
  }
  
  // Set up list view button
  const listViewButton = document.getElementById('listViewButton');
  if (listViewButton) {
    listViewButton.addEventListener('click', () => {
      if (window.views?.fileListViewer) {
        window.views.fileListViewer.show();
      }
    });
  }
  
  // Initialize and start the application
  const app = new window.AppController();
  app.init();
});
