import React from 'react';
import GlassWrapper from '@/components/GlassWrapper';
import Search from '@/pages/Search';

const GlassSearch = () => {
  return (
    <div className="max-w-5xl mx-auto px-2 md:px-0">
      <GlassWrapper>
        <div className="rounded-2xl overflow-hidden">
          <Search />
        </div>
      </GlassWrapper>
    </div>
  );
};

export default GlassSearch;
