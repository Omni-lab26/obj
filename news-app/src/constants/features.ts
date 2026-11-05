// MVP の外に出した機能は消さずに、ここで隠す（CLAUDE.md）。
export const features = {
  /** 1日4回の定時配信。公開当初は出さない（2026-11-05 決定） */
  scheduledSlots: false,
  /** 個人の投稿のサブスク。後回し（2026-11-05） */
  subscription: false,
  /** 明るい画面。公開時に要るかは未決 */
  lightMode: false,
} as const;
