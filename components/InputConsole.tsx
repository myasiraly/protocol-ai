
import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Loader2, Mic, MicOff, BrainCircuit, Paperclip, X, Zap, Video, Ghost, FileText, Mail, HardDrive, Calendar, Music, FileCode, FileJson, Plus, Settings2 } from 'lucide-react';
import { playSound } from '../utils/audio';
import { Attachment } from '../types';

interface InputConsoleProps {
  onSend: (text: string, useDeepAgent: boolean, attachments: Attachment[], isVoice: boolean) => void;
  isLoading: boolean;
  isSidebarOpen: boolean;
  isIncognito: boolean;
  onToggleIncognito: () => void;
  onOpenIntegrations: () => void;
}

export const InputConsole: React.FC<InputConsoleProps> = ({ onSend, isLoading, isSidebarOpen, isIncognito, onToggleIncognito, onOpenIntegrations }) => {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isDeepAgent, setIsDeepAgent] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [showExtraTools, setShowExtraTools] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const silenceTimerRef = useRef<any>(null);
  const latestInputRef = useRef('');
  const sessionBaseTextRef = useRef(''); 

  useEffect(() => {
    latestInputRef.current = input;
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      // Adjust height dynamically, maxing out at a reasonable mobile height
      const maxHeight = window.innerWidth < 768 ? 120 : 200;
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, maxHeight) + 'px';
    }
    
    const lastWord = input.split(' ').pop();
    if (lastWord && lastWord.startsWith('@')) {
       setShowMentions(true);
    } else {
       setShowMentions(false);
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const textToSend = latestInputRef.current;
    if ((!textToSend.trim() && attachments.length === 0) || isLoading) {
      playSound('error');
      return;
    }
    playSound('click');
    onSend(textToSend, isDeepAgent, attachments, false); 
    setInput('');
    setAttachments([]);
    setShowMentions(false);
    setShowExtraTools(false);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleAutoSend = () => {
    const textToSend = latestInputRef.current;
    if (!textToSend.trim() && attachments.length === 0) {
      stopListening();
      return;
    }
    playSound('message'); 
    onSend(textToSend, isDeepAgent, attachments, true);
    setInput('');
    setAttachments([]);
    stopListening();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    setIsListening(false);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && window.innerWidth > 768) {
       e.preventDefault();
       handleSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleMentionSelect = (mention: string) => {
     const words = input.split(' ');
     words.pop(); 
     const newInput = words.join(' ') + (words.length > 0 ? ' ' : '') + mention + ' ';
     setInput(newInput);
     setShowMentions(false);
     textareaRef.current?.focus();
     playSound('click');
  };

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true; 
      recognition.interimResults = true; 
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        setIsListening(true);
        sessionBaseTextRef.current = latestInputRef.current;
      };
      
      recognition.onresult = (event: any) => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        const base = sessionBaseTextRef.current;
        const spacing = (base && !base.endsWith(' ')) ? ' ' : '';
        setInput(base + spacing + transcript);
        silenceTimerRef.current = setTimeout(() => handleAutoSend(), 1500);
      };

      recognition.onend = () => {
        setIsListening(false);
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      };
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
        alert("Speech Recognition not available.");
        return;
    }
    playSound('click');
    if (isListening) {
      stopListening();
    } else {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => recognitionRef.current.start())
        .catch(() => alert("Microphone access denied."));
    }
  };

  const processFile = (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');
    const isPDF = file.type === 'application/pdf';
    const isText = file.type.startsWith('text/') || 
                   file.type === 'application/json' ||
                   ['.json', '.js', '.ts', '.jsx', '.tsx', '.py', '.md', '.csv', '.xml', '.html', '.css'].some(ext => file.name.endsWith(ext));

    if (isImage || isVideo || isAudio || isPDF || isText) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (result) {
          let type: 'image' | 'video' | 'audio' | 'file' = 'file';
          let mimeType = file.type;
          if (isImage) type = 'image';
          if (isVideo) type = 'video';
          if (isAudio) type = 'audio';
          if ((!mimeType || mimeType === 'application/octet-stream') && isText) mimeType = 'text/plain';

          setAttachments(prev => [...prev, { 
              type, 
              mimeType: mimeType || 'text/plain', 
              data: result.split(',')[1],
              name: file.name
          }]);
          playSound('click');
        }
      };
      reader.readAsDataURL(file);
    } else {
        alert("Unsupported file format.");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) Array.from(e.target.files).forEach(processFile);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') {
            const file = items[i].getAsFile();
            if (file) processFile(file);
        }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (att: Attachment) => {
      if (att.mimeType?.includes('json') || att.name?.endsWith('.json')) return <FileJson size={18} className="text-protocol-champagne mb-1" />;
      if (att.mimeType?.includes('javascript') || att.name?.endsWith('.js') || att.name?.endsWith('.ts')) return <FileCode size={18} className="text-protocol-platinum mb-1" />;
      if (att.mimeType?.includes('pdf')) return <FileText size={18} className="text-protocol-swissRed mb-1" />;
      return <FileText size={18} className="text-protocol-muted mb-1" />;
  };

  return (
    <div className={`
      fixed bottom-0 right-0 z-50 flex justify-center items-end transition-all duration-300 pointer-events-none pb-4 md:pb-6 px-3 md:px-6
      ${isSidebarOpen ? 'left-0 md:left-72' : 'left-0'}
    `}>
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-protocol-obsidian via-protocol-obsidian/90 to-transparent z-[-1] pointer-events-none"></div>

      <div className="w-full max-w-4xl relative pointer-events-auto flex flex-col">
        
        {/* Indicators & Attachments Row - Mobile Friendly */}
        <div className="flex flex-col gap-2 mb-2 w-full">
            <div className="flex flex-wrap gap-2 px-1">
                {isIncognito && (
                    <div className="px-2.5 py-1 bg-violet-500/10 backdrop-blur-md border border-violet-500/20 text-[8px] md:text-[9px] text-violet-400 font-mono tracking-widest uppercase flex items-center gap-1.5 rounded-full shadow-lg">
                        <Ghost size={10} className="fill-current" />
                        <span className="hidden xs:inline">Incognito</span>
                    </div>
                )}
                {isDeepAgent && (
                    <div className="px-2.5 py-1 bg-emerald-500/10 backdrop-blur-md border border-emerald-500/20 text-[8px] md:text-[9px] text-emerald-400 font-mono tracking-widest uppercase flex items-center gap-1.5 rounded-full shadow-lg">
                        <Zap size={10} className="fill-current" />
                        <span className="hidden xs:inline">DeepAgent</span>
                    </div>
                )}
            </div>

            {attachments.length > 0 && (
                <div className="px-1 flex gap-2 overflow-x-auto custom-scrollbar no-scrollbar py-1">
                    {attachments.map((att, idx) => (
                    <div key={idx} className="relative group shrink-0">
                        <div className="h-12 w-12 md:h-14 md:w-14 border border-protocol-border bg-protocol-input flex items-center justify-center relative rounded-xl overflow-hidden shadow-lg">
                            {att.type === 'video' ? <Video size={16} /> : att.type === 'audio' ? <Music size={16} /> : att.type === 'file' ? getFileIcon(att) : <img src={`data:${att.mimeType};base64,${att.data}`} alt="" className="h-full w-full object-cover" />}
                        </div>
                        <button onClick={() => removeAttachment(idx)} className="absolute -top-1.5 -right-1.5 bg-protocol-charcoal border border-protocol-border text-protocol-platinum p-1 hover:text-red-400 transition-colors rounded-full shadow-md">
                            <X size={10} />
                        </button>
                    </div>
                    ))}
                </div>
            )}
        </div>

        {/* Mentions Popover */}
        {showMentions && (
            <div className="absolute bottom-full left-4 mb-4 bg-protocol-charcoal border border-protocol-border p-2 w-48 shadow-2xl z-30 flex flex-col gap-1 rounded-2xl overflow-hidden animate-slide-up">
                <div className="px-4 py-2 text-[9px] text-protocol-muted font-mono uppercase tracking-wider">Ecosystem</div>
                <button onClick={() => handleMentionSelect('@Gmail')} className="flex items-center gap-3 px-4 py-2.5 hover:bg-protocol-border text-xs text-protocol-platinum transition-colors rounded-xl"><Mail size={14} className="text-protocol-swissRed" /><span>Gmail</span></button>
                <button onClick={() => handleMentionSelect('@Drive')} className="flex items-center gap-3 px-4 py-2.5 hover:bg-protocol-border text-xs text-protocol-platinum transition-colors rounded-xl"><HardDrive size={14} className="text-blue-400" /><span>Drive</span></button>
                <button onClick={() => handleMentionSelect('@Calendar')} className="flex items-center gap-3 px-4 py-2.5 hover:bg-protocol-border text-xs text-protocol-platinum transition-colors rounded-xl"><Calendar size={14} className="text-emerald-400" /><span>Calendar</span></button>
            </div>
        )}
        
        {/* Main Input Bar */}
        <div className="bg-protocol-charcoal/90 backdrop-blur-2xl border border-protocol-border rounded-[1.75rem] shadow-heavy overflow-hidden ring-1 ring-white/5">
            <div className="flex flex-col">
                {/* Secondary Tools Expansion (Mobile Only) */}
                {showExtraTools && (
                    <div className="flex items-center justify-around p-3 border-b border-protocol-border bg-protocol-obsidian/30 animate-fade-in md:hidden">
                        <button onClick={() => { onToggleIncognito(); playSound('click'); }} className={`p-2 rounded-xl flex flex-col items-center gap-1 ${isIncognito ? 'text-violet-400' : 'text-protocol-muted'}`}><Ghost size={18} /><span className="text-[8px] font-mono tracking-tighter">SECURE</span></button>
                        <button onClick={() => { setIsDeepAgent(!isDeepAgent); playSound('click'); }} className={`p-2 rounded-xl flex flex-col items-center gap-1 ${isDeepAgent ? 'text-emerald-400' : 'text-protocol-muted'}`}><BrainCircuit size={18} /><span className="text-[8px] font-mono tracking-tighter">THINK</span></button>
                        <button onClick={() => { toggleListening(); playSound('click'); }} className={`p-2 rounded-xl flex flex-col items-center gap-1 ${isListening ? 'text-red-500' : 'text-protocol-muted'}`}>{isListening ? <MicOff size={18} /> : <Mic size={18} />}<span className="text-[8px] font-mono tracking-tighter">VOICE</span></button>
                        <button onClick={() => { onOpenIntegrations(); playSound('click'); }} className="p-2 rounded-xl flex flex-col items-center gap-1 text-protocol-muted"><Plus size={18} /><span className="text-[8px] font-mono tracking-tighter">TOOLS</span></button>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex items-end gap-1 p-2 md:p-2.5">
                    {/* Left Actions */}
                    <div className="flex items-center mb-0.5">
                        <button
                            type="button"
                            onClick={() => setShowExtraTools(!showExtraTools)}
                            className={`w-9 h-9 md:hidden flex items-center justify-center transition-all rounded-full ${showExtraTools ? 'bg-protocol-platinum text-protocol-obsidian' : 'text-protocol-muted hover:text-protocol-platinum'}`}
                        >
                            <Settings2 size={18} />
                        </button>
                        
                        <div className="hidden md:flex items-center">
                            <button type="button" onClick={() => { onOpenIntegrations(); playSound('click'); }} className="w-9 h-9 flex items-center justify-center text-protocol-muted hover:text-protocol-platinum hover:bg-protocol-border/10 rounded-full transition-all"><Plus size={18} /></button>
                            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isLoading} className="w-9 h-9 flex items-center justify-center text-protocol-muted hover:text-protocol-platinum hover:bg-protocol-border/10 rounded-full transition-all"><Paperclip size={18} /></button>
                        </div>
                        
                        {/* Mobile Clip button always visible if not expanded */}
                        {!showExtraTools && (
                            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isLoading} className="w-9 h-9 md:hidden flex items-center justify-center text-protocol-muted hover:text-protocol-platinum rounded-full"><Paperclip size={18} /></button>
                        )}
                        
                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,video/*,audio/*,application/pdf,text/*,.csv,.json,.js,.jsx,.ts,.tsx,.py,.html,.css,.md,.xml" multiple />
                    </div>
                    
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        onPaste={handlePaste}
                        placeholder={isIncognito ? "Secure message..." : "Enter directive..."}
                        disabled={isLoading}
                        rows={1}
                        className="flex-1 bg-transparent text-protocol-platinum py-2 px-1.5 focus:outline-none placeholder-protocol-muted/60 font-sans text-[15px] leading-snug resize-none max-h-[120px] md:max-h-[200px] custom-scrollbar mb-0.5"
                    />

                    {/* Right Actions */}
                    <div className="flex items-center gap-1 mb-0.5">
                        <div className="hidden md:flex items-center gap-1">
                            <button type="button" onClick={() => { onToggleIncognito(); playSound('click'); }} className={`w-9 h-9 flex items-center justify-center rounded-full transition-all ${isIncognito ? 'text-violet-400 bg-violet-500/10' : 'text-protocol-muted hover:text-protocol-platinum hover:bg-protocol-border/10'}`} title="Incognito"><Ghost size={18} /></button>
                            <button type="button" onClick={() => { setIsDeepAgent(!isDeepAgent); playSound('click'); }} className={`w-9 h-9 flex items-center justify-center rounded-full transition-all ${isDeepAgent ? 'text-emerald-400 bg-emerald-500/10' : 'text-protocol-muted hover:text-protocol-platinum hover:bg-protocol-border/10'}`} title="DeepAgent"><BrainCircuit size={18} /></button>
                            <button type="button" onClick={toggleListening} className={`w-9 h-9 flex items-center justify-center rounded-full transition-all ${isListening ? 'text-protocol-swissRed animate-pulse' : 'text-protocol-muted hover:text-protocol-platinum hover:bg-protocol-border/10'}`} title="Voice Input">{isListening ? <MicOff size={18} /> : <Mic size={18} />}</button>
                        </div>

                        <button
                            type="submit"
                            disabled={(!input.trim() && attachments.length === 0) || isLoading}
                            className={`h-9 w-9 md:w-auto md:px-4 flex items-center justify-center bg-protocol-platinum text-protocol-obsidian font-bold text-[10px] uppercase tracking-widest hover:bg-protocol-muted transition-all disabled:opacity-20 rounded-full shadow-lg shrink-0`}
                        >
                            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={20} strokeWidth={2.5} />}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      </div>
    </div>
  );
};
