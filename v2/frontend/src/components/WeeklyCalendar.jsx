import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Check, Loader2, Plus, X } from 'lucide-react';
import { api } from '../services/api';
import { t } from '../utils/translations';
import VideoCard from './VideoCard';
import Modal from './ui/Modal';
import Button from './ui/Button';


/* ─── Mini card component for the calendar grid ─── */
function CalendarVideoCard({ video, isSelected, upload, API_URL, language, formatPublishTime, onClick }) {
  const [isHovering, setIsHovering] = useState(false);
  const isUploading = upload && upload.status === 'running';
  const isFailed    = upload && upload.status === 'error';

  return (
    <div
      onClick={onClick}
      title={isFailed ? `${video.name} — Hata: ${upload.error}` : video.name}
      className={`relative rounded-xl overflow-hidden cursor-pointer border transition-all select-none w-full aspect-[20/17]
        ${isSelected
          ? 'border-accent/50 shadow-md shadow-accent/10 ring-1 ring-accent/30'
          : isFailed
            ? 'border-red-500/30'
            : isUploading
              ? 'border-accent/20 animate-pulse'
              : 'border-foreground/5 hover:border-foreground/15'
        }`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Thumbnail — hidden while hovering */}
      <img
        src={`${API_URL}/api/thumbnail?path=${encodeURIComponent(video.path)}`}
        alt={video.name}
        className={`absolute inset-0 w-full h-full object-cover transition-all duration-200 z-10
          ${isUploading || isFailed ? 'opacity-40' : ''}
          ${isHovering && !isUploading && !isFailed ? 'opacity-0' : ''}`}
        loading="lazy"
      />

      {/* Hover video */}
      {isHovering && !isUploading && !isFailed && (
        <video
          src={`${API_URL}/api/video?path=${encodeURIComponent(video.path)}`}
          autoPlay
          loop
          muted
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover z-0"
        />
      )}

      {/* Gradient overlay */}
      {!isUploading && !isFailed && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none z-20" />
      )}

      {/* Uploading overlay */}
      {isUploading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 select-none z-30">
          <Loader2 size={18} className="text-accent animate-spin mb-1" />
          <div className="w-3/4 bg-foreground/20 h-1 rounded-full overflow-hidden mt-1">
            <div className="bg-accent h-full transition-all duration-300" style={{ width: `${upload.progress}%` }} />
          </div>
        </div>
      )}

      {/* Failed overlay */}
      {isFailed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/60 select-none z-30">
          <span className="text-[8px] font-black text-red-400 tracking-wider uppercase">Failed</span>
        </div>
      )}

      {/* Time badge */}
      {!isUploading && !isFailed && (
        <div className="absolute bottom-1.5 left-1.5 bg-black/70 backdrop-blur-sm text-[8px] font-bold px-1.5 py-0.5 rounded text-white/95 select-none z-30">
          {formatPublishTime(video.publish_time)}
        </div>
      )}

      {/* Shared checkmark */}
      {video.shared && !isUploading && !isFailed && (
        <div className="absolute bottom-1.5 right-1.5 bg-green-500 text-white rounded-full p-0.5 shadow-sm z-30">
          <Check size={7} strokeWidth={3.5} />
        </div>
      )}
    </div>
  );
}

