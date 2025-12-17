
import React, { useState, useRef, useEffect } from 'react';
import { Message, MessageRole, Attachment } from '../types';
import { Square, Play, ExternalLink, Video, Copy, Check, Volume2, ChevronLeft, ChevronRight, FileText, RotateCw, Globe, MapPin, Download } from 'lucide-react';
import { playAudioData } from '../services/geminiService';
import { playSound } from '../utils/audio';

interface MessageCardProps {
  message: Message;
  onRegenerate?: (messageId: string) => void;
  isLoading?: boolean;
}

export const MessageCard: React.FC<MessageCardProps> = ({ message, onRegenerate, isLoading }) => {
  const isProtocol = message.role === MessageRole.PROTOCOL;
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [versionIndex, setVersionIndex] = useState(message.currentVersionIndex || 0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    setVersionIndex(message.currentVersionIndex || 0);
  }, [message.currentVersionIndex]);

  const rawContent = (message.versions && message.versions.length > 0) 
    ? message.versions[versionIndex].content 
    : message.content;
    
  const displayMedia = (message.versions && message.versions.length > 0)
    ? message.versions[versionIndex].generatedMedia
    : message.generatedMedia;

  const displayAudio = (message.versions && message.versions.length > 0)
    ? message.versions[versionIndex].audioData
    : message.audioData;

  // Extract Grounding Data
  let displayContent = rawContent;
  let sources: any[] = [];
  const groundingMatch = rawContent.match(/:::GROUNDING=(.*?):::/);
  if (groundingMatch) {
      try {
          sources = JSON.parse(groundingMatch[1]);
          displayContent = rawContent.replace(groundingMatch[0], '').trim();
      } catch(e) {
          console.error("Failed to parse sources", e);
      }
  }

  useEffect(() => {
    if (Date.now() - message.timestamp < 1000) {
      playSound(isProtocol ? 'message' : 'click');
    }
    if (displayAudio && Date.now() - message.timestamp < 2000) {
       handlePlayNativeAudio();
    }
    return () => {
      if (sourceRef.current) sourceRef.current.stop();
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const handlePlayNativeAudio = async () => {
    if (!displayAudio) return;
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
      const source = await playAudioData(displayAudio, audioContextRef.current);
      sourceRef.current = source;
      source.onended = () => setIsPlaying(false);
    } catch (error) {
      console.error("Audio Playback Error:", error);
      setIsPlaying(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(displayContent).then(() => {
      setIsCopied(true);
      playSound('click');
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const handleDownload = (attachment: Attachment) => {
      if (attachment.type === 'image' && attachment.data) {
          const link = document.createElement('a');
          link.href = `data:${attachment.mimeType};base64,${attachment.data}`;
          link.download = `protocol_generated_${Date.now()}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          playSound('click');
      }
  };

  const handleVersionChange = (direction: 'prev' | 'next') => {
    if (!message.versions) return;
    let newIndex = versionIndex;
    if (direction === 'prev') newIndex = Math.max(0, versionIndex - 1);
    if (direction === 'next') newIndex = Math.min(message.versions.length - 1, versionIndex + 1);
    
    if (newIndex !== versionIndex) {
        setVersionIndex(newIndex);
        playSound('click');
    }
  };

  const parseBold = (text: string) => {
    const parts: React.ReactNode[] = [];
    const boldRegex = /\*\*([^\*]+)\*\*/g;
    let lastIndex = 0;
    let match;

    while ((match = boldRegex.exec(text)) !== null) {
      if (match.index > lastIndex) parts.push(text.substring(lastIndex, match.index));
      parts.push(<strong key={match.index} className="font-semibold text-protocol-platinum">{match[1]}</strong>);
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
        <a key={match.index} href={match[2]} target="_blank" rel="noopener noreferrer" className="text-protocol-platinum underline decoration-1 underline-offset-8 decoration-protocol-muted/50 hover:decoration-protocol-platinum hover:text-protocol-platinum inline-flex items-center gap-1 transition-all rounded-md px-1 -mx-1">
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
      <div className="grid grid-cols-1 gap-6 mt-6">
        {media.map((item, idx) => (
          <div key={idx} className="group/media overflow-hidden border border-protocol-border bg-protocol-charcoal relative shadow-2xl rounded-2xl">
            {item.type === 'image' && item.data && (
               <>
                 <img src={`data:${item.mimeType};base64,${item.data}`} alt="Gen" className="w-full h-auto object-cover" />
                 <div className="absolute top-2 right-2 opacity-0 group-hover/media:opacity-100 transition-opacity">
                     <button 
                        onClick={() => handleDownload(item)}
                        className="p-2 bg-black/60 backdrop-blur-md text-protocol-platinum hover:text-white border border-white/10 rounded-lg hover:bg-black/80 transition-all shadow-lg"
                        title="Download Image"
                     >
                        <Download size={14} />
                     </button>
                 </div>
               </>
            )}
            {item.type === 'video' && item.uri && (
               <div className="relative w-full aspect-video">
                 <video controls className="w-full h-full object-cover">
                   <source src={item.uri} type="video/mp4" />
                 </video>
                 <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 flex items-center gap-2 text-[9px] font-mono text-white tracking-[0.2em] border border-white/10 rounded-full">
                   <Video size={10} className="text-protocol-champagne" />
                   <span>VEO CINEMATIC</span>
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
       <div className="flex flex-wrap gap-3 mb-4 justify-end">
         {attachments.map((att, idx) => (
           <div key={idx} className="h-16 w-16 border border-protocol-border flex items-center justify-center bg-protocol-charcoal relative shadow-lg rounded-xl overflow-hidden">
              {att.type === 'image' && att.data && (
                  <img src={`data:${att.mimeType};base64,${att.data}`} alt="Att" className="w-full h-full object-cover opacity-80" />
              )}
              {att.type === 'file' && (
                  <FileText size={20} className="text-protocol-platinum" />
              )}
           </div>
         ))}
       </div>
     );
  };

  const renderContent = (text: string) => {
    if (displayAudio) {
        return (
            <div className="flex items-center gap-6 py-4 animate-fade-in border-l border-protocol-champagne pl-6 my-4 bg-protocol-charcoal/50 pr-6 rounded-r-xl">
                <button onClick={handlePlayNativeAudio} className={`w-10 h-10 flex items-center justify-center transition-all border border-protocol-border rounded-full ${isPlaying ? 'bg-protocol-platinum text-protocol-obsidian' : 'bg-transparent text-protocol-platinum hover:border-protocol-platinum'}`}>
                   {isPlaying ? <Square size={14} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
                </button>
                <div className="flex flex-col gap-1.5 flex-1">
                    <span className="text-[9px] font-mono font-bold text-protocol-champagne tracking-[0.2em] uppercase flex items-center gap-2">
                        <Volume2 size={10} /> Secure Audio Transmission
                    </span>
                    <div className="h-[2px] w-full bg-protocol-border overflow-hidden mt-0.5 rounded-full">
                       <div className={`h-full bg-protocol-platinum transition-all duration-300 ${isPlaying ? 'animate-pulse w-full' : 'w-0'}`}></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!isProtocol) {
      // User Message - Rounded Bubble-ish but keeping editorial alignment
      return (
        <div className="font-sans text-[13px] font-light leading-loose text-protocol-platinum whitespace-pre-wrap text-right tracking-wide">
          {formatText(text)}
        </div>
      );
    }

    // Protocol Message
    return (
      <div className="space-y-5 pl-8 border-l border-protocol-champagne/60">
        {text.split('\n').map((line, idx) => {
          const trimmed = line.trim();
          
          if (trimmed.startsWith('###')) {
            return (
              <h3 key={idx} className="font-heading text-base font-semibold text-protocol-platinum tracking-tight mt-8 mb-3 leading-none">
                {line.replace(/^###\s*/, '')}
              </h3>
            );
          }
          if (trimmed.match(/^\[.*?\]:/)) {
            const [tag, ...rest] = line.split(':');
            return (
              <div key={idx} className="flex gap-3 items-start py-2.5 text-[11px] font-mono animate-fade-in text-protocol-muted uppercase tracking-widest border-y border-protocol-border my-3">
                <span className="text-protocol-champagne">{tag.replace('[','').replace(']','')}</span>
                <span className="opacity-80 flex-1">{formatText(rest.join(':'))}</span>
              </div>
            );
          }
          if (trimmed.startsWith('* ')) {
            return (
              <div key={idx} className="flex items-start gap-4 mb-3 pl-1.5">
                <div className="w-1 h-1 bg-protocol-platinum mt-2.5 shrink-0 rounded-full" />
                <span className="text-protocol-platinum/90 text-[13px] leading-loose font-light tracking-wide">{formatText(line.replace(/^\*\s*/, ''))}</span>
              </div>
            );
          }
          if (trimmed === '') return <div key={idx} className="h-2" />;
          return <p key={idx} className="mb-3 text-protocol-platinum/90 text-[13px] leading-[2.0] font-light tracking-wide">{formatText(line)}</p>;
        })}
        {displayMedia && renderGeneratedMedia(displayMedia)}
        
        {/* Sources */}
        {sources.length > 0 && (
          <div className="mt-8 pt-6 border-t border-protocol-border">
             <div className="text-[8px] font-mono uppercase tracking-[0.3em] text-protocol-muted mb-4 flex items-center gap-1.5">
                 <Globe size={10} /> Validated Sources
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sources.map((source, i) => (
                   <a 
                     key={i} 
                     href={source.uri} 
                     target="_blank" 
                     rel="noreferrer"
                     className="flex items-center justify-between p-3 border border-protocol-border hover:bg-protocol-border/50 transition-all group rounded-xl"
                   >
                     <div className="flex items-center gap-2 overflow-hidden">
                        {source.type === 'map' ? <MapPin size={12} className="text-protocol-swissRed shrink-0" /> : <ExternalLink size={12} className="text-protocol-platinum shrink-0" />}
                        <span className="text-[10px] font-mono text-protocol-muted group-hover:text-protocol-platinum truncate transition-colors">{source.title}</span>
                     </div>
                     <span className="text-[8px] font-mono text-protocol-muted uppercase tracking-widest group-hover:text-protocol-platinum">OPEN</span>
                   </a>
                ))}
             </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`w-full flex ${isProtocol ? 'justify-start' : 'justify-end'} mb-12 animate-slide-up px-4 md:px-16 group`}>
      <div className={`flex flex-col max-w-[90%] md:max-w-[75%] lg:max-w-[65%] ${isProtocol ? 'items-start' : 'items-end'}`}>
        
        {/* Meta Header - Minimalist */}
        <div className="flex items-center gap-3 mb-3 opacity-50 px-1">
             <span className="text-[8px] font-mono uppercase tracking-[0.25em] text-protocol-muted">
                {isProtocol ? 'PROTOCOL // SYSTEM' : 'OPERATOR // 001'}
             </span>
             
             {isProtocol && !displayAudio && (
                <div className="flex items-center gap-3 ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                   {/* Versions */}
                   {message.versions && message.versions.length > 1 && (
                      <div className="flex items-center gap-2 border-r border-protocol-border pr-3">
                         <button onClick={() => handleVersionChange('prev')} disabled={versionIndex === 0} className="text-protocol-muted hover:text-protocol-platinum disabled:opacity-30 p-0.5 rounded-full hover:bg-protocol-border"><ChevronLeft size={12} /></button>
                         <span className="text-[9px] font-mono font-bold text-protocol-muted">{versionIndex + 1} / {message.versions.length}</span>
                         <button onClick={() => handleVersionChange('next')} disabled={versionIndex === message.versions.length - 1} className="text-protocol-muted hover:text-protocol-platinum disabled:opacity-30 p-0.5 rounded-full hover:bg-protocol-border"><ChevronRight size={12} /></button>
                      </div>
                   )}
                   
                   {onRegenerate && !isLoading && (
                        <button onClick={() => onRegenerate(message.id)} className="text-protocol-muted hover:text-protocol-platinum transition-colors p-0.5 rounded-full hover:bg-protocol-border" title="Regenerate">
                            <RotateCw size={12} />
                        </button>
                    )}
                   <button onClick={handleCopy} className="text-protocol-muted hover:text-protocol-platinum transition-colors p-0.5 rounded-full hover:bg-protocol-border">
                        {isCopied ? <Check size={12} /> : <Copy size={12} />}
                   </button>
                </div>
             )}
        </div>

        {/* Payload */}
        <div className="relative w-full">
             {!isProtocol && renderUserAttachments(message.attachments || [])}
             {renderContent(displayContent)}
        </div>

      </div>
    </div>
  );
};
