
import React from 'react';
import { User as UserIcon, LogOut, Menu, Activity } from 'lucide-react';
import { UserProfile } from '../types';

interface ProtocolHeaderProps {
  user: UserProfile | null;
  onLogout?: () => void;
  onToggleSidebar?: () => void;
}

export const ProtocolHeader: React.FC<ProtocolHeaderProps> = ({ user, onLogout, onToggleSidebar }) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-16 flex items-center justify-between px-4 md:px-6 bg-gradient-to-b from-[#050505] to-transparent pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-4">
        <button 
          onClick={onToggleSidebar}
          className="text-gray-500 hover:text-white transition-colors"
        >
          <Menu size={20} />
        </button>
        
        <div className="flex items-center gap-2 select-none">
          <span className="text-sm font-bold tracking-[0.2em] text-white">PROTOCOL</span>
          <div className="h-4 w-[1px] bg-white/10 mx-1"></div>
          <Activity size={12} className="text-emerald-500" />
        </div>
      </div>

      <div className="pointer-events-auto flex items-center gap-4">
         {user && (
           <div className="flex items-center gap-3 group">
             <div className="text-right hidden sm:block">
               <div className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">{user.name}</div>
             </div>
             <div className="relative">
                <div className="w-8 h-8 rounded-full bg-zinc-900 border border-white/10 overflow-hidden">
                   {user.picture ? <img src={user.picture} alt="" className="w-full h-full object-cover" /> : <UserIcon size={14} className="m-2 text-gray-500" />}
                </div>
                {onLogout && (
                   <button 
                     onClick={onLogout}
                     className="absolute top-full right-0 mt-2 bg-zinc-900 border border-white/10 py-1.5 px-3 rounded-lg text-[10px] text-red-400 uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
                   >
                     Disconnect
                   </button>
                )}
             </div>
           </div>
         )}
      </div>
    </header>
  );
};
