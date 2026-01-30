import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";

/**
 * Hidden WebView that runs NSFWJS in a browser context.
 *
 * Usage:
 * <NSFWScannerWebView ref={scannerRef} />
 * await scannerRef.current.scanBase64(base64String)
 *
 * Notes:
 * - This keeps ML off the Flask backend.
 * - We "fail closed" by default: if scanning fails, caller can block the upload.
 */

const NSFW_HTML = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>NSFW Scanner</title>
  </head>
  <body>
    <script>
      (function () {
        // Post helper
        function post(obj) {
          try {
            window.ReactNativeWebView.postMessage(JSON.stringify(obj));
          } catch (e) {}
        }

        // Load external scripts (from CDN) inside WebView
        function loadScript(src) {
          return new Promise(function(resolve, reject) {
            var s = document.createElement('script');
            s.src = src;
            s.async = true;
            s.onload = resolve;
            s.onerror = function() { reject(new Error('Failed to load ' + src)); };
            document.head.appendChild(s);
          });
        }

        var model = null;
        var isLoading = false;

        async function ensureModel() {
          if (model) return model;
          if (isLoading) {
            // crude wait loop
            while (isLoading) {
              await new Promise(r => setTimeout(r, 100));
            }
            if (model) return model;
          }
          isLoading = true;
          try {
            // Use CDN builds to avoid bundling issues
            await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js');
            try {
              await loadScript('https://cdn.jsdelivr.net/npm/nsfwjs@4.2.1/dist/nsfwjs.min.js');
            } catch (e) {
              // Fallback CDN if jsDelivr is blocked on the device/network
              await loadScript('https://unpkg.com/nsfwjs@4.2.1/dist/nsfwjs.min.js');
            }
            await tf.ready();
            model = await nsfwjs.load('https://nsfwjs.com/model/', { size: 299 });
            post({ type: 'READY' });
            return model;
          } finally {
            isLoading = false;
          }
        }

        function computeNsfwScore(predictions) {
          var score = 0;
          for (var i = 0; i < predictions.length; i++) {
            var p = predictions[i];
            if (p.className === 'Porn' || p.className === 'Hentai' || p.className === 'Sexy') {
              score += p.probability;
            }
          }
          return score;
        }

        async function scanBase64(base64, requestId, threshold) {
          try {
            var t = typeof threshold === 'number' ? threshold : 0.5;
            await ensureModel();
            var img = new Image();
            img.crossOrigin = 'anonymous';
            var src = 'data:image/jpeg;base64,' + base64;
            await new Promise(function(resolve, reject) {
              img.onload = resolve;
              img.onerror = function() { reject(new Error('Image decode failed')); };
              img.src = src;
            });
            var preds = await model.classify(img);
            var nsfwScore = computeNsfwScore(preds);
            var isNSFW = nsfwScore >= t;
            post({ type: 'RESULT', requestId: requestId, isNSFW: isNSFW, nsfwScore: nsfwScore, threshold: t, predictions: preds });
          } catch (e) {
            post({ type: 'ERROR', requestId: requestId, message: String(e && e.message ? e.message : e) });
          }
        }

        // React Native -> WebView messages
        document.addEventListener('message', function(event) {
          try {
            var msg = JSON.parse(event.data);
            if (!msg || !msg.type) return;
            if (msg.type === 'SCAN_BASE64') {
              scanBase64(msg.base64, msg.requestId, msg.threshold);
            } else if (msg.type === 'PING') {
              post({ type: 'PONG' });
            }
          } catch (e) {
            post({ type: 'ERROR', requestId: null, message: 'Bad message' });
          }
        });

        // RN Android uses window as well
        window.addEventListener('message', function(event) {
          try {
            var msg = JSON.parse(event.data);
            if (!msg || !msg.type) return;
            if (msg.type === 'SCAN_BASE64') {
              scanBase64(msg.base64, msg.requestId, msg.threshold);
            } else if (msg.type === 'PING') {
              post({ type: 'PONG' });
            }
          } catch (e) {
            post({ type: 'ERROR', requestId: null, message: 'Bad message' });
          }
        });

        // Preload model ASAP
        ensureModel().catch(function(err) {
          post({ type: 'ERROR', requestId: null, message: String(err && err.message ? err.message : err) });
        });
      })();
    </script>
  </body>
</html>`;

function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

export const NSFWScannerWebView = React.forwardRef(function NSFWScannerWebView(
  { threshold = 0.5, onReady, style },
  ref
) {
  const webviewRef = useRef(null);
  const pendingRef = useRef(new Map()); // requestId -> {resolve,reject,timeout}

  const requestId = useMemo(() => {
    let n = 0;
    return () => {
      n += 1;
      return String(Date.now()) + "_" + String(n);
    };
  }, []);

  const cleanup = useCallback((id) => {
    const entry = pendingRef.current.get(id);
    if (entry?.timeout) clearTimeout(entry.timeout);
    pendingRef.current.delete(id);
  }, []);

  const scanBase64 = useCallback(
    (base64, opts = {}) =>
      new Promise((resolve, reject) => {
        const id = requestId();
        const t = typeof opts.threshold === "number" ? opts.threshold : threshold;
        const timeoutMs = opts.timeoutMs ?? 15000;

        const timeout = setTimeout(() => {
          cleanup(id);
          reject(new Error("NSFW scan timed out"));
        }, timeoutMs);

        pendingRef.current.set(id, { resolve, reject, timeout });

        const payload = JSON.stringify({
          type: "SCAN_BASE64",
          requestId: id,
          base64,
          threshold: t,
        });

        // Use postMessage when possible
        webviewRef.current?.postMessage(payload);
      }),
    [cleanup, requestId, threshold]
  );

  React.useImperativeHandle(ref, () => ({ scanBase64 }), [scanBase64]);

  useEffect(() => {
    return () => {
      // cleanup all pending
      for (const [id, entry] of pendingRef.current.entries()) {
        if (entry?.timeout) clearTimeout(entry.timeout);
        entry?.reject?.(new Error("Scanner unmounted"));
        pendingRef.current.delete(id);
      }
    };
  }, []);

  const onMessage = useCallback(
    (event) => {
      const data = safeJsonParse(event.nativeEvent.data);
      if (!data || !data.type) return;

      if (data.type === "READY") {
        onReady?.();
        return;
      }

      if (data.type === "RESULT") {
        const { requestId: id } = data;
        const entry = pendingRef.current.get(id);
        if (!entry) return;
        cleanup(id);
        entry.resolve(data);
        return;
      }

      if (data.type === "ERROR") {
        const id = data.requestId;
        if (id) {
          const entry = pendingRef.current.get(id);
          if (!entry) return;
          cleanup(id);
          entry.reject(new Error(data.message || "NSFW scan failed"));
        }
      }
    },
    [cleanup, onReady]
  );

  return (
    <View
      style={[
        { width: 0, height: 0, opacity: 0, position: "absolute", left: -9999, top: -9999 },
        style,
      ]}
      pointerEvents="none"
    >
      <WebView
        ref={webviewRef}
        originWhitelist={["*"]}
        source={{ html: NSFW_HTML }}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        cacheEnabled
        allowsInlineMediaPlayback
      />
    </View>
  );
});

