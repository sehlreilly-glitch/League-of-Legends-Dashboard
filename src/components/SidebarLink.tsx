import React from 'react';

interface SidebarLinkProps {
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode; 
  label: string; 
  className?: string;
}

export function SidebarLink({ active, onClick, icon, label, className = "" }: SidebarLinkProps) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all duration-300 group ${active ? 'bg-brand-gold text-brand-green shadow-lg shadow-brand-gold/10' : 'text-gray-400 hover:bg-white/5 hover:text-brand-gold'} ${className}`}
    >
      <div className={`transition-transform group-hover:scale-110 ${active ? 'text-brand-green' : 'text-brand-gold/60'}`}>
        {icon}
      </div>
      <span className="font-black text-[9px] uppercase tracking-widest italic font-display flex-1 text-left">{label}</span>
    </button>
  );
}
