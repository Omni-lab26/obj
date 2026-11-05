// データの出入り口。画面はここだけを通す（CLAUDE.md）。
// いまはデモデータ（demo.json）を返す。Supabase につないだら、同じ関数の中身を差し替える。
import { useSyncExternalStore } from 'react';

import demo from './demo.json';
import type { Article, Comment, Genre, Notice, Room, UserPost } from './types';

const articles = demo.articles as unknown as Article[];
const posts = demo.posts as unknown as UserPost[];
const rooms = demo.rooms as unknown as Room[];
const notices = demo.notifications as unknown as Notice[];
const genres = demo.genres as unknown as Genre[];
const roles = demo.roles as Record<string, string>;
const bios = demo.bios as Record<string, string>;
const faces = demo.faces as Record<string, number>;

// ---- 変わる値（保存・コメント・投票）は小さな入れ物に入れ、変わったら画面に知らせる
type State = {
  saved: Set<string>;
  votes: Record<string, number>;
  discussions: Record<string, Comment[]>;
  liked: Set<number>;
};
let cid = 1000;
const C = (who: string, t: string, up: number, min: number, kids: Comment[] = []): Comment => ({
  id: ++cid,
  who,
  t,
  up,
  min,
  kids,
});
const state: State = {
  saved: new Set(['boj']),
  votes: {},
  discussions: JSON.parse(JSON.stringify(demo.discussions)) as Record<string, Comment[]>,
  liked: new Set(),
};
let version = 0;
const listeners = new Set<() => void>();
const emit = () => {
  version++;
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
/** データが変わったら描き直すための印 */
export const useDataVersion = () =>
  useSyncExternalStore(
    subscribe,
    () => version,
    () => version
  );

// ---- 読む
export const getFeed = (): Article[] => articles;
export const getArticle = (id: string): Article | undefined => articles.find((a) => a.id === id);
export const getRelated = (id: string, n = 4): Article[] =>
  articles.filter((a) => a.id !== id && a.type !== 'note').slice(0, n);
export const getPosts = (): UserPost[] => posts;
export const getRooms = (): Room[] => rooms;
export const getNotices = (): Notice[] => notices;
export const getGenres = (): Genre[] => genres;
export const roleOf = (who: string): string => roles[who] ?? '';
export const bioOf = (who: string): string => bios[who] ?? '';
/** 人のアイコン（見本の画像の名前）。ないときは undefined */
export const faceOf = (who: string): string | undefined => (faces[who] ? `sq${faces[who]}` : undefined);

export const getComments = (id: string): Comment[] =>
  state.discussions[id] ??
  (state.discussions[id] = [
    C('k.mori', 'ここは素直に織り込み済みだと思う。', 14, 30, [C('s.tanaka', '同意。ただ債券の反応は鈍い', 5, 20)]),
    C('Mia Chen', 'Interesting read. Volumes were light though.', 8, 44),
    C('y.okada', '個人的には来週のデータが本番', 3, 60),
  ]);

export const isSaved = (id: string) => state.saved.has(id);
export const voteOf = (pollId: string): number | undefined => state.votes[pollId];
export const isLiked = (commentId: number) => state.liked.has(commentId);

// ---- 書く
export const toggleSave = (id: string): boolean => {
  if (state.saved.has(id)) state.saved.delete(id);
  else state.saved.add(id);
  emit();
  return state.saved.has(id);
};
export const vote = (pollId: string, i: number) => {
  state.votes[pollId] = i;
  emit();
};
export const toggleLike = (commentId: number) => {
  if (state.liked.has(commentId)) state.liked.delete(commentId);
  else state.liked.add(commentId);
  emit();
};
export const addComment = (id: string, text: string): Comment => {
  const c = C('あなた', text, 0, 0);
  getComments(id).unshift(c);
  emit();
  return c;
};
