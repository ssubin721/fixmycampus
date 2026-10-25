const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Booting server.js for end-to-end testing...');
const server = spawn('node', ['server.js'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit'
});

setTimeout(() => {
  console.log('\n🏃 Running verify_app.js...');
  const tests = spawn('node', ['tests/verify_app.js'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
  });

  tests.on('exit', (code) => {
    console.log(`\n🏁 Test runner exited with code ${code}`);
    server.kill('SIGTERM');
    process.exit(code);
  });
}, 2500);
