const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const backendEnvPath = path.join(repoRoot, 'apps', 'backend', '.env');
const frontendEnvPath = path.join(repoRoot, 'apps', 'frontend', '.env.local');
const DOCKER_ENGINE_WAIT_SECONDS = 300;

function log(message, color = '\x1b[36m') {
  console.log(`${color}${message}\x1b[0m`);
}

function commandExists(command) {
  try {
    execSync(`${command} --version`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: options.stdio ?? 'inherit',
      shell: true,
      env: { ...process.env, ...options.env },
      cwd: options.cwd || repoRoot,
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
      }
    });

    child.on('error', reject);
  });
}

function ensureEnvFiles() {
  const backendExample = path.join(repoRoot, 'apps', 'backend', '.env.example');
  const frontendExample = path.join(repoRoot, 'apps', 'frontend', '.env.example');

  if (!fs.existsSync(backendEnvPath) && fs.existsSync(backendExample)) {
    fs.copyFileSync(backendExample, backendEnvPath);
    log('Created apps/backend/.env from .env.example');
  }

  if (!fs.existsSync(frontendEnvPath) && fs.existsSync(frontendExample)) {
    fs.copyFileSync(frontendExample, frontendEnvPath);
    log('Created apps/frontend/.env.local from .env.example');
  }
}

function clearPortIfInUse(port) {
  try {
    if (process.platform === 'win32') {
      const output = execSync(
        `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | ForEach-Object { $_.OwningProcess } | Sort-Object -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"`,
        { stdio: 'ignore' },
      );
      return output;
    }

    try {
      execSync(`lsof -ti tcp:${port} | xargs -r kill -9`, { stdio: 'ignore' });
      return;
    } catch {
      execSync(`fuser -k ${port}/tcp`, { stdio: 'ignore' });
    }
  } catch {
    // ignore stale-process cleanup when the port is free or tooling is unavailable
  }
}

async function ensureDependencies() {
  log('[1/5] Checking Node.js and npm...');
  if (!commandExists('node')) {
    throw new Error('Node.js belum terpasang. Install Node.js LTS dari https://nodejs.org/ lalu jalankan ulang.');
  }
  if (!commandExists('npm')) {
    throw new Error('npm belum terpasang. Install Node.js LTS dari https://nodejs.org/ lalu jalankan ulang.');
  }
  log(`Node: ${execSync('node -v', { encoding: 'utf8' }).trim()}`);
  log(`npm: ${execSync('npm -v', { encoding: 'utf8' }).trim()}`);

  log('[2/5] Installing workspace dependencies...');
  await runCommand('npm', ['install']);
}

async function ensureDockerServices() {
  log('[3/5] Checking Docker Compose...');
  const dockerCommands = ['docker', 'docker.exe'];
  const dockerCommand = dockerCommands.find((item) => commandExists(item));

  if (!dockerCommand) {
    throw new Error('Docker belum terpasang. Install Docker Desktop, lalu jalankan kembali: npm run start');
  }

  const waitForDockerEngine = async () => {
    const attempts = Math.floor(DOCKER_ENGINE_WAIT_SECONDS / 5);
    for (let i = 1; i <= attempts; i += 1) {
      try {
        execSync(`${dockerCommand} compose version`, { stdio: 'ignore' });
        return;
      } catch {
        if (i === 1) {
          log('Docker terdeteksi, menunggu engine siap...', '\x1b[33m');
        }
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
    throw new Error(
      `Docker tersedia tapi engine belum siap setelah ${DOCKER_ENGINE_WAIT_SECONDS} detik. Pastikan Docker Desktop status "Engine running", lalu coba lagi.`,
    );
  };

  await waitForDockerEngine();

  log('[4/5] Starting PostgreSQL + Redis...');
  try {
    await runCommand(dockerCommand, ['compose', 'up', '-d', 'postgres', 'redis'], { cwd: repoRoot });
  } catch {
    throw new Error(
      'Gagal menjalankan docker compose. Pastikan Docker Desktop benar-benar running (Engine running), lalu coba lagi. Jika masih gagal, jalankan: docker context ls dan pilih context default/desktop-linux yang aktif.',
    );
  }

  const waitForHealthy = async () => {
    for (let i = 0; i < 30; i += 1) {
      try {
        const output = execSync(`${dockerCommand} compose ps --format json`, {
          cwd: repoRoot,
          encoding: 'utf8',
        });

        const parsed = output
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => JSON.parse(line));

        const services = parsed.filter((service) => ['postgres', 'redis'].includes(service.Service));
        const healthy = services.length === 2 && services.every((service) => service.State === 'running');
        if (healthy) {
          return;
        }
      } catch {
        // retry
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    throw new Error('PostgreSQL atau Redis belum siap setelah menunggu. Cek docker compose logs.');
  };

  await waitForHealthy();

  log('[5/5] Preparing database schema and seeding admin user...');
  await runCommand('npm', ['run', 'db:prepare'], { cwd: repoRoot });
}

async function startApp() {
  log('[START] Membersihkan port yang masih dipakai oleh proses lama...');
  clearPortIfInUse(3000);
  clearPortIfInUse(3001);

  log('\n[START] Backend + frontend akan berjalan bersama...');
  log('Frontend: http://localhost:3001');
  log('Backend docs: http://localhost:3000/api/docs');
  log('Admin login: admin@sinarpay.test / password123');
  log('Tekan Ctrl+C untuk menghentikan semua layanan.\n');

  const child = spawn('npm', ['run', 'dev'], {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: true,
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });

  child.on('error', (error) => {
    console.error(error);
    process.exit(1);
  });
}

(async () => {
  try {
    ensureEnvFiles();
    await ensureDependencies();
    await ensureDockerServices();
    await startApp();
  } catch (error) {
    console.error('\n[ERROR]');
    console.error(error.message);
    process.exit(1);
  }
})();
