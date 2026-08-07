import React, { useState, useRef } from 'react';

export default function MiniSelectionPlayer({ video, API_URL }) {
  const [isHovering, setIsHovering] = useState(false);
  const hoverVideoRef = useRef(null);

  return (
    <div 
      className="w-full h-auto min-w-0 min-h-0 isolate relative aspect-[9/16] rounded-md overflow-hidden bg-black/40 border border-muted/10 group/thumb cursor-pointer transition-all hover:border-accent/40 z-10"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <img
        src={`${API_URL}/api/thumbnail?path=${encodeURIComponent(video.path)}`}
        alt=""
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-150 z-10 ${isHovering ? 'opacity-0' : 'opacity-100'}`}
      />
      {isHovering && (
        <video
          ref={hoverVideoRef}
          src={`${API_URL}/api/video?path=${encodeURIComponent(video.path)}`}
          autoPlay
          loop
          muted
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover z-0"
        />
      )}
      {video.shared && (
        <div className="absolute inset-0 bg-success/15 pointer-events-none z-15 rounded-md transition-all duration-150" />
      )}
      <span className="absolute bottom-1 left-1 px-1 rounded-sm bg-black/60 text-[8px] font-bold text-white uppercase z-20 pointer-events-none">
        {video.extension.replace('.', '')}
      </span>
    </div>
  );
}
