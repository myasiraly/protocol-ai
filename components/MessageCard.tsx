
import React, { useState, useRef, useEffect } from 'react';
import { Message, MessageRole, Attachment } from '../types';
import { User, Cpu, Square, Play, ExternalLink, Video, Copy, Check, Volume2, Sparkles } from 'lucide-react';
import { playAudioData } from '../services/geminiService';
import { playSound } from '../utils/audio';

interface MessageCardProps {
  message: Message;
}

export const MessageCard: React.FC<MessageCardProps> = ({ message }) => {
  const isProtocol = message.role === MessageRole.PROTOCOL;
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    if (Date.now() - message.timestamp < 1000) {
      playSound(isProtocol ? 'message' : 'click');
    }
    if (message.audioData && Date.now() - message.timestamp < 2000) {
       handlePlayNativeAudio();
    }
    return () => {
      if (sourceRef.current) sourceRef.current.stop();
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const handlePlayNativeAudio = async () => {
    if (!message.audioData) return;
    if (isPlaying) {
      sourceRef.current?.stop();
      setIsPlaying(false);
      return;
    }
    try {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();

      setIsPlaying(true);
      const source = await playAudioData(message.audioData, audioContextRef.current);
      sourceRef.current = source;
      source.onended = () => setIsPlaying(false);
    } catch (error) {
      console.error("Audio Playback Error:", error);
      setIsPlaying(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content).then(() => {
      setIsCopied(true);
      playSound('click');
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const parseBold = (text: string) => {
    const parts: React.ReactNode[] = [];
    const boldRegex = /\*\*([^\*]+)\*\*/g;
    let lastIndex = 0;
    let match;

    while ((match = boldRegex.exec(text)) !== null) {
      if (match.index > lastIndex) parts.push(text.substring(lastIndex, match.index));
      parts.push(<strong key={match.index} className="font-semibold text-white">{match[1]}</strong>);
      lastIndex = boldRegex.lastIndex;
    }
    if (lastIndex < text.length) parts.push(text.substring(lastIndex));
    return parts.length > 0 ? parts : [text];
  };

  const formatText = (text: string) => {
    const parts: React.ReactNode[] = [];
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
      if (match.index > lastIndex) parts.push(...parseBold(text.substring(lastIndex, match.index)));
      parts.push(
        <a key={match.index} href={match[2]} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline decoration-blue-500/30 inline-flex items-center gap-1">
          {match[1]}<ExternalLink size={10} />
        </a>
      );
      lastIndex = linkRegex.lastIndex;
    }
    if (lastIndex < text.length) parts.push(...parseBold(text.substring(lastIndex)));
    return parts.length > 0 ? parts : parseBold(text);
  };

  const renderGeneratedMedia = (media: Attachment[]) => {
    if (!media || media.length === 0) return null;
    return (
      <div className="grid grid-cols-1 gap-3 mt-4">
        {media.map((item, idx) => (
          <div key={idx} className="rounded-2xl overflow-hidden border border-white/10 bg-black/50 relative shadow-lg">
            {item.type === 'image' && item.data && (
               <img src={`data:${item.mimeType};base64,${item.data}`} alt="Gen" className="w-full h-auto object-cover" />
            )}
            {item.type === 'video' && item.uri && (
               <div className="relative w-full aspect-video">
                 <video controls className="w-full h-full object-cover">
                   <source src={item.uri} type="video/mp4" />
                 </video>
                 <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-full flex items-center gap-1.5 text-[10px] font-mono text-white/90 pointer-events-none border border-white/10">
                   <Video size={10} className="text-emerald-400" />
                   <span>VEO GENERATION</span>
                 </div>
               </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderUserAttachments = (attachments: Attachment[]) => {
     if (!attachments || attachments.length === 0) return null;
     return (
       <div className="flex flex-wrap gap-2 mb-2 justify-end">
         {attachments.map((att, idx) => (
           <div key={idx} className="h-16 w-16 md:h-20 md:w-20 rounded-xl overflow-hidden border border-white/10 shadow-sm flex items-center justify-center bg-black/50">
              {att.type === 'image' && att.data && (
                  <img src={`data:${att.mimeType};base64,${att.data}`} alt="Att" className="w-full h-full object-cover" />
              )}
              {att.type === 'video' && att.data && (
                  <video src={`data:${att.mimeType};base64,${att.data}`} className="w-full h-full object-cover" />
              )}
           </div>
         ))}
       </div>
     );
  };

  const renderContent = (text: string) => {
    if (message.audioData) {
        return (
            <div className="flex items-center gap-4 py-2 px-1 animate-fade-in">
                <button onClick={handlePlayNativeAudio} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg ${isPlaying ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                   {isPlaying ? <Square size={16} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                </button>
                <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-mono font-bold text-blue-400 tracking-wider uppercase flex items-center gap-1.5">
                        <Volume2 size={12} /> Encrypted Audio
                    </span>
                    <div className="h-1 w-32 bg-white/10 rounded-full overflow-hidden">
                       <div className={`h-full bg-blue-500 rounded-full transition-all duration-300 ${isPlaying ? 'animate-pulse w-full' : 'w-0'}`}></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!isProtocol) {
      return (
        <div className="font-sans text-[15px] leading-relaxed text-white whitespace-pre-wrap">
          {formatText(text)}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {text.split('\n').map((line, idx) => {
          const trimmed = line.trim();
          if (trimmed.startsWith('###')) {
            return (
              <div key={idx} className="mt-6 mb-3 flex items-center gap-3">
                 <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono">{line.replace(/^###\s*/, '')}</h3>
                 <div className="h-[1px] flex-grow bg-white/10"></div>
              </div>
            );
          }
          if (trimmed.match(/^\[.*?\]:/)) {
             // System Status Messages
            const [tag, ...rest] = line.split(':');
            return (
              <div key={idx} className="flex gap-2 items-start py-1 text-xs font-mono animate-fade-in text-protocol-muted">
                <span className="text-blue-400 whitespace-nowrap">{tag}</span>
                <span className="opacity-80">{formatText(rest.join(':'))}</span>
              </div>
            );
          }
          if (trimmed.startsWith('* ')) {
            return (
              <div key={idx} className="flex items-start gap-3 mb-1 pl-1">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500/50 mt-2 shrink-0" />
                <span className="text-gray-300 text-[15px] leading-relaxed">{formatText(line.replace(/^\*\s*/, ''))}</span>
              </div>
            );
          }
          if (trimmed === '') return <div key={idx} className="h-2" />;
          return <p key={idx} className="mb-2 text-gray-300 text-[15px] leading-relaxed">{formatText(line)}</p>;
        })}
        {message.generatedMedia && renderGeneratedMedia(message.generatedMedia)}
      </div>
    );
  };

  return (
    <div className={`w-full flex ${isProtocol ? 'justify-start' : 'justify-end'} mb-6 md:mb-8 animate-slide-up px-2 group`}>
      <div className={`flex gap-4 max-w-[95%] md:max-w-[85%] lg:max-w-[75%] ${isProtocol ? 'flex-row' : 'flex-row-reverse'}`}>
        
        {/* Avatar Area */}
        <div className="shrink-0 flex flex-col gap-2 mt-1">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shadow-lg ${isProtocol ? 'bg-gradient-to-br from-gray-900 to-black border-white/10 text-blue-400' : 'bg-white text-black border-transparent'}`}>
             {isProtocol ? <Sparkles size={14} /> : <User size={14} />}
          </div>
        </div>

        {/* Content Area */}
        <div className={`flex flex-col ${isProtocol ? 'items-start' : 'items-end'}`}>
          <div className="flex items-center gap-2 mb-1 opacity-60 px-1">
             <span className="text-[10px] font-mono uppercase tracking-wider">{isProtocol ? 'Protocol' : 'You'}</span>
             {isProtocol && !message.audioData && (
                <button onClick={handleCopy} className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-white">
                  {isCopied ? <Check size={10} /> : <Copy size={10} />}
                </button>
             )}
          </div>

          <div className={`relative px-5 py-3.5 md:px-6 md:py-4 shadow-sm ${
            isProtocol 
              ? 'bg-transparent' // Protocol text blends with background, no bubble necessary for cleaner look, or minimal
              : 'bg-[#1a1a1a] border border-white/10 rounded-2xl rounded-tr-sm text-white'
          }`}>
             {!isProtocol && renderUserAttachments(message.attachments || [])}
             <div className={`${isProtocol ? 'text-gray-300' : 'text-white'}`}>
                {renderContent(message.content)}
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};
