/**
 * Configuration and constants
 */
const config = {
  // API endpoint handling
  getApiUrl: () => `${window.location.protocol}//${window.location.host}`,
  
  // Paths for media files
  fromPath: null,
  toPath: null,
  defaultFromPath: null,
  defaultToPath: null,
  
  // Initialize paths from server
  initPaths: async function() {
    try {
      const response = await fetch(`${this.getApiUrl()}/api/config/paths`);
      if (response.ok) {
        const data = await response.json();
        this.fromPath = data.fromPath;
        this.toPath = data.toPath;
        this.defaultFromPath = data.defaultFromPath;
        this.defaultToPath = data.defaultToPath;

        // Add path parameters to URL if not already present
        this.updateUrlWithPaths();
        
        return data;
      }
    } catch (error) {
      console.error('Error fetching paths:', error);
    }
    return null;
  },
  
  // Update URL with path parameters
  updateUrlWithPaths: function() {
    try {
      const url = new URL(window.location.href);
      const currentFromPath = url.searchParams.get('fromPath');
      const currentToPath = url.searchParams.get('toPath');
      
      let shouldUpdateUrl = false;
      
      // Only set parameters if they're not already in the URL
      if (this.fromPath && !currentFromPath && this.fromPath !== this.defaultFromPath) {
        url.searchParams.set('fromPath', this.fromPath);
        shouldUpdateUrl = true;
      }
      
      if (this.toPath && !currentToPath && this.toPath !== this.defaultToPath) {
        url.searchParams.set('toPath', this.toPath);
        shouldUpdateUrl = true;
      }
      
      // Update URL without reloading the page
      if (shouldUpdateUrl) {
        window.history.replaceState({}, '', url.toString());
      }
    } catch (error) {
      console.error('Error updating URL with paths:', error);
    }
  },
  
  // Update path settings on server and in URL
  updatePaths: async function(fromPath, toPath) {
    try {
      const requestBody = {};
      
      if (fromPath) {
        requestBody.fromPath = fromPath;
      }
      
      if (toPath) {
        requestBody.toPath = toPath;
      }
      
      const response = await fetch(`${this.getApiUrl()}/api/config/paths`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (response.ok) {
        const data = await response.json();
        this.fromPath = data.fromPath;
        this.toPath = data.toPath;
        
        // Update URL with new paths
        const url = new URL(window.location.href);
        
        if (fromPath) {
          url.searchParams.set('fromPath', fromPath);
        }
        
        if (toPath) {
          url.searchParams.set('toPath', toPath);
        }
        
        // Replace current URL without reload
        window.history.replaceState({}, '', url.toString());
        
        return data;
      }
    } catch (error) {
      console.error('Error updating paths:', error);
    }
    return null;
  },
  
  // Get display path (converts back to ~ format for display)
  getDisplayPath: function(fullPath) {
    if (!fullPath) return '';
    
    // Try to replace the home directory with ~
    try {
      const homeDir = this.defaultFromPath.split('Documents')[0];
      if (homeDir && fullPath.startsWith(homeDir)) {
        return fullPath.replace(homeDir, '~');
      }
    } catch (e) {
      console.error('Error formatting path for display:', e);
    }
    
    return fullPath;
  },
  
  // Action types
  actions: {
    ARCHIVE: 'archive',
    ARCHIVE_GOOD: 'archive_good',
    ARCHIVE_BAD: 'archive_bad',
    SAVED: 'saved',
    SAVED_WIP: 'saved_wip',
    BEST_COMPLETE: 'best_complete',
    BEST_WIP: 'best_wip',
    DELETE: 'delete',
    OPEN_FILE: 'open_file'
  },
  
  // Keyboard mapping for actions
  keyboardMap: {
    // Left side keyboard layout
    'a': 'archive',
    'A': 'archive',
    'd': 'saved',
    'D': 'saved',
    'w': 'best_complete',
    'W': 'best_complete',
    's': 'delete',
    'S': 'delete',
    'q': 'archive_good',
    'Q': 'archive_good',
    'e': 'best_wip',
    'E': 'best_wip',
    'z': 'archive_bad',
    'Z': 'archive_bad',
    'x': 'saved_wip',
    'X': 'saved_wip',
    
    // Right side keyboard layout
    'j': 'archive',
    'J': 'archive',
    'l': 'saved',
    'L': 'saved',
    'i': 'best_complete',
    'I': 'best_complete',
    'k': 'delete',
    'K': 'delete',
    'u': 'archive_good',
    'U': 'archive_good',
    'o': 'best_wip',
    'O': 'best_wip',
    'm': 'archive_bad',
    'M': 'archive_bad',
    ',': 'saved_wip'
  },
  
  // Grid zone configuration for tap areas
  zoneConfig: [
    { className: 'top-left', action: 'archive_good' },
    { className: 'top-middle', action: 'best_complete' },
    { className: 'top-right', action: 'best_wip' },
    { className: 'middle-left', action: 'archive' },
    { className: 'middle-center', action: 'open_file' },
    { className: 'middle-right', action: 'saved' },
    { className: 'bottom-left', action: 'archive_bad' },
    { className: 'bottom-middle', action: 'delete' },
    { className: 'bottom-right', action: 'saved_wip' }
  ],
  
  // Instructions content for the info modal
  instructionsContent: `
    <h3>Keyboard Controls</h3>
    <ul>
      <li><strong>Left/Right Arrows:</strong> Previous/Next image</li>
      <li><strong>Q/U:</strong> Top left (archive_good)</li>
      <li><strong>W/I:</strong> Top middle (best_complete)</li>
      <li><strong>E/O:</strong> Top right (best_wip)</li>
      <li><strong>A/J:</strong> Middle left (archive)</li>
      <li><strong>S/K:</strong> Bottom (delete)</li>
      <li><strong>D/L:</strong> Middle right (saved)</li>
      <li><strong>Z/M:</strong> Bottom left (archive_bad)</li>
      <li><strong>X:</strong> Bottom (delete)</li>
      <li><strong>,:</strong> Bottom right (saved_wip)</li>
      <li><strong>Command+Z:</strong> Undo</li>
      <li><strong>Command+A/D or Command+J/L:</strong> Previous/Next image</li>
      <li><strong>Command+Left/Right:</strong> Previous/Next image</li>
      <li><strong>Command+Down Arrow:</strong> Delete</li>
      <li><strong>Command+Left Arrow:</strong> Best Complete</li>
      <li><strong>Command+O:</strong> Open options menu</li>
      <li><strong>Command+N:</strong> Open custom name dialog</li>
      <li><strong>Command+S:</strong> Download current image</li>
      <li><strong>Command+R:</strong> Refresh</li>
    </ul>
    
    <h3>Tap Zones</h3>
    <p>The image is divided into a 3x3 grid:</p>
    <div class="grid-explanation">
      <div>Archive Good</div><div>Super Save Complete</div><div>Super Save WIP</div>
      <div>Archive</div><div>Open File</div><div>Save</div>
      <div>Archive Bad</div><div>Delete</div><div>Save WIP</div>
    </div>
    
    <h3>Swipe Actions</h3>
    <ul>
      <li><strong>Left swipe:</strong> Archive</li>
      <li><strong>Right swipe:</strong> Save</li>
      <li><strong>Up swipe:</strong> Super Save - Complete</li>
      <li><strong>Down swipe:</strong> Delete</li>
    </ul>
    
    <h3>Custom Paths</h3>
    <ul>
      <li><strong>FROM:</strong> The directory to sort media from</li>
      <li><strong>TO:</strong> The directory to sort media to</li>
      <li>Paths can be edited by tapping on them in the expanded header</li>
    </ul>
  `
};

// Export as a global variable instead of using ES6 modules
window.appConfig = config;