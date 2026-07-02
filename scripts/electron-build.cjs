const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.join(__dirname, '..');
const outputRoot = path.join(projectRoot, 'release-electron-rolefix');
const unpackedDir = path.join(outputRoot, 'win-unpacked');
const appDir = path.join(unpackedDir, 'resources', 'app');
const electronDist = path.join(projectRoot, 'node_modules', 'electron', 'dist');
const rceditBin = path.join(projectRoot, 'node_modules', 'electron-winstaller', 'vendor', 'rcedit.exe');
const electronBuilderBin = process.platform === 'win32'
  ? path.join(projectRoot, 'node_modules', '.bin', 'electron-builder.cmd')
  : path.join(projectRoot, 'node_modules', '.bin', 'electron-builder');

function removeInsideProject(target) {
  const resolvedProject = fs.realpathSync(projectRoot);

  if (!fs.existsSync(target)) {
    return;
  }

  const resolvedTarget = fs.realpathSync(target);

  if (!resolvedTarget.toLowerCase().startsWith(resolvedProject.toLowerCase())) {
    throw new Error(`Refusing to remove path outside project: ${resolvedTarget}`);
  }

  fs.rmSync(resolvedTarget, { recursive: true, force: true });
}

function copyRequiredAppFiles() {
  fs.cpSync(path.join(projectRoot, 'dist'), path.join(appDir, 'dist'), { recursive: true });
  fs.cpSync(path.join(projectRoot, 'electron'), path.join(appDir, 'electron'), { recursive: true });
  fs.mkdirSync(path.join(appDir, 'assets'), { recursive: true });
  fs.copyFileSync(path.join(projectRoot, 'assets', 'icon.png'), path.join(appDir, 'assets', 'icon.png'));
  fs.copyFileSync(path.join(projectRoot, 'assets', 'icon.ico'), path.join(appDir, 'assets', 'icon.ico'));

  fs.writeFileSync(
    path.join(appDir, 'package.json'),
    JSON.stringify({
      name: 'imonpro',
      version: '0.0.0',
      main: 'electron/main.cjs',
      private: true
    }, null, 2)
  );
}

function patchWindowsExecutable(exePath) {
  if (process.platform !== 'win32' || !fs.existsSync(rceditBin)) {
    return;
  }

  const result = spawnSync(rceditBin, [
    exePath,
    '--set-icon',
    path.join(projectRoot, 'assets', 'icon.ico'),
    '--set-version-string',
    'FileDescription',
    'Imon PRO',
    '--set-version-string',
    'ProductName',
    'Imon PRO'
  ], {
    cwd: projectRoot,
    stdio: 'inherit'
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`rcedit failed with exit code ${result.status}`);
  }
}

removeInsideProject(outputRoot);
fs.mkdirSync(unpackedDir, { recursive: true });
fs.cpSync(electronDist, unpackedDir, { recursive: true });

const electronExe = path.join(unpackedDir, 'electron.exe');
const appExe = path.join(unpackedDir, 'Imon PRO.exe');

if (fs.existsSync(electronExe)) {
  fs.renameSync(electronExe, appExe);
}

patchWindowsExecutable(appExe);

fs.mkdirSync(appDir, { recursive: true });
copyRequiredAppFiles();

const result = spawnSync(electronBuilderBin, [
  '--win',
  '--x64',
  '--prepackaged',
  path.relative(projectRoot, unpackedDir),
  '--config.directories.output=release-electron-rolefix'
], {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 0);

