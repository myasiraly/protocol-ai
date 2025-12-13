
import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Loader2, Mic, MicOff, BrainCircuit, Command, Paperclip, X, Zap, Image as ImageIcon, Settings2 } from 'lucide-react';
import { playSound } from '../utils/audio';
import { Attachment, ImageGenerationSize } from '../types';

interface InputConsoleProps {
  onSend: (text: string, useDeepAgent: boolean, attachments: Attachment[], imageSize: ImageGenerationSize) => void;
  isLoading: boolean;
}

export const InputConsole: React.FC<InputConsoleProps> = ({ onSend, isLoading }) => {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isDeepAgent, setIsDeepAgent] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [imageSize, setImageSize] = useState<ImageGenerationSize>('1K');
  const [showConfig, setShowConfig] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const silenceTimerRef = useRef<any>(null);
  
  // We use a ref to track input for the speech closure to access the latest state
  const inputRef = useRef(input);

  // Sync ref with state
  useEffect(() => {
    inputRef.current = input;
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isLoading) {
      playSound('error');
      return;
    }
    playSound('click');
    onSend(input, isDeepAgent, attachments, imageSize);
    setInput('');
    setAttachments([]);
    setShowConfig(false);
  };

  const handleAutoSend = () => {
    const currentInput = inputRef.current;
    if ((!currentInput.trim() && attachments.length === 0) || isLoading) return;

    playSound('message'); // Distinct sound for auto-send
    onSend(currentInput, isDeepAgent, attachments, imageSize);
    
    setInput('');
    setAttachments([]);
    setIsListening(false); // Stop listening after auto-send
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Remove hover sound on type for cleaner feel
  };

  const processFile = (file: File) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (result) {
          const base64String = result.split(',')[1];
          const newAttachment: Attachment = {
            type: 'image',
            mimeType: file.type,
            data: base64String
          };
          setAttachments(prev => [...prev, newAttachment]);
          playSound('click');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach(processFile);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    let foundImage = false;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          processFile(file);
          foundImage = true;
        }
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach(processFile);
      playSound('success');
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
    playSound('click');
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  // Speech Recognition Logic
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true; // Changed to true for smoother visual feedback
      recognition.lang = 'en-US';
      
      recognition.onstart = () => setIsListening(true);
      
      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcript = event.results[current][0].transcript;
        const isFinal = event.results[current].isFinal;

        if (transcript.trim()) {
           // We only update state if it's final or interim, logic depends on preference.
           // To avoid duplication, we can check isFinal or just overwrite the end of the string.
           // A simpler approach for continuous dictation + manual input mixing:
           
           if (isFinal) {
             setInput(prev => {
               const trimmedPrev = prev.trim();
               const cleanTranscript = transcript.trim();
               return trimmedPrev ? `${trimmedPrev} ${cleanTranscript}` : cleanTranscript;
             });
             
             // Reset Silence Timer on final result
             if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
             
             // Set new timer for Auto-Send (1.5 seconds silence)
             silenceTimerRef.current = setTimeout(() => {
                handleAutoSend();
             }, 1500);
           }
        }
      };

      recognition.onend = () => {
        // If we stopped but didn't auto-send (e.g. user clicked mic button), clean up
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      };

      recognitionRef.current = recognition;
    }
    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, []); // Empty dependency array, relying on refs for latest state

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    playSound('click');
    if (isListening) {
      recognitionRef.current.stop();
      // If manually stopping, we do NOT auto-send, we just stop listening.
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    } else {
      recognitionRef.current.start();
    }
  };

  const toggleDeepAgent = () => {
    playSound('click');
    setIsDeepAgent(!isDeepAgent);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 md:px-6 pb-6 pt-4 bg-gradient-to-t from-protocol-bg via-protocol-bg to-transparent flex justify-center">
      <div className="w-full max-w-3xl relative">
        
        {/* DeepAgent Mode Badge */}
        <div className={`
             absolute -top-10 left-0 right-0 flex justify-center transition-all duration-300 pointer-events-none
             ${isDeepAgent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
           `}>
             <div className="px-3 py-1 bg-emerald-500/10 backdrop-blur-md border border-emerald-500/30 text-[10px] text-emerald-400 font-mono tracking-[0.2em] rounded-full uppercase shadow-[0_0_20px_-5px_rgba(16,185,129,0.3)] flex items-center gap-2">
               <Zap size={12} className="fill-current animate-pulse" />
               DeepAgent Active
             </div>
        </div>

        {/* Config Menu Popover */}
        {showConfig && (
           <div className="absolute bottom-full right-0 mb-4 bg-[#0b1221]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 w-64 animate-slide-up z-20">
              <h3 className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-3 border-b border-white/5 pb-2">Image Gen Resolution</h3>
              <div className="flex gap-2">
                 {(['1K', '2K', '4K'] as ImageGenerationSize[]).map((size) => (
                    <button
                       key={size}
                       type="button"
                       onClick={() => { setImageSize(size); playSound('click'); }}
                       className={`flex-1 py-2 text-xs font-mono font-bold rounded-lg border transition-all ${
                          imageSize === size 
                            ? 'bg-sky-500/20 border-sky-500/50 text-sky-400' 
                            : 'bg-white/5 border-transparent text-slate-500 hover:bg-white/10 hover:text-slate-300'
                       }`}
                    >
                       {size}
                    </button>
                 ))}
              </div>
           </div>
        )}

        {/* Main Capsule Container */}
        <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
            relative bg-[#0b1221]/80 backdrop-blur-xl border transition-all duration-300 rounded-[1.5rem] shadow-2xl overflow-hidden flex flex-col
            ${isDeepAgent 
              ? 'border-emerald-500/40 shadow-[0_0_40px_-10px_rgba(16,185,129,0.1)]' 
              : 'border-white/10 shadow-black/50'}
            focus-within:border-white/20
            ${isListening ? 'ring-1 ring-red-500/50 shadow-[0_0_30px_-5px_rgba(239,68,68,0.2)]' : ''}
            ${isDragging ? 'ring-2 ring-sky-500 shadow-[0_0_40px_rgba(56,189,248,0.3)] bg-sky-900/20' : ''}
          `}>
          
          {/* Drag Overlay */}
          {isDragging && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none animate-fade-in">
              <div className="text-sky-400 font-mono text-sm tracking-widest uppercase flex items-center gap-2 border border-sky-500/30 bg-sky-900/40 px-6 py-3 rounded-xl shadow-lg">
                <Paperclip size={18} />
                <span>Drop Visual Intel Here</span>
              </div>
            </div>
          )}

          {/* Attachment Preview Area */}
          {attachments.length > 0 && (
            <div className="px-4 pt-4 pb-2 flex gap-3 overflow-x-auto custom-scrollbar border-b border-white/5 bg-white/[0.02]">
              {attachments.map((att, idx) => (
                <div key={idx} className="relative group shrink-0 animate-fade-in">
                  <div className="h-16 w-16 rounded-xl overflow-hidden border border-white/10 bg-black/40 ring-1 ring-white/5 shadow-lg relative">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10"></div>
                    <img src={`data:${att.mimeType};base64,${att.data}`} alt="Preview" className="h-full w-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <button 
                    type="button"
                    onClick={() => removeAttachment(idx)}
                    className="absolute -top-1.5 -right-1.5 bg-slate-900 text-slate-400 border border-white/10 rounded-full p-1 hover:bg-red-500/90 hover:text-white hover:border-red-500/50 transition-all shadow-xl z-20 scale-90 hover:scale-100 opacity-0 group-hover:opacity-100"
                    title="Remove Image"
                  >
                    <X size={10} strokeWidth={3} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="relative flex flex-col">
            <div className="flex items-end gap-2 p-2">
               {/* Left Actions */}
               <div className="flex items-center pb-2 pl-2 gap-1">
                   <button
                    type="button"
                    onClick={() => setShowConfig(!showConfig)}
                    className={`
                      w-9 h-9 rounded-full flex items-center justify-center transition-all
                      ${showConfig ? 'text-sky-400 bg-white/5' : 'text-slate-400 hover:text-white hover:bg-white/5'}
                    `}
                    title="Generation Settings"
                   >
                     <Settings2 size={16} />
                   </button>

                   <div className="h-4 w-[1px] bg-white/10 mx-1"></div>

                   <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileSelect} 
                    className="hidden" 
                    accept="image/*"
                    multiple
                   />
                   <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className={`
                      w-9 h-9 rounded-full flex items-center justify-center transition-all
                      ${attachments.length > 0 
                        ? 'text-sky-400 bg-sky-500/10' 
                        : 'text-slate-400 hover:text-white hover:bg-white/5'}
                    `}
                    title="Attach Visual Data"
                   >
                    {attachments.length > 0 ? <ImageIcon size={18} /> : <Paperclip size={18} />}
                   </button>
               </div>

               {/* Text Input */}
               <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder={isListening ? "Listening... (Auto-send on silence)" : isDeepAgent ? "DeepAgent Directive..." : "Command Protocol... (Drag images or paste)"}
                  disabled={isLoading}
                  rows={1}
                  className={`
                    flex-1 bg-transparent text-slate-100 py-3 px-2
                    focus:outline-none placeholder-slate-500 font-sans text-[15px] leading-relaxed resize-none 
                    disabled:opacity-50 min-h-[50px] max-h-[200px] custom-scrollbar
                  `}
                />

                {/* Right Actions */}
                <div className="flex items-center gap-2 pb-1 pr-1">
                   {/* DeepAgent Toggle */}
                   <button
                    type="button"
                    onClick={toggleDeepAgent}
                    disabled={isLoading}
                    className={`
                       h-9 px-3 rounded-full flex items-center gap-2 transition-all duration-300 text-xs font-medium tracking-wide border
                       ${isDeepAgent 
                         ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                         : 'text-slate-500 hover:text-slate-300 hover:bg-white/5 border-transparent'}
                    `}
                    title="Toggle DeepAgent"
                   >
                    {isDeepAgent ? <Zap size={14} className="fill-current" /> : <BrainCircuit size={16} />}
                    <span className="hidden md:inline-block">DeepAgent</span>
                   </button>

                   {/* Mic */}
                   {recognitionRef.current && (
                    <button
                      type="button"
                      onClick={toggleListening}
                      disabled={isLoading}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isListening 
                          ? 'text-red-400 bg-red-500/10 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.4)] ring-1 ring-red-500/30' 
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                    </button>
                   )}

                   {/* Send */}
                   <button
                    type="submit"
                    disabled={(!input.trim() && attachments.length === 0) || isLoading}
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg
                      ${isDeepAgent 
                        ? 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/20' 
                        : 'bg-sky-500 hover:bg-sky-400 shadow-sky-500/20'}
                      text-white disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95
                    `}
                   >
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <ArrowUp size={20} />}
                   </button>
                </div>
            </div>
          </form>
        </div>
        
        {/* Footer Hint */}
        <div className="mt-3 text-center flex items-center justify-center gap-2 opacity-30 transition-opacity duration-300 hover:opacity-60">
           <Command size={10} className="text-slate-400" />
           <span className="text-[10px] text-slate-400 font-mono tracking-[0.2em] uppercase">
             {isLoading ? 'Processing...' : isListening ? 'Listening (Auto-Send)' : 'Ready'} | Res: <span className="text-sky-400">{imageSize}</span>
           </span>
        </div>
      </div>
    </div>
  );
};
