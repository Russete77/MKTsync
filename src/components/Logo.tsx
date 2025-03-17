import React from 'react';

interface LogoProps {
  className?: string;
}

export function Logo({ className = "h-8" }: LogoProps) {
  return (
    <div className="flex items-center">
      <img 
        src="/mktsync-logo.svg" 
        alt="MKTsync" 
        className={className}
      />
      <span className="ml-2 text-xl font-bold text-gray-900">MKTsync</span>
    </div>
  );
}