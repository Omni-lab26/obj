// npm run live — `expo start`, plus: every 20 seconds, pull whatever was
// pushed to this branch. Metro sees the changed files and Expo Go refreshes on
// its own (or shake → Reload). When dependencies change, it runs npm install
// and restarts Expo for you.
import { execSync, spawn } from 'node:child_process';

const EVERY = 20_000;
const sh = (cmd) => execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const say = (msg) => console.log(`\x1b[36m[live]\x1b[0m ${msg}`);
const args = process.argv.slice(2); // e.g. npm run live -- --tunnel

let expo = null;
function startExpo() {
  expo = spawn('npx', ['expo', 'start', ...args], { stdio: 'inherit', shell: process.platform === 'win32' });
  expo.on('exit', (code, signal) => { if (!signal && code !== null) process.exit(code); });
}
function stopExpo() {
  return new Promise((done) => {
    if (!expo || expo.exitCode !== null) return done();
    expo.removeAllListeners('exit');
    expo.once('exit', () => done());
    expo.kill('SIGINT');
  });
}

let upstream;
try {
  upstream = sh('git rev-parse --abbrev-ref --symbolic-full-name @{u}');
} catch {
  upstream = `origin/${sh('git rev-parse --abbrev-ref HEAD')}`;
}
const [remote, ...rest] = upstream.split('/');
const branch = rest.join('/');

let busy = false;
async function pull() {
  if (busy) return;
  busy = true;
  try {
    sh(`git fetch --quiet ${remote} ${branch}`);
    const behind = Number(sh(`git rev-list --count HEAD..${upstream}`));
    if (!behind) return;
    const before = sh('git rev-parse HEAD');
    try {
      sh(`git merge --ff-only --quiet ${upstream}`);
    } catch {
      say(`新しい変更が ${behind} 件ありますが、このフォルダに手元の変更があるので取り込めませんでした（git status で確認してください）`);
      return;
    }
    const files = sh(`git diff --name-only ${before} HEAD -- .`).split('\n').filter(Boolean);
    say(`最新を取り込みました（${behind} 件）。Expo Go に反映されます`);
    if (files.some((f) => /(^|\/)(package(-lock)?\.json|app\.json)$/.test(f))) {
      say('パッケージか設定が変わったので、npm install して Expo を立ち上げ直します');
      await stopExpo();
      execSync('npm install', { stdio: 'inherit' });
      startExpo();
      say('立ち上げ直しました。Expo Go でもう一度開いてください（QRコードは同じです）');
    }
  } catch (e) {
    say(`取り込みに失敗しました（次の回にもう一度試します）: ${String(e.message).split('\n')[0]}`);
  } finally {
    busy = false;
  }
}

say(`${upstream} を ${EVERY / 1000} 秒ごとに確認します`);
startExpo();
pull();
setInterval(pull, EVERY);
process.on('SIGINT', async () => { await stopExpo(); process.exit(0); });
