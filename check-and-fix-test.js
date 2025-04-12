const fs = require('fs');
const path = require('path');

// Path to the test file
const testFilePath = path.join(__dirname, '__tests__/unit/utils/database-utils.test.js');

// Read the file content
let content = fs.readFileSync(testFilePath, 'utf8');

// Check for missing semicolons in describe/test blocks
// Common syntax error: lines ending with }) instead of });
content = content.replace(/\}\)/g, '});');

// Also check for any missing closing brackets
const openBrackets = (content.match(/\{/g) || []).length;
const closeBrackets = (content.match(/\}/g) || []).length;

if (openBrackets > closeBrackets) {
  console.log(`Warning: Found ${openBrackets} opening brackets but only ${closeBrackets} closing brackets`);
}

// Fix specific error at line 558: }) should be });
const lines = content.split('\n');
if (lines[557] && lines[557].trim() === '})') {
  lines[557] = '});';
  content = lines.join('\n');
  console.log('Fixed missing semicolon at line 558');
}

// Write the fixed content back to the file
fs.writeFileSync(testFilePath, content);
console.log(`Updated ${testFilePath}`);

// Output the few lines around line 559 to verify
const range = 5;
const start = Math.max(557 - range, 0);
const end = Math.min(557 + range, lines.length - 1);
console.log(`\nLines ${start+1}-${end+1}:`);
for (let i = start; i <= end; i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
