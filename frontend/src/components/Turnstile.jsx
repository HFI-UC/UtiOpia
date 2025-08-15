import { useEffect, useRef } from 'react';

const Turnstile = ({ onVerified }) => {
  const containerRef = useRef(null);
  const widgetId = useRef(null);

  useEffect(() => {
    // 模拟Turnstile验证组件
    // 在实际项目中，这里应该加载Cloudflare Turnstile脚本
    const mockVerification = () => {
      setTimeout(() => {
        // 模拟验证成功，返回一个假的token
        const mockToken = 'mock-turnstile-token-' + Date.now();
        onVerified?.(mockToken);
      }, 1000);
    };

    if (containerRef.current) {
      // 创建一个模拟的验证界面
      containerRef.current.innerHTML = `
        <div class="flex items-center justify-center p-4 border border-gray-300 rounded-lg bg-gray-50">
          <div class="flex items-center space-x-2">
            <div class="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span class="text-sm text-gray-600">安全验证中...</span>
          </div>
        </div>
      `;
      
      mockVerification();
    }

    return () => {
      // 清理
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
      }
    };
  }, [onVerified]);

  return <div ref={containerRef} className="turnstile-container" />;
};

export default Turnstile;

