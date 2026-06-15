import React from 'react';

export default function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 100 80" className="h-full w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Stylized M/Figure */}
        <circle cx="50" cy="20" r="10" className="fill-orange-500" />
        <path d="M10 70 Q 30 10, 50 40 Q 70 10, 90 70" stroke="currentColor" strokeWidth="10" className="text-orange-500" fill="none" strokeLinecap="round" />
        <line x1="5" y1="65" x2="95" y2="65" stroke="currentColor" strokeWidth="4" className="text-orange-500" />
      </svg>
    </div>
  );
}
