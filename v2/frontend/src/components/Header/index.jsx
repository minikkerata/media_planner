import React from 'react';
import SelectionToolbar from './SelectionToolbar';
import NavigationToolbar from './NavigationToolbar';
import GridSizeControl from './GridSizeControl';
import ShutdownControl from './ShutdownControl';
import SortControls from '../SortControls';
import { Eye, EyeOff, Check } from 'lucide-react';
import SelectDropdown from '../ui/SelectDropdown';
import { getShortcutString } from '../../utils/shortcutUtils';
import { t } from '../../utils/translations';

export { getShortcutString };

export default function Header(props) {
  const {
    selectionMode, selectedPaths, exitSelectionMode, selectAll, clearSelection,
    copyCurrentNote, setShowSettingsModal, handleShutdown, videos,
    gridSize, setGridSize,
    showUnsharedOnly, setShowUnsharedOnly, getVisibleVideos,
    enterSelectionMode, keybindings,
    sortOption, setSortOption, sortDirection, setSortDirection,
    uiStyle, onOpenSearch, language,
    isSidebarCollapsed, setIsSidebarCollapsed, isServerHealthy
  } = props;

  return (
    <header className="flex flex-col bg-surface px-4 py-2.5 z-10 shrink-0">
      {selectionMode ? (
        <SelectionToolbar 
          selectedPaths={selectedPaths} exitSelectionMode={exitSelectionMode} selectAll={selectAll}
          clearSelection={clearSelection} copyCurrentNote={copyCurrentNote} 
          setShowSettingsModal={setShowSettingsModal} handleShutdown={handleShutdown}
          keybindings={keybindings}
          uiStyle={uiStyle}
          language={language}
        />
      ) : (
        <div className="flex items-center justify-between h-[38px] w-full">
          <NavigationToolbar 
            videos={videos} 
            enterSelectionMode={enterSelectionMode}
            visibleVideosCount={getVisibleVideos().length}
            onOpenSearch={onOpenSearch}
            language={language}
            isSidebarCollapsed={isSidebarCollapsed}
            onOpenSidebar={() => setIsSidebarCollapsed(false)}
          />

          {/* Sağ Kısım */}
          <div className="flex items-center gap-2 shrink-0">
            <SelectDropdown
              value={showUnsharedOnly}
              onChange={setShowUnsharedOnly}
              options={[
                { value: 'all', label: t('filter_all', language), icon: Eye },
                { value: 'shared', label: t('filter_completed', language), icon: Check },
                { value: 'unshared', label: t('filter_incomplete', language), icon: EyeOff },
                { value: 'hidden', label: 'Gizliler', icon: EyeOff },
              ]}
            />
            <SortControls 
              sortOption={sortOption} setSortOption={setSortOption} 
              sortDirection={sortDirection} setSortDirection={setSortDirection} 
              language={language}
            />

            <div className="h-5 w-[1px] bg-muted/15" />

            <GridSizeControl 
              gridSize={gridSize}
              setGridSize={setGridSize}
              uiStyle={uiStyle}
              language={language}
            />

            <div className="h-5 w-[1px] bg-muted/15" />

            <ShutdownControl 
              handleShutdown={handleShutdown}
              uiStyle={uiStyle}
              language={language}
              isServerHealthy={isServerHealthy}
            />
          </div>
        </div>
      )}
    </header>
  );
}

