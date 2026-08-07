import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

/* ── Pure helper functions ── */
const getWeekDays = (date) => {
  const temp = new Date(date);
  const day = temp.getDay();
  const diff = temp.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(temp.setDate(diff));
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  return days;
};

const getDaysOfMonth = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  let startDay = firstDay.getDay() - 1;
  if (startDay === -1) startDay = 6;
  const startDate = new Date(firstDay);
  startDate.setDate(firstDay.getDate() - startDay);
  const days = [];
  const temp = new Date(startDate);
  for (let i = 0; i < 42; i++) {
    days.push(new Date(temp));
    temp.setDate(temp.getDate() + 1);
  }
  return days;
};

const isToday = (date) => {
  const today = new Date();
  return date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
};

const formatMonthRange = (date, language) => {
  const monthsTr = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const monthsEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const months = language === 'tr' ? monthsTr : monthsEn;
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
};

const formatWeekRange = (days, language) => {
  if (!days || days.length === 0) return '';
  const first = days[0];
  const last = days[6];
  const monthsTr = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const months = language === 'tr' ? monthsTr : monthsEn;
  if (first.getMonth() === last.getMonth()) {
    return `${first.getDate()} – ${last.getDate()} ${months[first.getMonth()]} ${first.getFullYear()}`;
  }
  return `${first.getDate()} ${months[first.getMonth()]} – ${last.getDate()} ${months[last.getMonth()]} ${first.getFullYear()}`;
};

export { getWeekDays, getDaysOfMonth, isToday, formatMonthRange, formatWeekRange };

