import React from 'react';
import GlassWrapper from '@/components/GlassWrapper';
import Write from '@/pages/Write';

const GlassWrite = () => {
  return (
    <div className="max-w-5xl mx-auto px-2 md:px-0">
      <GlassWrapper>
        <div className="rounded-2xl overflow-hidden">
          <Write />
        </div>
      </GlassWrapper>
    </div>
  );
};

export default GlassWrite;
