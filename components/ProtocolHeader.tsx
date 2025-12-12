
import React from 'react';
import { User as UserIcon, LogOut } from 'lucide-react';
import { UserProfile } from '../types';

interface ProtocolHeaderProps {
  user: UserProfile | null;
  onLogout?: () => void;
}

export const ProtocolHeader: React.FC<ProtocolHeaderProps> = ({ user, onLogout }) => {
  return (
    <header className="fixed top-0 left-0 right-0 h-24 z-40 flex flex-col transition-all duration-500 bg-gradient-to-b from-protocol-bg via-protocol-bg/90 to-transparent backdrop-blur-[2px]">
      
      {/* Upper Bar: Brand & User */}
      <div className="flex items-center justify-between px-4 md:px-8 h-20 relative">
        {/* Floating Glass Island Background */}
        <div className="absolute top-4 left-4 right-4 bottom-0 border border-white/5 rounded-2xl bg-white/[0.02] backdrop-blur-md shadow-sm pointer-events-none" />

        {/* Brand */}
        <div className="relative z-10 flex items-center gap-5 pl-4">
          <div className="w-10 h-10 bg-gradient-to-b from-slate-800 to-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-black/40 border border-white/10 group overflow-hidden">
            <div className="absolute inset-0 bg-sky-500/20 blur-lg group-hover:bg-sky-500/30 transition-all opacity-0 group-hover:opacity-100" />
            {/* Custom AI Logo */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10 text-sky-400">
               <path d="M14 7V17M14 7C14 4.79086 12.2091 3 10 3H7C4.79086 3 3 4.79086 3 7V17C3 19.2091 4.79086 21 7 21H10C12.2091 21 14 19.2091 14 17M14 17H16M21 21V11M21 7V7.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-base font-bold tracking-[0.25em] text-white font-sans leading-none mb-1">PROTOCOL</h1>
            <div className="flex items-center gap-2">
              <span className="flex h-1.5 w-1.5 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.6)] animate-pulse-slow"></span>
              <span className="text-[9px] uppercase text-slate-400 tracking-widest font-mono">The AI Chief of Staff</span>
            </div>
          </div>
        </div>
        
        {/* Status & Profile */}
        <div className="relative z-10 flex items-center gap-6 pr-4">
          
          {/* User Profile */}
          <div className="flex items-center gap-4 pl-8 border-l border-white/5 group relative">
            <div className="hidden md:flex flex-col items-end mr-1">
              <span className="text-xs font-bold text-slate-200 font-sans tracking-widest uppercase mb-0.5 max-w-[150px] truncate text-right">
                {user?.name || 'OPERATOR'}
              </span>
              <span className="text-[10px] text-sky-400 font-mono tracking-wider flex items-center gap-1.5 bg-sky-950/30 px-2 py-0.5 rounded-full border border-sky-500/20">
                <span className="w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.8)]"></span>
                {user?.email || 'uplink_secure'}
              </span>
            </div>
            
            <div className="w-10 h-10 rounded-full bg-slate-800 ring-2 ring-white/5 overflow-hidden relative flex items-center justify-center shadow-lg cursor-pointer transition-transform hover:scale-105">
              {user?.picture ? (
                <img src={user.picture} alt="User" className="w-full h-full object-cover" />
              ) : (
                <UserIcon size={18} className="text-slate-400" />
              )}
            </div>

            {/* Logout Tooltip/Button */}
            {onLogout && (
              <button 
                onClick={onLogout}
                className="absolute top-12 right-0 bg-slate-900 border border-white/10 rounded-lg px-3 py-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all pointer-events-none group-hover:pointer-events-auto hover:bg-slate-800 shadow-xl translate-y-2 group-hover:translate-y-0"
              >
                <LogOut size={12} className="text-red-400" />
                <span className="text-[10px] text-slate-300 font-mono tracking-wider uppercase">Disconnect</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
