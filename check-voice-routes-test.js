const fs = require('fs');
const path = require('path');

// Path to the test file
const testFilePath = path.join(__dirname, '__tests__/integration/voice-routes.test.js');

// Read the test file
const testContent = fs.readFileSync(testFilePath, 'utf8');
console.log('Voice Routes Test Content:');
console.log(testContent);

// Now check the actual implementation
const routesFilePath = path.join(__dirname, 'routes/voice-routes.js');
if (fs.existsSync(routesFilePath)) {
  const routesContent = fs.readFileSync(routesFilePath, 'utf8');
  console.log('\nVoice Routes Implementation:');
  console.log(routesContent);
}
