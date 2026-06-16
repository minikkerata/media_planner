import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

const Textarea = forwardRef(({ value, className = '', minHeight = 24, maxHeight = 200, ...props }, ref) => {
  const innerRef = useRef(null);

  useImperativeHandle(ref, () => innerRef.current);

  useEffect(() => {
    if (innerRef.current) {
      innerRef.current.style.height = `${minHeight}px`;
      const scrollHeight = innerRef.current.scrollHeight;
      innerRef.current.style.height = Math.max(minHeight, Math.min(scrollHeight, maxHeight)) + 'px';
    }
  }, [value, minHeight, maxHeight]);

  return (
    <textarea
      ref={innerRef}
      value={value}
      className={`bg-transparent text-foreground font-sans text-base resize-none outline-none overflow-y-auto px-3 py-1 placeholder-foreground/50 custom-scrollbar leading-tight w-full ${className}`}
      {...props}
    />
  );
});

Textarea.displayName = 'Textarea';

export default Textarea;
