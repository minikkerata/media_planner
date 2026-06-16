import React, { useState } from 'react';

export default function Button({ 
  children, 
  variant = 'secondary', 
  size = 'default', 
  className = '', 
  hoverActionIcon: HoverIcon,
  hoverActionFeedbackIcon: FeedbackIcon,
  onHoverActionClick,
  ...props 
}) {
  const [showFeedback, setShowFeedback] = useState(false);

  const handleHoverAction = (e) => {
    e.stopPropagation();
    if (onHoverActionClick) {
      onHoverActionClick(e);
      if (FeedbackIcon) {
        setShowFeedback(true);
        setTimeout(() => setShowFeedback(false), 2000);
      }
    }
  };

  const baseStyles = 'inline-flex items-center font-medium transition-colors rounded-lg shrink-0 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'justify-center bg-accent text-accent-foreground hover:opacity-90 shadow-sm',
    secondary: 'justify-center bg-active hover:bg-hover text-foreground border-0',
    dropdown: 'justify-between bg-base border border-foreground/10 hover:border-foreground/20 text-foreground text-sm rounded-md',
    ghost: 'justify-center text-foreground/50 hover:bg-active hover:text-foreground',
    'ghost-danger': 'text-red-400 hover:bg-red-400/10',
    danger: 'justify-center bg-red-500 text-foreground hover:bg-red-600',
    success: 'justify-center bg-success text-white hover:opacity-90 shadow-sm',
    outline: 'justify-center border border-foreground/5 text-foreground hover:bg-foreground/5',
    'menu-item': 'justify-start hover:bg-element text-foreground w-full',
    filled: 'justify-center bg-active hover:bg-hover text-foreground border-0 px-2.5 h-8 rounded-ui-md text-xs font-semibold',
    'header-flat': 'justify-center hover:bg-hover text-foreground/80 hover:text-foreground border-0 px-2.5 h-8 rounded-ui-md text-xs font-semibold',
    none: ''
  };

  const sizes = {
    default: 'px-4 py-2 text-sm',
    sm: 'px-3 py-1.5 text-sm',
    lg: 'px-6 py-3 text-base',
    icon: 'p-2 justify-center',
    none: ''
  };

  const variantStyle = variants[variant] !== undefined ? variants[variant] : variants.secondary;
  const sizeStyle = sizes[size] !== undefined ? sizes[size] : sizes.default;

  return (
    <button 
      className={`${baseStyles} ${variantStyle} ${sizeStyle} ${className}`}
      {...props}
    >
      {children}
      {HoverIcon && (
        <div 
          className="absolute right-8 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-1.5 rounded-md hover:bg-foreground/10 z-10"
          onClick={handleHoverAction}
        >
          {showFeedback && FeedbackIcon ? (
            <FeedbackIcon size={14} className="text-green-500" />
          ) : (
            <HoverIcon size={14} className="text-foreground/70 hover:text-foreground" />
          )}
        </div>
      )}
    </button>
  );
}
