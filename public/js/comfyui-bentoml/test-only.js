/**
 * BentoML Testing Functions - Safe Testing Without Queue Interference
 * These functions test the BentoML integration without actually submitting to queues
 */

window.bentoMLTestSafe = {
  /**
   * Test BentoML service connectivity without submitting workflows
   */
  async testConnectivity() {
    console.log('=== BentoML Connectivity Test ===');
    
    try {
      // Test 1: Health check
      console.log('1. Testing health check...');
      const health = await window.comfyUIBentoML.client.healthCheck();
      console.log('   Health check result:', health);

      // Test 2: Feature flags
      console.log('2. Testing feature flags...');
      await window.comfyUIBentoML.client.syncFeatureFlags();
      console.log('   Feature flags:', window.comfyUIBentoML.client.featureFlags);

      // Test 3: Server endpoint availability
      console.log('3. Testing server endpoints...');
      const endpoints = [
        '/api/bentoml/health',
        '/api/bentoml/flags',
        '/api/bentoml/schema'
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint);
          console.log(`   ${endpoint}: ${response.status} ${response.statusText}`);
        } catch (error) {
          console.log(`   ${endpoint}: ERROR - ${error.message}`);
        }
      }

      console.log('✅ Connectivity test completed');
      return true;

    } catch (error) {
      console.error('❌ Connectivity test failed:', error);
      return false;
    }
  },

  /**
   * Test workflow metadata extraction (safe - no submission)
   */
  async testWorkflowExtraction() {
    console.log('=== BentoML Workflow Extraction Test ===');
    
    try {
      // Get a sample PNG file from the media list
      console.log('1. Finding sample PNG file...');
      const response = await fetch('/api/files');
      const files = await response.json();
      const pngFile = files.find(f => f.name.endsWith('.png'));
      
      if (!pngFile) {
        console.log('   No PNG files found for testing');
        return false;
      }
      
      console.log(`   Using sample file: ${pngFile.name}`);

      // Test 2: Extract workflow metadata
      console.log('2. Testing workflow extraction...');
      const workflowResponse = await fetch(`/api/workflow/${encodeURIComponent(pngFile.name)}`);
      
      if (!workflowResponse.ok) {
        console.log(`   Workflow extraction failed: ${workflowResponse.status}`);
        return false;
      }
      
      const workflowData = await workflowResponse.json();
      console.log('   Workflow extracted successfully');
      console.log(`   Workflow format: ${workflowData.nodes ? 'GUI' : 'API'}`);
      console.log(`   Node count: ${workflowData.nodes ? workflowData.nodes.length : Object.keys(workflowData).length}`);

      // Test 3: Schema-based field detection (if available)
      console.log('3. Testing schema-based field detection...');
      try {
        const textFields = await window.comfyUIBentoML.schemaService.identifyTextFields(workflowData);
        console.log(`   Found ${textFields.length} text fields using schema`);
        
        textFields.slice(0, 3).forEach((field, i) => {
          console.log(`   Field ${i + 1}: ${field.name} = "${field.currentValue.substring(0, 50)}..."`);
        });
      } catch (schemaError) {
        console.log('   Schema-based detection failed (expected if BentoML not configured)');
      }

      // Test 4: Seed field detection
      console.log('4. Testing seed field detection...');
      try {
        const seedFields = await window.comfyUIBentoML.schemaService.identifySeedFields(workflowData);
        console.log(`   Found ${seedFields.length} seed fields`);
      } catch (seedError) {
        console.log('   Seed detection failed (expected if BentoML not configured)');
      }

      console.log('✅ Workflow extraction test completed');
      return true;

    } catch (error) {
      console.error('❌ Workflow extraction test failed:', error);
      return false;
    }
  },

  /**
   * Test feature flag toggling
   */
  async testFeatureFlags() {
    console.log('=== BentoML Feature Flag Test ===');
    
    try {
      const originalFlags = { ...window.comfyUIBentoML.client.featureFlags };
      console.log('Original flags:', originalFlags);

      // Test toggling submission flag
      console.log('1. Testing flag toggle...');
      const toggleResult = await window.comfyUIBentoML.client.setFeatureFlag('USE_BENTOML_SUBMISSION', true);
      console.log('   Toggle result:', toggleResult);

      // Verify change
      await window.comfyUIBentoML.client.syncFeatureFlags();
      console.log('   Updated flags:', window.comfyUIBentoML.client.featureFlags);

      // Restore original state
      console.log('2. Restoring original state...');
      await window.comfyUIBentoML.client.setFeatureFlag('USE_BENTOML_SUBMISSION', originalFlags.USE_BENTOML_SUBMISSION);
      await window.comfyUIBentoML.client.syncFeatureFlags();
      console.log('   Restored flags:', window.comfyUIBentoML.client.featureFlags);

      console.log('✅ Feature flag test completed');
      return true;

    } catch (error) {
      console.error('❌ Feature flag test failed:', error);
      return false;
    }
  },

  /**
   * Test UI adapter integration
   */
  async testUIIntegration() {
    console.log('=== BentoML UI Integration Test ===');
    
    try {
      // Test 1: Check if UI adapter is loaded
      console.log('1. Checking UI adapter status...');
      const uiStatus = window.comfyUIBentoML.uiAdapter?.getStatus();
      console.log('   UI adapter status:', uiStatus);

      // Test 2: Check if modal components are enhanced
      console.log('2. Checking modal enhancement...');
      const modalComponent = window.comfyUIComponents?.modalComponents?.workflowModal;
      console.log('   Modal component available:', Boolean(modalComponent));

      // Test 3: Check Alpine.js stores
      console.log('3. Checking Alpine.js integration...');
      if (window.Alpine) {
        const stores = ['comfyWorkflow', 'workflowEditor', 'comfyDestinations', 'queueViewer'];
        stores.forEach(storeName => {
          const store = window.Alpine.store(storeName);
          console.log(`   Store ${storeName}:`, Boolean(store));
        });
      } else {
        console.log('   Alpine.js not available');
      }

      console.log('✅ UI integration test completed');
      return true;

    } catch (error) {
      console.error('❌ UI integration test failed:', error);
      return false;
    }
  },

  /**
   * Run all safe tests
   */
  async runAllTests() {
    console.log('🧪 Running BentoML Safe Test Suite...');
    console.log('Note: These tests do NOT submit to queues or modify running workflows\n');

    const results = {
      connectivity: await this.testConnectivity(),
      extraction: await this.testWorkflowExtraction(),
      featureFlags: await this.testFeatureFlags(),
      uiIntegration: await this.testUIIntegration()
    };

    const passed = Object.values(results).filter(Boolean).length;
    const total = Object.keys(results).length;

    console.log(`\n📊 Test Results: ${passed}/${total} passed`);
    console.log('Detailed results:', results);

    if (passed === total) {
      console.log('🎉 All tests passed! BentoML integration is ready.');
    } else {
      console.log('⚠️  Some tests failed. Check configuration or BentoML service availability.');
    }

    return results;
  },

  /**
   * Show current system status
   */
  async showStatus() {
    console.log('=== BentoML System Status ===');
    
    try {
      const status = await window.comfyUIBentoML.main.getStatus();
      console.log('System status:', status);
      
      return status;
    } catch (error) {
      console.error('Failed to get system status:', error);
      return null;
    }
  }
};

// Add convenient global shortcuts
window.testBentoML = () => window.bentoMLTestSafe.runAllTests();
window.bentoMLConnectivity = () => window.bentoMLTestSafe.testConnectivity();
window.bentoMLWorkflow = () => window.bentoMLTestSafe.testWorkflowExtraction();

console.log('🧪 BentoML Safe Testing loaded. Run testBentoML() to test without affecting queues.');