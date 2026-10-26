import { useEffect, useRef } from 'react';

import type { SceneViewProps } from './SceneView';

type AmbientWindow = Window & { __ambient?: { pause(): void; resume(): void } };

/** Web stand-in for the WebView: the same page in an iframe, same messages. */
export function SceneView({ scene, paused, onReady, onTouch }: SceneViewProps) {
  const ref = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== ref.current?.contentWindow) return;
      if (e.data?.type === 'ready') onReady();
      else if (e.data?.type === 'touch') onTouch();
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onReady, onTouch]);

  useEffect(() => {
    const win = ref.current?.contentWindow as AmbientWindow | null | undefined;
    win?.__ambient?.[paused ? 'pause' : 'resume']();
  }, [paused]);

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
