
import React from 'react';
import { X, Check, Mail, Calendar, HardDrive, Github, Figma, Slack, Database, Link2 } from 'lucide-react';
import { Integration } from '../types';
import { playSound } from '../utils/audio';

interface IntegrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  integrations: Integration[];
  onToggle: (id: string) => void;
}

// Reusable Steel Switch - Small Size
const SteelSwitch = ({ checked, onClick }: { checked: boolean, onClick: () => void }) => (
    <button 
        onClick={onClick}
        className={`
            relative w-9 h-5 rounded-full p-0.5 transition-all duration-500 ease-out flex items-center
            ${checked ? 'bg-black shadow-[inset_0_2px_4px_rgba(0,0,0,1)] border border-emerald-900/30' : 'bg-gray-200 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] border border-protocol-border'}
        `}
    >
        <div className={`
            w-4 h-4 rounded-full shadow-[0_2px_5px_rgba(0,0,0,0.5)] transform transition-transform duration-500 cubic-bezier(0.34, 1.56, 0.64, 1)
            bg-gradient-to-b from-zinc-100 to-zinc-400
            ${checked ? 'translate-x-4' : 'translate-x-0'}
        `}>
             <div className="absolute top-1 left-1 w-1.5 h-0.5 bg-white/60 rounded-full blur-[0.5px]"></div>
        </div>
    </button>
);

export const IntegrationsModal: React.FC<IntegrationsModalProps> = ({ isOpen, onClose, integrations, onToggle }) => {
  if (!isOpen) return null;

  const getIcon = (name: string) => {
    switch (name) {
      case 'mail': return <Mail size={18} strokeWidth={1} />;
      case 'calendar': return <Calendar size={18} strokeWidth={1} />;
      case 'hard-drive': return <HardDrive size={18} strokeWidth={1} />;
      case 'github': return <Github size={18} strokeWidth={1} />;
      case 'slack': return <Slack size={18} strokeWidth={1} />;
      case 'figma': return <Figma size={18} strokeWidth={1} />;
      case 'notion': return <Database size={18} strokeWidth={1} />;
      default: return <Link2 size={18} strokeWidth={1} />;
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-fade-in" onClick={onClose} />
      
      {/* Modal Container - Rounded */}
      <div className="relative bg-protocol-charcoal border border-protocol-border w-full max-w-xl overflow-hidden shadow-2xl animate-slide-up flex flex-col max-h-[80vh] rounded-2xl">
        
        {/* Header */}
        <div className="relative px-6 py-6 border-b border-protocol-border bg-protocol-charcoal">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1.5">
              <h2 className="text-2xl font-heading font-semibold text-protocol-platinum tracking-tight">Active Integrations</h2>
              <p className="text-[9px] text-protocol-muted font-mono uppercase tracking-[0.25em]">Secure OAuth 2.0 Bridges</p>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-protocol-border rounded-full transition-colors group">
              <X size={20} strokeWidth={1.5} className="text-protocol-muted group-hover:text-protocol-platinum transition-colors" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6">
          {integrations.map((tool) => (
            <div key={tool.id} className="flex items-center justify-between py-5 border-b border-protocol-border group">
              <div className="flex items-center gap-5">
                <div className={`w-10 h-10 flex items-center justify-center border transition-all duration-500 rounded-xl ${tool.isConnected ? 'bg-protocol-platinum text-protocol-obsidian border-protocol-platinum' : 'bg-transparent text-protocol-muted border-protocol-border'}`}>
                   {getIcon(tool.icon)}
                </div>
                <div className="flex flex-col gap-0.5">
                   <h3 className={`text-lg font-heading font-medium tracking-wide transition-colors ${tool.isConnected ? 'text-protocol-platinum' : 'text-protocol-muted'}`}>{tool.name}</h3>
                   <p className="text-[9px] font-mono text-protocol-muted tracking-wider uppercase">{tool.description}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                  <span className={`text-[8px] font-mono tracking-widest uppercase transition-opacity duration-500 ${tool.isConnected ? 'text-emerald-500 opacity-100' : 'text-protocol-muted opacity-50'}`}>
                      {tool.isConnected ? 'LINKED' : 'OFFLINE'}
                  </span>
                  <SteelSwitch 
                     checked={tool.isConnected} 
                     onClick={() => { playSound(tool.isConnected ? 'click' : 'success'); onToggle(tool.id); }} 
                  />
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-protocol-border bg-protocol-charcoal flex justify-between items-center">
           <span className="text-[8px] text-protocol-muted font-mono tracking-widest uppercase flex items-center gap-2">
               <div className="w-1.5 h-1.5 bg-emerald-900 rounded-full"></div>
               Encrypted Connection
           </span>
        </div>

      </div>
    </div>
  );
};
