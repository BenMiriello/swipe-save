/**
 * Modal Factory for Directory Manager
 * Creates and manages modal dialogs for directory operations
 */
const DirectoryModalFactory = {
  modalElements: {},

  /**
   * Create all modals for directory management
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
          <h2>Set Destination Directory</h2>
          <button class="modal-close" onclick="directoryManager.closeDestinationPicker()">×</button>
        </div>
        
        <div class="modal-body">
          <div class="directory-browser">
            <input type="text" id="destBrowserPath" placeholder="Directory path..." class="path-input">
            <div id="destBrowserList" class="directory-list">
              <div class="loading">Loading directories...</div>
            </div>
          </div>
          
          <div class="destination-options">
            <label>
              <input type="checkbox" id="createIfMissing" checked>
              Create directory if it doesn't exist
            </label>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="directoryManager.closeDestinationPicker()">Cancel</button>
          <button class="btn btn-primary" onclick="directoryManager.setSelectedDestination()">Set Destination</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modalElements.destinationPicker = modal;
  }
};

window.DirectoryModalFactory = DirectoryModalFactory;