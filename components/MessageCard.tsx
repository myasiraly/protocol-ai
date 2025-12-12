
import React, { useState, useRef, useEffect } from 'react';
import { Message, MessageRole, Attachment } from '../types';
import { User, Cpu, Square, Loader2, Play, ExternalLink, Video, FileText, Copy, Check } from 'lucide-react';
import { generateSpeech, playAudioData } from '../services/geminiService';
import { playSound } from '../utils/audio';

interface MessageCardProps {
  message: Message;
}

export const MessageCard: React.FC<MessageCardProps> = ({ message }) => {
  const isProtocol = message.role === MessageRole.PROTOCOL;
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    // Trigger sound on mount for new messages
    if (Date.now() - message.timestamp < 1000) {
      playSound(isProtocol ? 'message' : 'click');
    }

    return () => {
      if (sourceRef.current) {
        sourceRef.current.stop();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const handleToggleAudio = async () => {
    if (isPlaying) {
      if (sourceRef.current) {
        sourceRef.current.stop();
        sourceRef.current = null;
      }
      setIsPlaying(false);
      return;
    }

    playSound('click');
    setIsLoadingAudio(true);
    try {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const base64Audio = await generateSpeech(message.content);
      const source = await playAudioData(base64Audio, audioContextRef.current);
      
      sourceRef.current = source;
      setIsPlaying(true);

      source.onended = () => {
        setIsPlaying(false);
        sourceRef.current = null;
      };

    } catch (error) {
      console.error("Failed to play audio:", error);
      playSound('error');
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content).then(() => {
      setIsCopied(true);
      playSound('click');
      setTimeout(() => setIsCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      playSound('error');
    });
  };

  // Helper to parse links [Title](url) in text
  const parseTextWithLinks = (text: string) => {
    const regex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      parts.push(
        <a 
          key={match.index} 
          href={match[2]} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-sky-400 hover:text-sky-300 underline decoration-sky-500/30 hover:decoration-sky-400 transition-all inline-flex items-center gap-1"
        >
          {match[1]}
          <ExternalLink size={10} />
        </a>
      );
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    return parts.length > 0 ? parts : text;
  };

  // Render Generated Media (Images/Videos) for Protocol
  const renderGeneratedMedia = (media: Attachment[]) => {
    if (!media || media.length === 0) return null;
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        {media.map((item, idx) => (
          <div key={idx} className={`rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-black/50 relative group ${item.type === 'video' ? 'md:col-span-2' : ''}`}>
            {item.type === 'image' && item.data && (
               <img src={`data:${item.mimeType};base64,${item.data}`} alt="DeepAgent Generation" className="w-full h-auto object-cover hover:scale-105 transition-transform duration-700" />
            )}
            {item.type === 'video' && item.uri && (
               <div className="relative w-full aspect-video">
                 <video controls className="w-full h-full object-cover">
                   <source src={item.uri} type="video/mp4" />
                   Your browser does not support the video tag.
                 </video>
                 <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-2 text-xs font-mono text-white/80 border border-white/10 pointer-events-none">
                   <Video size={12} className="text-emerald-400" />
                   <span>Veo 3.1</span>
                 </div>
               </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Render User Attachments
  const renderUserAttachments = (attachments: Attachment[]) => {
     if (!attachments || attachments.length === 0) return null;
     return (
       <div className="flex flex-wrap gap-2 mb-3 justify-end">
         {attachments.map((att, idx) => (
           <div key={idx} className="h-16 w-16 rounded-lg overflow-hidden border border-white/10 relative">
              <img src={`data:${att.mimeType};base64,${att.data}`} alt="Attachment" className="w-full h-full object-cover" />
           </div>
         ))}
       </div>
     );
  };

  // Smart Content Renderer
  const renderContent = (text: string) => {
    if (!isProtocol) {
      return (
        <div className="font-sans text-[15px] leading-relaxed text-slate-200 whitespace-pre-wrap">
           {text}
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {text.split('\n').map((line, idx) => {
          const trimmed = line.trim();

          // Headers (### ROLE)
          if (trimmed.startsWith('###')) {
            return (
              <div key={idx} className="mt-8 mb-4 flex items-center gap-3 opacity-90">
                 <div className="h-[1px] w-4 bg-sky-500/50"></div>
                 <h3 className="text-[11px] font-bold text-sky-400 uppercase tracking-[0.2em] font-mono">
                    {line.replace(/^###\s*/, '')}
                 </h3>
                 <div className="h-[1px] flex-grow bg-gradient-to-r from-sky-500/50 to-transparent"></div>
              </div>
            );
          }
          
          // Directives ([STATUS]: Completed)
          if (trimmed.match(/^\[.*?\]:/)) {
            const [tag, ...rest] = line.split(':');
            return (
              <div key={idx} className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-3 mb-3 font-mono text-xs animate-fade-in pl-1" style={{animationDelay: `${idx * 20}ms`}}>
                <span className="text-sky-300 font-bold tracking-tight inline-block bg-sky-950/40 px-2 py-1 rounded border border-sky-500/20 shadow-[0_0_10px_-4px_rgba(56,189,248,0.4)] whitespace-nowrap">
                  {tag}
                </span>
                <span className="text-slate-300 font-medium tracking-wide leading-relaxed">{rest.join(':')}</span>
              </div>
            );
          }

          // Bullet Points (* Item)
          if (trimmed.startsWith('* ')) {
            const content = line.replace(/^\*\s*/, '');
            return (
              <div key={idx} className="flex items-start gap-4 mb-2 pl-2 group">
                <div className="w-1 h-1 rounded-full bg-slate-500 mt-2.5 shrink-0 group-hover:bg-sky-400 group-hover:shadow-[0_0_8px_rgba(56,189,248,0.8)] transition-all" />
                <span className="text-slate-300 leading-relaxed text-[15px] font-sans font-light tracking-wide">
                  {parseTextWithLinks(content)}
                </span>
              </div>
            );
          }

          // Numbered Lists (1. Option)
          if (trimmed.match(/^\d+\./)) {
            const number = trimmed.match(/^\d+\./)?.[0];
            const content = line.replace(/^\d+\.\s*/, '');
            return (
              <div key={idx} className="flex items-start gap-4 mb-3 pl-1 group p-3 rounded-lg hover:bg-white/[0.02] transition-colors border border-transparent hover:border-white/5">
                 <span className="font-mono text-sky-500/80 text-xs mt-0.5 font-bold">{number}</span>
                 <span className="text-slate-200 leading-relaxed text-[15px] font-sans font-light tracking-wide">
                   {parseTextWithLinks(content)}
                 </span>
              </div>
            );
          }

          // Empty Lines
          if (trimmed === '') return <div key={idx} className="h-2" />;
          
          // Standard Text
          return <p key={idx} className="mb-2 text-slate-300 leading-relaxed text-[15px] font-sans font-light tracking-wide pl-1">
            {parseTextWithLinks(line)}
          </p>;
        })}
        
        {/* Render any generated media at the bottom of the message */}
        {message.generatedMedia && renderGeneratedMedia(message.generatedMedia)}
      </div>
    );
  };

  return (
    <div className={`w-full flex ${isProtocol ? 'justify-start' : 'justify-end'} mb-8 animate-slide-up group px-2 md:px-0`}>
      <div className={`flex flex-col relative max-w-[95%] md:max-w-[85%] lg:max-w-[75%] ${isProtocol ? 'items-start' : 'items-end'}`}>
        
        {/* Header Label - Visible on Hover or always for Protocol */}
        <div className={`flex items-center gap-3 mb-2 transition-all duration-300 ${isProtocol ? 'translate-x-1' : 'flex-row-reverse translate-x--1'}`}>
          <div className={`
             flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-mono tracking-widest font-bold uppercase shadow-sm backdrop-blur-md
             ${isProtocol 
               ? 'bg-[#0b1221] border-sky-500/20 text-sky-400' 
               : 'bg-slate-800 border-slate-600/50 text-slate-300'}
          `}>
             {isProtocol ? <Cpu size={12} /> : <User size={12} />}
             <span>{isProtocol ? 'PROTOCOL' : 'USER'}</span>
          </div>
          
          <span className="text-[10px] font-mono text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
            {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </span>

          {isProtocol && (
             <>
               <button 
                  onClick={handleToggleAudio}
                  disabled={isLoadingAudio}
                  className={`
                    flex items-center gap-1.5 px-2 py-0.5 rounded-full border bg-white/[0.02] backdrop-blur-sm transition-all hover:bg-white/[0.05] opacity-0 group-hover:opacity-100
                    ${isPlaying ? 'text-sky-400 border-sky-500/30' : 'text-slate-500 border-white/5 hover:text-slate-300'}
                  `}
                >
                  {isLoadingAudio ? <Loader2 size={10} className="animate-spin" /> : isPlaying ? <Square size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" />}
                  <span className="text-[9px] uppercase tracking-wider font-bold font-mono hidden sm:inline">
                     {isPlaying ? 'Stop' : 'Read Aloud'}
                  </span>
                </button>

                <button
                  onClick={handleCopy}
                  className={`
                    flex items-center gap-1.5 px-2 py-0.5 rounded-full border bg-white/[0.02] backdrop-blur-sm transition-all hover:bg-white/[0.05] opacity-0 group-hover:opacity-100
                    ${isCopied ? 'text-emerald-400 border-emerald-500/30' : 'text-slate-500 border-white/5 hover:text-slate-300'}
                  `}
                >
                  {isCopied ? <Check size={10} /> : <Copy size={10} />}
                  <span className="text-[9px] uppercase tracking-wider font-bold font-mono hidden sm:inline">
                     {isCopied ? 'Copied' : 'Copy'}
                  </span>
                </button>
             </>
          )}
        </div>

        {/* Message Container */}
        <div className={`
          relative overflow-hidden transition-all duration-300
          ${isProtocol 
            ? 'bg-[#020617]/80 backdrop-blur-xl border border-white/10 rounded-2xl rounded-tl-sm shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-6 md:p-8 w-full' 
            : 'bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl rounded-tr-sm shadow-xl p-5 min-w-[120px]'}
        `}>
          
          {/* Protocol Specific Visual Decorations */}
          {isProtocol && (
             <>
               <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-sky-500/20 to-transparent"></div>
               <div className="absolute top-0 left-0 w-[2px] h-full bg-gradient-to-b from-sky-500/20 via-transparent to-transparent"></div>
               <div className="absolute -top-32 -right-32 w-64 h-64 bg-sky-500/5 blur-[80px] pointer-events-none rounded-full"></div>
             </>
          )}

          {/* User Specific Visual Decorations */}
          {!isProtocol && (
             <div className="absolute inset-0 bg-white/[0.02] pointer-events-none"></div>
          )}
          
          {/* Content */}
          <div className="relative z-10">
             {!isProtocol && renderUserAttachments(message.attachments || [])}
             {renderContent(message.content)}
          </div>

        </div>

      </div>
    </div>
  );
};
