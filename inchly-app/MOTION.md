# 動きのルール（Inchly）

このファイルは、アプリの動きを直すときに AI（Claude など）へそのまま渡すプロンプトであり、守り続けるルールでもあります。
AGENTS.md から参照しています。動きに触れる変更をするときは、毎回ここを先に読むこと。

---

## プロンプト（このまま渡す）

あなたは Inchly（Expo SDK 58・React Native 0.88・react-native-reanimated 4.7・react-native-gesture-handler 3）の動きを、Apple の iOS の動きと同じ質にする担当です。
目的は2つあります。**ふわふわ・ぽよんとした動きを一つ残らずなくすこと**と、**どの操作でもカクつかないこと**です。
見た目の好みで判断せず、以下の決まりに一字一句従ってください。

### 0. 絶対の決まり

1. **跳ねる動きは禁止。** 行きすぎて戻る、揺れる、弾む、ぷるぷるする、伸び縮みをくり返す、は全部だめ。
   - ばねは必ず `dampingRatio: 1`（臨界減衰。行きすぎない）。`dampingRatio < 1`、`damping` / `stiffness` / `mass` を直接書く設定、`overshootClamping` に頼る設定は使わない。
   - 行きすぎるイージング（`ease.spring` = `bezier(0.28, 1.3, …)` のように 1 を超える値を持つもの）は使わない。
   - `ZoomIn` / `ZoomOut` / `BounceIn` などのレイアウトアニメーション、`withSequence` で大きくしてから戻す「ポップ」、UI の部品に付けた `withRepeat` のくり返し（点の明滅、ゆらゆら）は使わない。
   - 例外は iOS が自分で出す動きだけ：スクロールの端での跳ね返り（ScrollView の bounce）と、ネイティブの画面遷移・シート。
2. **Apple の動きをそのまま写す。** 下の「動きの決まり（トークン）」以外の長さや曲線を新しく作らない。
3. **重くしない。** 動きは UI スレッドだけで計算する（Reanimated の shared value と `useAnimatedStyle`）。1フレームごとに React の state を変えない。
4. **全部に当てる。** スタンダードのテーマだけでなく、テーマのアプリ（`src/themes/*`：8bit・かわいい・油絵・ink・riso など）も対象。

### 1. 動きの決まり（トークン）

`src/ui/motion.ts` を1つ作り、アプリの動きはすべてここから取る。ほかのファイルに数字を直接書かない。

注意：Reanimated 4 の `withSpring({ duration, dampingRatio })` の `duration` は「体感の長さ」で、**実際に止まるまでは 1.5 倍**かかる。下の表の「実際」はその値。

| 名前 | 使う場面（iOS での例） | 中身 | 実際の長さ |
|---|---|---|---|
| `M.press` | 押した瞬間に縮む | `withTiming(縮み, { duration: 90, easing: Easing.out(Easing.quad) })` | 0.09秒 |
| `M.release` | 指を離して戻る | `withSpring(1, { duration: 200, dampingRatio: 1 })` | 約0.3秒 |
| `M.micro` | スイッチ、チップの選択、色や透明度の切り替え | `withTiming(x, { duration: 200, easing: IOS })` | 0.2秒 |
| `M.move` | 行やカードが場所を空ける、タブの下の印が動く、指定した位置までスクロール | `withSpring(x, { duration: 250, dampingRatio: 1 })` | 約0.38秒 |
| `M.present` | シート、ダイアログ、タイマーの画面が出る | `withSpring(x, { duration: 330, dampingRatio: 1, velocity })` | 約0.5秒 |
| `M.dismiss` | 閉じる（指で払ったときは、その速さを `velocity` で引き継ぐ） | 払ったとき `withSpring(x, { duration: 280, dampingRatio: 1, velocity })`、ボタンで閉じるとき `withTiming(x, { duration: 280, easing: IOS })` | 約0.28〜0.42秒 |
| `M.fade` | 出る・消える | 透明度だけ。`FadeIn.duration(200)` / `FadeOut.duration(160)` | 0.16〜0.2秒 |

