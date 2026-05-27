const { spawn } = require('child_process');
const path = require('path');

// Configuration
const BACKEND_DIR = 'C:\\dev-services\\EPACK-DETAILING-TOOL-master\\EPACK-DETAILING-TOOL-master\\epack_backend';
const PYTHON_EXECUTABLE = path.join(BACKEND_DIR, 'env', 'Scripts', 'python.exe');
const APP_SCRIPT = 'app.py';

// Start the Python process without window
const pythonProcess = spawn(PYTHON_EXECUTABLE, [APP_SCRIPT], {
  cwd: BACKEND_DIR,
  detached: false,
  windowsHide: true,  // This hides the window on Windows
  stdio: ['ignore', 'pipe', 'pipe']
});

// Handle stdout
pythonProcess.stdout.on('data', (data) => {
  console.log(`${data}`);
});

// Handle stderr
pythonProcess.stderr.on('data', (data) => {
  console.error(`${data}`);
});

// Handle process exit
pythonProcess.on('exit', (code) => {
  console.log(`Python process exited with code ${code}`);
  process.exit(code);
});

// Handle errors
pythonProcess.on('error', (err) => {
  console.error('Failed to start Python process:', err);
  process.exit(1);
});

// Handle Node.js process termination
process.on('SIGINT', () => {
  pythonProcess.kill();
  process.exit();
});

process.on('SIGTERM', () => {
  pythonProcess.kill();
  process.exit();
});

console.log('Flask backend started successfully (hidden)');
console.log(`Working directory: ${BACKEND_DIR}`);