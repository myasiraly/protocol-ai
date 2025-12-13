
import React from 'react';
import { MessageSquarePlus, Trash2, MessageSquare, X, ChevronLeft } from 'lucide-react';
import { Conversation } from '../types';
import { playSound } from '../utils/audio';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string, e: React.MouseEvent) => void;
  onNewChat: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  conversations,
  currentConversationId,
  onSelectConversation,
  onDeleteConversation,
  onNewChat
}) => {
  return (
    <>
      {/* Backdrop for mobile */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Sidebar Panel */}
      <div className={`
        fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#020617]/95 backdrop-blur-2xl border-r border-white/5 shadow-2xl transform transition-transform duration-300 ease-out flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        
        {/* Header */}
        <div className="h-24 flex items-center justify-between px-6 border-b border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent">
          <span className="text-xs font-mono font-bold tracking-[0.2em] text-slate-400 uppercase">
            Encrypted Logs
          </span>
          <button 
            onClick={onClose}
            className="md:hidden text-slate-500 hover:text-white transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-4">
          <button
            onClick={() => {
              playSound('click');
              onNewChat();
              if (window.innerWidth < 768) onClose();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 bg-sky-600/10 hover:bg-sky-600/20 border border-sky-500/20 hover:border-sky-500/40 text-sky-400 rounded-xl transition-all group"
          >
            <div className="p-1.5 bg-sky-500/20 rounded-lg group-hover:scale-110 transition-transform">
              <MessageSquarePlus size={18} />
            </div>
            <span className="text-xs font-mono font-bold tracking-wider uppercase">New Protocol</span>
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-2 space-y-1">
          {conversations.length === 0 ? (
            <div className="text-center py-10 opacity-30">
              <MessageSquare size={32} className="mx-auto mb-3 text-slate-500" />
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">No Active Logs</p>
            </div>
          ) : (
            conversations.sort((a, b) => b.updatedAt - a.updatedAt).map((conv) => (
              <div 
                key={conv.id}
                onClick={() => {
                  if (currentConversationId !== conv.id) {
                    playSound('click');
                    onSelectConversation(conv.id);
                    if (window.innerWidth < 768) onClose();
                  }
                }}
                className={`
                  group relative flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-all border
                  ${currentConversationId === conv.id 
                    ? 'bg-white/[0.08] border-white/10 text-white' 
                    : 'bg-transparent border-transparent text-slate-400 hover:bg-white/[0.03] hover:text-slate-200'}
                `}
              >
                <MessageSquare size={14} className={`shrink-0 ${currentConversationId === conv.id ? 'text-sky-400' : 'opacity-50'}`} />
                
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <span className="text-xs font-medium truncate font-sans">
                    {conv.title}
                  </span>
                  <span className="text-[9px] font-mono opacity-40 uppercase tracking-wider">
                    {new Date(conv.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    playSound('click');
                    onDeleteConversation(conv.id, e);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-md transition-all"
                  title="Delete Log"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-white/5 bg-black/20">
          <div className="flex items-center gap-2 text-[10px] text-slate-600 font-mono">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span>SYSTEM: ONLINE</span>
          </div>
        </div>
      </div>
    </>
  );
};
