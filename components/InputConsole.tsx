
import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Loader2, Mic, MicOff, BrainCircuit, Paperclip, X, Zap, Image as ImageIcon, Settings2, Video } from 'lucide-react';
import { playSound } from '../utils/audio';
import { Attachment, ImageGenerationSize } from '../types';

interface InputConsoleProps {
  onSend: (text: string, useDeepAgent: boolean, attachments: Attachment[], imageSize: ImageGenerationSize, isVoice: boolean) => void;
  isLoading: boolean;
  isSidebarOpen: boolean;
}

export const InputConsole: React.FC<InputConsoleProps> = ({ onSend, isLoading, isSidebarOpen }) => {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isDeepAgent, setIsDeepAgent] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [imageSize, setImageSize] = useState<ImageGenerationSize>('1K');
  const [showConfig, setShowConfig] = useState(false);
  
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
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
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
    onSend(textToSend, isDeepAgent, attachments, imageSize, false); 
    setInput('');
    setAttachments([]);
    setShowConfig(false);
  };

  const handleAutoSend = () => {
    const textToSend = latestInputRef.current;
    if (!textToSend.trim() && attachments.length === 0) {
      stopListening();
      return;
    }
    playSound('message'); 
    onSend(textToSend, isDeepAgent, attachments, imageSize, true);
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
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
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

    if (isImage || isVideo) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (result) {
          const type = isVideo ? 'video' : 'image';
          setAttachments(prev => [...prev, { type, mimeType: file.type, data: result.split(',')[1] }]);
          playSound('click');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) Array.from(e.target.files).forEach(processFile);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1 || items[i].type.indexOf('video') !== -1) {
        const file = items[i].getAsFile();
        if (file) processFile(file);
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className={`
      fixed bottom-6 right-0 z-50 px-4 flex justify-center items-end pointer-events-none transition-all duration-300
      ${isSidebarOpen ? 'left-0 md:left-72' : 'left-0'}
    `}>
      <div className="w-full max-w-3xl relative pointer-events-auto">
        
        {/* Status Indicators */}
        <div className="absolute -top-14 left-0 right-0 flex justify-center gap-3">
            {isDeepAgent && (
                <div className="px-3 py-1 bg-emerald-500/10 backdrop-blur-md border border-emerald-500/20 text-[10px] text-emerald-400 font-mono tracking-widest rounded-full uppercase shadow-lg flex items-center gap-2 animate-fade-in">
                <Zap size={10} className="fill-current animate-pulse" />
                DeepAgent
                </div>
            )}
            {isListening && (
                <div className="px-3 py-1 bg-red-500/10 backdrop-blur-md border border-red-500/20 text-[10px] text-red-400 font-mono tracking-widest rounded-full uppercase shadow-lg flex items-center gap-2 animate-fade-in">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                Listening
                </div>
            )}
        </div>

        {/* Config Popover */}
        {showConfig && (
           <div className="absolute bottom-full left-0 mb-3 bg-[#111] border border-white/10 rounded-xl p-3 w-48 animate-slide-up shadow-2xl z-20">
              <div className="text-[10px] font-mono uppercase text-gray-500 mb-2">Image Fidelity</div>
              <div className="flex gap-1">
                 {(['1K', '2K', '4K'] as ImageGenerationSize[]).map((size) => (
                    <button
                       key={size}
                       onClick={() => { setImageSize(size); playSound('click'); }}
                       className={`flex-1 py-1.5 text-[10px] font-mono font-bold rounded border transition-all ${
                          imageSize === size 
                            ? 'bg-white text-black border-white' 
                            : 'bg-transparent border-white/10 text-gray-500 hover:border-white/30 hover:text-gray-300'
                       }`}
                    >
                       {size}
                    </button>
                 ))}
              </div>
           </div>
        )}

        {/* Main Input Capsule */}
        <div className={`
            relative bg-[#0A0A0A]/80 backdrop-blur-xl border transition-all duration-300 rounded-[24px] shadow-2xl overflow-hidden flex flex-col
            ${isDeepAgent ? 'border-emerald-500/30' : 'border-white/10'}
            ${isListening ? 'border-red-500/30' : 'focus-within:border-white/20'}
        `}>
          
          {attachments.length > 0 && (
            <div className="px-4 pt-4 pb-0 flex gap-2 overflow-x-auto custom-scrollbar">
              {attachments.map((att, idx) => (
                <div key={idx} className="relative group shrink-0 animate-fade-in">
                  <div className="h-14 w-14 rounded-lg overflow-hidden border border-white/10 bg-black flex items-center justify-center">
                    {att.type === 'video' ? (
                       <Video size={20} className="text-white/70" />
                    ) : (
                       <img src={`data:${att.mimeType};base64,${att.data}`} alt="Preview" className="h-full w-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                  <button onClick={() => removeAttachment(idx)} className="absolute -top-1.5 -right-1.5 bg-zinc-800 text-white rounded-full p-0.5 hover:bg-red-500 transition-colors">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex items-end gap-2 p-2">
               
               <div className="flex items-center gap-1 pl-1">
                   <button
                    type="button"
                    onClick={() => setShowConfig(!showConfig)}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
                   >
                     <Settings2 size={18} />
                   </button>

                   <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,video/*" multiple />
                   <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${attachments.length > 0 ? 'text-white' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                   >
                    <Paperclip size={18} />
                   </button>
               </div>

               <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder={isListening ? "Listening..." : "Enter directive..."}
                  disabled={isLoading}
                  rows={1}
                  className="flex-1 bg-transparent text-white py-3 px-2 focus:outline-none placeholder-gray-600 font-sans text-[15px] resize-none max-h-[120px] custom-scrollbar"
                />

                <div className="flex items-center gap-2 pr-1 pb-0.5">
                   <button
                    type="button"
                    onClick={() => { setIsDeepAgent(!isDeepAgent); playSound('click'); }}
                    className={`h-9 px-3 rounded-full flex items-center justify-center transition-all border ${isDeepAgent ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-transparent border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                   >
                    <BrainCircuit size={18} />
                   </button>

                   <button
                     type="button"
                     onClick={toggleListening}
                     className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${isListening ? 'text-red-400 bg-red-500/10' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                   >
                     {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                   </button>

                   <button
                    type="submit"
                    disabled={(!input.trim() && attachments.length === 0) || isLoading}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-lg ${isDeepAgent ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-white hover:bg-gray-200 text-black'} disabled:opacity-30 disabled:cursor-not-allowed`}
                   >
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={18} />}
                   </button>
                </div>
          </form>
        </div>
      </div>
    </div>
  );
};
