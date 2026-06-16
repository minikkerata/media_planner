import { useState } from 'react';

export function useSorting(initialOption = 'date', initialDirection = 'desc') {
  const [sortOption, setSortOption] = useState(initialOption);
  const [sortDirection, setSortDirection] = useState(initialDirection);

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
    setSortOption,
    sortDirection,
    setSortDirection,
    sortVideos
  };
}
