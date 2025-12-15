
import React from 'react';
import { Plus, Trash2, MessageSquare, X, ChevronLeft, Disc, PanelLeftClose } from 'lucide-react';
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
      <div 
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      <div className={`
        fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#0A0A0A] border-r border-white/5 transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        
        <div className="h-16 flex items-center justify-between px-5 border-b border-white/5">
          <div className="flex items-center gap-2 opacity-50">
             <Disc size={16} className="animate-spin-slow" />
             <span className="text-[10px] font-mono tracking-widest uppercase">Memory Banks</span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors" title="Collapse">
            <PanelLeftClose size={18} className="hidden md:block" />
            <X size={18} className="md:hidden" />
          </button>
        </div>

        <div className="p-4">
          <button
            onClick={() => {
              playSound('click');
              onNewChat();
              if (window.innerWidth < 768) onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-white text-black hover:bg-gray-200 rounded-lg transition-colors font-medium text-sm"
          >
            <Plus size={16} />
            <span>New Protocol</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-2 space-y-0.5">
          {conversations.length === 0 ? (
            <div className="text-center py-12 opacity-20">
              <p className="text-[10px] font-mono uppercase tracking-widest text-white">System Idle</p>
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
                  group relative flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all
                  ${currentConversationId === conv.id 
                    ? 'bg-white/10 text-white' 
                    : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'}
                `}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate font-medium">{conv.title}</p>
                  <p className="text-[10px] font-mono opacity-40 mt-0.5">
                    {new Date(conv.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    playSound('click');
                    onDeleteConversation(conv.id, e);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded transition-all"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};
