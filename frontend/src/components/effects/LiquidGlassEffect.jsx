import React from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

/**
 * Renders the LiquidGlass visual effect as an absolutely positioned background layer.
 * This component is designed to not interfere with layout calculations.
 */
const LiquidGlassEffect = ({
  className,
  blurAmount = 20,
  saturation = 1.4,
  overLight,
  ...props
}) => {
  const { isLiquidGlass, resolvedTheme } = useTheme();

  if (!isLiquidGlass) return null;

  // 纯 CSS 的 iOS 毛玻璃与柔和渐变高光层，作为原液态玻璃的替代方案
  // - 使用 backdrop-blur + 背景透明度模拟玻璃
  // - 使用轻微的渐变与高光层模拟折射感
  const isLight = (overLight ?? resolvedTheme === 'light');

  return (
    <div
      className={cn(
        "absolute inset-0 -z-10 rounded-2xl overflow-hidden",
        className
      )}
      {...props}
    >
      <div
        className={cn('w-full h-full')}
        style={{
          backgroundColor: isLight ? 'rgba(255,255,255,0.55)' : 'rgba(15,23,42,0.45)',
          backdropFilter: `blur(${blurAmount}px) saturate(${saturation})`,
          WebkitBackdropFilter: `blur(${blurAmount}px) saturate(${saturation})`,
        }}
      />

      {/* 高光/渐变叠加层，模拟 iOS 光泽感 */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background: isLight
            ? 'radial-gradient(100% 60% at 10% 0%, rgba(255,255,255,0.35), transparent 60%), radial-gradient(120% 70% at 90% -10%, rgba(255,255,255,0.25), transparent 60%)'
            : 'radial-gradient(100% 60% at 10% 0%, rgba(255,255,255,0.10), transparent 60%), radial-gradient(120% 70% at 90% -10%, rgba(255,255,255,0.08), transparent 60%)',
          mixBlendMode: 'overlay'
        }}
      />

      {/* 细边框与内阴影，让玻璃更“立体” */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        aria-hidden
        style={{
          boxShadow: isLight
            ? 'inset 0 0 0 1px rgba(255,255,255,0.5), inset 0 1px 6px rgba(255,255,255,0.28)'
            : 'inset 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 6px rgba(255,255,255,0.06)'
        }}
      />
    </div>
  );
};

LiquidGlassEffect.propTypes = {
  className: PropTypes.string,
  blurAmount: PropTypes.number, // 单位：px
  saturation: PropTypes.number, // 倍率，如 1.4
  overLight: PropTypes.bool,
};

export default LiquidGlassEffect;
