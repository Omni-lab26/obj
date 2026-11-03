// ビルドの前に、手元が最新でコミット済みかを確かめる。
// Lento で「古いアイコンのまま TestFlight に出た」のを防ぐため。
//
//   node scripts/preflight-build.mjs
//
// 未コミットの変更がある、またはリモートより遅れているときは止まる（終了コード 1）。

import { execSync } from 'node:child_process';

const sh = (cmd) => execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const problems = [];

try {
  sh('git rev-parse --is-inside-work-tree');
} catch {
  console.error('git リポジトリではありません。');
  process.exit(1);
}

const dirty = sh('git status --porcelain');
if (dirty) problems.push(`未コミットの変更があります：\n${dirty}`);

let upstream = '';
try {
  upstream = sh('git rev-parse --abbrev-ref --symbolic-full-name @{u}');
} catch {
  problems.push('リモートの追跡ブランチが設定されていません（git push -u で設定）。');
}

if (upstream) {
  try {
    sh('git fetch --quiet');
    const [behind, ahead] = sh(`git rev-list --left-right --count ${upstream}...HEAD`).split(/\s+/).map(Number);
    if (behind > 0) problems.push(`${upstream} より ${behind} コミット遅れています（git pull が必要）。`);
    if (ahead > 0) console.log(`注意：${upstream} に push していないコミットが ${ahead} 件あります。`);
  } catch {
    console.log('注意：リモートの確認に失敗しました（オフライン？）。');
  }
}

console.log(`ビルドするコミット：${sh('git log -1 --format="%h %s (%cr)"')}`);
console.log(`ブランチ：${sh('git rev-parse --abbrev-ref HEAD')}`);

if (problems.length) {
  console.error('\nビルドを止めました：');
  for (const p of problems) console.error(`- ${p}`);
  process.exit(1);
}
console.log('OK：ビルドしてよい状態です。');
