import React from 'react';
import { Calendar, Clock } from 'lucide-react';

export default function SchedulePickerCapsule({ scheduleTime, datePart, timePart, isScheduleInPast, onDateChange, onTimeChange, language }) {
  return (
    <div className="flex items-center gap-1.5 p-1 bg-active/40 border border-foreground/10 rounded-xl max-w-full">
      <div className="flex items-center gap-1 px-2.5 py-1 bg-surface rounded-lg border border-foreground/5 shadow-xs w-[108px] min-w-[100px] shrink-0">
        <Calendar size={13} className="text-accent shrink-0" />
        <input
          type="date"
          value={datePart}
          onChange={(e) => onDateChange(e.target.value)}
          className="bg-transparent border-none p-0 text-xs font-semibold text-foreground focus:ring-0 cursor-pointer w-full"
        />
      </div>
      <div className="flex items-center gap-1 px-2.5 py-1 bg-surface rounded-lg border border-foreground/5 shadow-xs w-[68px] min-w-[64px] shrink-0">
        <Clock size={13} className="text-accent shrink-0" />
        <input
          type="time"
          value={timePart}
          onChange={(e) => onTimeChange(e.target.value)}
          className="bg-transparent border-none p-0 text-xs font-semibold text-foreground focus:ring-0 cursor-pointer w-full"
        />
      </div>
    </div>
  );
}
