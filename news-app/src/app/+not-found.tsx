import { ErrorView } from '@/components/ErrorView';
import { Page } from '@/components/Page';

// まちがったリンクを開いたとき。開発者向けの英語の画面やサイトマップは出さない
export default function NotFound() {
  return (
    <Page>
      <ErrorView title="common.notFound" sub="common.notFoundSub" />
    </Page>
  );
}
