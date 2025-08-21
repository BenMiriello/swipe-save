/**
 * Directory Manager UI Component
 * Handles the new multi-source directory interface
 */
const directoryManager = {
  config: null,
  modalElements: {},
  
  /**
   * Initialize directory manager
   */
  async init() {
    try {
      await this.loadConfig();
      this.createModalElements();
      this.setupEventHandlers();
      
      // Populate the Options UI immediately
      await this.refreshOptionsUI();
      
      // Check if first run (only if no directories configured)
      const hasDirectories = this.config.sources.directories.length > 0;
      const hasDestination = this.config.destination.current;
      
      if (this.config.preferences.isFirstRun && (!hasDirectories || !hasDestination)) {
        this.showFirstRunExperience();
      } else {
        // Mark as not first run if we have basic config
        this.config.preferences.isFirstRun = false;
      }
    } catch (error) {
      console.error('Error initializing directory manager:', error);
    }
  },

  /**
   * Load directory configuration
   */
  async loadConfig() {
    try {
      this.config = await window.directoryApi.getDirectoryConfig();
      console.log('Loaded directory config:', this.config);
    } catch (error) {
      console.error('Error loading directory config:', error);
      // Create default config on error
      this.config = this.getDefaultConfig();
    }
  },

  /**
   * Get default configuration structure
   */
  getDefaultConfig() {
    return {
      sources: { directories: [], groups: [] },
      destination: { current: '', recent: [] },
      recent: { directories: [], groups: [] },
      preferences: { isFirstRun: true }
    };
  },

  /**
   * Show first run experience
   */
  async showFirstRunExperience() {
    // Auto-open options menu
    const optionsDropdown = document.querySelector('.options-dropdown');
    if (optionsDropdown) {
      optionsDropdown.classList.add('show');
    } else {
      console.log('Options dropdown not ready for first run experience');
    }

    // Show one-time popup after a brief delay
    setTimeout(() => {
      this.showFirstRunPopup();
    }, 500);
  },

  /**
   * Show first run popup
   */
  showFirstRunPopup() {
    const popup = document.createElement('div');
    popup.className = 'first-run-popup';
    popup.innerHTML = `
      <div class="first-run-content">
        <h3>Setup Tips</h3>
        <p>You can change source and destination folders and group source folders in the Options menu below.</p>
        <button class="btn btn-primary" onclick="directoryManager.dismissFirstRunPopup(event)">
          Got it!
        </button>
      </div>
    `;

    // Add styles
    popup.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border: 2px solid #4f46e5;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      z-index: 10000;
      max-width: 400px;
      text-align: center;
    `;

    document.body.appendChild(popup);

    // Mark first run as complete
    this.markFirstRunComplete();
  },

  /**
   * Dismiss first run popup without closing Options menu
   */
  dismissFirstRunPopup(event) {
    const popup = document.querySelector('.first-run-popup');
    if (popup) {
      popup.remove();
    }
    this.markFirstRunComplete();
    
    // Prevent any event bubbling that might close the options menu
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
  },

  /**
   * Mark first run as complete
   */
  async markFirstRunComplete() {
    try {
      this.config.preferences.isFirstRun = false;
      // Save preferences to server
      const response = await fetch(`${(window.appConfig && window.appConfig.getApiUrl) ? window.appConfig.getApiUrl() : ''}/api/user/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          preferences: this.config.preferences 
        })
      });
      
      if (!response.ok) {
        console.error('Failed to save first run completion');
      }
      
      console.log('First run marked as complete');
    } catch (error) {
      console.error('Error marking first run complete:', error);
    }
  },

  /**
   * Create modal elements for directory management
   */
  createModalElements() {
    this.createDirectoryPickerModal();
    this.createGroupManagerModal();
    this.createDestinationPickerModal();
  },

  /**
   * Create directory picker modal
   */
  createDirectoryPickerModal() {
    const modal = document.createElement('div');
    modal.id = 'directoryPickerModal';
    modal.className = 'modal-overlay';
    modal.style.display = 'none';
    
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Add Source Directory</h2>
          <button class="modal-close" onclick="directoryManager.closeDirectoryPicker()">×</button>
        </div>
        
        <div class="modal-body">
          <div class="directory-browser">
            <input type="text" id="sourceBrowserPath" placeholder="Directory path..." class="path-input">
            <div id="sourceBrowserList" class="directory-list">
              <div class="loading">Loading directories...</div>
            </div>
          </div>
          
          <div class="directory-options">
            <label>
              Directory Name:
              <input type="text" id="directoryName" placeholder="Auto-generated" class="name-input">
            </label>
            
            <div class="group-selection">
              <label>
                <input type="radio" name="groupOption" value="new" checked>
                Create new group: <input type="text" id="newGroupName" placeholder="Group name">
              </label>
              <label>
                <input type="radio" name="groupOption" value="existing">
                Add to existing: <select id="existingGroups"></select>
              </label>
            </div>
            
            <label>
              <input type="checkbox" id="enableImmediately" checked>
              Enable immediately
            </label>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="directoryManager.closeDirectoryPicker()">Cancel</button>
          <button class="btn btn-primary" onclick="directoryManager.addSelectedDirectory()">Add Directory</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modalElements.directoryPicker = modal;
  },

  /**
   * Create group manager modal
   */
  createGroupManagerModal() {
    const modal = document.createElement('div');
    modal.id = 'groupManagerModal';
    modal.className = 'modal-overlay';
    modal.style.display = 'none';
    
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Create Directory Group</h2>
          <button class="modal-close" onclick="directoryManager.closeGroupManager()">×</button>
        </div>
        
        <div class="modal-body">
          <label>
            Group Name:
            <input type="text" id="groupName" placeholder="Group name" class="name-input">
          </label>
          
          <div class="color-picker">
            <label>Color:</label>
            <div class="color-options">
              <button class="color-btn" data-color="#4f46e5" style="background: #4f46e5"></button>
              <button class="color-btn" data-color="#059669" style="background: #059669"></button>
              <button class="color-btn" data-color="#dc2626" style="background: #dc2626"></button>
              <button class="color-btn" data-color="#d97706" style="background: #d97706"></button>
              <button class="color-btn" data-color="#7c3aed" style="background: #7c3aed"></button>
            </div>
          </div>
          
          <div class="directory-selection">
            <label>Select Directories:</label>
            <div id="availableDirectories" class="directory-checkboxes">
              <!-- Populated dynamically -->
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="directoryManager.closeGroupManager()">Cancel</button>
          <button class="btn btn-primary" onclick="directoryManager.createGroup()">Create Group</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modalElements.groupManager = modal;
  },

  /**
   * Create destination picker modal
   */
  createDestinationPickerModal() {
    const modal = document.createElement('div');
    modal.id = 'destinationPickerModal';
    modal.className = 'modal-overlay';
    modal.style.display = 'none';
    
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Change Destination</h2>
          <button class="modal-close" onclick="directoryManager.closeDestinationPicker()">×</button>
        </div>
        
        <div class="modal-body">
          <div class="current-destination">
            <strong>Current:</strong> <span id="currentDestPath"></span>
          </div>
          
          <div class="recent-destinations">
            <h4>Recent Destinations</h4>
            <div id="recentDestList" class="destination-list">
              <!-- Populated dynamically -->
            </div>
          </div>
          
          <div class="browse-destination">
            <button class="btn btn-secondary" onclick="directoryManager.browseForDestination()">
              Browse for new folder...
            </button>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="directoryManager.closeDestinationPicker()">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modalElements.destinationPicker = modal;
  },

  /**
   * Setup event handlers
   */
  setupEventHandlers() {
    // Add directory button
    const addDirBtn = document.getElementById('addDirectoryBtn');
    if (addDirBtn) {
      addDirBtn.addEventListener('click', () => this.openDirectoryPicker());
    }

    // Create group button  
    const addGroupBtn = document.getElementById('addGroupBtn');
    if (addGroupBtn) {
      addGroupBtn.addEventListener('click', () => this.openGroupManager());
    }

    // Change destination button
    const changeDestBtn = document.getElementById('changeDestinationBtn');
    if (changeDestBtn) {
      changeDestBtn.addEventListener('click', () => this.openDestinationPicker());
    }
  },

  /**
   * Open directory picker
   */
  async openDirectoryPicker() {
    console.log('🔄 Opening directory picker...');
    
    // Ensure modal elements are created first
    if (!this.modalElements.directoryPicker) {
      console.log('Directory picker modal not found, recreating modals...');
      this.createModalElements();
    }
    
    const modal = this.modalElements.directoryPicker;
    console.log('Modal details:');
    console.log('- Modal exists:', !!modal);
    console.log('- Modal ID:', modal?.id);
    console.log('- Modal in DOM before show:', modal ? document.body.contains(modal) : 'N/A');
    console.log('- Modal display before show:', modal ? modal.style.display : 'N/A');
    
    if (modal) {
      modal.style.display = 'block';
      console.log('✅ Modal display set to block');
      console.log('- Modal display after show:', modal.style.display);
      console.log('- Modal visible after show:', modal.offsetParent !== null);
    } else {
      console.error('❌ Modal is null - cannot open!');
      return;
    }
    
    // Small delay to ensure DOM is ready
    setTimeout(async () => {
      console.log('🔍 Populating directory browser...');
      await this.populateDirectoryBrowser();
      await this.populateExistingGroups();
    }, 100);
  },

  /**
   * Close directory picker
   */
  closeDirectoryPicker() {
    this.modalElements.directoryPicker.style.display = 'none';
    // Don't close Options menu - user might want to do more operations
  },

  /**
   * Populate existing groups dropdown
   */
  async populateExistingGroups() {
    const select = document.getElementById('existingGroups');
    select.innerHTML = '';
    
    this.config.sources.groups.forEach(group => {
      const option = document.createElement('option');
      option.value = group.id;
      option.textContent = group.name;
      select.appendChild(option);
    });
  },

  /**
   * Other methods to be continued...
   */
  
  /**
   * Populate directory browser with file system navigation
   */
  async populateDirectoryBrowser() {
    const pathInput = document.getElementById('sourceBrowserPath');
    const directoryList = document.getElementById('sourceBrowserList');
    
    console.log('Directory browser elements:', {
      pathInput: !!pathInput,
      pathInputId: pathInput?.id,
      directoryList: !!directoryList,
      directoryListId: directoryList?.id,
      directoryListParent: directoryList?.parentElement?.tagName,
      directoryListVisible: directoryList?.offsetParent !== null
    });
    
    if (!pathInput || !directoryList) {
      console.error('Directory browser elements not found!');
      console.error('Available elements with ID sourceBrowserPath:', document.querySelectorAll('#sourceBrowserPath'));
      console.error('Available elements with ID sourceBrowserList:', document.querySelectorAll('#sourceBrowserList'));
      return;
    }
    
    let currentPath = pathInput.value || this.getDefaultSourcePath();
    pathInput.value = currentPath;
    
    try {
      directoryList.innerHTML = '<div class="loading">Loading directories...</div>';
      
      // Fetch real directory listing
      const apiUrl = (window.appConfig && window.appConfig.getApiUrl) ? window.appConfig.getApiUrl() : '';
      console.log('🔍 DIRECTORY BROWSER DEBUG:');
      console.log('- API URL:', apiUrl);
      console.log('- Current Path:', currentPath);
      console.log('- Window appConfig exists:', !!window.appConfig);
      
      const fetchUrl = `${apiUrl}/api/browse-directories?path=${encodeURIComponent(currentPath)}`;
      console.log('- Fetch URL:', fetchUrl);
      
      console.log('🌐 Making fetch request...');
      const response = await fetch(fetchUrl);
      console.log('- Response status:', response.status);
      console.log('- Response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Directory browser - Error response:', errorText);
        throw new Error(`Failed to load directory listing: ${response.status} ${errorText}`);
      }
      
      console.log('📄 Parsing JSON response...');
      const data = await response.json();
      console.log('- Data received:', data);
      console.log('- Directories count:', data.directories ? data.directories.length : 'no directories property');
      console.log('- Current path from response:', data.currentPath);
      
      console.log('🏗️ Building directory list...');
      directoryList.innerHTML = '';
      
      // Add parent directory navigation
      if (currentPath !== '/') {
        console.log('Adding parent directory navigation...');
        const parentItem = document.createElement('div');
        parentItem.className = 'directory-item parent';
        parentItem.innerHTML = '📁 .. (Parent Directory)';
        parentItem.onclick = () => {
          pathInput.value = data.parentPath;
          this.populateDirectoryBrowser();
        };
        directoryList.appendChild(parentItem);
        console.log('Parent directory added');
      }
      
      // Show current directory file count if any
      if (data.currentDirFileCount > 0) {
        const currentDirItem = document.createElement('div');
        currentDirItem.className = 'directory-item current';
        currentDirItem.innerHTML = `📁 . (Current directory - ${data.currentDirFileCount} files)`;
        directoryList.appendChild(currentDirItem);
      }
      
      // Add subdirectories
      console.log(`Adding ${data.directories.length} subdirectories...`);
      data.directories.forEach((dir, index) => {
        console.log(`Creating directory item ${index + 1}: ${dir.name}`);
        const dirItem = document.createElement('div');
        dirItem.className = 'directory-item';
        dirItem.innerHTML = `📁 ${dir.name} ${dir.fileCount ? `(${dir.fileCount} files)` : ''}`;
        dirItem.onclick = () => {
          pathInput.value = dir.path;
          this.populateDirectoryBrowser();
        };
        directoryList.appendChild(dirItem);
      });
      
      if (data.directories.length === 0 && data.currentDirFileCount === 0) {
        console.log('No directories found, showing no-directories message');
        directoryList.innerHTML = '<div class="no-directories">No subdirectories or media files found</div>';
      }
      
      console.log('✅ Directory list population complete!');
      console.log('Final directoryList state:');
      console.log('- Children count:', directoryList.children.length);
      console.log('- innerHTML length:', directoryList.innerHTML.length);
      console.log('- First 200 chars of innerHTML:', directoryList.innerHTML.substring(0, 200));
      console.log('- DirectoryList visible:', directoryList.offsetParent !== null);
      console.log('- DirectoryList display style:', getComputedStyle(directoryList).display);
      
      // Check modal visibility
      const modal = this.modalElements.directoryPicker;
      console.log('Modal state:');
      console.log('- Modal exists:', !!modal);
      console.log('- Modal display style:', modal ? modal.style.display : 'N/A');
      console.log('- Modal visible:', modal ? modal.offsetParent !== null : 'N/A');
      console.log('- Modal in DOM:', modal ? document.body.contains(modal) : 'N/A');
      
      // Auto-suggest directory name based on path
      const nameInput = document.getElementById('directoryName');
      if (nameInput) {
        nameInput.placeholder = this.suggestDirectoryName(currentPath);
        console.log('Directory name placeholder set:', nameInput.placeholder);
      } else {
        console.error('directoryName input not found!');
      }
      
      // Auto-suggest group name
      const newGroupInput = document.getElementById('newGroupName');
      newGroupInput.placeholder = this.suggestGroupName(currentPath);
      
    } catch (error) {
      console.error('Error populating directory browser:', error);
      console.error('Error stack:', error.stack);
      
      let errorDetails = `Error: ${error.message}`;
      if (error.name) errorDetails += `\nType: ${error.name}`;
      if (error.cause) errorDetails += `\nCause: ${error.cause}`;
      
      directoryList.innerHTML = `
        <div class="error">
          <strong>Failed to load directories</strong><br>
          ${errorDetails}<br><br>
          <strong>Debug info:</strong><br>
          Path: ${currentPath}<br>
          API URL: ${(window.appConfig && window.appConfig.getApiUrl) ? window.appConfig.getApiUrl() : 'undefined'}<br>
          Config loaded: ${!!this.config}
        </div>`;
    }
  },

  /**
   * Get default source path for browsing
   */
  getDefaultSourcePath() {
    // If we have existing directories in config, use the first one
    if (this.config && this.config.sources.directories.length > 0) {
      return this.config.sources.directories[0].path;
    }
    
    // Otherwise start from root and let user navigate
    return '/home';
  },

  /**
   * Suggest directory name based on path
   */
  suggestDirectoryName(path) {
    const parts = path.split('/').filter(p => p);
    const lastPart = parts[parts.length - 1];
    
    if (path.includes('ComfyUI')) {
      if (lastPart.match(/^\d{8}$/)) return `Work ${lastPart}`; // Date folder
      if (lastPart === 'output') return 'ComfyUI Output';
      return `ComfyUI ${lastPart}`;
    }
    
    return lastPart || 'New Directory';
  },

  /**
   * Suggest group name based on path
   */
  suggestGroupName(path) {
    if (path.includes('ComfyUI')) return 'ComfyUI';
    if (path.includes('Stability')) return 'Stability';
    if (path.includes('AUTOMATIC1111')) return 'Auto1111';
    
    // Use meaningful directory name
    const parts = path.split('/').filter(p => p);
    const meaningful = parts.find(part => 
      !['home', 'Documents', 'Desktop', 'Downloads', 'Pictures'].includes(part)
    );
    
    return meaningful ? meaningful.charAt(0).toUpperCase() + meaningful.slice(1) : 'Home';
  },

  /**
   * Add selected directory
   */
  async addSelectedDirectory() {
    try {
      const pathInput = document.getElementById('sourceBrowserPath');
      const nameInput = document.getElementById('directoryName');
      const newGroupInput = document.getElementById('newGroupName');
      const existingGroupSelect = document.getElementById('existingGroups');
      const enableCheckbox = document.getElementById('enableImmediately');
      
      const selectedPath = pathInput.value;
      if (!selectedPath) {
        alert('Please select a directory path');
        return;
      }
      
      const directoryName = nameInput.value || nameInput.placeholder;
      const createNewGroup = document.querySelector('input[name="groupOption"]:checked').value === 'new';
      
      let groupId = null;
      
      if (createNewGroup) {
        const groupName = newGroupInput.value || newGroupInput.placeholder;
        if (groupName) {
          // Create new group first
          const groupResponse = await window.directoryApi.createGroup({
            name: groupName,
            color: '#4f46e5', // Default color
            directoryIds: []
          });
          groupId = groupResponse.group.id;
        }
      } else {
        groupId = existingGroupSelect.value;
      }
      
      // Add directory
      const directoryData = {
        name: directoryName,
        path: selectedPath,
        enabled: enableCheckbox.checked,
        groupId: groupId
      };
      
      const response = await window.directoryApi.addDirectory(directoryData);
      console.log('Directory added:', response);
      
      // Refresh config
      await this.loadConfig();
      
      // Close modal and refresh UI
      this.closeDirectoryPicker();
      
      // Trigger refresh of options UI if it exists
      if (window.refreshOptionsUI) {
        window.refreshOptionsUI();
      }
      
      alert(`Added directory "${directoryName}" successfully!`);
      
    } catch (error) {
      console.error('Error adding directory:', error);
      alert('Error adding directory: ' + error.message);
    }
  },

  /**
   * Open group manager
   */
  async openGroupManager() {
    this.modalElements.groupManager.style.display = 'block';
    await this.populateAvailableDirectories();
    
    // Setup color picker
    const colorButtons = document.querySelectorAll('.color-btn');
    colorButtons.forEach(btn => {
      btn.onclick = () => {
        colorButtons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      };
    });
    
    // Select first color by default
    if (colorButtons.length > 0) {
      colorButtons[0].classList.add('selected');
    }
  },

  /**
   * Close group manager
   */
  closeGroupManager() {
    this.modalElements.groupManager.style.display = 'none';
    
    // Clear form
    document.getElementById('groupName').value = '';
    document.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('selected'));
    document.querySelectorAll('#availableDirectories input[type="checkbox"]').forEach(cb => cb.checked = false);
    // Don't close Options menu - user might want to do more operations
  },

  /**
   * Populate available directories for group creation
   */
  async populateAvailableDirectories() {
    const container = document.getElementById('availableDirectories');
    container.innerHTML = '';
    
    // Get ungrouped directories
    const ungroupedDirs = this.config.sources.directories.filter(dir => !dir.groupId);
    
    if (ungroupedDirs.length === 0) {
      container.innerHTML = '<p class="no-directories">No ungrouped directories available</p>';
      return;
    }
    
    ungroupedDirs.forEach(dir => {
      const checkbox = document.createElement('label');
      checkbox.className = 'directory-checkbox';
      checkbox.innerHTML = `
        <input type="checkbox" value="${dir.id}">
        📁 ${dir.name} <span class="path">(${dir.path})</span>
      `;
      container.appendChild(checkbox);
    });
  },

  /**
   * Create new group
   */
  async createGroup() {
    try {
      const nameInput = document.getElementById('groupName');
      const selectedColor = document.querySelector('.color-btn.selected');
      const selectedDirectories = Array.from(
        document.querySelectorAll('#availableDirectories input[type="checkbox"]:checked')
      ).map(cb => cb.value);
      
      const groupName = nameInput.value;
      if (!groupName) {
        alert('Please enter a group name');
        return;
      }
      
      const color = selectedColor ? selectedColor.dataset.color : '#4f46e5';
      
      const groupData = {
        name: groupName,
        color: color,
        directoryIds: selectedDirectories
      };
      
      const response = await window.directoryApi.createGroup(groupData);
      console.log('Group created:', response);
      
      // Refresh config
      await this.loadConfig();
      
      // Close modal and refresh UI
      this.closeGroupManager();
      
      // Trigger refresh of options UI if it exists
      if (window.refreshOptionsUI) {
        window.refreshOptionsUI();
      }
      
      alert(`Created group "${groupName}" with ${selectedDirectories.length} directories!`);
      
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Error creating group: ' + error.message);
    }
  },

  /**
   * Open destination picker
   */
  async openDestinationPicker() {
    this.modalElements.destinationPicker.style.display = 'block';
    await this.populateDestinationOptions();
  },

  /**
   * Close destination picker
   */
  closeDestinationPicker() {
    this.modalElements.destinationPicker.style.display = 'none';
    // Don't close Options menu - user might want to do more operations
  },

  /**
   * Populate destination options
   */
  async populateDestinationOptions() {
    const currentPathSpan = document.getElementById('currentDestPath');
    const recentList = document.getElementById('recentDestList');
    
    currentPathSpan.textContent = this.config.destination.current;
    
    recentList.innerHTML = '';
    
    this.config.destination.recent.forEach(path => {
      if (path !== this.config.destination.current) {
        const item = document.createElement('div');
        item.className = 'destination-item';
        item.innerHTML = `
          <label>
            <input type="radio" name="destinationOption" value="${path}">
            📁 ${path}
          </label>
        `;
        
        item.querySelector('input').onchange = () => {
          this.selectDestination(path);
        };
        
        recentList.appendChild(item);
      }
    });
    
    if (recentList.children.length === 0) {
      recentList.innerHTML = '<p class="no-recent">No recent destinations</p>';
    }
  },

  /**
   * Select destination
   */
  async selectDestination(path) {
    try {
      await window.directoryApi.updateDestination(path);
      await this.loadConfig();
      
      // Trigger refresh of options UI
      if (window.refreshOptionsUI) {
        window.refreshOptionsUI();
      }
      
      this.closeDestinationPicker();
      
    } catch (error) {
      console.error('Error updating destination:', error);
      alert('Error updating destination: ' + error.message);
    }
  },

  /**
   * Browse for new destination
   */
  async browseForDestination() {
    // Create a temporary directory browser modal for destination selection
    this.createDestinationBrowserModal();
  },

  /**
   * Create destination browser modal
   */
  createDestinationBrowserModal() {
    // Remove existing destination browser if any
    const existing = document.getElementById('destinationBrowserModal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'destinationBrowserModal';
    modal.className = 'modal-overlay';
    
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Select Destination Folder</h2>
          <button class="modal-close" onclick="directoryManager.closeDestinationBrowser()">×</button>
        </div>
        
        <div class="modal-body">
          <div class="directory-browser">
            <input type="text" id="destBrowserPath" placeholder="Directory path..." class="path-input">
            <div id="destBrowserList" class="directory-list">
              <div class="loading">Loading directories...</div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="directoryManager.closeDestinationBrowser()">Cancel</button>
          <button class="btn btn-primary" onclick="directoryManager.selectCurrentDestination()">Select This Folder</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
    
    // Populate with initial path
    this.populateDestinationBrowser();
  },

  /**
   * Populate destination browser
   */
  async populateDestinationBrowser() {
    const pathInput = document.getElementById('destBrowserPath');
    const browserList = document.getElementById('destBrowserList');
    
    // Use current destination or a sensible default
    let currentPath = pathInput.value || this.config.destination.current || '/home';
    pathInput.value = currentPath;
    
    try {
      browserList.innerHTML = '<div class="loading">Loading directories...</div>';
      
      const apiUrl = (window.appConfig && window.appConfig.getApiUrl) ? window.appConfig.getApiUrl() : '';
      console.log('Destination browser - API URL:', apiUrl, 'Path:', currentPath);
      
      const fetchUrl = `${apiUrl}/api/browse-directories?path=${encodeURIComponent(currentPath)}`;
      console.log('Destination browser - Fetch URL:', fetchUrl);
      
      const response = await fetch(fetchUrl);
      console.log('Destination browser - Response status:', response.status);
      
      if (!response.ok) {
        throw new Error('Failed to load directory listing');
      }
      
      const data = await response.json();
      browserList.innerHTML = '';
      
      // Add parent directory navigation
      if (currentPath !== '/') {
        const parentItem = document.createElement('div');
        parentItem.className = 'directory-item parent';
        parentItem.innerHTML = '📁 .. (Parent Directory)';
        parentItem.onclick = () => {
          pathInput.value = data.parentPath;
          this.populateDestinationBrowser();
        };
        browserList.appendChild(parentItem);
      }
      
      // Add current directory selection option
      const currentDirItem = document.createElement('div');
      currentDirItem.className = 'directory-item current-selection';
      currentDirItem.innerHTML = `📁 . (Select this folder: ${currentPath})`;
      currentDirItem.onclick = () => {
        this.selectDestinationPath(currentPath);
      };
      browserList.appendChild(currentDirItem);
      
      // Add subdirectories
      data.directories.forEach(dir => {
        const dirItem = document.createElement('div');
        dirItem.className = 'directory-item';
        dirItem.innerHTML = `📁 ${dir.name}`;
        dirItem.onclick = () => {
          pathInput.value = dir.path;
          this.populateDestinationBrowser();
        };
        browserList.appendChild(dirItem);
      });
      
      if (data.directories.length === 0) {
        const noDirsItem = document.createElement('div');
        noDirsItem.className = 'no-directories';
        noDirsItem.textContent = 'No subdirectories found';
        browserList.appendChild(noDirsItem);
      }
      
    } catch (error) {
      console.error('Error populating destination browser:', error);
      browserList.innerHTML = '<div class="error">Error loading directories: ' + error.message + '</div>';
    }
  },

  /**
   * Close destination browser
   */
  closeDestinationBrowser() {
    const modal = document.getElementById('destinationBrowserModal');
    if (modal) modal.remove();
  },

  /**
   * Select current destination path
   */
  selectCurrentDestination() {
    const pathInput = document.getElementById('destBrowserPath');
    const currentPath = pathInput.value;
    if (currentPath) {
      this.selectDestinationPath(currentPath);
    }
  },

  /**
   * Select destination path and close browser
   */
  async selectDestinationPath(path) {
    try {
      await this.selectDestination(path);
      this.closeDestinationBrowser();
    } catch (error) {
      console.error('Error selecting destination:', error);
      alert('Error selecting destination: ' + error.message);
    }
  },

  /**
   * Refresh the Options UI with current directory configuration
   */
  async refreshOptionsUI() {
    await this.populateSourceDirectoriesUI();
    await this.populateDestinationUI();
  },

  /**
   * Populate source directories in Options menu
   */
  async populateSourceDirectoriesUI() {
    const container = document.getElementById('sourceDirectoriesContainer');
    if (!container) return;

    try {
      if (!this.config) {
        await this.loadConfig();
      }

      container.innerHTML = '';

      if (this.config.sources.groups.length === 0 && this.config.sources.directories.length === 0) {
        container.innerHTML = '<div class="loading-state">No source directories configured</div>';
        return;
      }

      // Render groups
      this.config.sources.groups.forEach(group => {
        const groupElement = this.createGroupElement(group);
        container.appendChild(groupElement);
      });

      // Render ungrouped directories
      const ungroupedDirs = this.config.sources.directories.filter(dir => !dir.groupId);
      if (ungroupedDirs.length > 0) {
        const ungroupedElement = this.createUngroupedDirectoriesElement(ungroupedDirs);
        container.appendChild(ungroupedElement);
      }

    } catch (error) {
      console.error('Error populating source directories UI:', error);
      container.innerHTML = '<div class="error">Error loading directories</div>';
    }
  },

  /**
   * Create group element for Options UI
   */
  createGroupElement(group) {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'source-group';
    
    const groupDirs = this.config.sources.directories.filter(dir => dir.groupId === group.id);
    const enabledCount = groupDirs.filter(dir => dir.enabled).length;
    
    groupDiv.innerHTML = `
      <div class="source-group-header">
        <span class="source-group-toggle" onclick="directoryManager.toggleGroupCollapse('${group.id}')">▼</span>
        <input type="checkbox" class="source-group-checkbox" ${group.enabled ? 'checked' : ''} 
               onchange="directoryManager.toggleGroup('${group.id}', this.checked)">
        <span style="color: ${group.color || '#4f46e5'}">⚫</span>
        <span class="source-group-name">${group.name} (${enabledCount}/${groupDirs.length})</span>
      </div>
      <div class="source-directories" id="group-${group.id}-dirs">
        ${groupDirs.map(dir => this.createDirectoryHTML(dir)).join('')}
      </div>
    `;
    
    return groupDiv;
  },

  /**
   * Create ungrouped directories element
   */
  createUngroupedDirectoriesElement(directories) {
    const ungroupedDiv = document.createElement('div');
    ungroupedDiv.className = 'source-group';
    
    const enabledCount = directories.filter(dir => dir.enabled).length;
    
    ungroupedDiv.innerHTML = `
      <div class="source-group-header">
        <span class="source-group-toggle" onclick="directoryManager.toggleGroupCollapse('ungrouped')">▼</span>
        <span class="source-group-name">Individual Directories (${enabledCount}/${directories.length})</span>
      </div>
      <div class="source-directories" id="group-ungrouped-dirs">
        ${directories.map(dir => this.createDirectoryHTML(dir)).join('')}
      </div>
    `;
    
    return ungroupedDiv;
  },

  /**
   * Create directory HTML
   */
  createDirectoryHTML(dir) {
    const fileCount = dir.fileCount ? ` (${dir.fileCount})` : '';
    return `
      <div class="source-directory">
        <input type="checkbox" class="source-directory-checkbox" ${dir.enabled ? 'checked' : ''} 
               onchange="directoryManager.toggleDirectory('${dir.id}', this.checked)">
        <span class="source-directory-name">${dir.name}${fileCount}</span>
        <span class="source-directory-path">${this.truncatePath(dir.path)}</span>
      </div>
    `;
  },

  /**
   * Truncate path for display
   */
  truncatePath(path) {
    if (path.length <= 30) return path;
    const parts = path.split('/');
    return '.../' + parts.slice(-2).join('/');
  },

  /**
   * Populate destination in Options menu
   */
  async populateDestinationUI() {
    const pathElement = document.getElementById('currentDestinationPath');
    if (!pathElement) return;

    try {
      if (!this.config) {
        await this.loadConfig();
      }

      pathElement.textContent = this.truncatePath(this.config.destination.current || '/Documents');

    } catch (error) {
      console.error('Error populating destination UI:', error);
      pathElement.textContent = 'Error loading destination';
    }
  },

  /**
   * Toggle group enabled/disabled
   */
  async toggleGroup(groupId, enabled) {
    try {
      await window.directoryApi.updateGroup(groupId, { enabled });
      await this.loadConfig();
      await this.refreshOptionsUI();
    } catch (error) {
      console.error('Error toggling group:', error);
    }
  },

  /**
   * Toggle directory enabled/disabled
   */
  async toggleDirectory(directoryId, enabled) {
    try {
      await window.directoryApi.updateDirectory(directoryId, { enabled });
      await this.loadConfig();
      await this.refreshOptionsUI();
    } catch (error) {
      console.error('Error toggling directory:', error);
    }
  },

  /**
   * Toggle group collapse/expand
   */
  toggleGroupCollapse(groupId) {
    const dirsElement = document.getElementById(`group-${groupId}-dirs`);
    const toggleElement = event.target;
    
    if (dirsElement.style.display === 'none') {
      dirsElement.style.display = 'block';
      toggleElement.textContent = '▼';
    } else {
      dirsElement.style.display = 'none';
      toggleElement.textContent = '▶';
    }
  }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  directoryManager.init();
});

// Make available globally
window.directoryManager = directoryManager;

// Make refresh function available globally for other components
window.refreshOptionsUI = () => {
  if (window.directoryManager) {
    return window.directoryManager.refreshOptionsUI();
  }
};