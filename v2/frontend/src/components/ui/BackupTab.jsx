import React, { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import Button from './Button';
import SettingsSection from './SettingsSection';
import { t } from '../../utils/translations';

export default function BackupTab({ language, API_URL, showToast, refreshFolder, highlight = (x) => x }) {
  const fileInputRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(`${API_URL}/api/notes/export`);
      const data = await res.json();
      if (data.success) {
        const jsonStr = JSON.stringify(data.notes, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `media_planner_notes_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        if (showToast) showToast(t('notes_exported', language), 'success');
      } else {
        if (showToast) showToast(t('export_failed', language) + (data.detail || ''), 'error');
      }
    } catch (err) {
      console.error(err);
      if (showToast) showToast(t('export_error', language), 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const notes = JSON.parse(text);
        
        let notesList = [];
        if (Array.isArray(notes)) {
          notesList = notes;
        } else if (notes && Array.isArray(notes.notes)) {
          notesList = notes.notes;
        } else {
          throw new Error(t('invalid_json_format', language));
        }

        const res = await fetch(`${API_URL}/api/notes/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: notesList })
        });
        const data = await res.json();
        
        if (data.success) {
          if (showToast) showToast(data.message || t('notes_imported', language), 'success');
          if (refreshFolder) refreshFolder();
        } else {
          if (showToast) showToast(t('import_failed', language) + (data.detail || ''), 'error');
        }
      } catch (err) {
        console.error(err);
        if (showToast) showToast(t('import_error', language) + err.message, 'error');
      } finally {
        setIsImporting(false);
        e.target.value = ''; // Reset file input
      }
    };
    reader.readAsText(file);
  };

  const desc = t('backup_tab_desc', language);

  return (
    <SettingsSection description={highlight(desc)}>
      <div className="flex flex-col gap-4 py-4 border-b border-foreground/5">
        <div className="flex items-center justify-between group">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground">
              {highlight(t('backup_data_export', language))}
            </label>
            <span className="text-xs text-foreground/50">
              {highlight(t('export_subtext', language))}
            </span>
          </div>
          <Button 
            variant="secondary"
            onClick={handleExport}
            disabled={isExporting}
            className="gap-2"
          >
            <Download size={16} />
            {highlight(t('export_notes_btn', language))}
          </Button>
        </div>

        <div className="flex items-center justify-between group pt-2">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground">
              {highlight(t('restore_data_import', language))}
            </label>
            <span className="text-xs text-foreground/50">
              {highlight(t('import_subtext', language))}
            </span>
          </div>
          <div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept=".json" 
              style={{ display: 'none' }} 
            />
            <Button 
              variant="secondary"
              onClick={handleImportClick}
              disabled={isImporting}
              className="gap-2"
            >
              <Upload size={16} />
              {highlight(t('import_notes_btn', language))}
            </Button>
          </div>
        </div>
      </div>
    </SettingsSection>
  );
}
