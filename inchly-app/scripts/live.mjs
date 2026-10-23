// npm run live — `expo start`, plus: every 20 seconds, pull whatever was
// pushed to this branch. Metro sees the changed files and Expo Go refreshes on
// its own (or shake → Reload). When dependencies change, it runs npm install
// and restarts Expo for you.
import { execSync, spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const EVERY = 20_000;
const sh = (cmd) => execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const say = (msg) => console.log(`\x1b[36m[live]\x1b[0m ${msg}`);
const args = process.argv.slice(2); // e.g. npm run live -- --tunnel

let expo = null;
function startExpo() {
  // Expo's own CLI, run by this node, so stopping it reaches Expo itself (not just npx in front of it)
  let cli = null;
  try { cli = createRequire(import.meta.url).resolve('expo/bin/cli'); } catch { /* not installed yet: npx finds it */ }
  expo = cli
    ? spawn(process.execPath, [cli, 'start', ...args], { stdio: 'inherit' })
    : spawn('npx', ['expo', 'start', ...args], { stdio: 'inherit', shell: process.platform === 'win32' });
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
let stuck = null; // the commit that local changes kept out: said once, and Expo isn't stopped for it again
const blocked = (behind, target) => {
  say(`新しい変更が ${behind} 件ありますが、このフォルダに手元の変更があるので取り込めませんでした（git status で確認してください）`);
  stuck = target;
};
async function pull() {
  if (busy) return;
  busy = true;
  try {
    sh(`git fetch --quiet ${remote} ${branch}`);
    const behind = Number(sh(`git rev-list --count HEAD..${upstream}`));
    if (!behind) return;
    const target = sh(`git rev-parse ${upstream}`);
    if (target === stuck) return;
    // commits made here: it can't simply move forward
    try { sh(`git merge-base --is-ancestor HEAD ${upstream}`); } catch { blocked(behind, target); return; }
    // what's coming in: when packages change, Expo stops before the files arrive, so it never
    // builds code whose packages aren't installed yet
    const files = sh(`git diff --name-only HEAD ${upstream} -- .`).split('\n').filter(Boolean);
    // a file changed here that is also coming in: it can't come in
    const edited = sh('git diff --name-only HEAD').split('\n').filter(Boolean);
    if (files.some((f) => edited.includes(f))) { blocked(behind, target); return; }
    const deps = files.some((f) => /(^|\/)(package(-lock)?\.json|app\.json)$/.test(f));
    if (deps) {
      say('パッケージか設定が変わるので、Expo を止めてから取り込みます');
      await stopExpo();
    }
    try {
      sh(`git merge --ff-only --quiet ${upstream}`);
    } catch {
      blocked(behind, target);
      if (deps) startExpo();
      return;
    }
    stuck = null;
    say(`最新を取り込みました（${behind} 件）。Expo Go に反映されます`);
    if (deps) {
      say('npm install して Expo を立ち上げ直します');
      try {
        execSync('npm install', { stdio: 'inherit' });
      } catch {
        say('npm install に失敗しました。Ctrl+C で止めて、npm install をやり直してから npm run live してください');
      }
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
