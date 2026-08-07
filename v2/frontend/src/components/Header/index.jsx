import React from 'react';
import SelectionToolbar from './SelectionToolbar';
import NavigationToolbar from './NavigationToolbar';
import GridSizeControl from './GridSizeControl';

import CalendarHeader from './CalendarHeader';
import SortControls from '../SortControls';
import { Eye, EyeOff, Check, Loader2, X, Plus } from 'lucide-react';
import SelectDropdown from '../ui/SelectDropdown';
import Button from '../ui/Button';
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
    onOpenSearch, language,
    isSidebarCollapsed, setIsSidebarCollapsed, isServerHealthy,

    // Scan & Folder props
    currentFolder, scanFolder,

    // Upload queue props
    uploadStatus, uploadQueue, uploadCurrentIndex, setShowBulkUploadModal,
    activePath,

    // View tab props
    activeViewTab, setActiveViewTab,

    // Calendar props
    calendarDate, setCalendarDate, calendarView, setCalendarView, setCalendarSelectorCell,
    openPublishModalWithTime,
    bufferProfile,
  } = props;

  const renderQueueIndicator = () => {
    if (uploadStatus === 'idle') return null;

    const progressCount = uploadStatus === 'success' ? uploadQueue.length : uploadCurrentIndex;
    const totalCount = uploadQueue.length;

    let btnColor = 'bg-blue-600 hover:bg-blue-500 text-white';
    let labelText = `${progressCount}/${totalCount} Paylaşılıyor`;

    if (uploadStatus === 'error') {
      btnColor = 'bg-danger text-white hover:bg-danger/80';
      labelText = `${progressCount}/${totalCount} Durduruldu`;
    } else if (uploadStatus === 'success') {
      btnColor = 'bg-success text-white hover:bg-success/80';
      labelText = `Paylaşıldı ✓`;
    }

    return (
      <Button
        onClick={() => setShowBulkUploadModal(true)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer ${btnColor}`}
      >
        {uploadStatus === 'publishing' ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : uploadStatus === 'error' ? (
          <X className="w-3.5 h-3.5" />
        ) : (
          <Check className="w-3.5 h-3.5" />
        )}
        <span className="whitespace-nowrap">{labelText}</span>
      </Button>
    );
  };

  return (
    <header className="flex flex-col bg-surface px-4 py-2.5 z-10 shrink-0">
      {selectionMode ? (
        <SelectionToolbar 
          selectedPaths={selectedPaths} exitSelectionMode={exitSelectionMode} selectAll={selectAll}
          clearSelection={clearSelection} copyCurrentNote={copyCurrentNote} 
          setShowSettingsModal={setShowSettingsModal} handleShutdown={handleShutdown}
          keybindings={keybindings}
          language={language}
          uploadStatus={uploadStatus}
          uploadQueue={uploadQueue}
          uploadCurrentIndex={uploadCurrentIndex}
          setShowBulkUploadModal={setShowBulkUploadModal}
        />
      ) : (
        <div className="flex items-center justify-between h-[38px] w-full">

          {/* ── Left side ── */}
          {activeViewTab === 'calendar' ? (
            <CalendarHeader
              currentDate={calendarDate}
              setCurrentDate={setCalendarDate}
              calendarView={calendarView}
              language={language}
              bufferProfile={bufferProfile}
            />
          ) : (
            <NavigationToolbar 
              videos={videos} 
              enterSelectionMode={enterSelectionMode}
              visibleVideosCount={getVisibleVideos().length}
              onOpenSearch={onOpenSearch}
              language={language}
              isSidebarCollapsed={isSidebarCollapsed}
              onOpenSidebar={() => setIsSidebarCollapsed(false)}
              currentFolder={currentFolder}
              scanFolder={scanFolder}
              activePath={activePath}
              activeViewTab={activeViewTab}
            />
          )}

          {/* ── View Tab Switcher (center) ── */}
          {currentFolder && (
            <div className="flex items-center gap-0.5 bg-muted/20 border border-muted/10 p-0.5 rounded-lg select-none">
              <button
                onClick={() => {
                  setActiveViewTab('library');
                }}
                className={`text-[10px] font-bold px-3 py-1 rounded-md transition-all cursor-pointer
                  ${activeViewTab === 'library'
                    ? 'bg-active text-foreground shadow-sm font-black'
                    : 'text-foreground/60 hover:text-foreground'
                  }`}
              >
                {t('library', language)}
              </button>
              <button
                onClick={() => {
                  setActiveViewTab('calendar');
                  setIsSidebarCollapsed(true);
                }}
                className={`text-[10px] font-bold px-3 py-1 rounded-md transition-all cursor-pointer
                  ${activeViewTab === 'calendar'
                    ? 'bg-active text-foreground shadow-sm font-black'
                    : 'text-foreground/60 hover:text-foreground'
                  }`}
              >
                {t('weekly_calendar', language)}
              </button>
            </div>
          )}

          {/* ── Right side ── */}
          <div className="flex items-center gap-3 shrink-0">
            {uploadStatus !== 'idle' && (
              <>
                {renderQueueIndicator()}
                <div className="h-5 w-[1px] bg-muted/15" />
              </>
            )}

            {activeViewTab === 'calendar' ? (
              <>
                {/* Publish Video */}
                <button
                  onClick={() => {
                    if (setCalendarSelectorCell) {
                      const today = new Date();
                      setCalendarSelectorCell({ day: today, hour: 9, smartTime: null });
                    }
                  }}
                  className="text-xs font-bold text-accent-foreground bg-accent hover:opacity-90 px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-sm flex items-center gap-1.5 select-none"
                >
                  <Plus size={13} strokeWidth={2.5} />
                  <span>{language === 'tr' ? 'Video Paylaş' : 'Publish Video'}</span>
                </button>

                {/* View dropdown (ghost) */}
                <SelectDropdown
                  ghost
                  value={calendarView}
                  onChange={setCalendarView}
                  options={[
                    { value: 'week', label: language === 'tr' ? 'Haftalık' : 'Weekly' },
                    { value: 'month', label: language === 'tr' ? 'Aylık' : 'Monthly' },
                  ]}
                />

                <div className="h-5 w-[1px] bg-muted/15" />
              </>
            ) : (
              <>
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
                  language={language}
                />

                <div className="h-5 w-[1px] bg-muted/15" />
              </>
            )}


          </div>
        </div>
      )}
    </header>
  );
}
