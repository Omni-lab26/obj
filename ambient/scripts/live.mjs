// npm run live — the app on your phone in Expo Go, kept up to date.
//
// Brings in the latest of this branch, installs packages when they changed, bundles
// the scenes and starts Expo (scan the QR code with the camera or Expo Go). While it
// runs it keeps an eye on the branch: new commits are pulled in as they arrive and
// the phone reloads by itself (packages changed: reinstalled and Expo restarted).
//
//   npm run live                 same Wi-Fi as the phone (on WSL, through a tunnel)
//   npm run live -- --tunnel     any network, through a tunnel
//   npm run live -- --lan        same Wi-Fi, even on WSL
//   npm run live -- --no-pull    don't follow the branch
//   npm run live -- --clear      clear Metro's cache first
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const win = process.platform === 'win32';
const POLL_MS = 20_000;
// Regenerated from scenes/ on every start: never a reason to hold back a pull.
const GENERATED = join(root, 'src', 'scenes.generated.ts');

const say = (msg) => console.log(`\x1b[36m[live]\x1b[0m ${msg}`);
const warn = (msg) => console.log(`\x1b[33m[live]\x1b[0m ${msg}`);

function run(cmd, cmdArgs, opts = {}) {
  const r = spawnSync(cmd, cmdArgs, { cwd: root, encoding: 'utf8', shell: win, ...opts });
  return { ok: r.status === 0, out: (r.stdout ?? '').trim(), err: (r.stderr ?? '').trim() };
}
const git = (...a) => run('git', a);

// ── checks ──────────────────────────────────────────────────────────────────
const major = Number(process.versions.node.split('.')[0]);
if (major < 22) {
  warn(`Node.js ${process.versions.node} です。22 以上を入れてください（node -v で確認）。`);
  process.exit(1);
}
const isWsl = process.platform === 'linux' && existsSync('/proc/version') && /microsoft/i.test(readFileSync('/proc/version', 'utf8'));
const tunnel = args.has('--tunnel') || (isWsl && !args.has('--lan'));

// ── keeping up with the branch ──────────────────────────────────────────────
const branch = git('rev-parse', '--abbrev-ref', 'HEAD').out;
const follow = !args.has('--no-pull') && branch && branch !== 'HEAD';
let heldBack = false;

/** Fast-forwards to the branch on origin. Returns the files that changed, or null. */
function pull() {
  if (!follow) return null;
  if (!git('fetch', '--quiet', 'origin', branch).ok) return null;
  const head = git('rev-parse', 'HEAD').out;
  const remote = git('rev-parse', `origin/${branch}`).out;
  if (!remote || head === remote) return null;
  if (git('merge-base', '--is-ancestor', head, remote).ok === false) {
    if (!heldBack) warn(`このブランチに手元だけのコミットがあるので、自動の取り込みは止めています（git pull で合わせてください）。`);
    heldBack = true;
    return null;
  }
  const dirty = git('status', '--porcelain', '--untracked-files=no').out.split('\n').filter(Boolean).map((l) => l.slice(3));
  const others = dirty.filter((f) => !f.endsWith('src/scenes.generated.ts'));
  if (others.length) {
    if (!heldBack) warn(`手元に変更があるので、自動の取り込みは止めています: ${others.slice(0, 3).join(', ')}${others.length > 3 ? ' …' : ''}`);
    heldBack = true;
    return null;
  }
  heldBack = false;
  if (dirty.length) git('checkout', '--', GENERATED);
  const merged = git('merge', '--ff-only', '--quiet', `origin/${branch}`);
  if (!merged.ok) {
    warn(`取り込めませんでした: ${merged.err.split('\n')[0]}`);
    return null;
  }
  const subject = git('log', '-1', '--format=%s').out;
  say(`新しい変更を取り込みました: ${subject}`);
  return git('diff', '--name-only', head, 'HEAD').out.split('\n').filter(Boolean);
}

// ── packages and scenes ─────────────────────────────────────────────────────
function needsInstall() {
  const marker = join(root, 'node_modules', '.package-lock.json');
  if (!existsSync(marker)) return true;
  const lock = join(root, 'package-lock.json');
  return existsSync(lock) && statSync(lock).mtimeMs > statSync(marker).mtimeMs;
}
function install() {
  say('パッケージを入れています（npm install）…');
  const r = spawnSync('npm', ['install'], { cwd: root, stdio: 'inherit', shell: win });
  if (r.status !== 0) {
    warn('npm install に失敗しました。上のエラーを確認してください。');
    process.exit(1);
  }
}
function scenes() {
  spawnSync(process.execPath, [join(root, 'scripts', 'build-scenes.mjs')], { cwd: root, stdio: 'inherit' });
}

// ── Expo ────────────────────────────────────────────────────────────────────
let expo = null;
let restarting = false;
function startExpo() {
  const expoArgs = ['expo', 'start', tunnel ? '--tunnel' : '--lan'];
  if (tunnel) expoArgs.push('ngrok');
  if (args.has('--clear')) expoArgs.push('--clear');
  say(
    tunnel
      ? 'トンネル経由で起動します（スマホはどのネットワークからでも OK）。'
      : 'LAN で起動します（スマホを PC と同じ Wi-Fi に）。つながらないときは npm run live -- --tunnel'
  );
  say('QR コードを iPhone はカメラ、Android は Expo Go で読み取ってください。');
  expo = spawn('npx', expoArgs, { cwd: root, stdio: 'inherit', shell: win });
  expo.on('exit', (code) => {
    if (restarting) return;
    process.exit(code ?? 0);
  });
}
function restartExpo() {
  if (!expo) return startExpo();
  restarting = true;
  expo.once('exit', () => {
    restarting = false;
    startExpo();
  });
  expo.kill('SIGINT');
}

// ── go ──────────────────────────────────────────────────────────────────────
if (follow) say(`ブランチ ${branch} を追いかけます（${POLL_MS / 1000} 秒ごとに確認）。`);
pull();
if (needsInstall()) install();
scenes();
startExpo();

if (follow) {
  setInterval(() => {
    const changed = pull();
    if (!changed) return;
    if (changed.some((f) => /(^|\/)package(-lock)?\.json$/.test(f))) {
      install();
      scenes();
      say('パッケージが変わったので Expo を起動し直します。');
      restartExpo();
      return;
    }
    // Metro sees the new files and the phone reloads on its own; scenes are bundled
    // into one generated file, so that is rebuilt when they change.
    if (changed.some((f) => f.includes('ambient/scenes/'))) scenes();
  }, POLL_MS).unref();
}

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    if (expo && !expo.killed) expo.kill(sig);
    process.exit(0);
  });
}
