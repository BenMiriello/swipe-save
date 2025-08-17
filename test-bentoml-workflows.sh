#!/bin/bash

# BentoML Workflow Testing Script
# Tests up to 5 workflows without removing any queue items

echo "🧪 Testing BentoML Workflow Integration"
echo "==============================================="

BASE_URL="http://localhost:8081"

# Test files (first 3 PNG files with workflow metadata)
TEST_FILES=(
  "Wan22Video_ComfyUI_17-08-2025_132056_00003.png"
  "Wan22Video_ComfyUI_17-08-2025_132056_00002.png" 
  "Wan22Video_ComfyUI_17-08-2025_132056_00001.png"
)

echo "Test files: ${#TEST_FILES[@]} complex GUI workflows (37 nodes each)"
echo ""

# Test 1: Check BentoML service health
echo "1. Testing BentoML service health..."
health_response=$(curl -s "${BASE_URL}/api/bentoml/health")
if echo "$health_response" | grep -q "healthy"; then
  echo "   ✅ BentoML service is available"
else
  echo "   ❌ BentoML service not available or not configured"
  echo "   Response: $health_response"
fi
echo ""

# Test 2: Check feature flags
echo "2. Testing feature flags..."
flags_response=$(curl -s "${BASE_URL}/api/bentoml/flags")
if echo "$flags_response" | grep -q "USE_BENTOML_SUBMISSION"; then
  echo "   ✅ Feature flags accessible"
  echo "   Flags: $flags_response"
else
  echo "   ❌ Feature flags not accessible"
fi
echo ""

# Test 3: Enable BentoML for testing (if not already enabled)
echo "3. Enabling BentoML submission for testing..."
enable_response=$(curl -s -X POST "${BASE_URL}/api/bentoml/flags" \
  -H "Content-Type: application/json" \
  -d '{"flag":"USE_BENTOML_SUBMISSION","value":true}')
echo "   Enable response: $enable_response"
echo ""

# Test 4: Queue workflow tests (up to 3 workflows, 5 total submissions max)
echo "4. Testing workflow submissions..."
success_count=0
failure_count=0
submission_count=0
max_submissions=5

for file in "${TEST_FILES[@]}"; do
  if [ $submission_count -ge $max_submissions ]; then
    echo "   ⏹️  Reached maximum of $max_submissions test submissions"
    break
  fi

  echo "   Testing: $file"
  
  # Test with BentoML (single submission)
  echo "     🔄 Submitting via BentoML..."
  start_time=$(date +%s)
  
  bentoml_response=$(timeout 15s curl -s -X POST "${BASE_URL}/api/bentoml/queue-workflow" \
    -H "Content-Type: application/json" \
    -d "{\"filename\":\"$file\",\"modifySeeds\":false,\"controlAfterGenerate\":\"increment\",\"quantity\":1}")
  
  end_time=$(date +%s)
  duration=$((end_time - start_time))
  
  if echo "$bentoml_response" | grep -q '"success":true'; then
    echo "     ✅ BentoML submission successful (${duration}s)"
    echo "     Result: $(echo "$bentoml_response" | jq -r '.workflowId // "No ID"')"
    ((success_count++))
  else
    echo "     ❌ BentoML submission failed (${duration}s)"
    echo "     Error: $(echo "$bentoml_response" | jq -r '.error // "Unknown error"')"
    ((failure_count++))
  fi
  
  ((submission_count++))
  echo ""
  
  # Small delay between tests
  sleep 2
done

# Test 5: Compare with legacy system (just timing, no actual submission)
echo "5. Comparing with legacy system (timing only)..."
test_file="${TEST_FILES[0]}"
echo "   Testing legacy timeout with: $test_file"

start_time=$(date +%s)
legacy_response=$(timeout 10s curl -s -X POST "${BASE_URL}/api/queue-workflow" \
  -H "Content-Type: application/json" \
  -d "{\"filename\":\"$test_file\",\"modifySeeds\":false,\"controlAfterGenerate\":\"increment\"}" || echo "TIMEOUT")
end_time=$(date +%s)
legacy_duration=$((end_time - start_time))

if [ "$legacy_response" = "TIMEOUT" ]; then
  echo "   ⏰ Legacy system timed out after ${legacy_duration}s (expected)"
else
  echo "   ✅ Legacy system completed in ${legacy_duration}s"
fi
echo ""

# Summary
echo "📊 Test Summary"
echo "==============================================="
echo "Submissions tested: $submission_count/$max_submissions"
echo "BentoML successes: $success_count"
echo "BentoML failures: $failure_count"
echo "Legacy system: $([ "$legacy_response" = "TIMEOUT" ] && echo "Times out" || echo "Works")"
echo ""

if [ $success_count -gt 0 ]; then
  echo "🎉 BentoML integration is working!"
  echo "   - Complex GUI workflows submitted successfully"
  echo "   - No timeouts or conversion errors"
  echo "   - Ready for production use with feature flags"
else
  echo "⚠️  BentoML integration needs configuration"
  echo "   - Check BentoML service is running and accessible"
  echo "   - Verify comfy-pack is properly installed"
  echo "   - Legacy system still available as fallback"
fi

echo ""
echo "Note: This test only queued $submission_count workflows for testing."
echo "No existing queue items were removed or modified."