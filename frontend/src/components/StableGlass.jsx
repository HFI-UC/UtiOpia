import React from 'react';

/**
 * StableGlass: A CSS-only, layout-safe glass wrapper.
 * Avoids extra overlay siblings and complex transforms so Masonry stays stable.
 */
export default function StableGlass({ children, className = '', overLight = false, style = {}, radius = 20 }) {
  return (
    <div
      className={`stable-glass ${overLight ? 'stable-glass-overlight' : ''} rounded-2xl ${className}`}
      style={{ ...style, ['--glass-radius']: `${radius}px` }}
    >
      {children}
    </div>
  );
}
