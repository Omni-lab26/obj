// 見本の画像の出入り口。画像がない環境（リポジトリをそのまま取ってきたときなど）では undefined を返し、
// 画面は文字組みのサムネで代わりに表示する。
import { refImages } from './refImages.generated';

export const refImage = (key: string | undefined): number | undefined => (key ? refImages[key] : undefined);
