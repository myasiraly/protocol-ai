
import React, { useState, useEffect } from 'react';
import { X, Brain, Save, Power, User, Target, ShieldAlert, Zap } from 'lucide-react';
import { TrainingConfig } from '../types';
import { playSound } from '../utils/audio';

interface TrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: TrainingConfig;
  onSave: (newConfig: TrainingConfig) => void;
}

const DEFAULT_CONFIG: TrainingConfig = {
  identity: "You are an elite expert in your field.",
  objectives: "Provide accurate, high-quality information.",
  constraints: "Avoid verbosity. Be precise.",
  tone: "Professional and concise.",
  isEnabled: false
};

export const TrainingModal: React.FC<TrainingModalProps> = ({ isOpen, onClose, config, onSave }) => {
  const [localConfig, setLocalConfig] = useState<TrainingConfig>(DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState<'identity' | 'objectives' | 'style'>('identity');

  useEffect(() => {
    if (isOpen) {
      setLocalConfig(config || DEFAULT_CONFIG);
    }
  }, [isOpen, config]);

  const handleChange = (field: keyof TrainingConfig, value: any) => {
    setLocalConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    playSound('success');
    onSave(localConfig);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-lg animate-fade-in" onClick={onClose} />
      
      <div className="relative bg-protocol-charcoal border border-protocol-border w-full max-w-2xl overflow-hidden shadow-2xl animate-slide-up flex flex-col max-h-[90vh] rounded-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-protocol-border bg-protocol-charcoal">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg border ${localConfig.isEnabled ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-protocol-border/10 border-protocol-border text-protocol-muted'}`}>
                <Brain size={20} />
            </div>
            <div>
              <h2 className="text-xl font-heading font-semibold text-protocol-platinum tracking-tight">Neural Conditioning</h2>
              <p className="text-[10px] text-protocol-muted font-mono uppercase tracking-[0.2em]">Model Training & Behavior</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             {/* Toggle Switch */}
             <button 
               onClick={() => { playSound('click'); handleChange('isEnabled', !localConfig.isEnabled); }}
               className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${localConfig.isEnabled ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-transparent border-protocol-border text-protocol-muted hover:text-protocol-platinum'}`}
             >
                <Power size={12} />
                <span className="text-[9px] font-mono font-bold uppercase tracking-widest">{localConfig.isEnabled ? 'Active' : 'Offline'}</span>
             </button>

             <button onClick={onClose} className="p-1.5 hover:bg-protocol-border rounded-full transition-colors group">
                <X size={20} className="text-protocol-muted group-hover:text-protocol-platinum" />
             </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex border-b border-protocol-border px-6">
           <button 
             onClick={() => setActiveTab('identity')}
             className={`px-4 py-3 text-[10px] font-mono uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'identity' ? 'border-protocol-platinum text-protocol-platinum' : 'border-transparent text-protocol-muted hover:text-protocol-platinum'}`}
           >
             Identity
           </button>
           <button 
             onClick={() => setActiveTab('objectives')}
             className={`px-4 py-3 text-[10px] font-mono uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'objectives' ? 'border-protocol-platinum text-protocol-platinum' : 'border-transparent text-protocol-muted hover:text-protocol-platinum'}`}
           >
             Directives
           </button>
           <button 
             onClick={() => setActiveTab('style')}
             className={`px-4 py-3 text-[10px] font-mono uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'style' ? 'border-protocol-platinum text-protocol-platinum' : 'border-transparent text-protocol-muted hover:text-protocol-platinum'}`}
           >
             Style
           </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-protocol-obsidian/30">
           
           {activeTab === 'identity' && (
              <div className="space-y-6 animate-fade-in">
                 <div className="flex items-start gap-4">
                    <User size={18} className="text-protocol-champagne mt-1 shrink-0" />
                    <div className="flex-1 space-y-2">
                       <label className="text-xs font-heading font-semibold text-protocol-platinum">Core Identity</label>
                       <p className="text-[10px] text-protocol-muted leading-relaxed">Define the persona, expertise, and role the model should assume. e.g., "Senior Python Engineer" or "Creative Writer".</p>
                       <textarea 
                          value={localConfig.identity}
                          onChange={(e) => handleChange('identity', e.target.value)}
                          className="w-full h-32 bg-protocol-input border border-protocol-border rounded-xl p-3 text-xs text-protocol-platinum focus:outline-none focus:border-protocol-muted font-mono leading-relaxed resize-none custom-scrollbar"
                          placeholder="You are Protocol, an advanced AI system..."
                       />
                    </div>
                 </div>
              </div>
           )}

           {activeTab === 'objectives' && (
              <div className="space-y-6 animate-fade-in">
                 <div className="flex items-start gap-4">
                    <Target size={18} className="text-blue-400 mt-1 shrink-0" />
                    <div className="flex-1 space-y-2">
                       <label className="text-xs font-heading font-semibold text-protocol-platinum">Primary Objectives</label>
                       <p className="text-[10px] text-protocol-muted leading-relaxed">What goals should the model prioritize in every response?</p>
                       <textarea 
                          value={localConfig.objectives}
                          onChange={(e) => handleChange('objectives', e.target.value)}
                          className="w-full h-24 bg-protocol-input border border-protocol-border rounded-xl p-3 text-xs text-protocol-platinum focus:outline-none focus:border-protocol-muted font-mono leading-relaxed resize-none custom-scrollbar"
                          placeholder="Prioritize accuracy and safety..."
                       />
                    </div>
                 </div>

                 <div className="flex items-start gap-4 pt-4 border-t border-protocol-border">
                    <ShieldAlert size={18} className="text-protocol-swissRed mt-1 shrink-0" />
                    <div className="flex-1 space-y-2">
                       <label className="text-xs font-heading font-semibold text-protocol-platinum">Behavioral Constraints</label>
                       <p className="text-[10px] text-protocol-muted leading-relaxed">What should the model AVOID doing?</p>
                       <textarea 
                          value={localConfig.constraints}
                          onChange={(e) => handleChange('constraints', e.target.value)}
                          className="w-full h-24 bg-protocol-input border border-protocol-border rounded-xl p-3 text-xs text-protocol-platinum focus:outline-none focus:border-protocol-muted font-mono leading-relaxed resize-none custom-scrollbar"
                          placeholder="Do not apologize overly. Avoid markdown in short replies..."
                       />
                    </div>
                 </div>
              </div>
           )}

           {activeTab === 'style' && (
              <div className="space-y-6 animate-fade-in">
                 <div className="flex items-start gap-4">
                    <Zap size={18} className="text-yellow-400 mt-1 shrink-0" />
                    <div className="flex-1 space-y-2">
                       <label className="text-xs font-heading font-semibold text-protocol-platinum">Response Style & Tone</label>
                       <p className="text-[10px] text-protocol-muted leading-relaxed">Describe the structure, length, and feeling of the responses.</p>
                       <textarea 
                          value={localConfig.tone}
                          onChange={(e) => handleChange('tone', e.target.value)}
                          className="w-full h-32 bg-protocol-input border border-protocol-border rounded-xl p-3 text-xs text-protocol-platinum focus:outline-none focus:border-protocol-muted font-mono leading-relaxed resize-none custom-scrollbar"
                          placeholder="Concise, professional, and slightly futuristic..."
                       />
                    </div>
                 </div>
              </div>
           )}

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-protocol-border bg-protocol-charcoal flex justify-between items-center">
           <button onClick={onClose} className="px-5 py-2 text-[10px] font-mono font-bold uppercase tracking-widest text-protocol-muted hover:text-protocol-platinum transition-colors">
             Cancel
           </button>
           <button 
             onClick={handleSave}
             className="px-6 py-2 bg-protocol-platinum text-protocol-obsidian text-[10px] font-mono font-bold uppercase tracking-widest rounded-lg hover:bg-white transition-colors flex items-center gap-2 shadow-lg"
           >
             <Save size={14} />
             Save Configuration
           </button>
        </div>

      </div>
    </div>
  );
};