export default function CalendarHeader({ currentDate, setCurrentDate, calendarView, language, bufferProfile }) {
  const [weekPickerOpen, setWeekPickerOpen] = useState(false);
  const [weekPickerMonth, setWeekPickerMonth] = useState(() => new Date(currentDate));
  const [hoveredWeekStart, setHoveredWeekStart] = useState(null);
  const weekPickerRef = useRef(null);

  useEffect(() => {
    if (!weekPickerOpen) return;
    const handleClick = (e) => {
      if (weekPickerRef.current && !weekPickerRef.current.contains(e.target)) {
        setWeekPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [weekPickerOpen]);

  const handlePrev = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      if (calendarView === 'month') d.setMonth(d.getMonth() - 1);
      else d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const handleNext = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      if (calendarView === 'month') d.setMonth(d.getMonth() + 1);
      else d.setDate(d.getDate() + 7);
      return d;
    });
  };

  const daysOfWeek = getWeekDays(currentDate);
  const displayText = calendarView === 'month'
    ? formatMonthRange(currentDate, language)
    : formatWeekRange(daysOfWeek, language);

  const weekdayLabels = language === 'tr'
    ? ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz']
    : ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  return (
    <div className="flex items-center gap-2.5">

      {/* Instagram Profile Badge — left of Today */}
      {bufferProfile?.name && (
        <div className="flex items-center gap-2 pr-2.5 border-r border-muted/15 select-none">
          {/* Avatar */}
          {bufferProfile.avatar ? (
            <img
              src={bufferProfile.avatar}
              alt={bufferProfile.name}
              className="w-7 h-7 rounded-full object-cover ring-1 ring-purple-500/40 shrink-0"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
              <span className="text-white text-[10px] font-bold">{bufferProfile.name[0]?.toUpperCase()}</span>
            </div>
          )}
          {/* Name + followers */}
          <div className="flex flex-col leading-none min-w-0">
            <span className="text-[11px] font-bold text-foreground truncate max-w-[110px]">@{bufferProfile.name}</span>
            {bufferProfile.followers != null && (
              <span className="text-[9px] text-foreground/45 mt-0.5">
                {Number(bufferProfile.followers).toLocaleString()} {language === 'tr' ? 'takipçi' : 'followers'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Today */}
      <button
        onClick={() => setCurrentDate(new Date())}
        className="text-xs font-semibold text-accent hover:bg-accent/10 border border-accent/20 bg-accent/5 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer select-none"
      >
        {language === 'tr' ? 'Bugün' : 'Today'}
      </button>

      {/* Prev */}
      <button
        onClick={handlePrev}
        className="p-1.5 hover:bg-muted/40 text-foreground/70 hover:text-foreground rounded-lg transition-colors border border-muted/10 bg-muted/20 cursor-pointer"
      >
        <ChevronLeft size={14} />
      </button>

      {/* Week / Month range picker trigger */}
      <div className="relative" ref={weekPickerRef}>
        <button
          onClick={() => {
            setWeekPickerMonth(new Date(currentDate));
            setWeekPickerOpen(v => !v);
          }}
          className="text-xs font-semibold text-foreground bg-muted/30 hover:bg-muted/50 px-3 py-1.5 rounded-lg border border-muted/10 min-w-[160px] text-center select-none transition-colors cursor-pointer flex items-center gap-1.5 justify-center"
        >
          <span className="truncate">{displayText}</span>
          <ChevronDown size={11} className={`shrink-0 transition-transform duration-200 ${weekPickerOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown */}
        {weekPickerOpen && (
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 bg-surface border border-muted/15 rounded-xl shadow-2xl p-3 w-[280px] select-none animate-in fade-in zoom-in-95 duration-150">
            {/* Month nav header */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setWeekPickerMonth(prev => { const d = new Date(prev); d.setMonth(d.getMonth() - 1); return d; })}
                className="p-1 rounded-lg hover:bg-hover text-foreground/60 hover:text-foreground transition cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs font-bold text-foreground">
                {formatMonthRange(weekPickerMonth, language)}
              </span>
              <button
                onClick={() => setWeekPickerMonth(prev => { const d = new Date(prev); d.setMonth(d.getMonth() + 1); return d; })}
                className="p-1 rounded-lg hover:bg-hover text-foreground/60 hover:text-foreground transition cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Weekday label row */}
            <div className="grid grid-cols-7 mb-1">
              {weekdayLabels.map(d => (
                <div key={d} className="text-center text-[9px] font-bold text-foreground/35 uppercase pb-1">{d}</div>
              ))}
            </div>

            {/* Week rows */}
            {(() => {
              const pickerDays = getDaysOfMonth(weekPickerMonth);
              const weeks = [];
              for (let i = 0; i < pickerDays.length; i += 7) weeks.push(pickerDays.slice(i, i + 7));
              const selectedWeekStart = getWeekDays(currentDate)[0];

              return weeks.map((week, wIdx) => {
                const isHovered = hoveredWeekStart !== null &&
                  week[0].toDateString() === new Date(hoveredWeekStart).toDateString();
                const isSelectedWeek = week[0].toDateString() === selectedWeekStart.toDateString();

                return (
                  <div
                    key={wIdx}
                    className={`grid grid-cols-7 rounded-lg cursor-pointer transition-all duration-100 mb-0.5
                      ${isSelectedWeek
                        ? 'bg-accent/20 ring-1 ring-accent/30'
                        : isHovered
                          ? 'bg-muted/40 ring-1 ring-muted/30'
                          : ''}`}
                    onMouseEnter={() => setHoveredWeekStart(week[0])}
                    onMouseLeave={() => setHoveredWeekStart(null)}
                    onClick={() => {
                      setCurrentDate(new Date(week[0]));
                      setWeekPickerOpen(false);
                    }}
                  >
                    {week.map((day, dIdx) => {
                      const isCurrentMonth = day.getMonth() === weekPickerMonth.getMonth();
                      const isDayToday = isToday(day);
                      return (
                        <div
                          key={dIdx}
                          className={`flex items-center justify-center py-1 text-[11px] font-semibold rounded-lg
                            ${isDayToday
                              ? 'text-accent font-black'
                              : isSelectedWeek
                                ? 'text-foreground/90'
                                : isCurrentMonth
                                  ? 'text-foreground/70'
                                  : 'text-foreground/25'}`}
                        >
                          {day.getDate()}
                        </div>
                      );
                    })}
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>

      {/* Next */}
      <button
        onClick={handleNext}
        className="p-1.5 hover:bg-muted/40 text-foreground/70 hover:text-foreground rounded-lg transition-colors border border-muted/10 bg-muted/20 cursor-pointer"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
