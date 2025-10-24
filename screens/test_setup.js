// Test Setup - Verify all services work correctly
console.log('🧪 Testing backend integration setup...');

// Test 1: Check if services can be imported
try {
  const simpleService = require('../services/simpleServiceNode');
  console.log('✅ SimpleService imported successfully');
  
  // Test 2: Check if service can be initialized
  simpleService.init().then(() => {
    console.log('✅ SimpleService initialized successfully');
    
    // Test 3: Check basic operations
    const status = simpleService.getStatus();
    console.log('📊 Service status:', status);
    
    // Test 4: Test profile operations
    simpleService.updateProfile({
      first_name: 'Test',
      last_name: 'User',
      age: 25,
      location: 'Test City',
      bio: 'This is a test profile'
    }).then(result => {
      console.log('✅ Profile update test:', result);
      
      // Test 5: Test profile retrieval
      simpleService.getProfile().then(profile => {
        console.log('✅ Profile retrieval test:', profile);
        console.log('🎉 All tests passed! Your backend integration is ready.');
      }).catch(error => {
        console.error('❌ Profile retrieval test failed:', error);
      });
    }).catch(error => {
      console.error('❌ Profile update test failed:', error);
    });
    
  }).catch(error => {
    console.error('❌ SimpleService initialization failed:', error);
  });
  
} catch (error) {
  console.error('❌ Failed to import SimpleService:', error);
}

console.log('🏁 Test setup complete. Check the results above.');