import { useState } from 'react';

export function useSorting(initialOption = 'date', initialDirection = 'desc') {
  const [sortOption, setSortOption] = useState(() =>
    localStorage.getItem('sort_option') || initialOption
  );
  const [sortDirection, setSortDirection] = useState(() =>
    localStorage.getItem('sort_direction') || initialDirection
  );

  const handleSetSortOption = (val) => {
    setSortOption(val);
    localStorage.setItem('sort_option', val);
  };

  const handleSetSortDirection = (val) => {
    setSortDirection(val);
    localStorage.setItem('sort_direction', val);
  };

  const sortVideos = (videosArray) => {
    // Avoid mutating the original array directly if it's passed as reference
    const visible = [...videosArray];
    visible.sort((a, b) => {
      // Group shared items at the bottom always
      if (a.shared !== b.shared) {
        return a.shared ? 1 : -1;
      }
      
      let cmp = 0;
      if (sortOption === 'date') {
        cmp = (a.time || 0) - (b.time || 0);
      } else if (sortOption === 'edited') {
        const valA = a.updated_at || (a.time ? a.time * 1000 : 0);
        const valB = b.updated_at || (b.time ? b.time * 1000 : 0);
        cmp = valA - valB;
      } else if (sortOption === 'name') {
        cmp = a.name.localeCompare(b.name, undefined, {numeric: true});
      } else if (sortOption === 'size') {
        cmp = (a.size || 0) - (b.size || 0);
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return visible;
  };

  return {
    sortOption,
    setSortOption: handleSetSortOption,
    sortDirection,
    setSortDirection: handleSetSortDirection,
    sortVideos
  };
}
