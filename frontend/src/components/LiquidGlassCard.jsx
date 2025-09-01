import React, { forwardRef, cloneElement } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '@/lib/utils';

/**
 * A wrapper that provides a ref to its child and injects an `isInsideGlass`
 * prop when the liquid glass theme is active. This allows the child component
 * to adapt its style (e.g., become transparent) without this component
 * needing to know about its internal structure.
 */
const LiquidGlassCard = forwardRef(({ children, className, style }, ref) => {
  const { isLiquidGlass } = useTheme();

  // We need to pass the ref to the actual child element for Masonry to measure it.
  // We also inject a prop to let the child know it should be transparent.
  const childWithProps = cloneElement(children, {
    ref,
    isInsideGlass: isLiquidGlass,
  });

  return (
    <div className={cn('relative', className)} style={style}>
      {childWithProps}
    </div>
  );
});

LiquidGlassCard.displayName = 'LiquidGlassCard';

export default LiquidGlassCard;

