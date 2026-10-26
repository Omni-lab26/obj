import { useEffect, useRef, type ComponentType, type Ref } from 'react';
import { StyleSheet } from 'react-native';
import { WebView as RNWebView, type WebViewMessageEvent, type WebViewProps } from 'react-native-webview';

import type { Scene } from './scenes';

// The package types its class as Component<WebViewProps & undefined>, which
// collapses to `never` under current TypeScript; re-type it with what we use.
type WebViewHandle = { injectJavaScript: (script: string) => void };
const WebView = RNWebView as unknown as ComponentType<WebViewProps & { ref?: Ref<WebViewHandle> }>;

export type SceneViewProps = {
  scene: Scene;
  paused: boolean;
  onReady: () => void;
  onTouch: () => void;
};

/** Runs one scene page full-screen. The page reports 'ready' and 'touch' back. */
export function SceneView({ scene, paused, onReady, onTouch }: SceneViewProps) {
  const ref = useRef<WebViewHandle>(null);

  useEffect(() => {
    ref.current?.injectJavaScript(`window.__ambient && window.__ambient.${paused ? 'pause' : 'resume'}(); true;`);
  }, [paused]);

  const onMessage = (e: WebViewMessageEvent) => {
    let msg: { type?: string };
    try {
      msg = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type === 'ready') onReady();
    else if (msg.type === 'touch') onTouch();
  };

  return (
    <WebView
      ref={ref}
      source={{ html: scene.html }}
      originWhitelist={['*']}
      onMessage={onMessage}
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
