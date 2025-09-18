import React from 'react';
import GlassWrapper from '@/components/GlassWrapper';
import { useTheme } from '@/contexts/ThemeContext';

const SIZE_CLASS = {
  sm: 'min-h-[2.25rem] px-4 text-sm',
  md: 'min-h-[2.5rem] px-5 text-sm',
  lg: 'min-h-[2.75rem] px-6 text-base',
};

const GlassButton = ({
  children,
  onClick,
  className = '',
  tone = 'primary',
  size = 'md',
  type = 'button',
  wrapperClassName = '',
  ...props
}) => {
  const { isLiquidGlass } = useTheme();
  const sizeClasses = SIZE_CLASS[size] || SIZE_CLASS.md;
  const baseClasses = [
    'relative inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-wide',
    sizeClasses,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (!isLiquidGlass) {
    return (
      <button
        type={type}
        onClick={onClick}
        className={`glass-button-plain ${baseClasses}`.trim()}
        {...props}
      >
        {children}
      </button>
    );
  }

  return (
    <GlassWrapper
      overLight
      className={`glass-button-wrapper inline-flex ${wrapperClassName}`.trim()}
      surfaceClassName="glass-button-surface inline-flex"
      tone={tone}
      radius={999}
    >
      <button
        type={type}
        onClick={onClick}
        className={`glass-button ${baseClasses}`.trim()}
        data-glass-tone={tone}
        {...props}
      >
        {children}
      </button>
    </GlassWrapper>
  );
};

export default GlassButton;
