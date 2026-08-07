import React from 'react';
import { FolderOpen } from 'lucide-react';
import Button from './ui/Button';

export default function EmptyStateFolder({ pickFolder, language }) {
  const isTr = language === 'tr';

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none my-auto min-h-[400px]">
      {/* Clean Main Container without border */}
      <div className="relative max-w-xl w-full bg-transparent flex flex-col items-center gap-5">
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

        {/* Clean Secondary Button without right arrow */}
        <Button
          variant="secondary"
          size="sm"
          onClick={pickFolder}
        >
          <FolderOpen size={14} className="shrink-0" />
          <span>{isTr ? 'Video Klasörünü Seç' : 'Choose Video Folder'}</span>
        </Button>
      </div>
    </div>
  );
}
