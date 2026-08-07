import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import Button from './Button';
import DropdownMenu from './DropdownMenu';

export default function SelectDropdown({ value, options, onChange, icon: DefaultIcon, className = "", classic = false, ghost = false }) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find(o => o.value === value) || options[0];
  const CurrentIcon = selectedOption?.icon || DefaultIcon;

  return (
    <div className="relative">
      {ghost ? (
        <Button 
          variant="none"
          size="none"
          onClick={() => setIsOpen(!isOpen)}
          className={`${className} flex items-center gap-1 text-foreground/70 hover:text-foreground transition cursor-pointer`}
          title={selectedOption?.label}
        >
          <span className="text-xs font-semibold">{selectedOption?.label}</span>
          <ChevronDown size={11} className="opacity-50 shrink-0" />
        </Button>
      ) : classic ? (
        <Button 
          variant="none"
          size="none"
          onClick={() => setIsOpen(!isOpen)}
          className={`${className} px-3 py-1.5 h-8 transition-all flex items-center gap-2 hover:bg-hover text-foreground/80 hover:text-foreground rounded-ui-md border border-foreground/5 bg-element`}
          title={selectedOption?.label}
        >
          {CurrentIcon && <CurrentIcon size={14} className="text-foreground/80 shrink-0" />}
          <span className="text-xs font-semibold pr-1">{selectedOption?.label}</span>
          <ChevronDown size={12} className="opacity-60 shrink-0 ml-auto" />
        </Button>
      ) : (
        <Button 
          variant="none"
          size="none"
          onClick={() => setIsOpen(!isOpen)}
          className={`${className} p-1.5 h-8 w-8 transition-all flex items-center justify-center hover:bg-hover text-foreground/80 hover:text-foreground rounded-ui-md`}
          title={selectedOption?.label}
        >
          {CurrentIcon && <CurrentIcon size={16} className="text-foreground/80 shrink-0" />}
        </Button>
      )}
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
