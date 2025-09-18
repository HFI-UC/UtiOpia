import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '../contexts/ThemeContext';
import StableGlass from './StableGlass';

/**
 * Wraps its children in a LiquidGlass component when the current theme is
 * 'ios-glass'（iOS 毛玻璃模式）。当其他主题
 * active the children are rendered directly without any wrapper to avoid
 * unnecessary DOM nesting.
 *
 * This implementation uses an absolute positioning strategy to avoid layout
 * conflicts. The children are rendered normally to define the container's
 * size, while the LiquidGlass component is positioned absolutely behind them,
 * acting as a visual background. This ensures that complex parent layouts
 * (like CSS Grid Masonry) can correctly measure the component's dimensions.
 */
const GlassWrapper = ({
  children,
  overLight = false,
  className = '',
  surfaceClassName = '',
  style,
  tone = 'default',
  radius,
}) => {
  const { isLiquidGlass } = useTheme();
  const containerRef = useRef(null);

  if (isLiquidGlass) {
    return (
      <div ref={containerRef} className={`glass-wrapper ${className}`} style={style}>
        <StableGlass
          overLight={overLight}
          className={surfaceClassName}
          radius={radius}
          tone={tone}
        >
          {children}
        </StableGlass>
      </div>
    );
  }

  return <>{children}</>;
};

export default GlassWrapper;

GlassWrapper.propTypes = {
  children: PropTypes.node,
  overLight: PropTypes.bool,
  className: PropTypes.string,
  surfaceClassName: PropTypes.string,
  style: PropTypes.object,
  tone: PropTypes.string,
  radius: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};
