import React from 'react';
import { FolderOpen, Film, Image as ImageIcon, FileText, Sparkles, ArrowRight } from 'lucide-react';
import Button from './ui/Button';

export default function EmptyStateFolder({ pickFolder, scanFolder, language }) {
  const isTr = language === 'tr';

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none animate-fade-in my-auto min-h-[500px]">
      {/* Glow Backdrop Hero Card */}
      <div className="relative group max-w-xl w-full bg-surface/60 backdrop-blur-md border border-muted/20 rounded-ui-xl p-8 shadow-2xl flex flex-col items-center gap-6 overflow-hidden">
        {/* Subtle Ambient Background Gradient */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-accent/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Hero Icon */}
        <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-accent/20 to-blue-500/20 border border-accent/30 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
          <FolderOpen className="w-10 h-10 text-accent animate-pulse" strokeWidth={1.75} />
          <div className="absolute -top-1 -right-1 p-1 bg-accent rounded-full text-black">
            <Sparkles size={12} />
          </div>
        </div>

        {/* Text Explanations */}
        <div className="flex flex-col gap-2 max-w-md">
          <h2 className="text-xl font-bold text-foreground tracking-tight">
            {isTr ? 'Başlamak İçin Bir Klasör Seçin' : 'Select a Folder to Get Started'}
          </h2>
          <p className="text-xs text-foreground/60 leading-relaxed font-normal">
            {isTr 
              ? 'Media Planner, seçeceğiniz video klasörünü otomatik olarak tarayarak içindeki dikey videoları, kapak fotoğraflarını ve özel notlarınızı anında organize eder.'
              : 'Media Planner automatically scans your selected video folder, instant-indexing vertical videos, thumbnails, and custom notes.'}
          </p>
        </div>

        {/* Primary Call To Action Button */}
        <Button
          variant="filled"
          size="lg"
          onClick={pickFolder}
          className="px-8 py-3.5 bg-accent hover:bg-accent-hover text-accent-foreground font-bold text-sm rounded-ui-lg shadow-lg hover:shadow-accent/20 transition-all flex items-center gap-2.5 cursor-pointer group/btn active:scale-95"
        >
          <FolderOpen size={18} className="shrink-0" />
          <span>{isTr ? 'Video Klasörünü Seç' : 'Choose Video Folder'}</span>
          <ArrowRight size={16} className="shrink-0 group-hover/btn:translate-x-1 transition-transform" />
        </Button>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-3 gap-3 w-full pt-4 border-t border-muted/15 text-left">
          <div className="flex flex-col gap-1.5 p-3 rounded-ui-md bg-foreground/[0.03] border border-muted/10">
            <div className="flex items-center gap-1.5 text-accent">
              <Film size={14} />
              <span className="text-[11px] font-bold">{isTr ? 'Otomatik Tarama' : 'Auto Scan'}</span>
            </div>
            <p className="text-[10px] text-foreground/50 leading-tight">
              {isTr ? 'Klasördeki tüm MP4, MOV, MKV videolarını anında listeler.' : 'Instantly detects MP4, MOV, and MKV video files.'}
            </p>
          </div>

          <div className="flex flex-col gap-1.5 p-3 rounded-ui-md bg-foreground/[0.03] border border-muted/10">
            <div className="flex items-center gap-1.5 text-blue-400">
              <ImageIcon size={14} />
              <span className="text-[11px] font-bold">{isTr ? '9:16 Önizleme' : '9:16 Covers'}</span>
            </div>
            <p className="text-[10px] text-foreground/50 leading-tight">
              {isTr ? 'FFmpeg ile dikey kapak fotoğraflarını otomatik üretir.' : 'Generates high quality 9:16 vertical thumbnails automatically.'}
            </p>
          </div>

          <div className="flex flex-col gap-1.5 p-3 rounded-ui-md bg-foreground/[0.03] border border-muted/10">
            <div className="flex items-center gap-1.5 text-emerald-400">
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
