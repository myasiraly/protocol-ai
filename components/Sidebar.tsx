
import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, X, PanelLeftClose, Search, Edit2, Check, Download, History } from 'lucide-react';
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
  onRenameConversation: (id: string, newTitle: string) => void;
  onExportData: () => void;
  onClearAllHistory: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  conversations,
  currentConversationId,
  onSelectConversation,
  onDeleteConversation,
  onNewChat,
  onRenameConversation,
  onExportData,
  onClearAllHistory,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingId]);

  const filteredConversations = conversations
    .filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const startEditing = (e: React.MouseEvent, conv: Conversation) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const saveTitle = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (editingId && editTitle.trim()) {
      onRenameConversation(editingId, editTitle.trim());
      setEditingId(null);
    }
  };

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-700 md:hidden ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      <div className={`
        fixed top-0 bottom-0 left-0 z-50 w-72 bg-protocol-sidebar border-r border-protocol-border transform transition-transform duration-500 cubic-bezier(0.19, 1, 0.22, 1) flex flex-col rounded-r-3xl shadow-2xl
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        
        <div className="h-20 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-2 opacity-60 text-protocol-platinum">
             <History size={14} strokeWidth={1.5} />
             <span className="text-[9px] font-mono tracking-[0.25em] uppercase">Archives</span>
          </div>
          <button onClick={onClose} className="text-protocol-muted hover:text-protocol-platinum transition-colors p-1.5 rounded-full hover:bg-protocol-border" title="Collapse">
            <PanelLeftClose size={18} strokeWidth={1} className="hidden md:block" />
            <X size={18} strokeWidth={1} className="md:hidden" />
          </button>
        </div>

        <div className="px-6 pb-6 shrink-0 space-y-4">
          <button
            onClick={() => {
              playSound('click');
              onNewChat();
              if (window.innerWidth < 768) onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-protocol-platinum text-protocol-obsidian hover:bg-protocol-muted transition-all duration-500 font-heading font-semibold text-xs tracking-wide shadow-lg shadow-black/5 rounded-xl"
          >
            <Plus size={16} />
            <span>New Protocol</span>
          </button>
          
          <div className="relative group bg-protocol-input rounded-xl border border-protocol-border focus-within:border-protocol-muted transition-colors">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-protocol-muted group-focus-within:text-protocol-platinum transition-colors" />
            <input 
              type="text" 
              placeholder="Search Intelligence..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent border-none rounded-xl pl-10 pr-3 py-2.5 text-xs text-protocol-platinum focus:ring-0 focus:outline-none placeholder:text-protocol-muted font-sans"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-4">
          {conversations.length === 0 ? (
            <div className="text-center py-20 opacity-20">
              <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-protocol-platinum">No Records</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-12 opacity-30">
               <p className="text-[9px] text-protocol-muted font-mono tracking-widest">NO MATCHES</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
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
                  group relative flex items-start gap-3 py-3 px-3 cursor-pointer transition-all duration-300 rounded-lg mb-0.5
                  ${currentConversationId === conv.id ? 'bg-protocol-platinum/10' : 'hover:bg-protocol-border/50 opacity-60 hover:opacity-100'}
                `}
              >
                <div className="flex-1 min-w-0">
                  {editingId === conv.id ? (
                    <form onSubmit={saveTitle} className="flex items-center gap-2">
                      <input 
                        ref={editInputRef}
                        type="text" 
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() => saveTitle()}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-transparent border-b border-protocol-border pb-0.5 text-sm font-heading text-protocol-platinum focus:outline-none"
                      />
                    </form>
                  ) : (
                    <>
                      <h3 className={`text-sm font-heading tracking-tight leading-snug transition-colors ${currentConversationId === conv.id ? 'text-protocol-platinum' : 'text-protocol-muted'}`}>
                        {conv.title}
                      </h3>
                      <p className="text-[9px] font-mono text-protocol-muted mt-1 tracking-wider uppercase">
                        {new Date(conv.updatedAt).toLocaleDateString('en-US', {month:'short', day:'numeric'})} &bull; {new Date(conv.updatedAt).toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit'})}
                      </p>
                    </>
                  )}
                </div>

                <div className={`flex flex-col gap-1 ${editingId === conv.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity duration-300`}>
                   {editingId === conv.id ? (
                     <button onClick={saveTitle} className="p-1 rounded text-emerald-400 hover:bg-emerald-400/10">
                        <Check size={12} />
                     </button>
                   ) : (
                     <>
                        <button 
                          onClick={(e) => startEditing(e, conv)} 
                          className="p-1 rounded text-protocol-muted hover:text-protocol-platinum hover:bg-protocol-border transition-colors"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            playSound('click');
                            onDeleteConversation(conv.id, e);
                          }}
                          className="p-1 rounded text-protocol-muted hover:text-protocol-swissRed hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                     </>
                   )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-6 py-6 border-t border-protocol-border shrink-0 bg-protocol-sidebar" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
          <div className="flex items-center justify-between opacity-40 hover:opacity-100 transition-opacity">
              <button onClick={onExportData} className="flex items-center gap-2 text-[8px] font-mono uppercase tracking-widest text-protocol-muted hover:text-protocol-platinum transition-colors p-1.5 rounded-lg hover:bg-protocol-border">
                <Download size={10} /> Data
              </button>
              <button onClick={() => { playSound('error'); setShowClearConfirm(true); }} className="flex items-center gap-2 text-[8px] font-mono uppercase tracking-widest text-protocol-muted hover:text-protocol-swissRed transition-colors p-1.5 rounded-lg hover:bg-protocol-border">
                 <Trash2 size={10} /> Clear All
              </button>
          </div>
          
          {showClearConfirm && (
            <div className="absolute bottom-20 left-4 right-4 bg-red-950/90 backdrop-blur-md border border-red-500/20 p-3 animate-slide-up shadow-2xl z-50 rounded-xl">
              <p className="text-[10px] text-red-200 mb-3 font-heading text-center">Permanently erase all logs?</p>
              <div className="flex gap-2">
                <button 
                  onClick={() => { onClearAllHistory(); setShowClearConfirm(false); }}
                  className="flex-1 py-1.5 bg-red-900 hover:bg-red-800 text-white text-[9px] uppercase font-bold tracking-widest border border-red-700/50 rounded-lg transition-colors"
                >
                  Confirm
                </button>
                <button 
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-1.5 bg-transparent hover:bg-white/5 text-white text-[9px] uppercase tracking-widest border border-white/10 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