/* ─── Mini LIST style card component for the monthly calendar grid ─── */
function CalendarListVideoCard({ video, isSelected, upload, API_URL, language, formatPublishTime, onClick }) {
  const [isHovering, setIsHovering] = useState(false);
  const isUploading = upload && upload.status === 'running';
  const isFailed    = upload && upload.status === 'error';
  const hoverVideoRef = useRef(null);

  let bgClass = 'bg-muted/15 text-foreground/80 hover:bg-hover hover:text-foreground border-foreground/5';
  if (video.shared) {
    bgClass = 'bg-green-500/10 text-foreground/80 hover:bg-green-500/15 border-green-500/20';
  }
  if (isSelected) {
    bgClass = 'bg-accent/15 text-accent border-accent/30';
  } else if (isFailed) {
    bgClass = 'bg-red-500/10 text-red-400 border-red-500/20';
  } else if (isUploading) {
    bgClass = 'bg-accent/5 text-accent/80 border-accent/20 animate-pulse';
  }

  return (
    <div
      onClick={onClick}
      title={isFailed ? `${video.name} — Hata: ${upload.error}` : video.name}
      className={`group flex flex-row items-center gap-1.5 p-1 rounded-md border border-solid transition-all duration-150 cursor-pointer relative select-none w-full min-w-0 ${bgClass}`}
    >
      {/* Left: Tiny Thumbnail with hover scale effect */}
      <div 
        className="w-5 aspect-[9/16] rounded-[1px] overflow-hidden relative shrink-0 bg-black/20 transition-all duration-200 ease-out hover:scale-[3.5] hover:z-50 hover:shadow-2xl origin-left"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <img
          src={`${API_URL}/api/thumbnail?path=${encodeURIComponent(video.path)}`}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-150 z-10 
            ${isUploading || isFailed ? 'opacity-40' : ''}
            ${isHovering && !isUploading && !isFailed ? 'opacity-0' : ''}`}
          loading="lazy"
        />
        {isHovering && !isUploading && !isFailed && (
          <video
            ref={hoverVideoRef}
            src={`${API_URL}/api/video?path=${encodeURIComponent(video.path)}`}
            autoPlay
            loop
            muted
            preload="auto"
            className="absolute inset-0 w-full h-full object-cover z-0"
          />
        )}
      </div>

      {/* Title & Time */}
      <div className="flex-1 min-w-0 flex flex-col leading-none">
        <span className="text-[8px] font-bold truncate">
          {video.name}
        </span>
        <span className="text-[7px] text-foreground/45 mt-0.5">
          {formatPublishTime(video.publish_time)}
        </span>
      </div>

      {/* Status icons */}
      {video.shared && !isUploading && !isFailed && (
        <div className="bg-green-500 text-white rounded-full p-0.5 shrink-0 scale-75">
          <Check size={6} strokeWidth={4} />
        </div>
      )}
      {isUploading && (
        <Loader2 size={8} className="text-accent animate-spin shrink-0" />
      )}
    </div>
  );
}

export default function WeeklyCalendar({
  language,
  videos,
  API_URL,
  activePath,
  handleItemClick,
  scanFolder,
  showToast,
  openPublishModalWithTime,
  activeUploads,
  openVideoDetailModal,
  // Controlled from App
  currentDate,
  setCurrentDate,
  calendarView,
  setCalendarView,
  selectorCell,
  setSelectorCell,
}) {
  const [scheduledVideos, setScheduledVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewUploadTask, setViewUploadTask] = useState(null);
  const gridContainerRef = useRef(null);

  const fetchScheduledVideos = () => {
    api.getScheduledVideos()
      .then(res => {
        if (res.success && res.videos) {
          setScheduledVideos(res.videos);
        }
      })
      .catch(err => {
        console.error("Failed to load scheduled videos:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchScheduledVideos();
  }, [videos]);


  // Scroll to a reasonable hour (e.g. 09:00) on mount/load only in week view
  useEffect(() => {
    if (!loading && calendarView === 'week' && gridContainerRef.current) {
      // Find the row for 9:00 AM (row index 9) and scroll to it
      const targetRow = gridContainerRef.current.querySelector('[data-hour="9"]');
      if (targetRow) {
        gridContainerRef.current.scrollTop = targetRow.offsetTop - 100;
      }
    }
  }, [loading, calendarView]);

  const getWeekDays = (date) => {
    const temp = new Date(date);
    const day = temp.getDay();
    const diff = temp.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday (0) to show Monday first
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
    if (startDay === -1) startDay = 6; // Sunday is 6
    
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

  const daysOfWeek = getWeekDays(currentDate);

  const getCombinedVideos = () => {
    const list = [...scheduledVideos];
    Object.keys(activeUploads || {}).forEach(path => {
      const upload = activeUploads[path];
      const existingIdx = list.findIndex(v => v.path === path);
      if (existingIdx !== -1) {
        list[existingIdx] = {
          ...list[existingIdx],
          ...upload.video,
          uploadStatus: upload
        };
      } else {
        list.push({
          ...upload.video,
          publish_time: upload.publish_time,
          shared: false,
          uploadStatus: upload
        });
      }
    });
    return list;
  };

  const combinedVideos = getCombinedVideos();

  const handlePrevWeek = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setDate(prev.getDate() - 7);
      return d;
    });
  };

  const handleNextWeek = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setDate(prev.getDate() + 7);
      return d;
    });
  };

  const handlePrevMonth = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setMonth(prev.getMonth() - 1);
      return d;
    });
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setMonth(prev.getMonth() + 1);
      return d;
    });
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const isSameDay = (d1, d2String) => {
    if (!d2String) return false;
    const d2 = new Date(d2String);
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const isToday = (date) => {
    const today = new Date();
    return date.getFullYear() === today.getFullYear() &&
           date.getMonth() === today.getMonth() &&
           date.getDate() === today.getDate();
  };

  const formatMonthRange = (date) => {
    const monthsTr = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    const monthsEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const months = language === 'tr' ? monthsTr : monthsEn;
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const formatWeekRange = (days) => {
    if (!days || days.length === 0) return '';
    const first = days[0];
    const last = days[6];
    
    const monthsTr = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const months = language === 'tr' ? monthsTr : monthsEn;
    
    if (first.getMonth() === last.getMonth()) {
      return `${first.getDate()} - ${last.getDate()} ${months[first.getMonth()]} ${first.getFullYear()}`;
    } else {
      return `${first.getDate()} ${months[first.getMonth()]} - ${last.getDate()} ${months[last.getMonth()]} ${first.getFullYear()}`;
    }
  };

  const formatPublishTime = (timeString) => {
    if (!timeString) return '';
    const d = new Date(timeString);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };

  const handleVideoCardClick = async (video) => {
    const isCurrent = videos.some(v => v.path === video.path);
    if (isCurrent) {
      if (openVideoDetailModal) {
        openVideoDetailModal(video.path);
      } else {
        handleItemClick(video.path);
      }
    } else {
      const lastSlash = Math.max(video.path.lastIndexOf('\\'), video.path.lastIndexOf('/'));
      if (lastSlash !== -1) {
        const parentFolder = video.path.substring(0, lastSlash);
        if (showToast) {
          showToast(language === 'tr' ? 'Klasör değiştiriliyor ve detaylar açılıyor...' : 'Switching folder and opening details...', 'success');
        }
        await scanFolder(parentFolder);
        setTimeout(() => {
          if (openVideoDetailModal) {
            openVideoDetailModal(video.path);
          } else {
            handleItemClick(video.path);
          }
        }, 300);
      }
    }
  };

  const weekdaysTr = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
  const weekdaysEn = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const weekdays = language === 'tr' ? weekdaysTr : weekdaysEn;

  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Returns ISO datetime string: 1h after latest video on that day, clamped to current time if past
  const getNextSlotForDay = (day) => {
    const dayVideos = combinedVideos.filter(v => isSameDay(day, v.publish_time));
    const yyyy = day.getFullYear();
    const mm = String(day.getMonth() + 1).padStart(2, '0');
    const dd = String(day.getDate()).padStart(2, '0');

    // Helper: 5 minutes from now (small safety buffer)
    const nowPlus5 = () => {
      const n = new Date();
      n.setMinutes(n.getMinutes() + 5, 0, 0);
      return n;
    };

    let candidate;
    if (dayVideos.length === 0) {
      // No videos that day → default 09:00, but if that's already past use now+5min
      candidate = new Date(`${yyyy}-${mm}-${dd}T09:00:00`);
    } else {
      const latest = dayVideos.reduce((max, v) =>
        new Date(v.publish_time) > new Date(max.publish_time) ? v : max
      );
      candidate = new Date(latest.publish_time);
      candidate.setHours(candidate.getHours() + 1, 0, 0, 0);
      // Cap at 23:00
      if (candidate.getHours() === 0) candidate.setHours(23);
    }

    // If candidate is in the past, snap to now+5min
    const now = new Date();
    if (candidate <= now) {
      candidate = nowPlus5();
    }

    const hh = String(candidate.getHours()).padStart(2, '0');
    const min = String(candidate.getMinutes()).padStart(2, '0');
    const candYYYY = candidate.getFullYear();
    const candMM = String(candidate.getMonth() + 1).padStart(2, '0');
    const candDD = String(candidate.getDate()).padStart(2, '0');
    return `${candYYYY}-${candMM}-${candDD}T${hh}:${min}`;
  };
  const renderMonthlyCalendar = () => {
    const days = getDaysOfMonth(currentDate);
    const month = currentDate.getMonth();

    return (
      <div className="flex flex-col h-full min-w-[700px]">
        {/* Sticky Weekday Header Row */}
        <div className="sticky top-0 z-20 flex bg-surface/95 border-b border-muted/10 backdrop-blur select-none">
          {weekdays.map((dayName, idx) => (
            <div
              key={idx}
              className="flex-1 text-center py-2 border-l first:border-l-0 border-muted/15"
            >
              <span className="text-[10px] font-bold tracking-wider uppercase text-foreground/55">
                {dayName.substring(0, 3)}
              </span>
            </div>
          ))}
        </div>

        {/* 6 Weeks Grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-muted/20 border-b border-muted/20 flex-1">
          {days.map((day, idx) => {
            const isCurrentMonth = day.getMonth() === month;
            const isDayToday = isToday(day);
            const isPast = (() => {
              const d = new Date(day);
              d.setHours(23, 59, 59, 999);
              return d < new Date();
            })();

            const dayVideos = combinedVideos.filter(v => isSameDay(day, v.publish_time))
              .sort((a, b) => new Date(a.publish_time) - new Date(b.publish_time));

            return (
              <div
                key={idx}
                className={`min-h-[110px] p-2 flex flex-col gap-1.5 relative group/monthcell transition-colors border-l first:border-l-0 border-muted/15
                  ${isDayToday ? 'bg-accent/[0.03]' : ''}
                  ${!isCurrentMonth ? 'bg-muted/[0.03]' : ''}
                  ${isPast ? 'pb-2' : 'pb-7'}`}
              >
                {/* Cell Header: Day Number */}
                <div className="flex items-center justify-between select-none">
                  <span className={`text-[10px] font-bold leading-none w-4.5 h-4.5 flex items-center justify-center rounded-full
                    ${isDayToday ? 'bg-accent text-accent-foreground font-black' : isCurrentMonth ? 'text-foreground/80' : 'text-foreground/30'}`}
                  >
                    {day.getDate()}
                  </span>
                  
                  {/* Hover Quick Add Plus Button for future/today */}
                  {!isPast && (
                    <button
                      onClick={() => {
                        const timeStr = getNextSlotForDay(day);
                        setSelectorCell({ day, hour: parseInt(timeStr.split('T')[1]), smartTime: timeStr });
                      }}
                      className="opacity-0 group-hover/monthcell:opacity-100 transition-opacity duration-150 p-0.5 bg-accent text-accent-foreground rounded cursor-pointer hover:opacity-90 shadow-sm"
                      title={language === 'tr' ? 'Bu güne video ekle' : 'Add video to this day'}
                    >
                      <Plus size={9} strokeWidth={3} />
                    </button>
                  )}
                </div>

                {/* Day's Videos List */}
                <div className="flex-1 overflow-y-auto pr-0.5 space-y-1.5 scrollbar-thin">
                  {dayVideos.map((video) => {
                    const isSelected = activePath === video.path;
                    const upload = video.uploadStatus;
                    
                    return (
                      <CalendarListVideoCard
                        key={video.path}
                        video={video}
                        isSelected={isSelected}
                        upload={upload}
                        API_URL={API_URL}
                        language={language}
                        formatPublishTime={formatPublishTime}
                        onClick={() => {
                          if (upload && upload.status === 'running') {
                            setViewUploadTask(upload);
                          } else {
                            handleVideoCardClick(video);
                          }
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background/30 backdrop-blur border border-muted/10 rounded-2xl p-8 min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-foreground/50">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <span className="text-sm font-medium">Takvim yükleniyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-200">

      {/* Main Grid Wrapper */}
      <div 
        ref={gridContainerRef}
        className="flex-1 min-h-0 overflow-y-auto border-t border-muted/10 relative bg-muted/[0.02] scrollbar-thin"
      >
        {calendarView === 'week' ? (
          <>
            {/* Sticky Weekday Header Row */}
            <div className="sticky top-0 z-20 flex bg-surface/95 border-b border-muted/10 backdrop-blur select-none">
              {/* Time Corner cell */}
              <div className="w-14 shrink-0 border-r border-muted/10 flex items-center justify-center py-2.5">
                <Calendar size={12} className="text-foreground/30" />
              </div>
              {/* 7 Day headers */}
              {daysOfWeek.map((day, idx) => {
                const isDayToday = isToday(day);
                return (
                  <div
                    key={idx}
                    className={`flex-1 text-center py-2.5 flex flex-col items-center justify-center border-l border-muted/15 min-w-[120px] relative group/dayheader
                      ${isDayToday ? 'bg-accent/[0.04]' : ''}`}
                  >
                    <span className={`text-[10px] font-bold tracking-wider uppercase leading-none mb-1
                      ${isDayToday ? 'text-accent' : 'text-foreground/55'}`}
                    >
                      {weekdays[idx].substring(0, 3)}
                    </span>
                    <span className={`text-xs font-bold leading-none w-5 h-5 flex items-center justify-center rounded-full
                      ${isDayToday ? 'bg-accent text-accent-foreground font-black' : 'text-foreground/80'}`}
                    >
                      {day.getDate()}
                    </span>

                    {/* Hover plus button – day-level quick-add, only for today or future days */}
                    {(() => {
                      const endOfDay = new Date(day);
                      endOfDay.setHours(23, 59, 59, 999);
                      return endOfDay >= new Date();
                    })() && (
                      <button
                        onClick={() => {
                          const timeStr = getNextSlotForDay(day);
                          setSelectorCell({ day, hour: parseInt(timeStr.split('T')[1]), smartTime: timeStr });
                        }}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover/dayheader:opacity-100 transition-opacity duration-150 flex items-center gap-0.5 bg-accent text-accent-foreground text-[9px] font-black px-1.5 py-1 rounded-md cursor-pointer hover:opacity-90 select-none shadow-sm"
                        title={language === 'tr' ? 'Bu güne video ekle' : 'Add video to this day'}
                      >
                        <Plus size={9} strokeWidth={3} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 24 Hour Rows */}
            <div className="flex flex-col divide-y divide-muted/20">
              {hours.map((hour) => (
                <div 
                  key={hour} 
                  data-hour={hour}
                  className="flex hover:bg-foreground/[0.005] transition-colors min-h-[105px]"
                >
                  {/* Hour Axis Cell */}
                  <div className="w-14 shrink-0 flex items-start justify-center pt-2 border-r border-muted/10 text-[9px] font-mono text-foreground/45 font-bold select-none bg-surface/10">
                    {String(hour).padStart(2, '0')}:00
                  </div>

                  {/* 7 Day cells for this hour */}
                  {daysOfWeek.map((day, idx) => {
                    const cellVideos = combinedVideos.filter(v => 
                      isSameDay(day, v.publish_time) && new Date(v.publish_time).getHours() === hour
                    ).sort((a, b) => new Date(a.publish_time) - new Date(b.publish_time));
                    
                    const isDayToday = isToday(day);
                    const isSlotPast = (() => {
                      const d = new Date(day);
                      d.setHours(hour, 59, 59, 999);
                      return d < new Date();
                    })();
                    
                    return (
                      <div
                        key={idx}
                        className={`flex-1 flex flex-col gap-1 border-l border-muted/15 min-w-[120px] relative group
                          ${isSlotPast ? 'p-2' : 'pt-2 px-2 pb-7'}
                          ${isDayToday ? 'bg-accent/[0.01]' : ''}`}
                      >
                        {cellVideos.map((video) => {
                          const isSelected = activePath === video.path;
                          const upload = video.uploadStatus;
                          const isUploading = upload && upload.status === 'running';
                          const isFailed = upload && upload.status === 'error';
                          
                          return (
                            <CalendarVideoCard
                              key={video.path}
                              video={video}
                              isSelected={isSelected}
                              upload={upload}
                              API_URL={API_URL}
                              language={language}
                              formatPublishTime={formatPublishTime}
                              onClick={() => {
                                if (upload && upload.status === 'running') {
                                  setViewUploadTask(upload);
                                } else {
                                  handleVideoCardClick(video);
                                }
                              }}
                            />
                          );
                        })}
                        
                        {/* Plus Button - secondary style, visible on hover only for future slots */}
                        {!(() => {
                          const slotDate = new Date(day);
                          slotDate.setHours(hour, 59, 59, 999);
                          return slotDate < new Date();
                        })() && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectorCell({ day, hour });
                            }}
                            className="absolute bottom-1.5 right-1.5 w-5 h-5 bg-active hover:bg-hover text-foreground/80 hover:text-foreground border border-muted/10 rounded-md shadow opacity-0 group-hover:opacity-100 transition-all cursor-pointer z-10 flex items-center justify-center scale-90 hover:scale-100"
                            title={language === 'tr' ? 'Video Ekle' : 'Add Video'}
                          >
                            <Plus size={10} strokeWidth={3} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </>
        ) : (
          renderMonthlyCalendar()
        )}
      </div>

      {/* Unshared Videos Selector Modal */}
      <Modal
        isOpen={!!selectorCell}
        onClose={() => setSelectorCell(null)}
        className="w-full max-w-5xl h-[85vh] bg-modal-base border border-muted/10 rounded-2xl flex flex-col p-6 animate-in zoom-in-95 duration-150 shadow-2xl"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-muted/10 pb-3 shrink-0">
          <div className="flex flex-col">
            <h3 className="text-sm font-bold text-foreground">
              {language === 'tr' ? 'Planlanacak Videoyu Seçin' : 'Select Video to Schedule'}
            </h3>
            <span className="text-[10px] font-semibold text-accent mt-0.5">
              {selectorCell && new Date(selectorCell.day).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })} - {selectorCell && String(selectorCell.hour).padStart(2, '0')}:00
            </span>
          </div>
          <button
            onClick={() => setSelectorCell(null)}
            className="p-1 text-foreground/55 hover:text-foreground hover:bg-muted/30 rounded-lg transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Videos Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 pr-1 mt-4 scrollbar-thin">
          {(() => {
            if (!selectorCell) return null;
            const unsharedVideos = videos.filter(v => !v.shared && !v.hidden && !v.is_folder);
            if (unsharedVideos.length === 0) {
              return (
                <div className="col-span-full flex flex-col items-center justify-center py-10 text-foreground/45">
                  <span className="text-xs font-semibold text-center">
                    {language === 'tr' ? 'Bu klasörde planlanabilecek tamamlanmamış video bulunamadı.' : 'No unshared videos found in this folder to schedule.'}
                  </span>
                </div>
              );
            }
            return unsharedVideos.map(video => (
              <VideoCard
                key={video.path}
                video={video}
                activePath={null}
                selectedPaths={new Set()}
                clipboardState={{ paths: [], operation: null }}
                selectionMode={false}
                EXT_COLORS={{ ".mp4": "bg-blue-500/80", ".mov": "bg-purple-500/80", ".avi": "bg-red-500/80", ".mkv": "bg-amber-500/80", ".webm": "bg-green-500/80" }}
                API_URL={API_URL}
                handleItemClick={() => {
                  let initialTimeStr;
                  if (selectorCell.smartTime) {
                    initialTimeStr = selectorCell.smartTime;
                  } else {
                    const targetDate = new Date(selectorCell.day);
                    targetDate.setHours(selectorCell.hour, 0, 0, 0);
                    const yyyy = targetDate.getFullYear();
                    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
                    const dd = String(targetDate.getDate()).padStart(2, '0');
                    const hh = String(targetDate.getHours()).padStart(2, '0');
                    initialTimeStr = `${yyyy}-${mm}-${dd}T${hh}:00`;
                  }
                  if (openPublishModalWithTime) {
                    openPublishModalWithTime(video.path, initialTimeStr);
                  }
                  setSelectorCell(null);
                }}
                handleCardMouseDown={() => {}}
                handleCardMouseEnter={() => {}}
                handleContextMenu={() => {}}
                toggleSharedState={() => {}}
                handleCopyPath={() => {}}
                language={language}
              />
            ));
          })()}
        </div>
      </Modal>

      {/* Upload Task Steps Modal */}
      {viewUploadTask && (
        <Modal
          isOpen={true}
          onClose={() => setViewUploadTask(null)}
          className="w-full max-w-sm bg-modal-surface border border-foreground/5 rounded-2xl p-6 shadow-2xl flex flex-col gap-5 select-none animate-in zoom-in-95 duration-150"
        >
          <div className="flex items-center gap-3 border-b border-foreground/5 pb-3">
            {viewUploadTask.status === 'running' && (
              <Loader2 className="w-4 h-4 text-accent animate-spin" />
            )}
            {viewUploadTask.status === 'success' && (
              <Check className="w-4 h-4 text-green-500 font-bold" />
            )}
            {viewUploadTask.status === 'error' && (
              <X className="w-4 h-4 text-red-500" />
            )}
            <span className="text-sm font-bold text-foreground">
              {viewUploadTask.status === 'running' && (language === 'tr' ? 'Sosyal Medya Gönderimi' : 'Social Media Publishing')}
              {viewUploadTask.status === 'success' && (language === 'tr' ? 'Gönderim Başarılı' : 'Publishing Successful')}
              {viewUploadTask.status === 'error' && (language === 'tr' ? 'Gönderim Başarısız' : 'Publishing Failed')}
            </span>
          </div>
          
          <div className="flex flex-col gap-3.5">
            {viewUploadTask.steps.map((step) => {
              const isRunning = step.status === 'running';
              const isSuccess = step.status === 'success';
              const isError = step.status === 'error';
              
              return (
                <div key={step.id} className="flex items-center justify-between text-xs gap-3">
                  <span className={`font-medium ${isRunning ? 'text-foreground font-semibold' : isSuccess ? 'text-foreground/75' : isError ? 'text-danger font-semibold' : 'text-foreground/35'}`}>
                    {step.label}
                  </span>
                  <div className="shrink-0 flex items-center justify-center w-5 h-5">
                    {isRunning && (
                      <Loader2 className="w-3.5 h-3.5 text-accent animate-spin" />
                    )}
                    {isSuccess && (
                      <Check className="w-4 h-4 text-green-500 font-bold" />
                    )}
                    {isError && (
                      <X className="w-4 h-4 text-red-500 font-bold" />
                    )}
                    {step.status === 'idle' && (
                      <div className="w-1.5 h-1.5 rounded-full bg-foreground/20" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-2 mt-2 pt-3 border-t border-foreground/5">
            {viewUploadTask.status === 'error' && (
              <>
                <p className="text-[11px] text-danger/80 break-words font-mono bg-red-500/[0.03] p-2.5 rounded-lg border border-red-500/10 max-h-24 overflow-y-auto">
                  {viewUploadTask.error}
                </p>
                {/* Retry action */}
                <Button
                  variant="primary"
                  onClick={() => {
                    setViewUploadTask(null);
                    openPublishModalWithTime(viewUploadTask.video.path, viewUploadTask.publish_time);
                  }}
                  className="py-2 text-xs font-semibold w-full"
                >
                  {language === 'tr' ? 'Yeniden Dene' : 'Retry'}
                </Button>
              </>
            )}
            <Button
              variant="secondary"
              onClick={() => setViewUploadTask(null)}
              className="py-2 text-xs font-semibold w-full"
            >
              {language === 'tr' ? 'Kapat' : 'Close'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
