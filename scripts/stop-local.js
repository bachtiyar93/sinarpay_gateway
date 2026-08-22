const { execSync, spawn } = require('child_process');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

function commandExists(command) {
  try {
    execSync(`${command} --version`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || repoRoot,
      stdio: 'inherit',
      shell: true,
    });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
    child.on('error', reject);
  });
}

(async () => {
  console.log('[STOP] Stopping backend + frontend processes...');

  const candidateCommands = ['pkill', 'taskkill'];
  const pkill = candidateCommands.find((cmd) => commandExists(cmd));

  if (pkill === 'pkill') {
    try {
      execSync("pkill -f \"next dev\" || true", { stdio: 'inherit', cwd: repoRoot });
      execSync("pkill -f \"nest start --watch\" || true", { stdio: 'inherit', cwd: repoRoot });
      execSync("pkill -f \"node .*apps/frontend\" || true", { stdio: 'inherit', cwd: repoRoot });
      execSync("pkill -f \"node .*apps/backend\" || true", { stdio: 'inherit', cwd: repoRoot });
    } catch {
      // ignore
    }
  } else if (pkill === 'taskkill') {
    try {
      execSync('taskkill /F /IM node.exe /T', { stdio: 'inherit', cwd: repoRoot });
    } catch {
      // ignore
    }
  }

  if (commandExists('docker')) {
    try {
      console.log('[STOP] Stopping PostgreSQL + Redis containers...');
      await run('docker', ['compose', 'down', '--remove-orphans'], { cwd: repoRoot });
    } catch (error) {
      console.warn('Docker tidak aktif atau tidak bisa shutdown.');
    }
  }

  console.log('Semua service telah dimatikan.');
})();
