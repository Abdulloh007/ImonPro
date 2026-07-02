const { spawn } = require('node:child_process');
const path = require('node:path');

const projectRoot = path.join(__dirname, '..');
const viteBin = process.platform === 'win32'
  ? path.join(projectRoot, 'node_modules', '.bin', 'vite.cmd')
  : path.join(projectRoot, 'node_modules', '.bin', 'vite');
const electronBin = process.platform === 'win32'
  ? path.join(projectRoot, 'node_modules', '.bin', 'electron.cmd')
  : path.join(projectRoot, 'node_modules', '.bin', 'electron');

const vite = spawn(viteBin, ['--host', '127.0.0.1'], {
  cwd: projectRoot,
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: process.platform === 'win32'
});

let electronStarted = false;
let electronProcess;

function startElectron() {
  if (electronStarted) {
    return;
  }

  electronStarted = true;
  const electronEnv = {
    ...process.env,
    ELECTRON_RENDERER_URL: 'http://127.0.0.1:5173'
  };
  delete electronEnv.ELECTRON_RUN_AS_NODE;

  electronProcess = spawn(electronBin, ['.'], {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: electronEnv
  });

  electronProcess.on('exit', (code) => {
    vite.kill();
    process.exit(code ?? 0);
  });
}

vite.stdout.on('data', (chunk) => {
  const text = chunk.toString();
  process.stdout.write(text);

  if (text.includes('Local:') || text.includes('ready in')) {
    startElectron();
  }
});

vite.stderr.on('data', (chunk) => {
  process.stderr.write(chunk);
});

vite.on('exit', (code) => {
  if (electronProcess && !electronProcess.killed) {
    electronProcess.kill();
  }
  process.exit(code ?? 0);
});

process.on('SIGINT', () => {
  if (electronProcess && !electronProcess.killed) {
    electronProcess.kill();
  }
  vite.kill();
});
