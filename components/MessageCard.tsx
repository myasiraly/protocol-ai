
import React, { useState, useRef, useEffect } from 'react';
import { Message, MessageRole, Attachment } from '../types';
import { Square, Play, ExternalLink, Video, Copy, Check, Volume2, ChevronLeft, ChevronRight, FileText, RotateCw, Globe, MapPin, Download, FileDown, ShieldCheck, FileSpreadsheet, FileEdit, Link, User, Cpu } from 'lucide-react';
import { playAudioData } from '../services/geminiService';
import { generateProtocolPDF, generateProtocolDoc, generateProtocolSheet } from '../services/pdfService';
import { playSound } from '../utils/audio';
import { ProtocolLogo } from './ProtocolLogo';

interface MessageCardProps {
  message: Message;
  onRegenerate?: (messageId: string) => void;
  isLoading?: boolean;
  userName?: string;
}

export const MessageCard: React.FC<MessageCardProps> = ({ message, onRegenerate, isLoading, userName }) => {
  const isProtocol = message.role === MessageRole.PROTOCOL;
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
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

  // Extract Tags
  let displayContent = rawContent;
  let sources: any[] = [];
  let reportTitle = "";
  let docTitle = "";
  let sheetTitle = "";

  const groundingMatch = rawContent.match(/:::GROUNDING=(.*?):::/);
  if (groundingMatch) {
      try {
          sources = JSON.parse(groundingMatch[1]);
          displayContent = displayContent.replace(groundingMatch[0], '').trim();
      } catch(e) {
          console.error("Failed to parse sources", e);
      }
  }

  const reportMatch = displayContent.match(/\[GENERATE_REPORT:\s*(.*?)\]/);
  if (reportMatch) {
      reportTitle = reportMatch[1];
      displayContent = displayContent.replace(reportMatch[0], '').trim();
  }

  const docMatch = displayContent.match(/\[GENERATE_DOC:\s*(.*?)\]/);
  if (docMatch) {
      docTitle = docMatch[1];
      displayContent = displayContent.replace(docMatch[0], '').trim();
  }

  const sheetMatch = displayContent.match(/\[GENERATE_SHEET:\s*(.*?)\]/);
  if (sheetMatch) {
      sheetTitle = sheetMatch[1];
      displayContent = displayContent.replace(sheetMatch[0], '').trim();
  }

  useEffect(() => {
    if (Date.now() - message.timestamp < 1000) {
      playSound(isProtocol ? 'message' : 'click');
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

  const handleExport = async (type: 'pdf' | 'doc' | 'sheet') => {
    const title = reportTitle || docTitle || sheetTitle;
    if (!title) return;
    setIsGenerating(true);
    playSound('click');
    try {
      const data = {
        title,
        content: displayContent,
        author: "PROTOCOL DEEPAGENT",
        date: new Date().toLocaleDateString()
      };

      if (type === 'pdf') await generateProtocolPDF(data);
      if (type === 'doc') await generateProtocolDoc(data);
      if (type === 'sheet') await generateProtocolSheet(data);
      
      playSound('success');
    } catch (e) {
      console.error("Export failed", e);
      playSound('error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(displayContent).then(() => {
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

  return (
    <div className={`w-full flex ${isProtocol ? 'justify-start' : 'justify-end'} mb-10 animate-slide-up px-2 md:px-4 group`}>
      <div className={`flex flex-col w-full ${isProtocol ? 'max-w-4xl' : 'max-w-2xl'} ${isProtocol ? 'items-start' : 'items-end'}`}>
        
        {/* Role Header */}
        <div className={`flex items-center gap-3 mb-2 px-1 transition-opacity duration-500 ${isProtocol ? 'flex-row' : 'flex-row-reverse opacity-60'}`}>
             <div className={`flex items-center justify-center w-6 h-6 rounded-full border ${isProtocol ? 'bg-protocol-charcoal border-protocol-border' : 'bg-protocol-platinum text-protocol-obsidian border-protocol-platinum'}`}>
                {isProtocol ? <ProtocolLogo size={14} className="text-protocol-platinum" /> : <User size={12} />}
             </div>
             <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-protocol-muted flex items-center gap-2">
                {isProtocol ? (
                    <>
                        <span className="text-protocol-platinum font-bold">PROTOCOL</span>
                        <span className="opacity-40">//</span>
                        <span>SYSTEM</span>
                        <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse ml-1" />
                    </>
                ) : (
                    <>
                        <span>OPERATOR</span>
                        <span className="opacity-40">//</span>
                        <span className="text-protocol-platinum">{userName ? userName.toUpperCase() : '001'}</span>
                    </>
                )}
             </span>
             
             {isProtocol && (
                <div className="flex items-center gap-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                   <button onClick={handleCopy} title="Copy Directive" className="text-protocol-muted hover:text-protocol-platinum transition-colors p-1 rounded-md hover:bg-protocol-border">
                        {isCopied ? <Check size={12} /> : <Copy size={12} />}
                   </button>
                   {displayAudio && (
                      <button onClick={handlePlayNativeAudio} title="Play Transmission" className={`text-protocol-muted hover:text-protocol-platinum transition-colors p-1 rounded-md hover:bg-protocol-border ${isPlaying ? 'text-protocol-champagne' : ''}`}>
                         <Volume2 size={12} className={isPlaying ? 'animate-pulse' : ''} />
                      </button>
                   )}
                </div>
             )}
        </div>

        {/* Message Content Container */}
        <div className={`
            relative w-full overflow-hidden transition-all duration-500
            ${isProtocol 
                ? 'bg-protocol-charcoal/30 border-l-2 border-protocol-champagne/40 backdrop-blur-md rounded-r-3xl rounded-bl-3xl p-6 md:p-8 shadow-sm ring-1 ring-white/[0.03]' 
                : 'bg-protocol-platinum/[0.03] border border-protocol-border/30 rounded-l-2xl rounded-tr-2xl p-4 md:p-5'
            }
        `}>
            {/* Export Cards - Only for Protocol */}
            {isProtocol && (reportTitle || docTitle || sheetTitle) && (
                <div className="p-5 bg-protocol-input/50 border border-protocol-border/50 rounded-2xl mb-8 shadow-inner w-full animate-fade-in">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-protocol-platinum text-protocol-obsidian flex items-center justify-center rounded-xl shadow-lg">
                                {sheetTitle ? <FileSpreadsheet size={22}/> : <FileText size={22} />}
                            </div>
                            <div>
                                <h4 className="text-xs font-heading font-bold text-protocol-platinum uppercase tracking-wider">{reportTitle || docTitle || sheetTitle}</h4>
                                <div className="flex items-center gap-2 text-[8px] font-mono text-protocol-muted mt-1">
                                    <ShieldCheck size={10} className="text-emerald-500/70" />
                                    <span>PROTOCOL VERIFIED ASSET // ENCRYPTED</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            {reportTitle && (
                                <button onClick={() => handleExport('pdf')} disabled={isGenerating} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-protocol-platinum text-protocol-obsidian text-[9px] font-mono font-bold uppercase tracking-widest rounded-lg hover:bg-protocol-muted transition-all active:scale-95 shadow-md">
                                    {isGenerating ? <RotateCw size={14} className="animate-spin" /> : <FileDown size={14} />} PDF
                                </button>
                            )}
                            {docTitle && (
                                <button onClick={() => handleExport('doc')} disabled={isGenerating} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-protocol-platinum text-protocol-obsidian text-[9px] font-mono font-bold uppercase tracking-widest rounded-lg hover:bg-protocol-muted transition-all active:scale-95 shadow-md">
                                    {isGenerating ? <RotateCw size={14} className="animate-spin" /> : <FileEdit size={14} />} DOC
                                </button>
                            )}
                            {sheetTitle && (
                                <button onClick={() => handleExport('sheet')} disabled={isGenerating} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-protocol-platinum text-protocol-obsidian text-[9px] font-mono font-bold uppercase tracking-widest rounded-lg hover:bg-protocol-muted transition-all active:scale-95 shadow-md">
                                    {isGenerating ? <RotateCw size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />} SHEET
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Text Content */}
            <div className={`
                font-sans text-[14px] leading-relaxed tracking-wide
                ${isProtocol ? 'text-protocol-platinum/90' : 'text-protocol-platinum/80 text-right'}
                whitespace-pre-wrap
            `}>
                {displayContent.split('\n').map((line, idx) => {
                    const trimmed = line.trim();
                    if (trimmed.startsWith('###')) {
                        return (
                            <div key={idx} className={`mt-8 mb-4 flex items-center gap-3 ${isProtocol ? '' : 'justify-end'}`}>
                                {isProtocol && <div className="w-1 h-5 bg-protocol-champagne/40 rounded-full" />}
                                <h3 className="font-heading text-base font-bold text-protocol-platinum uppercase tracking-tight">
                                    {trimmed.replace(/^###\s*/, '')}
                                </h3>
                                {!isProtocol && <div className="w-1 h-5 bg-protocol-platinum/40 rounded-full" />}
                            </div>
                        );
                    }
                    if (trimmed.startsWith('* ')) {
                        return (
                            <div key={idx} className={`flex items-start gap-4 mb-3 ${isProtocol ? 'pl-2' : 'flex-row-reverse pr-2'}`}>
                                <div className={`w-1 h-1 mt-2.5 shrink-0 rounded-full ${isProtocol ? 'bg-protocol-champagne/60' : 'bg-protocol-platinum/40'}`} />
                                <span className={isProtocol ? '' : 'text-right'}>{formatText(trimmed.replace(/^\*\s*/, ''))}</span>
                            </div>
                        );
                    }
                    if (trimmed === '') return <div key={idx} className="h-4" />;
                    return <p key={idx} className="mb-4">{formatText(line)}</p>;
                })}
            </div>

            {/* Grounding Sources - Only for Protocol */}
            {isProtocol && sources.length > 0 && (
                <div className="mt-10 flex flex-wrap gap-2 animate-fade-in border-t border-protocol-border/30 pt-6">
                    <div className="w-full text-[9px] font-mono text-protocol-muted uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                        <Cpu size={10} className="text-protocol-champagne opacity-60" /> Intelligence Nodes & Validation
                    </div>
                    {sources.map((src, i) => (
                        <a 
                            key={i} 
                            href={src.uri} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 px-4 py-2 bg-protocol-obsidian/40 border border-protocol-border/50 rounded-xl hover:border-protocol-platinum/40 hover:bg-protocol-charcoal transition-all group active:scale-95 shadow-sm"
                        >
                            {src.type === 'map' ? <MapPin size={11} className="text-emerald-500/80" /> : <Globe size={11} className="text-blue-400/80" />}
                            <span className="text-[10px] text-protocol-muted group-hover:text-protocol-platinum transition-colors truncate max-w-[140px] font-medium tracking-tight">
                                {src.title}
                            </span>
                            <ExternalLink size={9} className="text-protocol-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                    ))}
                </div>
            )}
            
            {/* Media Rendering */}
            {displayMedia && displayMedia.length > 0 && (
                <div className={`grid grid-cols-1 gap-6 mt-8 ${isProtocol ? '' : 'max-w-md ml-auto'}`}>
                    {displayMedia.map((item, idx) => (
                        <div key={idx} className="group relative overflow-hidden border border-protocol-border/50 bg-protocol-charcoal shadow-2xl rounded-2xl ring-1 ring-white/5">
                            {item.type === 'image' && <img src={`data:${item.mimeType};base64,${item.data}`} alt="" className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105" />}
                            {item.type === 'video' && <video src={item.uri} controls className="w-full h-auto" />}
                            
                            {/* Media Overlay status */}
                            <div className="absolute top-3 right-3 px-2 py-1 bg-protocol-obsidian/60 backdrop-blur-md border border-white/10 rounded-md text-[8px] font-mono text-protocol-platinum uppercase tracking-widest pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                                High fidelity // Generated
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
        
        {/* User Attachments (Outside bubble for clean UI) */}
        {!isProtocol && message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap justify-end gap-2 mt-3">
                {message.attachments.map((att, idx) => (
                    <div key={idx} className="h-12 w-12 border border-protocol-border bg-protocol-input/50 flex items-center justify-center rounded-lg overflow-hidden shadow-sm hover:border-protocol-platinum transition-colors cursor-pointer group">
                        {att.type === 'image' ? (
                            <img src={`data:${att.mimeType};base64,${att.data}`} alt="" className="h-full w-full object-cover group-hover:scale-110 transition-transform" />
                        ) : (
                            <FileText size={16} className="text-protocol-muted" />
                        )}
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};
