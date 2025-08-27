/**
 * Script to initialize MSW service worker
 * Run this after installing dependencies: node scripts/init-msw.js
 */

const { execSync } = require('child_process');
const path = require('path');

try {
  console.log('Initializing MSW service worker...');
  
  // Run the MSW init command
  execSync('npx msw init public/ --save', { 
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..')
  });
  
  console.log('✅ MSW service worker initialized successfully!');
  console.log('');
  console.log('To enable mocking in development:');
  console.log('1. Copy .env.example to .env.local');
  console.log('2. Set VITE_ENABLE_MOCKING=true in .env.local');
  console.log('3. Start the development server with npm run dev');
  
} catch (error) {
  console.error('❌ Failed to initialize MSW service worker:', error.message);
  process.exit(1);
}
