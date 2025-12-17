
import React, { useState } from 'react';
import { X, Moon, Sun, User, Shield, Bell, Sliders, Smartphone, Monitor, Volume2, CheckCircle2, ChevronRight, LogOut, Trash2, CreditCard, Sparkles, AlertTriangle, Download, Type, Palette, Laptop, Brain } from 'lucide-react';
import { UserProfile } from '../types';
import { playSound } from '../utils/audio';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onOpenTraining?: () => void;
  textSize: '12px' | '14px' | '16px';
  onSetTextSize: (size: '12px' | '14px' | '16px') => void;
}

type SettingsTab = 'account' | 'personalization' | 'notifications' | 'general';

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  user, 
  isDarkMode, 
  onToggleTheme, 
  onOpenTraining, 
  textSize, 
  onSetTextSize 
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    marketing: false
  });
  
  // New States for requested features
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [launchAtLogin, setLaunchAtLogin] = useState(false);
  const [accentColor, setAccentColor] = useState('platinum'); // platinum, red, champagne, emerald, blue
  
  if (!isOpen) return null;

  const renderSwitch = (checked: boolean, onChange: () => void) => (
    <button 
        onClick={() => { onChange(); playSound(checked ? 'click' : 'success'); }}
        className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-300 ${ checked ? 'bg-protocol-platinum' : 'bg-protocol-border' }`}
    >
        <div className={`w-4 h-4 rounded-full bg-protocol-charcoal shadow-sm transform transition-transform duration-300 ${ checked ? 'translate-x-4' : 'translate-x-0' }`}></div>
    </button>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'account':
        return (
           <div className="space-y-6 animate-fade-in pb-10">
              <div>
                 <h3 className="text-sm font-heading font-semibold text-protocol-platinum mb-1">Account Identity</h3>
                 <p className="text-[10px] text-protocol-muted">Manage your personal dossier and security credentials.</p>
              </div>
              
              <div className="p-4 bg-protocol-input border border-protocol-border rounded-xl flex items-center gap-4">
                 <div className="w-14 h-14 rounded-full bg-protocol-charcoal border border-protocol-border overflow-hidden shadow-md shrink-0">
                    {user?.picture ? <img src={user.picture} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-protocol-muted"><User size={24}/></div>}
                 </div>
                 <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                       <span className="text-sm font-bold text-protocol-platinum truncate">{user?.name}</span>
                       <CheckCircle2 size={12} className="text-emerald-500" />
                    </div>
                    <div className="text-xs text-protocol-muted font-mono truncate">{user?.email}</div>
                 </div>
                 <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[9px] text-emerald-500 font-mono uppercase tracking-wider hidden sm:block">
                    Verified ID
                 </div>
              </div>

              {/* Memory Settings */}
              <div className="space-y-3 pt-2">
                 <h4 className="text-[10px] font-mono text-protocol-muted uppercase tracking-widest pl-1">Intelligence</h4>
                 <div className="flex items-center justify-between p-3 border border-protocol-border rounded-lg bg-protocol-charcoal">
                    <div className="flex items-center gap-3">
                       <Sparkles size={16} className="text-protocol-champagne"/>
                       <div className="flex flex-col">
                          <span className="text-xs text-protocol-platinum">Reference Memory</span>
                          <span className="text-[9px] text-protocol-muted">Allow Protocol to retain context across sessions.</span>
                       </div>
                    </div>
                    {renderSwitch(memoryEnabled, () => setMemoryEnabled(!memoryEnabled))}
                 </div>
              </div>

              <div className="space-y-3 pt-2">
                 <h4 className="text-[10px] font-mono text-protocol-muted uppercase tracking-widest pl-1">Security & Billing</h4>
                 
                 <div className="flex items-center justify-between p-3 border border-protocol-border rounded-lg hover:bg-protocol-border/30 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3">
                       <Shield size={16} className="text-protocol-muted group-hover:text-protocol-platinum transition-colors"/>
                       <div className="flex flex-col">
                          <span className="text-xs text-protocol-platinum">Security Protocols</span>
                          <span className="text-[9px] text-protocol-muted">2FA, Password Rotation</span>
                       </div>
                    </div>
                    <ChevronRight size={14} className="text-protocol-muted" />
                 </div>
                 
                 <div className="flex items-center justify-between p-3 border border-protocol-border rounded-lg hover:bg-protocol-border/30 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3">
                       <CreditCard size={16} className="text-protocol-muted group-hover:text-protocol-platinum transition-colors"/>
                       <div className="flex flex-col">
                          <span className="text-xs text-protocol-platinum">Billing Support</span>
                          <span className="text-[9px] text-protocol-muted">Invoices and Plan Management</span>
                       </div>
                    </div>
                    <ChevronRight size={14} className="text-protocol-muted" />
                 </div>
              </div>

              {/* Danger Zone */}
              <div className="mt-8 pt-6 border-t border-protocol-border/50">
                 <h4 className="text-[10px] font-mono text-red-500 uppercase tracking-widest mb-3 pl-1">Danger Zone</h4>
                 <button 
                    onClick={() => playSound('error')}
                    className="w-full flex items-center justify-between p-3 border border-red-500/20 bg-red-500/5 rounded-lg hover:bg-red-500/10 transition-colors group"
                 >
                    <div className="flex items-center gap-3">
                       <Trash2 size={16} className="text-red-500"/>
                       <div className="flex flex-col items-start">
                          <span className="text-xs text-red-400 font-medium">Delete Account</span>
                          <span className="text-[9px] text-red-400/60">Permanently purge all data and credentials.</span>
                       </div>
                    </div>
                    <AlertTriangle size={14} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                 </button>
              </div>
           </div>
        );

      case 'personalization':
        return (
          <div className="space-y-6 animate-fade-in">
              <div>
                 <h3 className="text-sm font-heading font-semibold text-protocol-platinum mb-1">Interface Appearance</h3>
                 <p className="text-[10px] text-protocol-muted">Customize the visual environment of the Protocol interface.</p>
              </div>

              {/* Text Size - Moved up to replace Theme Toggles */}
              <div className="flex items-center justify-between p-3 border border-protocol-border rounded-lg">
                <div className="flex items-center gap-3">
                    <Type size={16} className="text-protocol-platinum"/>
                    <span className="text-xs text-protocol-platinum">Text Size</span>
                </div>
                <div className="flex bg-protocol-border/20 rounded-lg p-0.5">
                    {['12px', '14px', '16px'].map((size) => (
                        <button 
                        key={size}
                        onClick={() => { onSetTextSize(size as any); playSound('click'); }} 
                        className={`px-3 py-1 text-[10px] font-mono rounded-md transition-all ${textSize === size ? 'bg-protocol-platinum text-protocol-obsidian shadow-sm' : 'text-protocol-muted hover:text-protocol-platinum'}`}
                        >
                        {size}
                        </button>
                    ))}
                </div>
              </div>
              
              {/* Neural Training Integration */}
              <div className="pt-6 border-t border-protocol-border">
                  <div className="mb-4">
                      <h3 className="text-xs font-heading font-semibold text-protocol-platinum mb-0.5">Neural Personalization</h3>
                      <p className="text-[10px] text-protocol-muted">Configure the AI's behavioral conditioning.</p>
                  </div>
                  
                  <button 
                      onClick={() => { if(onOpenTraining) { onClose(); onOpenTraining(); } }}
                      className="w-full flex items-center justify-between p-3 border border-emerald-500/20 bg-emerald-500/5 rounded-xl hover:bg-emerald-500/10 transition-all group"
                  >
                      <div className="flex items-center gap-3">
                          <Brain size={18} className="text-emerald-500" />
                          <div className="flex flex-col items-start">
                              <span className="text-xs font-medium text-emerald-400">Train Protocol</span>
                              <span className="text-[9px] text-emerald-400/60">Customize Identity, Objectives & Tone</span>
                          </div>
                      </div>
                      <ChevronRight size={14} className="text-emerald-500/50 group-hover:text-emerald-500" />
                  </button>
              </div>

               <div className="pt-6 border-t border-protocol-border space-y-4">
                  <div className="flex items-center justify-between">
                     <span className="text-xs text-protocol-platinum">Compact Density</span>
                     <div className="w-8 h-4 bg-protocol-border rounded-full relative cursor-not-allowed opacity-50">
                        <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-protocol-muted rounded-full"></div>
                     </div>
                  </div>
                  <div className="flex items-center justify-between">
                     <span className="text-xs text-protocol-platinum">Reduced Motion</span>
                     <div className="w-8 h-4 bg-protocol-border rounded-full relative cursor-not-allowed opacity-50">
                        <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-protocol-muted rounded-full"></div>
                     </div>
                  </div>
               </div>
          </div>
        );

      case 'notifications':
        return (
           <div className="space-y-6 animate-fade-in">
               <div>
                 <h3 className="text-sm font-heading font-semibold text-protocol-platinum mb-1">Notification Matrix</h3>
                 <p className="text-[10px] text-protocol-muted">Control how Protocol alerts you to critical intelligence.</p>
              </div>

              <div className="space-y-1 bg-protocol-input border border-protocol-border rounded-xl overflow-hidden divide-y divide-protocol-border">
                  {[
                    { label: 'Deep Research Complete', desc: 'Alerts when background analysis finishes.', key: 'push' },
                    { label: 'Security Digests', desc: 'Daily summary of security events.', key: 'email' },
                    { label: 'Ecosystem Updates', desc: 'News about Protocol features.', key: 'marketing' }
                  ].map((item: any, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 hover:bg-protocol-border/30 transition-colors">
                        <div className="flex flex-col gap-0.5">
                           <span className="text-xs font-medium text-protocol-platinum">{item.label}</span>
                           <span className="text-[9px] text-protocol-muted">{item.desc}</span>
                        </div>
                        {renderSwitch((notifications as any)[item.key], () => setNotifications(prev => ({...prev, [item.key]: !(prev as any)[item.key]})))}
                    </div>
                  ))}
              </div>
           </div>
        );

      case 'general':
         return (
           <div className="space-y-6 animate-fade-in pb-10">
               <div>
                 <h3 className="text-sm font-heading font-semibold text-protocol-platinum mb-1">System General</h3>
                 <p className="text-[10px] text-protocol-muted">Global configuration, language, and system metrics.</p>
              </div>

              {/* System Behavior */}
              <div className="space-y-3">
                 <h4 className="text-[10px] font-mono text-protocol-muted uppercase tracking-widest pl-1">Behavior</h4>
                 
                 <div className="flex items-center justify-between p-3 border border-protocol-border rounded-lg">
                    <div className="flex items-center gap-3">
                       <Laptop size={16} className="text-protocol-platinum"/>
                       <span className="text-xs text-protocol-platinum">Launch at Login</span>
                    </div>
                    {renderSwitch(launchAtLogin, () => setLaunchAtLogin(!launchAtLogin))}
                 </div>
                 
                 <div className="flex items-center justify-between p-3 border border-protocol-border rounded-lg">
                    <div className="flex items-center gap-3">
                       <Volume2 size={16} className="text-protocol-platinum"/>
                       <span className="text-xs text-protocol-platinum">UI Sound Effects</span>
                    </div>
                    {renderSwitch(soundEnabled, () => setSoundEnabled(!soundEnabled))}
                 </div>
              </div>

              {/* Visuals */}
              <div className="space-y-3 pt-2">
                 <h4 className="text-[10px] font-mono text-protocol-muted uppercase tracking-widest pl-1">Visuals</h4>
                 
                 <div className="flex items-center justify-between p-3 border border-protocol-border rounded-lg">
                    <div className="flex items-center gap-3">
                       <Palette size={16} className="text-protocol-platinum"/>
                       <span className="text-xs text-protocol-platinum">Accent Color</span>
                    </div>
                    <div className="flex gap-2">
                        {['platinum', 'red', 'gold', 'emerald', 'blue'].map((color) => (
                            <button 
                                key={color}
                                onClick={() => { setAccentColor(color); playSound('click'); }}
                                className={`w-4 h-4 rounded-full border border-protocol-border/50 transition-all ${
                                    color === 'platinum' ? 'bg-[#F0F0F0]' :
                                    color === 'red' ? 'bg-[#FF453A]' :
                                    color === 'gold' ? 'bg-[#E0C097]' :
                                    color === 'emerald' ? 'bg-[#10B981]' :
                                    'bg-[#3B82F6]'
                                } ${accentColor === color ? 'ring-2 ring-offset-1 ring-offset-protocol-charcoal ring-protocol-platinum scale-110' : 'hover:scale-110'}`}
                            />
                        ))}
                    </div>
                 </div>
              </div>

              {/* Updates */}
               <div className="pt-6 mt-6 border-t border-protocol-border">
                  <div className="flex items-center justify-between text-[10px] text-protocol-muted font-mono mb-2">
                      <span>Protocol Version</span>
                      <span>v2.4.1 (Stable)</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-protocol-muted font-mono mb-4">
                      <span>Build ID</span>
                      <span>8f9a2b3c</span>
                  </div>
                  <button onClick={() => playSound('click')} className="w-full py-2 border border-protocol-border rounded-lg text-xs text-protocol-platinum hover:bg-protocol-border/30 transition-colors flex items-center justify-center gap-2">
                     <Download size={14} />
                     Check for Updates
                  </button>
               </div>
           </div>
         );
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md animate-fade-in" onClick={onClose} />
      
      <div className="relative bg-protocol-charcoal border border-protocol-border w-full max-w-3xl h-[600px] max-h-[90vh] overflow-hidden shadow-2xl animate-slide-up flex rounded-2xl flex-col md:flex-row">
        
        {/* Sidebar Navigation */}
        <div className="w-full md:w-64 bg-protocol-obsidian/50 border-b md:border-b-0 md:border-r border-protocol-border p-4 flex flex-col">
           <h2 className="text-lg font-heading font-bold text-protocol-platinum mb-6 px-2 hidden md:block">Settings</h2>
           
           <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
              <button 
                onClick={() => setActiveTab('account')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all shrink-0 ${activeTab === 'account' ? 'bg-protocol-platinum text-protocol-obsidian shadow-md' : 'text-protocol-muted hover:text-protocol-platinum hover:bg-protocol-border/50'}`}
              >
                 <User size={16} />
                 <span>Account</span>
              </button>
              
              <button 
                onClick={() => setActiveTab('personalization')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all shrink-0 ${activeTab === 'personalization' ? 'bg-protocol-platinum text-protocol-obsidian shadow-md' : 'text-protocol-muted hover:text-protocol-platinum hover:bg-protocol-border/50'}`}
              >
                 <Monitor size={16} />
                 <span>Personalization</span>
              </button>

              <button 
                onClick={() => setActiveTab('notifications')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all shrink-0 ${activeTab === 'notifications' ? 'bg-protocol-platinum text-protocol-obsidian shadow-md' : 'text-protocol-muted hover:text-protocol-platinum hover:bg-protocol-border/50'}`}
              >
                 <Bell size={16} />
                 <span>Notifications</span>
              </button>

              <button 
                onClick={() => setActiveTab('general')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all shrink-0 ${activeTab === 'general' ? 'bg-protocol-platinum text-protocol-obsidian shadow-md' : 'text-protocol-muted hover:text-protocol-platinum hover:bg-protocol-border/50'}`}
              >
                 <Sliders size={16} />
                 <span>General</span>
              </button>
           </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col bg-protocol-charcoal relative">
            {/* Mobile Header / Close Button */}
            <div className="absolute top-4 right-4 z-10">
               <button onClick={onClose} className="p-2 text-protocol-muted hover:text-protocol-platinum hover:bg-protocol-border rounded-full transition-colors"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
               {renderContent()}
            </div>
        </div>

      </div>
    </div>
  );
};
