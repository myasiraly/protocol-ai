
import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Loader2, Mic, MicOff, BrainCircuit, Paperclip, X, Zap, Video, Ghost, FileText, Mail, HardDrive, Calendar, Music, FileCode, FileJson, Plus, Settings2, Activity, Square } from 'lucide-react';
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
  const [silenceProgress, setSilenceProgress] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const silenceTimerRef = useRef<any>(null);
  const progressIntervalRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const latestInputRef = useRef('');
  const sessionBaseTextRef = useRef(''); 

  // Track viewport height to handle mobile keyboard
  const [vh, setVh] = useState(window.innerHeight);

  useEffect(() => {
    const handleResize = () => setVh(window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    latestInputRef.current = input;
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      // Adjust height dynamically, maxing out at a reasonable mobile height
      const maxHeight = window.innerWidth < 768 ? 100 : 200;
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
    
    if (isListening) {
        stopListening();
    }

    playSound('click');
    onSend(textToSend, isDeepAgent, attachments, isListening); 
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

  const startSilenceTimer = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    
    setSilenceProgress(0);
    const duration = 2000; // Increased for mobile stability
    const interval = 40;
    let elapsed = 0;
    
    progressIntervalRef.current = setInterval(() => {
        elapsed += interval;
        const progress = (elapsed / duration) * 100;
        setSilenceProgress(Math.min(progress, 100));
    }, interval);

    silenceTimerRef.current = setTimeout(() => {
        clearInterval(progressIntervalRef.current);
        handleAutoSend();
    }, duration);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    setIsListening(false);
    setSilenceProgress(0);
    setAudioLevel(0);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (audioContextRef.current) {
        if (audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
        }
        audioContextRef.current = null;
    }
  };

  const startAudioVisualization = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateLevel = () => {
            if (!analyserRef.current || !isListening) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
            const avg = sum / dataArray.length;
            setAudioLevel(avg);
            requestAnimationFrame(updateLevel);
        };
        updateLevel();
    } catch (e) {
        console.warn("Audio visualization failed:", e);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && window.innerWidth > 768) {
       e.preventDefault();
       handleSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    setSilenceProgress(0);
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
    // Correcting the SpeechRecognition API selection for mobile Chrome
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true; 
      recognition.interimResults = true; 
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        setIsListening(true);
        sessionBaseTextRef.current = latestInputRef.current;
        startAudioVisualization();
      };
      
      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        const base = sessionBaseTextRef.current;
        const spacing = (base && !base.endsWith(' ')) ? ' ' : '';
        setInput(base + spacing + transcript.trim());
        startSilenceTimer();
      };

      recognition.onend = () => {
        if (isListening) {
           // On some browsers, mobile recognition might stop unexpectedly.
           // We keep the state clean.
           setIsListening(false);
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        stopListening();
      };

      recognitionRef.current = recognition;
    }
    
    return () => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
        alert("Speech Recognition not available on this browser/device.");
        return;
    }
    playSound('click');
    if (isListening) {
      stopListening();
    } else {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
            try {
                recognitionRef.current.start();
            } catch (err) {
                console.error("Recognition start failed:", err);
                stopListening();
            }
        })
        .catch(() => alert("Microphone access denied. Please enable it in browser settings."));
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
      fixed bottom-0 right-0 z-50 flex justify-center items-end transition-all duration-300 pointer-events-none pb-safe px-3 md:px-6
      ${isSidebarOpen ? 'left-0 md:left-72' : 'left-0'}
    `} style={{ bottom: 'env(safe-area-inset-bottom, 16px)' }}>
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-protocol-obsidian via-protocol-obsidian/95 to-transparent z-[-1] pointer-events-none"></div>

      <div className="w-full max-w-4xl relative pointer-events-auto flex flex-col mb-4 md:mb-6">
        
        {/* Indicators & Attachments Row */}
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
                {isListening && (
                    <div className="px-2.5 py-1 bg-red-500/10 backdrop-blur-md border border-red-500/20 text-[8px] md:text-[9px] text-red-400 font-mono tracking-widest uppercase flex items-center gap-1.5 rounded-full shadow-lg">
                        <div className="flex items-center gap-1">
                            <Activity size={10} className="animate-pulse" />
                            <div className="flex items-end gap-[1px] h-2">
                                {[1,2,3].map(i => (
                                    <div key={i} className="w-[1.5px] bg-red-400 rounded-full transition-all duration-75" style={{ height: `${Math.max(20, Math.min(100, audioLevel * (i * 0.5 + 0.5)))}%` }}></div>
                                ))}
                            </div>
                        </div>
                        <span className="ml-1">Listening</span>
                    </div>
                )}
            </div>

            {attachments.length > 0 && (
                <div className="px-1 flex gap-2 overflow-x-auto custom-scrollbar no-scrollbar py-1">
                    {attachments.map((att, idx) => (
                    <div key={idx} className="relative group shrink-0">
                        <div className="h-14 w-14 border border-protocol-border bg-protocol-input flex items-center justify-center relative rounded-xl overflow-hidden shadow-lg">
                            {att.type === 'video' ? <Video size={16} /> : att.type === 'audio' ? <Music size={16} /> : att.type === 'file' ? getFileIcon(att) : <img src={`data:${att.mimeType};base64,${att.data}`} alt="" className="h-full w-full object-cover" />}
                        </div>
                        <button onClick={() => removeAttachment(idx)} className="absolute -top-1.5 -right-1.5 bg-protocol-charcoal border border-protocol-border text-protocol-platinum p-1.5 hover:text-red-400 transition-colors rounded-full shadow-md z-10">
                            <X size={12} />
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
        <div className={`
            bg-protocol-charcoal/95 backdrop-blur-2xl border border-protocol-border rounded-[1.75rem] shadow-heavy overflow-hidden ring-1 ring-white/5 transition-all duration-500 relative
            ${isListening ? 'border-red-500/50 ring-red-500/20' : ''}
        `}>
            {/* Silence Detection Progress Bar */}
            {isListening && silenceProgress > 0 && (
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-protocol-border overflow-hidden z-[60]">
                    <div 
                        className="h-full bg-red-500 transition-all duration-100 ease-linear shadow-[0_0_8px_#ef4444]"
                        style={{ width: `${silenceProgress}%` }}
                    />
                </div>
            )}

            <div className="flex flex-col">
                {/* Secondary Tools Expansion (Mobile Only) */}
                {showExtraTools && (
                    <div className="flex items-center justify-around p-3 border-b border-protocol-border bg-protocol-obsidian/30 animate-fade-in md:hidden">
                        <button type="button" onClick={() => { onToggleIncognito(); playSound('click'); }} className={`p-3 rounded-xl flex flex-col items-center gap-1 ${isIncognito ? 'text-violet-400' : 'text-protocol-muted'}`}><Ghost size={20} /><span className="text-[8px] font-mono tracking-tighter">SECURE</span></button>
                        <button type="button" onClick={() => { setIsDeepAgent(!isDeepAgent); playSound('click'); }} className={`p-3 rounded-xl flex flex-col items-center gap-1 ${isDeepAgent ? 'text-emerald-400' : 'text-protocol-muted'}`}><BrainCircuit size={20} /><span className="text-[8px] font-mono tracking-tighter">THINK</span></button>
                        <button type="button" onClick={() => { toggleListening(); playSound('click'); }} className={`p-3 rounded-xl flex flex-col items-center gap-1 ${isListening ? 'text-red-500' : 'text-protocol-muted'}`}>{isListening ? <MicOff size={20} /> : <Mic size={20} />}<span className="text-[8px] font-mono tracking-tighter">VOICE</span></button>
                        <button type="button" onClick={() => { onOpenIntegrations(); playSound('click'); }} className="p-3 rounded-xl flex flex-col items-center gap-1 text-protocol-muted"><Plus size={20} /><span className="text-[8px] font-mono tracking-tighter">TOOLS</span></button>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex items-end gap-1.5 p-2 md:p-3">
                    {/* Left Actions */}
                    <div className="flex items-center mb-0.5">
                        <button
                            type="button"
                            onClick={() => { setShowExtraTools(!showExtraTools); playSound('click'); }}
                            className={`w-10 h-10 md:hidden flex items-center justify-center transition-all rounded-full ${showExtraTools ? 'bg-protocol-platinum text-protocol-obsidian' : 'text-protocol-muted hover:text-protocol-platinum'}`}
                        >
                            <Settings2 size={20} />
                        </button>
                        
                        <div className="hidden md:flex items-center">
                            <button type="button" onClick={() => { onOpenIntegrations(); playSound('click'); }} className="w-10 h-10 flex items-center justify-center text-protocol-muted hover:text-protocol-platinum hover:bg-protocol-border/10 rounded-full transition-all"><Plus size={20} /></button>
                            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isLoading} className="w-10 h-10 flex items-center justify-center text-protocol-muted hover:text-protocol-platinum hover:bg-protocol-border/10 rounded-full transition-all"><Paperclip size={20} /></button>
                        </div>
                        
                        {!showExtraTools && (
                            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isLoading} className="w-10 h-10 md:hidden flex items-center justify-center text-protocol-muted hover:text-protocol-platinum rounded-full"><Paperclip size={20} /></button>
                        )}
                        
                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,video/*,audio/*,application/pdf,text/*,.csv,.json,.js,.jsx,.ts,.tsx,.py,.html,.css,.md,.xml" multiple />
                    </div>
                    
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        onPaste={handlePaste}
                        placeholder={isListening ? "Listening..." : (isIncognito ? "Secure message..." : "Enter directive...")}
                        disabled={isLoading}
                        rows={1}
                        className={`flex-1 bg-transparent text-protocol-platinum py-2.5 px-2 focus:outline-none placeholder-protocol-muted/60 font-sans text-[16px] leading-snug resize-none max-h-[120px] md:max-h-[200px] custom-scrollbar mb-0.5 transition-colors ${isListening ? 'placeholder-red-400/50 italic' : ''}`}
                    />

                    {/* Right Actions */}
                    <div className="flex items-center gap-1 mb-0.5">
                        <div className="hidden md:flex items-center gap-1">
                            <button type="button" onClick={() => { onToggleIncognito(); playSound('click'); }} className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${isIncognito ? 'text-violet-400 bg-violet-500/10' : 'text-protocol-muted hover:text-protocol-platinum hover:bg-protocol-border/10'}`} title="Incognito"><Ghost size={20} /></button>
                            <button type="button" onClick={() => { setIsDeepAgent(!isDeepAgent); playSound('click'); }} className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${isDeepAgent ? 'text-emerald-400 bg-emerald-500/10' : 'text-protocol-muted hover:text-protocol-platinum hover:bg-protocol-border/10'}`} title="DeepAgent"><BrainCircuit size={20} /></button>
                            <button type="button" onClick={toggleListening} className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${isListening ? 'text-red-500 bg-red-500/10' : 'text-protocol-muted hover:text-protocol-platinum hover:bg-protocol-border/10'}`} title="Voice Input">{isListening ? <MicOff size={20} /> : <Mic size={20} />}</button>
                        </div>

                        <button
                            type="submit"
                            disabled={(!input.trim() && attachments.length === 0) || isLoading}
                            className={`h-10 w-10 md:w-auto md:px-5 flex items-center justify-center ${isListening ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-protocol-platinum text-protocol-obsidian hover:bg-protocol-muted'} font-bold text-[10px] uppercase tracking-widest transition-all disabled:opacity-20 rounded-full shadow-lg shrink-0`}
                        >
                            {isLoading ? <Loader2 size={18} className="animate-spin" /> : (isListening ? <Square size={16} fill="currentColor" /> : <ArrowUp size={22} strokeWidth={2.5} />)}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      </div>
    </div>
  );
};
