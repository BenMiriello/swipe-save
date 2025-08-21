document.addEventListener('DOMContentLoaded', () => {
  try {
    // Set up list view button handler
    const listViewButton = document.getElementById('listViewButton');
    if (listViewButton) {
      listViewButton.addEventListener('click', () => {
        if (window.simpleListView && !window.simpleListView.isActive) {
          window.simpleListView.init();
        }
      });
    }
    
    // Hide single view elements immediately - don't create them
    const mediaContainer = document.querySelector('.media-container');
    if (mediaContainer) mediaContainer.style.display = 'none';
    
    const bottomControls = document.querySelector('.bottom-controls');
    if (bottomControls) bottomControls.style.display = 'none';
    
    // Initialize the app controller but don't auto-load files in single view  
    const app = new window.AppController();
    app.initWithoutAutoLoad();
    
    // Start with list view immediately
    setTimeout(() => {
      if (window.simpleListView) {
        window.simpleListView.init();
      }
    }, 100);
    
  } catch (error) {
    console.error('Error initializing app:', error);
  }
});
