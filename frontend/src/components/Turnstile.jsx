import { useEffect, useRef } from 'react';

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let turnstileScriptPromise = null;

function loadTurnstileScriptOnce() {
  if (typeof window !== 'undefined' && window.turnstile) {
    return Promise.resolve();
  }
  if (turnstileScriptPromise) {
    return turnstileScriptPromise;
  }
  turnstileScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-turnstile]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Turnstile script failed to load')));
      return;
    }
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.setAttribute('data-turnstile', 'true');
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Turnstile script failed to load'));
    document.head.appendChild(script);
  });
  return turnstileScriptPromise;
}

const Turnstile = ({ onVerified }) => {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

  useEffect(() => {
    let isUnmounted = false;

    async function renderTurnstile() {
      if (!containerRef.current) return;
      containerRef.current.innerHTML = '';

      if (!siteKey) {
        containerRef.current.innerHTML = '<div class="text-sm text-red-600">未配置 Turnstile Site Key（VITE_TURNSTILE_SITE_KEY）。</div>';
        return;
      }

      try {
        await loadTurnstileScriptOnce();
        if (isUnmounted) return;
        if (!window.turnstile) throw new Error('Turnstile global not available after script load');

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: 'light',
          size: 'normal',
          callback: (token) => {
            onVerified?.(token);
          },
          'error-callback': () => {
            onVerified?.('');
          },
          'expired-callback': () => {
            onVerified?.('');
            if (widgetIdRef.current && window.turnstile) {
              window.turnstile.reset(widgetIdRef.current);
            }
          },
        });
      } catch (error) {
        if (containerRef.current) {
          containerRef.current.innerHTML = '<div class="text-sm text-red-600">Turnstile 加载失败，请稍后重试。</div>';
        }
      }
    }

    renderTurnstile();

    return () => {
      isUnmounted = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (_) {}
      }
    };
  }, [siteKey, onVerified]);

  return <div ref={containerRef} className="turnstile-container" />;
};

export default Turnstile;

