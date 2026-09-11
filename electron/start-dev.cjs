const { spawn } = require('child_process');
const http = require('http');

const devServerUrl = 'http://127.0.0.1:3000';
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const electronCommand = process.platform === 'win32' ? 'electron.cmd' : 'electron';

let viteProcess;
let electronProcess;

function waitForServer(url, attemptsRemaining = 60) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (response) => {
      response.resume();
      resolve();
    });

    request.on('error', () => {
      if (attemptsRemaining <= 1) {
        reject(new Error(`Vite did not start at ${url}`));
        return;
      }

      setTimeout(() => {
        waitForServer(url, attemptsRemaining - 1).then(resolve, reject);
      }, 500);
    });
  });
}

function stopProcesses() {
  if (electronProcess && !electronProcess.killed) {
    electronProcess.kill();
  }

  if (viteProcess && !viteProcess.killed) {
    viteProcess.kill();
  }
}

async function start() {
  viteProcess = spawn(npmCommand, ['run', 'dev'], {
    stdio: 'inherit',
    shell: false,
  });

  viteProcess.on('exit', (code) => {
    if (code !== 0 && electronProcess && !electronProcess.killed) {
      electronProcess.kill();
    }
  });

  await waitForServer(devServerUrl);

  electronProcess = spawn(electronCommand, ['.'], {
    stdio: 'inherit',
    shell: false,
    env: {
      ...process.env,
      VITE_DEV_SERVER_URL: devServerUrl,
    },
  });

  electronProcess.on('exit', (code) => {
    stopProcesses();
    process.exit(code ?? 0);
  });
}

process.on('SIGINT', () => {
  stopProcesses();
  process.exit(0);
});

process.on('SIGTERM', () => {
  stopProcesses();
  process.exit(0);
});

start().catch((error) => {
  console.error(error);
  stopProcesses();
  process.exit(1);
});

