/// <reference types="jest" />
import { glyphOf } from '../../ui/SubjectGlyph';

describe("a subject's picture", () => {
  it('is found from its name', () => {
    expect(glyphOf('化学')).toBe('flask');
    expect(glyphOf('物理')).toBe('atom');
    expect(glyphOf('生物')).toBe('leaf');
    expect(glyphOf('数III')).toBe('pi');
    expect(glyphOf('英語')).toBe('bubble');
    expect(glyphOf('リスニング')).toBe('headphones');
    expect(glyphOf('古文')).toBe('scroll');
    expect(glyphOf('漢文')).toBe('brush');
    expect(glyphOf('日本史')).toBe('torii');
    expect(glyphOf('世界史')).toBe('temple');
    expect(glyphOf('政治・経済')).toBe('scales');
    expect(glyphOf('情報I')).toBe('laptop');
  });
  it('else from its 教科, else none (its first letter stays)', () => {
    expect(glyphOf('青チャート', 'ma')).toBe('pi');
    expect(glyphOf('ピアノ', 'other')).toBeNull();
    expect(glyphOf('ピアノ')).toBeNull();
  });
});
