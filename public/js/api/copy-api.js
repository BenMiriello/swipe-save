/**
 * Copy Settings API service
 */
const copyApi = {
  /**
   * Get save copies when sorting setting
   * @returns {boolean} Whether to save copies when sorting
   */
  getSaveCopiesWhenSorting() {
    const savedSetting = localStorage.getItem('saveCopiesWhenSorting');
    return savedSetting !== null ? savedSetting === 'true' : true; // Default to true
  }
};

window.copyApi = copyApi;
