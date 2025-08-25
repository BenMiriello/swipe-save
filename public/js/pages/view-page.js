/**
 * Single View Page Controller - Clean implementation for viewing individual files
 */
class ViewPage {
  constructor() {
    this.isInitialized = false;
  }
  
  /**
   * Initialize and render the view page
   */
  async init(params) {
    console.log('Initializing View Page with params:', params.toString());
    
    const filePath = params.get('file');
    const index = parseInt(params.get('index') || '0');
    
    if (!filePath) {
      console.error('No file parameter provided');
      window.router.navigate('/list');
      return;
    }
    
    // Hide list view elements
    this.hideListViewElements();
    
    // Show single view elements
    this.showSingleViewElements();
    
    // Initialize single view functionality
    await this.initializeSingleView(filePath, index);
    
    // Update navigation buttons for single view
    if (window.navigationController) {
      window.navigationController.updateNavigationButtons();
    }
    
    this.isInitialized = true;
  }
  
  /**
   * Hide list view elements
   */
  hideListViewElements() {
    const elementsToHide = [
      '.alpine-list-view'
    ];
    
    elementsToHide.forEach(selector => {
      const element = document.querySelector(selector);
      if (element) {
        element.style.display = 'none';
      }
    });
  }
  
  /**
   * Show single view elements
   */
  showSingleViewElements() {
    const elementsToShow = [
      '.media-container',
      '.bottom-controls',
      '#listViewButton'
    ];
    
    elementsToShow.forEach(selector => {
      const element = document.querySelector(selector);
      if (element) {
        element.style.display = element.tagName === 'BUTTON' ? 'block' : 
                               selector === '.bottom-controls' ? 'flex' : 'block';
      }
    });
  }
  
  /**
   * Initialize single view functionality
   */
  async initializeSingleView(filePath, index) {
    // Use the same files data as the list view to maintain consistency
    const listView = Alpine.store('listView');
    if (listView && listView.allFiles && listView.allFiles.length > 0) {
      this.filesData = listView.allFiles;
    } else {
      // Fallback to loading files data if list view doesn't have them
      await this.loadFilesData();
    }
    
    // Set up state manager
    if (window.stateManager && this.filesData) {
      window.stateManager.setFiles(this.filesData);
      
      // Use the provided index directly since it should match the list view's data
      let fileIndex = index;
      
      // Validate the index and file path match
      if (index >= 0 && index < this.filesData.length && this.filesData[index]) {
        const expectedFile = this.filesData[index];
        if (expectedFile.fullPath === filePath || expectedFile.path === filePath) {
          // Index is valid and points to the correct file
          fileIndex = index;
        } else {
          // Index doesn't match, try to find by path
          fileIndex = this.filesData.findIndex(file => file.fullPath === filePath || file.path === filePath);
        }
      } else {
        // Index is invalid, find by path
        fileIndex = this.filesData.findIndex(file => file.fullPath === filePath || file.path === filePath);
      }
      
      if (fileIndex === -1) {
        console.error('File not found:', filePath);
        window.router.navigate('/list');
        return;
      }
      
      // Navigate to the file
      window.stateManager.goToIndex(fileIndex);
      
      // Store the file index for cross-view navigation
      localStorage.setItem('selectedFileIndex', fileIndex.toString());
      
      // Display the file
      if (window.navigationController) {
        window.navigationController.displayCurrentImage();
      }
    }
  }
  
  /**
   * Load files data from API
   */
  async loadFilesData() {
    if (this.filesData) return;
    
    try {
      const response = await fetch(`${window.appConfig.getApiUrl()}/api/media`);
      if (!response.ok) throw new Error('Failed to load files');
      
      const data = await response.json();
      this.filesData = data.items || data.files || [];
      console.log('Loaded files data:', this.filesData.length, 'files');
    } catch (error) {
      console.error('Error loading files data:', error);
      this.filesData = [];
    }
  }
  
  /**
   * Navigate back to list view
   */
  navigateToList() {
    window.router.navigate('/list');
  }
  
  /**
   * Navigate to next file
   */
  navigateToNext() {
    if (!this.filesData || !window.stateManager) return;
    
    const currentIndex = window.stateManager.getState().currentIndex;
    const nextIndex = (currentIndex + 1) % this.filesData.length;
    const nextFile = this.filesData[nextIndex];
    
    if (nextFile) {
      const encodedPath = encodeURIComponent(nextFile.path);
      window.router.navigate(`/view?file=${encodedPath}&index=${nextIndex}`);
    }
  }
  
  /**
   * Navigate to previous file
   */
  navigateToPrevious() {
    if (!this.filesData || !window.stateManager) return;
    
    const currentIndex = window.stateManager.getState().currentIndex;
    const prevIndex = currentIndex === 0 ? this.filesData.length - 1 : currentIndex - 1;
    const prevFile = this.filesData[prevIndex];
    
    if (prevFile) {
      const encodedPath = encodeURIComponent(prevFile.path);
      window.router.navigate(`/view?file=${encodedPath}&index=${prevIndex}`);
    }
  }
}

// Create global instance
window.viewPage = new ViewPage();