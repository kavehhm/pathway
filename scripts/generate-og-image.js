// Simple script to open the OG image template in your default browser
// You can then take a screenshot at 1200x630 resolution

const { exec } = require('child_process');
const path = require('path');

const templatePath = path.join(__dirname, '../public/og-image-template.html');

console.log('📸 Opening OG image template...');
console.log('');
console.log('Instructions:');
console.log('1. Set your browser window to 1200x630 pixels');
console.log('2. Take a screenshot');
console.log('3. Save as public/og-image.png');
console.log('');

// Open in default browser (works on Mac, Windows, Linux)
const command = process.platform === 'darwin' 
  ? `open "${templatePath}"`
  : process.platform === 'win32'
  ? `start "${templatePath}"`
  : `xdg-open "${templatePath}"`;

exec(command, (error) => {
  if (error) {
    console.error('Error opening template:', error);
    console.log('\nManually open:', templatePath);
  }
});

