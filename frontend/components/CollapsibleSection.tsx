import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function CollapsibleSection({ title, icon: Icon, children, defaultOpen = false, className = '' }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`overview-section ${className}`}>
      <div className="section-header" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center">
          <Icon className="h-5 w-5 mr-3 text-accent-cyan" />
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        <ChevronDown
          className={`h-5 w-5 text-text-secondary transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </div>
      <div className={`section-content-wrapper ${isOpen ? 'open' : ''}`}>
        <div className="section-content">
          {children}
        </div>
      </div>
    </div>
  );
}
