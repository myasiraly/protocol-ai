
import React, { useState, useRef, useEffect } from 'react';
import { Message, MessageRole, Attachment } from '../types';
import { Square, Play, ExternalLink, Video, Copy, Check, Volume2, ChevronLeft, ChevronRight, FileText, RotateCw, Globe, MapPin, Download, FileDown, ShieldCheck, FileSpreadsheet, FileEdit } from 'lucide-react';
import { playAudioData } from '../services/geminiService';
import { generateProtocolPDF, generateProtocolDoc, generateProtocolSheet } from '../services/pdfService';
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
    <div className={`w-full flex ${isProtocol ? 'justify-start' : 'justify-end'} mb-12 animate-slide-up px-4 md:px-16 group`}>
      <div className={`flex flex-col max-w-[90%] md:max-w-[75%] lg:max-w-[65%] ${isProtocol ? 'items-start' : 'items-end'}`}>
        
        <div className="flex items-center gap-3 mb-3 opacity-50 px-1">
             <span className="text-[8px] font-mono uppercase tracking-[0.25em] text-protocol-muted">
                {isProtocol ? 'PROTOCOL // SYSTEM' : 'OPERATOR // 001'}
             </span>
             {isProtocol && (
                <div className="flex items-center gap-3 ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                   <button onClick={handleCopy} className="text-protocol-muted hover:text-protocol-platinum transition-colors p-0.5 rounded-full hover:bg-protocol-border">
                        {isCopied ? <Check size={12} /> : <Copy size={12} />}
                   </button>
                </div>
             )}
        </div>

        <div className="relative w-full">
            {/* Export Cards */}
            {(reportTitle || docTitle || sheetTitle) && (
                <div className="p-6 bg-protocol-input border border-protocol-border rounded-2xl mb-8 shadow-lg w-full animate-fade-in">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-protocol-platinum text-protocol-obsidian flex items-center justify-center rounded-xl">
                                {sheetTitle ? <FileSpreadsheet size={20}/> : <FileText size={20} />}
                            </div>
                            <div>
                                <h4 className="text-sm font-heading font-bold text-protocol-platinum uppercase tracking-tight">{reportTitle || docTitle || sheetTitle}</h4>
                                <div className="flex items-center gap-2 text-[9px] font-mono text-protocol-muted">
                                    <ShieldCheck size={10} className="text-emerald-500" />
                                    <span>PROTOCOL VERIFIED ASSET</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            {reportTitle && (
                                <button onClick={() => handleExport('pdf')} disabled={isGenerating} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-protocol-platinum text-protocol-obsidian text-[10px] font-mono font-bold uppercase tracking-widest rounded-lg hover:bg-protocol-muted transition-all">
                                    {isGenerating ? <RotateCw size={14} className="animate-spin" /> : <FileDown size={14} />} PDF
                                </button>
                            )}
                            {docTitle && (
                                <button onClick={() => handleExport('doc')} disabled={isGenerating} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-protocol-platinum text-protocol-obsidian text-[10px] font-mono font-bold uppercase tracking-widest rounded-lg hover:bg-protocol-muted transition-all">
                                    {isGenerating ? <RotateCw size={14} className="animate-spin" /> : <FileEdit size={14} />} DOC
                                </button>
                            )}
                            {sheetTitle && (
                                <button onClick={() => handleExport('sheet')} disabled={isGenerating} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-protocol-platinum text-protocol-obsidian text-[10px] font-mono font-bold uppercase tracking-widest rounded-lg hover:bg-protocol-muted transition-all">
                                    {isGenerating ? <RotateCw size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />} SHEET
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className={`font-sans text-[13px] leading-loose ${isProtocol ? 'text-left border-l border-protocol-champagne/40 pl-8' : 'text-right pr-4'} whitespace-pre-wrap tracking-wide text-protocol-platinum/90`}>
                {displayContent.split('\n').map((line, idx) => {
                    const trimmed = line.trim();
                    if (trimmed.startsWith('###')) return <h3 key={idx} className="font-heading text-base font-semibold text-protocol-platinum mt-8 mb-3">{trimmed.replace(/^###\s*/, '')}</h3>;
                    if (trimmed.startsWith('* ')) return <div key={idx} className="flex items-start gap-4 mb-3 pl-1.5"><div className="w-1 h-1 bg-protocol-platinum mt-2.5 shrink-0 rounded-full" /><span>{formatText(trimmed.replace(/^\*\s*/, ''))}</span></div>;
                    if (trimmed === '') return <div key={idx} className="h-2" />;
                    return <p key={idx} className="mb-3">{formatText(line)}</p>;
                })}
            </div>
            
            {displayMedia && (
                <div className="grid grid-cols-1 gap-6 mt-6">
                    {displayMedia.map((item, idx) => (
                        <div key={idx} className="overflow-hidden border border-protocol-border bg-protocol-charcoal shadow-2xl rounded-2xl">
                            {item.type === 'image' && <img src={`data:${item.mimeType};base64,${item.data}`} alt="" className="w-full h-auto object-cover" />}
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
