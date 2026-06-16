import React, { useState, useEffect, useRef } from 'react';
import { X, Keyboard, Globe, FolderOpen, Palette, Database, Brain } from 'lucide-react';
import ShortcutsTab from './ui/ShortcutsTab';
import LanguageTab from './ui/LanguageTab';
import FolderTab from './ui/FolderTab';
import ThemeTab from './ui/ThemeTab';
import BackupTab from './ui/BackupTab';
import AITab from './ui/AITab';
import Button from './ui/Button';
import Modal from './ui/Modal';
import Input from './ui/Input';
import { t } from '../utils/translations';
import { highlightText } from '../utils/searchHighlight';

export default function SettingsModal({
  showSettingsModal,
  setShowSettingsModal,
  keybindings,
  saveKeybindings,
  resetKeybindings,
  theme,
  setTheme,
  uiStyle,
  setUiStyle,
  currentFolder,
  pickFolder,
  language,
  setLanguage,
  API_URL,
  showToast,
  scanFolder,
  settingsActiveTab: activeTab,
  setSettingsActiveTab: setActiveTab
}) {
  const onClose = () => setShowSettingsModal(false);

  const [settingsQuery, setSettingsQuery] = useState('');
  const settingsSearchInputRef = useRef(null);
  const [settingsMatchIndex, setSettingsMatchIndex] = useState(0);
  const contentAreaRef = useRef(null);
  const matchCounterRef = useRef({ current: 0 });
  
  // Reset match counter on every render so that indices are sequentially computed in DOM render order
  matchCounterRef.current.current = 0;
  const highlight = (text) => highlightText(text, settingsQuery, settingsMatchIndex, matchCounterRef.current);

  // Build content map for each tab - includes all searchable text
  const getTabSearchableContent = (tab) => {
    const lang = language;
    const contents = {
      folder: [
        t('folder', lang), t('folder_tab_desc', lang), t('save_location', lang),
        t('no_folder_selected', lang), currentFolder || ''
      ],
      shortcuts: [
        t('shortcuts', lang), t('shortcut_desc', lang), t('save_shortcuts', lang),
        t('press_keys', lang), t('cancel', lang), t('clear', lang), t('no_binding', lang),
        t('reset_defaults', lang),
        // All shortcut action names
        t('seekBackward', lang), t('playPause', lang), t('seekForward', lang),
        t('toggleMute', lang), t('shutdown', lang), t('markShared', lang),
        t('openExplorer', lang), t('prevVideo', lang), t('nextVideo', lang),
        t('toggleSettings', lang), t('goUp', lang), t('jumpToNextShared', lang),
        t('copyPath', lang), t('copyText', lang), t('openLink', lang), t('toggleSidebar', lang),
        t('openNoteFinder', lang), t('toggleDetailPanel', lang),
        // Shortcut group titles
        t('shortcut_group_player', lang),
        t('shortcut_group_nav', lang),
        t('shortcut_group_ops', lang),
        t('shortcut_group_sys', lang),
        // Key names from current keybindings
        ...Object.values(keybindings || {}).filter(Boolean).map(b => {
          const parts = [];
          if (b.ctrlKey) parts.push('Ctrl');
          if (b.shiftKey) parts.push('Shift');
          if (b.altKey) parts.push('Alt');
          let key = b.key;
          if (key === ' ') key = 'Space';
          else if (key?.length === 1) key = key.toUpperCase();
          parts.push(key);
          return parts.join('+');
        })
      ],
      language: [
        t('language_options', lang), t('choose_lang_desc', lang), t('interface_lang', lang),
        t('save_language', lang), 'Türkçe', 'English'
      ],
      theme: [
        t('theme', lang), t('choose_theme_desc', lang), t('interface_style', lang),
        t('theme_options', lang), t('classic_style', lang), t('modern_style', lang),
        t('system_theme', lang), t('light_theme', lang), t('dark_theme', lang),
        t('save_btn', lang)
      ],
      backup: [
        'Yedekleme & Notlar', 'Backup & Notes',
        'Verileri Yedekle', 'Dışa Aktar', 'Backup Data', 'Export',
        'Verileri Yükle', 'İçe Aktar', 'Restore Data', 'Import',
        'JSON', 'SQLite', 'veritabanı', 'database',
        'Notları Dışa Aktar', 'Notları İçe Aktar', 'Export Notes', 'Import Notes',
        lang === 'tr'
          ? 'Tüm video açıklamalarını ve durumlarını küresel SQLite veritabanından JSON olarak yedekleyebilir veya yedekten geri yükleyebilirsiniz.'
          : 'Backup all video descriptions and shared states from the global SQLite database as JSON, or restore them from a backup file.'
      ],
      ai: [
        t('ai_settings', lang), t('ai_settings_desc', lang), t('ai_default_prompt_label', lang),
        'Yapay Zeka', 'Prompt', 'Instruction', 'Llama', 'AI Assistant'
      ]
    };
    return contents[tab] || [];
  };

  const handleSettingsSearch = (val) => {
    setSettingsQuery(val);
    if (!val.trim()) return;
    const query = val.toLowerCase().trim();
    
    // Find matching tab based on actual content text
    const tabs = ['folder', 'shortcuts', 'language', 'theme', 'backup', 'ai'];
    const matchedTab = tabs.find(tab => 
      getTabSearchableContent(tab).some(text => 
        text && text.toLowerCase().includes(query)
      )
    );
    
    if (matchedTab) {
      setActiveTab(matchedTab);
    }
  };

  const handleSettingsCycle = (e) => {
    const val = settingsQuery.trim();
    if (!val) return;
    const query = val.toLowerCase();
    const tabs = ['folder', 'shortcuts', 'language', 'theme', 'backup', 'ai'];
    
    // Find all tabs that contain the query
    const matchingTabs = tabs.filter(tab => 
      getTabSearchableContent(tab).some(text => 
        text && text.toLowerCase().includes(query)
      )
    );
    if (matchingTabs.length === 0) return;

    const container = contentAreaRef.current;
    if (!container) return;
    const marks = container.querySelectorAll('mark');
    const currentTabMatchesCount = marks.length;

    const isBackward = e.shiftKey;

    if (currentTabMatchesCount > 0) {
      const nextIdx = settingsMatchIndex + (isBackward ? -1 : 1);
      if (nextIdx >= 0 && nextIdx < currentTabMatchesCount) {
        setSettingsMatchIndex(nextIdx);
        marks[nextIdx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        // Current tab exhausted. Switch tab!
        const currentTabIdx = matchingTabs.indexOf(activeTab);
        if (currentTabIdx !== -1 && matchingTabs.length > 1) {
          const nextTabIdx = (currentTabIdx + (isBackward ? -1 : 1) + matchingTabs.length) % matchingTabs.length;
          const nextTab = matchingTabs[nextTabIdx];
          
          // Switch to next tab
          setActiveTab(nextTab);
          
          if (isBackward) {
            setSettingsMatchIndex(-1); // special flag to highlight last match after render
          } else {
            setSettingsMatchIndex(0);
          }
        } else {
          // Only one matching tab. Wrap around!
          const wrapIdx = isBackward ? currentTabMatchesCount - 1 : 0;
          setSettingsMatchIndex(wrapIdx);
          marks[wrapIdx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    } else {
      // No matches on current tab, but there might be matches on other tabs
      const currentTabIdx = matchingTabs.indexOf(activeTab);
      const nextTabIdx = currentTabIdx !== -1 
        ? (currentTabIdx + (isBackward ? -1 : 1) + matchingTabs.length) % matchingTabs.length
        : 0;
      setActiveTab(matchingTabs[nextTabIdx]);
      setSettingsMatchIndex(isBackward ? -1 : 0);
    }
  };

  useEffect(() => {
    if (showSettingsModal) {
      setSettingsQuery('');
      setTimeout(() => {
        settingsSearchInputRef.current?.focus();
      }, 100);
    }
  }, [showSettingsModal]);

  // Reset match index when query changes
  useEffect(() => {
    setSettingsMatchIndex(0);
  }, [settingsQuery]);

  const [totalSettingsMatches, setTotalSettingsMatches] = useState(0);

  // Update total matches count whenever query or tab changes
  useEffect(() => {
    const timer = setTimeout(() => {
      const container = contentAreaRef.current;
      if (container && settingsQuery.trim()) {
        const marks = container.querySelectorAll('mark');
        setTotalSettingsMatches(marks.length);
      } else {
        setTotalSettingsMatches(0);
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [settingsQuery, activeTab]);

  // Scroll to current match after tab switch or query change
  useEffect(() => {
    if (!settingsQuery.trim()) return;
    const timer = setTimeout(() => {
      const container = contentAreaRef.current;
      if (!container) return;
      const marks = container.querySelectorAll('mark');
      if (marks.length > 0) {
        let targetIdx = settingsMatchIndex;
        if (settingsMatchIndex === -1) {
          targetIdx = marks.length - 1;
          setSettingsMatchIndex(targetIdx);
        } else if (settingsMatchIndex >= marks.length) {
          targetIdx = 0;
          setSettingsMatchIndex(0);
        }
        marks[targetIdx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [settingsQuery, activeTab, settingsMatchIndex]);

  return (
    <Modal 
      isOpen={showSettingsModal} 
      onClose={onClose}
      className="bg-modal-surface border border-foreground/5 rounded-2xl w-full max-w-4xl h-[660px] shadow-2xl flex overflow-hidden animate-in fade-in zoom-in duration-200"
    >
      {/* Left Sidebar Menu */}
      <div className="w-48 bg-modal-surface border-r border-foreground/5 flex flex-col shrink-0">
        <div className="p-4 border-b border-foreground/5 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-foreground">{t('settings', language)}</h2>
        </div>
        <div className="flex-1 p-2 flex flex-col gap-1.5">
          {/* Mini Search input - matches Note Finder style */}
          <div className="px-1.5 py-1 mb-1 relative shrink-0">
            <div className="flex items-center justify-between gap-2 px-2.5 py-1 bg-foreground/[0.06] backdrop-blur-md border border-foreground/[0.08] focus-within:border-accent/40 rounded-ui-md h-[30px] relative">
              <input
                ref={settingsSearchInputRef}
                type="text"
                placeholder={t('settings_search_placeholder', language)}
                value={settingsQuery}
                onChange={(e) => handleSettingsSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSettingsCycle(e);
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    setSettingsQuery('');
                  }
                }}
                className="flex-1 bg-transparent border-0 focus:outline-none focus:ring-0 text-xs text-foreground placeholder-foreground/30 p-0"
              />
              {settingsQuery.trim() && totalSettingsMatches > 0 && (
                <span className="text-[10px] text-foreground/45 font-mono select-none shrink-0 mr-0.5">
                  {settingsMatchIndex + 1} / {totalSettingsMatches}
                </span>
              )}
            </div>
          </div>
          <Button
            variant="none"
            size="none"
            onClick={() => setActiveTab('folder')}
            className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors text-sm font-medium
              ${activeTab === 'folder' ? 'bg-active text-foreground font-semibold' : 'text-foreground/70 hover:bg-active/50 hover:text-foreground'}`}
          >
            <FolderOpen size={16} />
            {t('folder', language)}
          </Button>
          <Button
            variant="none"
            size="none"
            onClick={() => setActiveTab('shortcuts')}
            className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors text-sm font-medium
              ${activeTab === 'shortcuts' ? 'bg-active text-foreground font-semibold' : 'text-foreground/70 hover:bg-active/50 hover:text-foreground'}`}
          >
            <Keyboard size={16} />
            {t('shortcuts', language)}
          </Button>
          <Button
            variant="none"
            size="none"
            onClick={() => setActiveTab('language')}
            className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors text-sm font-medium
              ${activeTab === 'language' ? 'bg-active text-foreground font-semibold' : 'text-foreground/70 hover:bg-active/50 hover:text-foreground'}`}
          >
            <Globe size={16} />
            {t('language_options', language)}
          </Button>
          <Button
            variant="none"
            size="none"
            onClick={() => setActiveTab('theme')}
            className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors text-sm font-medium
              ${activeTab === 'theme' ? 'bg-active text-foreground font-semibold' : 'text-foreground/70 hover:bg-active/50 hover:text-foreground'}`}
          >
            <Palette size={16} />
            {t('theme', language)}
          </Button>
          <Button
            variant="none"
            size="none"
            onClick={() => setActiveTab('backup')}
            className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors text-sm font-medium
              ${activeTab === 'backup' ? 'bg-active text-foreground font-semibold' : 'text-foreground/70 hover:bg-active/50 hover:text-foreground'}`}
          >
            <Database size={16} />
            {t('backup_tab_title', language)}
          </Button>
          <Button
            variant="none"
            size="none"
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors text-sm font-medium
              ${activeTab === 'ai' ? 'bg-active text-foreground font-semibold' : 'text-foreground/70 hover:bg-active/50 hover:text-foreground'}`}
          >
            <Brain size={16} />
            {t('ai_settings', language)}
          </Button>
        </div>
      </div>

      {/* Right Content Area */}
      <div className="flex-1 flex flex-col bg-modal-base relative">
        <Button 
          variant="ghost"
          size="none"
          onClick={onClose} 
          className="absolute top-4 right-4 rounded-md z-10 p-1.5" 
          title={t('close_title', language)}
        >
          <X size={20} />
        </Button>
        
        <div ref={contentAreaRef} className="flex-1 p-8 pt-12 overflow-hidden">
          {activeTab === 'folder' && (
            <FolderTab saveDir={currentFolder} onSelectFolder={pickFolder} language={language} onClose={onClose} settingsQuery={settingsQuery} highlight={highlight} />
          )}
          {activeTab === 'shortcuts' && (
            <ShortcutsTab keybindings={keybindings} saveKeybindings={saveKeybindings} resetKeybindings={resetKeybindings} language={language} onClose={onClose} settingsQuery={settingsQuery} highlight={highlight} />
          )}
          {activeTab === 'language' && (
            <LanguageTab language={language} setLanguage={setLanguage} onClose={onClose} settingsQuery={settingsQuery} highlight={highlight} />
          )}
          {activeTab === 'theme' && (
            <ThemeTab 
              theme={theme} 
              setTheme={setTheme} 
              uiStyle={uiStyle} 
              setUiStyle={setUiStyle} 
              language={language} 
              onClose={onClose} 
              settingsQuery={settingsQuery}
              highlight={highlight}
            />
          )}
          {activeTab === 'backup' && (
            <BackupTab 
              language={language} 
              API_URL={API_URL} 
              showToast={showToast} 
              refreshFolder={() => currentFolder && scanFolder(currentFolder)} 
              settingsQuery={settingsQuery}
              highlight={highlight}
            />
          )}
          {activeTab === 'ai' && (
            <AITab 
              language={language} 
              onClose={onClose} 
              settingsQuery={settingsQuery}
              highlight={highlight}
            />
          )}
        </div>
      </div>
    </Modal>
  );
}
