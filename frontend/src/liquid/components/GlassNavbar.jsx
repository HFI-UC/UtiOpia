import React from 'react';
import GlassWrapper from '@/components/GlassWrapper';
import { Link } from 'react-router-dom';

const GlassNavbar = () => {
	return (
		<div className="sticky top-0 z-50 py-2">
			<GlassWrapper overLight className="block">
				<div className="flex items-center justify-between px-4 py-2">
					<Link to="/" className="font-semibold">UtiOpia</Link>
					<div className="flex items-center gap-4 text-sm">
						<Link to="/write">写纸条</Link>
						<Link to="/search">搜索</Link>
					</div>
				</div>
			</GlassWrapper>
		</div>
	);
};

export default GlassNavbar;