- `IOS = Easing.bezier(0.32, 0.72, 0, 1)`（iOS のシートやキーボードと同じ、速く出てすっと止まる曲線）。行きすぎない曲線はこれ1本に絞る。
- 押したときの縮み：カードや大きいものは 0.98、ボタンは 0.96、小さいアイコンは 0.92。
- 出るときに大きさを変えるなら 0.98 → 1 まで（iOS のアラートと同じくらいの控えめさ）。0.8 から大きくする、1.1 から縮める、はしない。
- 0.6秒を超える動きは作らない（背景の鯉など、ずっと流れている飾りは別）。
- レイアウトアニメーション（`LinearTransition` など）は `LinearTransition.springify().duration(250).dampingRatio(1)` だけを使う。
- 指で動かすもの（タイマーを下に引く、カードを横に送る、シートを下げる）は、指に 1:1 でついてくる。離したら `M.present` / `M.dismiss` を、指の速さ（`velocity`）を引き継いで使う。
- 「視差効果を減らす」がオンのときは、`reduceMotion: ReduceMotion.System` を設定に入れ、動きを透明度の切り替えだけにする。
- 触覚（haptics）は、押した瞬間か止まった瞬間に1回だけ。動きの途中で鳴らさない。

### 2. 重くしない決まり

1. **動かすのは `transform`（translate / scale）と `opacity` だけ。** `width` / `height` / `top` / `left` / `margin` / `padding` / `borderRadius` / 影 を毎フレーム変えると、そのたびにレイアウトの計算が走ってカクつく。
   - 進み具合の線 → `scaleX` と `transformOrigin: 'left'`
   - 横に動く印 → `translateX`
   - 開閉 → `translateY` と、上に重ねたものの `opacity`
2. **React の再描画を最小にする。**
   - 毎秒変わる時間は、それを出す一番小さい部品の中だけで読む。親は再描画させない。
   - ストアからは必要な値だけを取る（`useStore((s) => s.paused)` のように）。オブジェクトや配列をまるごと取らない。
   - `onScroll`・ジェスチャー・フレームのたびに `setState` しない。React に知らせるのは、ページが変わった、離した、などの区切りの瞬間だけ（`scheduleOnRN`）。
3. **レイアウトアニメーション（entering / exiting / layout）は数を絞る。** 画面に同時に出る10個以下のものだけ。スクロールする長い一覧の行には付けない。
4. **ぼかしは動かさない。** BlurView の強さをアニメーションしない。同じ画面にたくさん重ねない。背景（`src/ui/backdrop`）はジェスチャー中に `holdBackdrop()` で描く回数を落とす（今の仕組みを守る）。
5. **長い一覧** は FlatList（行の高さが決まっていれば `getItemLayout`）と `React.memo` を使った行で作る。ScrollView に全部並べない。
6. **画像** は `expo-image` で、表示する大きさを決めて出す。
7. **120Hz（ProMotion）**：iPhone の 120Hz で動かすには、`app.json` の `ios.infoPlist` に `CADisableMinimumFrameDurationOnPhone: true` を入れる。これは Expo Go では効かず、development build と本番で効く。入れてよいかをユーザーに確認してから入れる。

### 3. 進め方

1. `package.json` で react-native-reanimated の版を確かめ、その版のドキュメントで API（`withSpring` の `duration` と `dampingRatio`、`springify().dampingRatio()`、`ReduceMotion`）を確認する。覚えている知識で書かない。
2. `src/ui/motion.ts` を作る（上のトークンと、`press` / `release` / `move` / `present` / `dismiss` / `fade` / `layout` の小さな関数）。`src/theme.ts` の `ease.spring`（行きすぎる曲線）は消し、`ease.ios` は `motion.ts` の `IOS` に寄せる。
3. **全部の置き換え。** 下の一覧を上から順に直す。1ファイル直すたびに `npx tsc --noEmit` を通す。
4. **戻らないように見張りを付ける。**
   - ESLint の `no-restricted-syntax` / `no-restricted-imports` で、`motion.ts` 以外の `withSpring`、`ZoomIn` / `ZoomOut` / `BounceIn*`、`damping:` / `stiffness:` / `mass:` を書けなくする。
   - Jest のテストを1本足す：`src` の中に `dampingRatio: 0.` や `springify()` のあとに `dampingRatio(1)` がない書き方が残っていたら落ちる。
5. **カクつきを測る。**
   - Expo Go の開発モードは JS が遅いので、速さは `npx expo start --no-dev --minify` で開いて確かめる。そのうえで Perf Monitor（端末を振って開くメニュー）で、UI と JS の両方のフレームを見る。
   - 測る操作：タイマーを開く・下に引いて閉じる、カードを横に送る、タブを切り替える、予定を追加のシートを開く・閉じる、ホームをスクロールする、時間のフォントのシートを開く。
   - どれも 60Hz の端末で 58fps を切らないこと。直す前と直した後の数字を README に残す。
   - Web 版（`npx expo export -p web`）でも Playwright で同じ操作をして、フレームの間隔（requestAnimationFrame の差）を前後で比べる。
6. `npx expo lint`・`npx tsc --noEmit`・`npx jest` を全部通してから、README の「動き」の節を書き直し、コミットして push する。

