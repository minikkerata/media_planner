import React from 'react';

/**
 * Highlights matches of a query string inside a text block.
 * Supports cycling active matches with custom styling.
 */
export const highlightText = (text, query, activeIndex = -1, matchCounterRef = { current: 0 }) => {
  if (!query || !query.trim() || !text) return text;
  
  const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, i) => {
    if (part.toLowerCase() === query.toLowerCase()) {
      const isCurrentActive = matchCounterRef.current === activeIndex;
      matchCounterRef.current++;
      return (
        <mark 
          key={i} 
          data-active-match={isCurrentActive ? "true" : "false"}
          className={`rounded-sm px-[1.5px] py-[0.5px] transition-all duration-150 ${
            isCurrentActive 
              ? 'bg-amber-500/35 text-amber-100 border-b-2 border-amber-500 font-semibold shadow-sm' 
              : 'bg-yellow-500/15 text-yellow-200/90 border-b border-yellow-500/30'
          }`}
        >
          {part}
        </mark>
      );
    }
    return part;
  });
};
