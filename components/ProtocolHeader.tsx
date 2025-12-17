
import React, { useState, useEffect, useRef } from 'react';
import { Menu, Cloud, CloudOff, RefreshCw, Settings, LogOut, User as UserIcon, ChevronDown } from 'lucide-react';
import { UserProfile } from '../types';
import { ProtocolLogo } from './ProtocolLogo';

interface ProtocolHeaderProps {
  user: UserProfile | null;
  onLogout?: () => void;
  onToggleSidebar?: () => void;
  isLoading?: boolean;
  isSaving?: boolean;
  onOpenTraining?: () => void;
  onOpenSettings?: () => void;
}

export const ProtocolHeader: React.FC<ProtocolHeaderProps> = ({ 
  user, 
  onLogout, 
  onToggleSidebar, 
  isLoading = false, 
  isSaving = false,
  onOpenTraining,
  onOpenSettings
}) => {
  const [time, setTime] = useState(new Date());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      clearInterval(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Format Date: "OCTOBER 14" - Editorial Style
  const dateStr = time.toLocaleDateString('en-US', { day: '2-digit', month: 'long' }).toUpperCase();
  const timeStr = time.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-20 flex items-center justify-between px-6 bg-protocol-obsidian/80 backdrop-blur-xl border-b border-protocol-border transition-all duration-500">
      
      {/* Left: Branding & Toggle */}
      <div className="flex items-center gap-5">
        <button 
          onClick={onToggleSidebar}
          className="text-protocol-platinum hover:text-protocol-muted transition-colors opacity-80 hover:opacity-100 p-1.5 rounded-full hover:bg-protocol-border"
        >
          <Menu size={20} strokeWidth={2} />
        </button>
        
        <div className="flex items-center gap-1 select-none group">
          <ProtocolLogo size={24} className="text-protocol-muted group-hover:text-protocol-platinum transition-colors" />
          
          <div className="relative flex items-center justify-center w-2 h-2 ml-2">
             <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${isLoading ? 'bg-protocol-champagne animate-pulse shadow-[0_0_10px_#D4AF37]' : 'bg-protocol-muted'}`}></div>
          </div>
        </div>
      </div>

      {/* Center: System Clock (Absolute on Desktop) - Bloomberg Terminal Style */}
      <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-8 text-[10px] font-mono text-protocol-muted tracking-[0.2em] select-none pointer-events-none">
         <span className="text-protocol-platinum">{dateStr}</span>
         <div className="w-[1px] h-3 bg-protocol-border"></div>
         <span>{timeStr} UTC</span>
      </div>

      {/* Right: User Profile & Sync Status */}
      <div className="flex items-center gap-8">
         
         {/* Sync Indicator - Shows history is working */}
         {user && (
           <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-protocol-charcoal border border-protocol-border">
              {isSaving ? (
                <>
                  <RefreshCw size={10} className="text-protocol-champagne animate-spin" />
                  <span className="text-[8px] font-mono uppercase tracking-widest text-protocol-champagne">UPLOADING</span>
                </>
              ) : (
                <>
                  <Cloud size={10} className="text-emerald-500/80" />
                  <span className="text-[8px] font-mono uppercase tracking-widest text-protocol-muted">SYNCED</span>
                </>
              )}
           </div>
         )}

         {user && (
           <div className="relative" ref={menuRef}>
             <button 
               onClick={() => setIsMenuOpen(!isMenuOpen)}
               className="flex items-center gap-3 group focus:outline-none"
             >
               <div className="text-right hidden sm:block">
                 <div className="text-xs text-protocol-platinum font-heading font-medium tracking-wide group-hover:text-protocol-champagne transition-colors">{user.name}</div>
               </div>
               <div className="relative w-8 h-8 rounded-full bg-protocol-charcoal border border-protocol-border overflow-hidden shadow-heavy group-hover:border-protocol-champagne/50 transition-all duration-300 flex items-center justify-center">
                   {user.picture ? (
                     <img src={user.picture} alt="" className="w-full h-full object-cover" />
                   ) : (
                     <span className="font-heading text-protocol-platinum text-sm">{user.name.charAt(0)}</span>
                   )}
               </div>
               <ChevronDown size={12} className={`text-protocol-muted transition-transform duration-300 ${isMenuOpen ? 'rotate-180' : ''}`} />
             </button>

             {/* Dropdown Menu */}
             {isMenuOpen && (
               <div className="absolute top-full right-0 mt-3 w-64 bg-protocol-charcoal border border-protocol-border rounded-xl shadow-2xl overflow-hidden animate-fade-in origin-top-right z-50 ring-1 ring-black/5">
                  <div className="p-4 border-b border-protocol-border bg-protocol-obsidian/30">
                     <p className="text-xs text-protocol-platinum font-bold truncate">{user.name}</p>
                     <p className="text-[10px] text-protocol-muted truncate font-mono">{user.email}</p>
                  </div>
                  <div className="p-1.5 space-y-0.5">
                    <button onClick={() => { setIsMenuOpen(false); onOpenSettings?.(); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-[10px] uppercase tracking-widest text-protocol-muted hover:text-protocol-platinum hover:bg-protocol-border/50 rounded-lg transition-colors text-left group">
                       <Settings size={14} className="group-hover:text-protocol-platinum transition-colors" /> Settings
                    </button>
                  </div>
                  <div className="p-1.5 border-t border-protocol-border">
                    <button onClick={() => { setIsMenuOpen(false); onLogout?.(); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-[10px] uppercase tracking-widest text-protocol-swissRed hover:bg-red-500/10 rounded-lg transition-colors text-left">
                       <LogOut size={14} /> Logout
                    </button>
                  </div>
               </div>
             )}
           </div>
         )}
      </div>
    </header>
  );
};
