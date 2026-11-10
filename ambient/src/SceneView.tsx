import { useEffect, useRef, useState, type ComponentType, type Ref } from 'react';
import { StyleSheet } from 'react-native';
import { WebView as RNWebView, type WebViewMessageEvent, type WebViewProps } from 'react-native-webview';

import type { Scene } from './scenes';

// The package types its class as Component<WebViewProps & undefined>, which
// collapses to `never` under current TypeScript; re-type it with what we use.
type WebViewHandle = { injectJavaScript: (script: string) => void; reload: () => void };
const WebView = RNWebView as unknown as ComponentType<WebViewProps & { ref?: Ref<WebViewHandle> }>;

export type SceneViewProps = {
  scene: Scene;
  paused: boolean;
  /** Digital layer amount from settings, 0..1. */
  digital: number;
  onReady: () => void;
  /** A tap on the scene (let go without moving, before it became a long-press). */
  onTap: () => void;
  onLongPress: () => void;
  /** Photo scenes report whether the area behind the clock is light or dark. */
  onTone?: (tone: 'dark' | 'light') => void;
};

/** Runs one scene page full-screen. The page reports 'ready', 'tap' and 'longpress' back. */
export function SceneView({ scene, paused, digital, onReady, onTap, onLongPress, onTone }: SceneViewProps) {
  const ref = useRef<WebViewHandle>(null);
  // Read once: settings at load time; later changes go through injectJavaScript.
  const [initScript] = useState(() => `window.__ambientInit = ${JSON.stringify({ digital })}; true;`);
  // What the page should be doing now, for when it (re)loads: a call made before the
  // page was up found no window.__ambient and was lost.
  const latest = useRef({ paused, digital });
  useEffect(() => {
    latest.current = { paused, digital };
  });

  useEffect(() => {
    ref.current?.injectJavaScript(`window.__ambient && window.__ambient.${paused ? 'pause' : 'resume'}(); true;`);
  }, [paused]);

  useEffect(() => {
    ref.current?.injectJavaScript(`window.__ambient && window.__ambient.setDigital(${digital}); true;`);
  }, [digital]);

  const onMessage = (e: WebViewMessageEvent) => {
    let msg: { type?: string; tone?: 'dark' | 'light' };
    try {
      msg = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type === 'ready') {
      const { paused: p, digital: d } = latest.current;
      ref.current?.injectJavaScript(`window.__ambient && (window.__ambient.setDigital(${d}), window.__ambient.${p ? 'pause' : 'resume'}()); true;`);
      onReady();
    } else if (msg.type === 'tap') onTap();
    else if (msg.type === 'longpress') onLongPress();
    else if (msg.type === 'tone' && msg.tone) onTone?.(msg.tone);
  };

  return (
    <WebView
      ref={ref}
      source={{ html: scene.html }}
      originWhitelist={['*']}
      injectedJavaScriptBeforeContentLoaded={initScript}
      onMessage={onMessage}
      // iOS ends a web page's process now and then (short of memory, or after a long
      // while in the background) and leaves the view blank: load the scene again.
      onContentProcessDidTerminate={() => ref.current?.reload()}
      onRenderProcessGone={() => ref.current?.reload()}
      style={{ backgroundColor: scene.background }}
      containerStyle={[StyleSheet.absoluteFill, { backgroundColor: scene.background }]}
      scrollEnabled={false}
      bounces={false}
      overScrollMode="never"
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="never"
      automaticallyAdjustContentInsets={false}
      allowsLinkPreview={false}
      textInteractionEnabled={false}
      setBuiltInZoomControls={false}
      androidLayerType="hardware"
    />
  );
}
