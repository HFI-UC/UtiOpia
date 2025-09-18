import React from 'react';

/**
 * StableGlass: A CSS-only, layout-safe glass wrapper.
 * Avoids extra overlay siblings and complex transforms so Masonry stays stable.
 */
export default function StableGlass({
  children,
  className = '',
  overLight = false,
  style = {},
  radius = 20,
  tone = 'default',
}) {
  const resolvedRadius =
    radius === undefined || radius === null
      ? undefined
      : typeof radius === 'number'
        ? `${radius}px`
        : radius;

  const mergedStyle =
    resolvedRadius !== undefined
      ? { ...style, ['--glass-radius']: resolvedRadius }
      : style;

  return (
    <div
      className={`stable-glass ${overLight ? 'stable-glass-overlight' : ''} ${className}`}
      style={mergedStyle}
      data-glass-tone={tone}
    >
      {children}
    </div>
  );
}

