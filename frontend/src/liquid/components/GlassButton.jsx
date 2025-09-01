import React from 'react';
import GlassWrapper from '@/components/GlassWrapper';

const GlassButton = ({ children, onClick, className = '' }) => {
	return (
		<GlassWrapper overLight className={className}>
			<button onClick={onClick} className="px-4 py-2 text-sm">
				{children}
			</button>
		</GlassWrapper>
	);
};

export default GlassButton;
