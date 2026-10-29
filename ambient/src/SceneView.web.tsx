import { useEffect, useRef } from 'react';

import type { SceneViewProps } from './SceneView';

type AmbientWindow = Window & {
  __ambient?: { pause(): void; resume(): void; setDigital(v: number): void };
};

/** Web stand-in for the WebView: the same page in an iframe, same messages. */
export function SceneView({ scene, paused, digital, onReady, onTouch, onLongPress, onTone }: SceneViewProps) {
  const ref = useRef<HTMLIFrameElement>(null);
  const latest = useRef({ paused, digital });
  useEffect(() => {
    latest.current = { paused, digital };
  });

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== ref.current?.contentWindow) return;
      const type = e.data?.type;
      if (type === 'ready') {
        // The page may have started before our settings reached it.
        const win = ref.current?.contentWindow as AmbientWindow | null | undefined;
        win?.__ambient?.setDigital(latest.current.digital);
        if (latest.current.paused) win?.__ambient?.pause();
        onReady();
      } else if (type === 'touch') onTouch();
      else if (type === 'longpress') onLongPress();
      else if (type === 'tone' && (e.data.tone === 'dark' || e.data.tone === 'light')) onTone?.(e.data.tone);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onReady, onTouch, onLongPress, onTone]);

  useEffect(() => {
    const win = ref.current?.contentWindow as AmbientWindow | null | undefined;
    win?.__ambient?.[paused ? 'pause' : 'resume']();
  }, [paused]);

  useEffect(() => {
    const win = ref.current?.contentWindow as AmbientWindow | null | undefined;
    win?.__ambient?.setDigital(digital);
  }, [digital]);

  return (
    <iframe
      ref={ref}
      title={scene.title}
      srcDoc={scene.html}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        border: 0,
        background: scene.background,
      }}
    />
  );
}