### 4. 今のコードで直すところ（調べた時点：2026-10-28）

- **ばねの直書き**：105か所。行きすぎる設定（`dampingRatio` 0.4〜0.92、`damping` 7〜18）が約20か所。ファイル：
  `src/ui/OrderSheet.tsx`, `Rolling.tsx`, `base.tsx`（押したときの反応）, `Dialog.tsx`, `Toast.tsx`, `ScoreCard.tsx`, `SlideToRecord.tsx`, `PostParts.tsx`, `MeCard.tsx`, `Growth.tsx`, `Sticker.tsx`,
  `src/screens/tabs.tsx`（タブの下の印 `dampingRatio: 0.78`）, `StudyBar.tsx`, `home/HomeScreen.tsx`, `home/Friends.tsx`, `home/standard.tsx`, `timer/standard.tsx`, `timer/cards.tsx`（カードの並び替え `springify().damping(20).stiffness(180)`、カードが消えるときの `ZoomOut`）,
  `src/themes/ink/*`, `oil/*`, `kawaii/*`, `riso/*`
- **行きすぎる曲線**：`src/theme.ts` の `ease.spring`。
- **ポップとくり返し**：`withSequence` が約80か所、`withRepeat` が約30か所（多くはテーマのアプリと、ホームの飾り）。UI の部品に付いているものは全部やめる。
- **レイアウトの値を動かしているところ**：27か所。ファイル：
  `src/ui/Rolling.tsx`, `Tabs.tsx`, `SlideToRecord.tsx`, `HomeParts.tsx`, `RecordsPanel.tsx`, `StackedBars.tsx`, `GroupParts.tsx`, `Growth.tsx`, `Tour.tsx`, `Brand.tsx` ほか。transform に置き換える。
- **毎秒の再描画**：`setInterval` / `useNow(1000)` が8か所。時間を出す一番小さい部品だけが読むようにする。

---

## やったこと（2026-10-28）

上の「直すところ」は全部直した。lint・型チェック・テスト（168件、跳ねる書き方の見張りを含む）が通る。

- `src/ui/motion.ts` に7つの動き。`press` / `release` / `micro` / `move` / `present` / `dismiss` / `timed` と `fadeIn()` / `fadeOut()` / `layout()`。終わったときの `done` と、指の速さ（`velocity`）を受け取り、速さを受け取ったときは行きすぎない（`overshootClamping`）
- ばね約80か所、ポップ・揺れ約50か所、くり返し約35か所をなくし、レイアウトの値を動かしていた約25か所を transform にした
- 指で払う操作（タイマーを下に引く、横のメニュー、友達の行、勉強バー、シート、トースト、カードの横送り）は、指の速さを引き継ぐ
- 指が画面にふれている間と、離して少しのあいだは、鯉の背景を止める（`holdBackdrop`）
- 毎秒の時間は、時間を出す部品だけが読む（`useTicking`。タイマーのカード・勉強バー・横向きの勉強部屋）

残したもの：

- 1回だけの短い明滅（ネオンのグリッチ、8bit の光る枠など。動かない・大きさを変えない・0.3秒以内）
- 8bit・grid の段階的な動き（行きすぎない）、デジタルのテーマの流れる文字（読ませるための一定の速さ）
- 使い方の吹き出しのくり抜き（1回だけ・1つだけなので、位置と大きさを直接動かしている）
- `app.json` の 120Hz の設定（`CADisableMinimumFrameDurationOnPhone`）はまだ入れていない（Expo Go では効かない。development build を作るときに入れる）

測った数字（Web 版・Chromium・393×852。鯉の背景あり。1秒あたりのコマ数。GPU のない環境で背景を描くので、実機より重く出る）：

| 操作 | 直す前 | 直した後 |
|---|---|---|
| ホームをスクロール | 5.6 | 60 |
| タイマーを開く | 5.6 | 47.9 |
| カードを横に送る | 20.5 | 59.7 |
| タイマーを下に引いて閉じる | 9.3 | 48.9 |
| タブを切り替える（2回目以降） | 7.6 | 26 前後 |

背景を「なし」にすると、直す前も後もほぼ 60。タブを初めて開くときだけ、ページを組み立てる重さで止まる（マイページで 0.3 秒ほど）。次に手を入れるならここ。

## 守り続けること（短い版）

- 跳ねない。ばねは `dampingRatio: 1` だけ。長さと曲線は `src/ui/motion.ts` のトークンだけ。
- 動かすのは transform と opacity だけ。
- 毎フレームの `setState` はしない。毎秒の時間は一番小さい部品で読む。
- 速さは開発モードではなく `--no-dev --minify` で測る。
