/**
 * ComfyUI Module Integration Test
 * Simple test to verify Alpine.js module is working
 */

// Test function to verify module integration
function testComfyUIModule() {
  const isDev = window.location.hostname === 'localhost';
  if (isDev) console.log('Testing ComfyUI Module Integration...');

  // Check if Alpine is loaded
  if (typeof Alpine === 'undefined') {
    console.error('❌ Alpine.js not loaded');
    return false;
  }
  if (isDev) console.log('✅ Alpine.js loaded');

  // Check if ComfyUI module is initialized
  if (!window.comfyUIModule) {
    console.error('❌ ComfyUI module not found');
    return false;
  }
  if (isDev) console.log('✅ ComfyUI module found');

  // Check if services are available
  if (!window.comfyUIServices?.apiClient) {
    console.error('❌ ComfyUI API client not found');
    return false;
  }
  if (isDev) console.log('✅ ComfyUI API client available');

  // Check if stores are registered
  try {
    const workflowStore = Alpine.store('comfyWorkflow');
    const destinationsStore = Alpine.store('comfyDestinations');

    if (!workflowStore || !destinationsStore) {
      console.error('❌ Alpine stores not registered');
      return false;
    }
    if (isDev) {
      console.log('✅ Alpine stores registered');
      console.log('Current workflow settings:', workflowStore.settings);
      console.log('Current destinations:', destinationsStore.destinations);
    }

  } catch (error) {
    console.error('❌ Error accessing stores:', error);
    return false;
  }

  // Test modal opening (without file for now)
  try {
    const testFile = { name: 'test.png' };
    window.comfyUIModule.openWorkflowModal(testFile);

    // Check if modal state changed
    const isOpen = Alpine.store('comfyWorkflow').isModalOpen;
    if (isOpen) {
      // Close it immediately (no logging in production)
      Alpine.store('comfyWorkflow').closeModal();
    } else {
      console.error('❌ Modal did not open');
      return false;
    }

  } catch (error) {
    console.error('❌ Error testing modal:', error);
    return false;
  }

  if (isDev) console.log('🎉 All tests passed! ComfyUI module is working correctly.');
  return true;
}

// Auto-run test when DOM is loaded (after Alpine is initialized)
document.addEventListener('DOMContentLoaded', () => {
  // Wait a bit for Alpine to fully initialize
  setTimeout(() => {
    if (window.comfyUIModule?.isInitialized) {
      testComfyUIModule();
    } else if (window.location.hostname === 'localhost') {
      console.warn('⚠️ ComfyUI module not yet initialized, skipping test');
    }
  }, 1000);
});

// Export test function for manual testing
window.testComfyUIModule = testComfyUIModule;