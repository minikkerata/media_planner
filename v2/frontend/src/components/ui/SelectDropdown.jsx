import React, { useState } from 'react';
import Button from './Button';
import DropdownMenu from './DropdownMenu';

export default function SelectDropdown({ value, options, onChange, icon: DefaultIcon, className = "" }) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find(o => o.value === value) || options[0];
  const CurrentIcon = selectedOption?.icon || DefaultIcon;

  return (
    <div className="relative">
      <Button 
        variant="none"
        size="none"
        onClick={() => setIsOpen(!isOpen)}
        className={`${className} p-1.5 h-8 w-8 transition-all flex items-center justify-center hover:bg-hover text-foreground/80 hover:text-foreground rounded-ui-md cursor-pointer`}
        title={selectedOption?.label}
      >
        {CurrentIcon && <CurrentIcon size={16} className="text-foreground/80 shrink-0" />}
      </Button>
      <DropdownMenu
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        className="min-w-[160px] w-max mt-1 right-0 origin-top-right"
        items={options.map(opt => ({
          label: opt.label,
          icon: opt.icon,
          selected: opt.value === value,
          onClick: () => onChange(opt.value)
        }))}
      />
    </div>
  );
}
