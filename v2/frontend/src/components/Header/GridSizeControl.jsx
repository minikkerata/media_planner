import React, { useState } from 'react';
import { Square, Grid2X2, Grid3X3, List } from 'lucide-react';
import DropdownMenu from '../ui/DropdownMenu';
import Button from '../ui/Button';
import { t } from '../../utils/translations';

export default function GridSizeControl({ gridSize, setGridSize, language }) {
  const [gridDropdownOpen, setGridDropdownOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="none"
        size="none"
        onClick={() => setGridDropdownOpen(!gridDropdownOpen)}
        tabIndex={-1}
        className="p-1.5 transition cursor-pointer flex items-center justify-center h-8 w-8 text-foreground/80 hover:text-foreground hover:bg-hover rounded-ui-md"
        title={t('view_size_title', language)}
      >
        {gridSize === 'list' ? (
          <List size={16} />
        ) : (gridSize === 320 || gridSize === 400) ? (
          <Square size={16} />
        ) : (gridSize === 220 || gridSize === 200) ? (
          <Grid2X2 size={16} />
        ) : (
          <Grid3X3 size={16} />
        )}
      </Button>
      <DropdownMenu
        isOpen={gridDropdownOpen}
        onClose={() => setGridDropdownOpen(false)}
        className="w-max mt-1 right-0 origin-top-right"
        items={[
          { 
            label: t('large_view', language), 
            icon: Square, 
            selected: gridSize === 320 || gridSize === 400, 
            onClick: () => setGridSize(320) 
          },
          { 
            label: t('medium_view', language), 
            icon: Grid2X2, 
            selected: gridSize === 220 || gridSize === 200, 
            onClick: () => setGridSize(220) 
          },
          { 
            label: t('small_view', language), 
            icon: Grid3X3, 
            selected: gridSize === 150, 
            onClick: () => setGridSize(150) 
          },
          { 
            label: t('list_view', language), 
            icon: List, 
            selected: gridSize === 'list', 
            onClick: () => setGridSize('list') 
          }
        ]}
      />
    </div>
  );
}

