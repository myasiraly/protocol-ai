
import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Loader2, Mic, MicOff, BrainCircuit, Command, Paperclip, X, Zap, Image as ImageIcon } from 'lucide-react';
import { playSound } from '../utils/audio';
import { Attachment } from '../types';

interface InputConsoleProps {
  onSend: (text: string, useDeepAgent: boolean, attachments: Attachment[]) => void;
  isLoading: boolean;
}

export const InputConsole: React.FC<InputConsoleProps> = ({ onSend, isLoading }) => {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isDeepAgent, setIsDeepAgent] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isLoading) {
      playSound('error');
      return;
    }
    playSound('click');
    onSend(input, isDeepAgent, attachments);
    setInput('');
    setAttachments([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (Math.random() > 0.8) playSound('hover'); 
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach((file: File) => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64String = (reader.result as string).split(',')[1];
            const newAttachment: Attachment = {
              type: 'image',
              mimeType: file.type,
              data: base64String
            };
            setAttachments(prev => [...prev, newAttachment]);
            playSound('click');
          };
          reader.readAsDataURL(file);
        }
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
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

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
        playSound('error');
      };
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    playSound('click');
    if (isListening) recognitionRef.current.stop();
    else recognitionRef.current.start();
  };

  const toggleDeepAgent = () => {
    playSound('click');
    setIsDeepAgent(!isDeepAgent);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 md:px-6 pb-6 pt-4 bg-gradient-to-t from-protocol-bg via-protocol-bg to-transparent flex justify-center">
      <div className="w-full max-w-3xl relative">
        
        {/* DeepAgent Mode Badge - Indicator floating above */}
        <div className={`
             absolute -top-10 left-0 right-0 flex justify-center transition-all duration-300 pointer-events-none
             ${isDeepAgent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
           `}>
             <div className="px-3 py-1 bg-emerald-500/10 backdrop-blur-md border border-emerald-500/30 text-[10px] text-emerald-400 font-mono tracking-[0.2em] rounded-full uppercase shadow-[0_0_20px_-5px_rgba(16,185,129,0.3)] flex items-center gap-2">
               <Zap size={12} className="fill-current animate-pulse" />
               DeepAgent Active
             </div>
        </div>

        {/* Main Capsule Container */}
        <div className={`
            relative bg-[#0b1221]/80 backdrop-blur-xl border transition-all duration-300 rounded-[1.5rem] shadow-2xl overflow-hidden flex flex-col
            ${isDeepAgent 
              ? 'border-emerald-500/40 shadow-[0_0_40px_-10px_rgba(16,185,129,0.1)]' 
              : 'border-white/10 shadow-black/50'}
            focus-within:border-white/20
          `}>
          
          {/* Attachment Preview Area - Inside Capsule */}
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
               {/* Left Actions (Attach) */}
               <div className="flex items-center pb-2 pl-2">
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
                  placeholder={isListening ? "Listening..." : isDeepAgent ? "DeepAgent Directive..." : "Command Protocol..."}
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
                    title="Toggle DeepAgent (Complex Workflows)"
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
                          ? 'text-red-400 bg-red-500/10 animate-pulse' 
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
                      text-white disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none hover:scale-105 active:scale-95
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
             {isLoading ? 'Processing...' : 'Ready'}
           </span>
        </div>
      </div>
    </div>
  );
};
