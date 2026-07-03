import React from 'react';

export default function Slider({
  min = 0,
  max = 100,
  step = 1,
  value,
  onChange,
  onMouseDown,
  onTouchStart,
  onMouseUp,
  onTouchEnd,
  onInput,
  className = '',
  accentColor = 'var(--theme-foreground)',
  trackColor = 'var(--theme-active)',
  widthClass = 'w-full'
}) {
  const percent = max > min ? ((value - min) / (max - min)) * 100 : 0;

  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={onChange}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onMouseUp={onMouseUp}
      onTouchEnd={onTouchEnd}
      onInput={onInput}
      tabIndex="-1"
      className={`h-1 rounded-full appearance-none cursor-pointer hover:h-1.5 transition-all focus:outline-none focus:ring-0 ${widthClass} ${className}`}
      style={{
        background: `linear-gradient(to right, ${accentColor} ${percent}%, ${trackColor} ${percent}%)`
      }}
    />
  );
}
