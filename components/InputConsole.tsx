
import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Loader2, Mic, MicOff, BrainCircuit, Paperclip, X, Zap, Video, Ghost, FileText, Mail, HardDrive, Calendar, Music, FileCode, FileJson, Plus } from 'lucide-react';
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
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
    
    // Check for @ mention trigger
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
    if (e.key === 'Enter' && !e.shiftKey) {
      if (showMentions) {
         e.preventDefault();
         handleSubmit();
      } else {
         e.preventDefault();
         handleSubmit();
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleMentionSelect = (mention: string) => {
     const words = input.split(' ');
     words.pop(); // remove the partial @...
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
    
    // Expanded text/code detection
    const isText = file.type.startsWith('text/') || 
                   file.type === 'application/json' ||
                   file.name.endsWith('.json') ||
                   file.name.endsWith('.js') ||
                   file.name.endsWith('.ts') ||
                   file.name.endsWith('.jsx') ||
                   file.name.endsWith('.tsx') ||
                   file.name.endsWith('.py') ||
                   file.name.endsWith('.md') ||
                   file.name.endsWith('.csv') ||
                   file.name.endsWith('.xml') ||
                   file.name.endsWith('.html') ||
                   file.name.endsWith('.css');

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
          
          if ((!mimeType || mimeType === 'application/octet-stream') && isText) {
             mimeType = 'text/plain';
          }

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
        alert("Unsupported file format. Please use Images, Video, Audio, PDF, or Text/Code files.");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) Array.from(e.target.files).forEach(processFile);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
            const file = item.getAsFile();
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
      fixed bottom-0 right-0 z-50 flex justify-center items-end transition-all duration-300 pointer-events-none pb-4 px-4
      ${isSidebarOpen ? 'left-0 md:left-72' : 'left-0'}
    `}>
      {/* Background Gradient to mask scrolling text at the very bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-protocol-obsidian via-protocol-obsidian/80 to-transparent z-[-1] pointer-events-none"></div>

      <div className="w-full max-w-4xl relative pointer-events-auto">
        
        {/* Status Indicators (Above Input) */}
        <div className="flex gap-2 mb-2 ml-2">
            {isIncognito && (
                <div className="px-3 py-1 bg-violet-500/10 backdrop-blur-md border border-violet-500/20 text-[9px] text-violet-400 font-mono tracking-widest uppercase flex items-center gap-2 rounded-full shadow-lg">
                <Ghost size={10} className="fill-current" />
                Incognito
                </div>
            )}
            {isDeepAgent && (
                <div className="px-3 py-1 bg-emerald-500/10 backdrop-blur-md border border-emerald-500/20 text-[9px] text-emerald-400 font-mono tracking-widest uppercase flex items-center gap-2 rounded-full shadow-lg">
                <Zap size={10} className="fill-current" />
                DeepAgent
                </div>
            )}
        </div>

        {/* Mentions Popover */}
        {showMentions && (
            <div className="absolute bottom-full left-12 mb-4 bg-protocol-charcoal border border-protocol-border p-2 w-48 shadow-2xl z-30 flex flex-col gap-1 rounded-xl overflow-hidden">
                <div className="px-4 py-2 text-[9px] text-protocol-muted font-mono uppercase tracking-wider">Ecosystem</div>
                <button onClick={() => handleMentionSelect('@Gmail')} className="flex items-center gap-3 px-4 py-2 hover:bg-protocol-border text-xs text-protocol-platinum transition-colors rounded-lg">
                    <Mail size={14} className="text-protocol-swissRed" />
                    <span>Gmail</span>
                </button>
                <button onClick={() => handleMentionSelect('@Drive')} className="flex items-center gap-3 px-4 py-2 hover:bg-protocol-border text-xs text-protocol-platinum transition-colors rounded-lg">
                    <HardDrive size={14} className="text-blue-400" />
                    <span>Drive</span>
                </button>
                <button onClick={() => handleMentionSelect('@Calendar')} className="flex items-center gap-3 px-4 py-2 hover:bg-protocol-border text-xs text-protocol-platinum transition-colors rounded-lg">
                    <Calendar size={14} className="text-emerald-400" />
                    <span>Calendar</span>
                </button>
            </div>
        )}
        
        {/* Attachments Rail */}
        {attachments.length > 0 && (
        <div className="px-6 py-2 flex gap-3 overflow-x-auto custom-scrollbar mb-2">
            {attachments.map((att, idx) => (
            <div key={idx} className="relative group shrink-0">
                <div className="h-14 w-14 border border-protocol-border bg-protocol-input flex items-center justify-center relative rounded-xl overflow-hidden shadow-lg">
                {att.type === 'video' ? (
                    <Video size={18} className="text-protocol-platinum/70" />
                ) : att.type === 'audio' ? (
                    <Music size={18} className="text-protocol-platinum/70" />
                ) : att.type === 'file' ? (
                    <div className="flex flex-col items-center justify-center p-1">
                        {getFileIcon(att)}
                        <span className="text-[7px] text-protocol-muted truncate w-10 text-center mt-0.5">{att.name?.slice(-8)}</span>
                    </div>
                ) : (
                    <img src={`data:${att.mimeType};base64,${att.data}`} alt="Preview" className="h-full w-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                )}
                </div>
                <button onClick={() => removeAttachment(idx)} className="absolute -top-1 -right-1 bg-protocol-charcoal border border-protocol-border text-protocol-platinum p-0.5 hover:text-red-400 transition-colors rounded-full shadow-md">
                <X size={8} />
                </button>
            </div>
            ))}
        </div>
        )}

        {/* The "Command Line" Input Form - Rounded & Floating - COMPACT */}
        <div className="bg-protocol-charcoal/90 backdrop-blur-xl border border-protocol-border rounded-[1.5rem] shadow-heavy overflow-hidden transition-all duration-300">
            <form onSubmit={handleSubmit} className="flex items-end gap-1 p-2">
               
               <div className="flex items-center gap-0.5 pl-1 h-10">
                   <button
                    type="button"
                    onClick={() => { onOpenIntegrations(); playSound('click'); }}
                    className="w-8 h-8 flex items-center justify-center text-protocol-muted hover:text-protocol-platinum hover:bg-protocol-border/10 transition-all rounded-full"
                    title="Connect Tools"
                   >
                     <Plus size={18} />
                   </button>

                   <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileSelect} 
                      className="hidden" 
                      accept="image/*,video/*,audio/*,application/pdf,text/*,.csv,.json,.js,.jsx,.ts,.tsx,.py,.html,.css,.md,.xml" 
                      multiple 
                   />
                   <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className={`w-8 h-8 flex items-center justify-center transition-all rounded-full hover:bg-protocol-border/10 ${attachments.length > 0 ? 'text-protocol-platinum' : 'text-protocol-muted hover:text-protocol-platinum'}`}
                   >
                    <Paperclip size={18} />
                   </button>
               </div>
               
               {/* Divider */}
               <div className="w-[1px] h-5 bg-protocol-border self-center mx-1"></div>

               <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder={isIncognito ? "Secure Channel Active..." : isListening ? "Listening..." : "Enter directive..."}
                  disabled={isLoading}
                  rows={1}
                  className="flex-1 bg-transparent text-protocol-platinum py-2.5 px-2 focus:outline-none placeholder-protocol-muted font-sans text-[14px] leading-relaxed resize-none max-h-[140px] custom-scrollbar"
                />

                <div className="flex items-center gap-1 pr-1 h-10">
                   {/* Tools */}
                   <button
                    type="button"
                    onClick={() => { onToggleIncognito(); playSound('click'); }}
                    className={`w-8 h-8 flex items-center justify-center transition-all rounded-full hover:bg-protocol-border/10 ${isIncognito ? 'text-violet-400 bg-violet-500/10' : 'text-protocol-muted hover:text-protocol-platinum'}`}
                    title="Toggle Incognito"
                   >
                    <Ghost size={18} />
                   </button>

                   <button
                    type="button"
                    onClick={() => { setIsDeepAgent(!isDeepAgent); playSound('click'); }}
                    className={`w-8 h-8 flex items-center justify-center transition-all rounded-full hover:bg-protocol-border/10 ${isDeepAgent ? 'text-emerald-400 bg-emerald-500/10' : 'text-protocol-muted hover:text-protocol-platinum'}`}
                   >
                    <BrainCircuit size={18} />
                   </button>

                   <button
                     type="button"
                     onClick={toggleListening}
                     className={`w-8 h-8 flex items-center justify-center transition-all rounded-full hover:bg-protocol-border/10 ${isListening ? 'text-protocol-swissRed animate-pulse' : 'text-protocol-muted hover:text-protocol-platinum'}`}
                   >
                     {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                   </button>

                   {/* Submit - Rounded Heavy Button - Smaller */}
                   <button
                    type="submit"
                    disabled={(!input.trim() && attachments.length === 0) || isLoading}
                    className={`h-8 px-4 ml-1 bg-protocol-platinum text-protocol-obsidian font-bold text-[10px] uppercase tracking-widest hover:bg-protocol-muted transition-all disabled:opacity-30 disabled:cursor-not-allowed rounded-full shadow-lg hover:shadow-xl hover:scale-105 active:scale-95`}
                   >
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={18} strokeWidth={2.5} />}
                   </button>
                </div>
            </form>
        </div>
      </div>
    </div>
  );
};
