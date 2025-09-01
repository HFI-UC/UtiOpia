import React from 'react';
import GlassWrapper from '@/components/GlassWrapper';
import { useTheme } from '@/contexts/ThemeContext';

const LiquidApp = ({ children }) => {
	const { isLiquidGlass } = useTheme();
	return (
		<div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-200/40 via-purple-200/30 to-pink-200/30 dark:from-blue-900/30 dark:via-purple-900/20 dark:to-pink-900/20 p-4">
			<div className="max-w-6xl mx-auto">
				{isLiquidGlass ? (
					<GlassWrapper>
						<div className="rounded-2xl overflow-hidden">
							{children}
						</div>
					</GlassWrapper>
				) : (
					<div className="rounded-2xl overflow-hidden">
						{children}
					</div>
				)}
			</div>
		</div>
	);
};

export default LiquidApp;
