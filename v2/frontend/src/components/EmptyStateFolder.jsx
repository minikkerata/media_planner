import React from 'react';
import { FolderOpen, Film, Image as ImageIcon, FileText, ArrowRight } from 'lucide-react';
import Button from './ui/Button';

export default function EmptyStateFolder({ pickFolder, scanFolder, language }) {
  const isTr = language === 'tr';

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none animate-fade-in my-auto min-h-[480px]">
      {/* Clean Hero Card */}
      <div className="relative max-w-xl w-full bg-surface border border-muted/20 rounded-ui-xl p-8 shadow-md flex flex-col items-center gap-6 overflow-hidden">
        {/* Hero Icon */}
        <div className="w-16 h-16 rounded-xl bg-foreground/5 border border-muted/20 flex items-center justify-center">
          <FolderOpen className="w-8 h-8 text-foreground/70" strokeWidth={1.75} />
        </div>

        {/* Text Explanations */}
        <div className="flex flex-col gap-2 max-w-md">
          <h2 className="text-lg font-bold text-foreground tracking-tight">
            {isTr ? 'Başlamak İçin Bir Klasör Seçin' : 'Select a Folder to Get Started'}
          </h2>
          <p className="text-xs text-foreground/60 leading-relaxed font-normal">
            {isTr 
              ? 'Media Planner, seçeceğiniz video klasörünü otomatik olarak tarayarak içindeki dikey videoları, kapak fotoğraflarını ve özel notlarınızı anında organize eder.'
              : 'Media Planner automatically scans your selected video folder, instant-indexing vertical videos, thumbnails, and custom notes.'}
          </p>
        </div>

        {/* Clean Secondary Button */}
        <Button
          variant="secondary"
          size="lg"
          onClick={pickFolder}
          className="px-6 py-2.5 bg-foreground/5 hover:bg-foreground/10 text-foreground border border-muted/20 font-semibold text-xs rounded-ui-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
        >
          <FolderOpen size={16} className="shrink-0 text-foreground/80" />
          <span>{isTr ? 'Video Klasörünü Seç' : 'Choose Video Folder'}</span>
          <ArrowRight size={14} className="shrink-0 text-foreground/60" />
        </Button>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-3 gap-3 w-full pt-4 border-t border-muted/15 text-left">
          <div className="flex flex-col gap-1.5 p-3 rounded-ui-md bg-foreground/[0.02] border border-muted/10">
            <div className="flex items-center gap-1.5 text-foreground/80">
              <Film size={14} />
              <span className="text-[11px] font-bold">{isTr ? 'Otomatik Tarama' : 'Auto Scan'}</span>
            </div>
            <p className="text-[10px] text-foreground/50 leading-tight">
              {isTr ? 'Klasördeki tüm MP4, MOV, MKV videolarını anında listeler.' : 'Instantly detects MP4, MOV, and MKV video files.'}
            </p>
          </div>

          <div className="flex flex-col gap-1.5 p-3 rounded-ui-md bg-foreground/[0.02] border border-muted/10">
            <div className="flex items-center gap-1.5 text-foreground/80">
              <ImageIcon size={14} />
              <span className="text-[11px] font-bold">{isTr ? '9:16 Önizleme' : '9:16 Covers'}</span>
            </div>
            <p className="text-[10px] text-foreground/50 leading-tight">
              {isTr ? 'FFmpeg ile dikey kapak fotoğraflarını otomatik üretir.' : 'Generates high quality 9:16 vertical thumbnails automatically.'}
            </p>
          </div>

          <div className="flex flex-col gap-1.5 p-3 rounded-ui-md bg-foreground/[0.02] border border-muted/10">
            <div className="flex items-center gap-1.5 text-foreground/80">
              <FileText size={14} />
              <span className="text-[11px] font-bold">{isTr ? 'Notlar & Paylaşım' : 'Notes & Share'}</span>
            </div>
            <p className="text-[10px] text-foreground/50 leading-tight">
              {isTr ? 'Notlarınızı kaydeder ve sosyal medyada tek tıkla paylaşır.' : 'Saves custom descriptions and posts to social accounts.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
