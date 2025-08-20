/**
 * Directory Management API Client
 * Handles multi-source directory configuration
 */
const directoryApi = {
  /**
   * Get full directory configuration
   */
  async getDirectoryConfig() {
    try {
      const response = await fetch(`${window.appConfig.getApiUrl()}/api/user/directories`);
      
      if (!response.ok) {
        throw new Error('Failed to get directory configuration');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting directory config:', error);
      throw error;
    }
  },

  /**
   * Add new directory
   */
  async addDirectory(directoryData) {
    try {
      const response = await fetch(`${window.appConfig.getApiUrl()}/api/user/directories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(directoryData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add directory');
      }

      return await response.json();
    } catch (error) {
      console.error('Error adding directory:', error);
      throw error;
    }
  },

  /**
   * Update directory
   */
  async updateDirectory(id, updates) {
    try {
      const response = await fetch(`${window.appConfig.getApiUrl()}/api/user/directories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update directory');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating directory:', error);
      throw error;
    }
  },

  /**
   * Delete directory
   */
  async deleteDirectory(id) {
    try {
      const response = await fetch(`${window.appConfig.getApiUrl()}/api/user/directories/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete directory');
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting directory:', error);
      throw error;
    }
  },

  /**
   * Create new group
   */
  async createGroup(groupData) {
    try {
      const response = await fetch(`${window.appConfig.getApiUrl()}/api/user/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create group');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  },

  /**
   * Update group
   */
  async updateGroup(id, updates) {
    try {
      const response = await fetch(`${window.appConfig.getApiUrl()}/api/user/groups/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update group');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating group:', error);
      throw error;
    }
  },

  /**
   * Delete group
   */
  async deleteGroup(id) {
    try {
      const response = await fetch(`${window.appConfig.getApiUrl()}/api/user/groups/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete group');
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting group:', error);
      throw error;
    }
  },

  /**
   * Update destination
   */
  async updateDestination(path) {
    try {
      const response = await fetch(`${window.appConfig.getApiUrl()}/api/user/destination`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update destination');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating destination:', error);
      throw error;
    }
  },

  /**
   * Scan directory for file count
   */
  async scanDirectory(id) {
    try {
      const response = await fetch(`${window.appConfig.getApiUrl()}/api/user/directories/${id}/scan`, {
        method: 'POST'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to scan directory');
      }

      return await response.json();
    } catch (error) {
      console.error('Error scanning directory:', error);
      throw error;
    }
  },

  /**
   * Get files from specific sources
   */
  async getFiles(options = {}) {
    try {
      // Get file limit from config if not provided
      const defaultLimit = await window.appConfig.getFileLimit();
      const {
        limit = defaultLimit,
        sortBy = 'date',
        order = 'desc',
        directories = null,
        groups = null,
        sources = 'enabled'
      } = options;

      const params = new URLSearchParams({
        limit: limit.toString(),
        sortBy,
        order
      });

      if (directories) {
        params.append('directories', Array.isArray(directories) ? directories.join(',') : directories);
      }

      if (groups) {
        params.append('groups', Array.isArray(groups) ? groups.join(',') : groups);
      }

      if (sources !== 'enabled') {
        params.append('sources', sources);
      }

      const response = await fetch(`${window.appConfig.getApiUrl()}/api/files?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to get files');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting files:', error);
      throw error;
    }
  }
};

// Make available globally
window.directoryApi = directoryApi;