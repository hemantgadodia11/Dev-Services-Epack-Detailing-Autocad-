const { spawn } = require('child_process');
const path = require('path');

const FRONTEND_DIR = 'C:\\dev-services\\EPACK-DETAILING-TOOL-master\\EPACK-DETAILING-TOOL-master\\epack_frontend';
console.log('Starting Next.js frontend...');
console.log(`Working directory: ${FRONTEND_DIR}`);





// Start npm run dev
const npmProcess = spawn('cmd', ['/c', 'npm', 'run', 'dev'], {
  cwd: FRONTEND_DIR,
  stdio: 'inherit',
  shell: false,
  windowsHide: true
});

// Handle process exit
npmProcess.on('exit', (code) => {
  console.log(`Frontend process exited with code ${code}`);
  process.exit(code);
});

// Handle errors
npmProcess.on('error', (err) => {
  console.error('Failed to start frontend process:', err);
  process.exit(1);
});

// Keep the Node.js process running
process.on('SIGINT', () => {
  npmProcess.kill();
  process.exit();
});

process.on('SIGTERM', () => {
  npmProcess.kill();
  process.exit();
});