// 見本の画像（オーナーの参考画像の切り抜き）を、アプリから読めるようにする対応表を作る。
//
//   node scripts/gen-ref-images.mjs
//
// - 画像は assets/ref/ に置く（sq1.jpg … sq11.jpg、th1.jpg … th11.jpg、chart1〜3.jpg など）
// - 第三者の作品なので、リポジトリ（公開）には入れない。assets/ref/ と生成物は .gitignore 済み
// - 画像がないときは空の表を作り、アプリは文字組みのサムネで表示する
// - npm install のあと（postinstall）と、npm start / verify の前に自動で動く
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const DIR = resolve(ROOT, 'assets/ref');
const OUT = resolve(ROOT, 'src/lib/data/refImages.generated.ts');

const files = existsSync(DIR)
  ? readdirSync(DIR)
      .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
      .sort()
  : [];

const lines = files.map((f) => `  '${f.replace(/\.\w+$/, '')}': require('../../../assets/ref/${f}'),`);
const body = `// 自動で作るファイル（scripts/gen-ref-images.mjs）。手で直さない。リポジトリに入れない。
export const refImages: Record<string, number> = {
${lines.join('\n')}
};
`;
mkdirSync(resolve(ROOT, 'src/lib/data'), { recursive: true });
writeFileSync(OUT, body);
console.log(
  `見本の画像：${files.length} 枚（${files.length ? 'assets/ref/' : '画像なし。文字組みのサムネで表示します'}）`
);
