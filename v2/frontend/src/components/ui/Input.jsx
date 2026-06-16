import React, { forwardRef } from 'react';

const Input = forwardRef(({ className = '', variant = 'default', ...props }, ref) => {
  const baseStyles = "w-full outline-none transition-all";
  
  const variants = {
    default: "bg-active text-foreground px-3 py-1.5 rounded-md border border-foreground/5 focus:border-blue-500/50",
    finder: "bg-white/[0.06] backdrop-blur-md border border-white/[0.08] focus:border-accent/40 rounded-ui-md px-2 py-1 text-xs text-foreground placeholder-foreground/30 focus:outline-none focus:ring-0"
  };

  return (
    <input
      ref={ref}
      className={`${baseStyles} ${variants[variant] || variants.default} ${className}`}
      {...props}
    />
  );
});

Input.displayName = 'Input';

export default Input;
