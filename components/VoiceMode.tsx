
import React, { useEffect, useRef, useState } from 'react';
import { X, Mic, MicOff, Headphones, Activity } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { playSound } from '../utils/audio';
import { AUDIO_MODEL_NAME } from '../constants';

interface VoiceModeProps {
  isOpen: boolean;
  onClose: (transcript: string) => void;
}

// --- Audio Helpers ---
function createBlob(data: Float32Array): { data: string; mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  let binary = '';
  const bytes = new Uint8Array(int16.buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return {
    data: btoa(binary),
    mimeType: 'audio/pcm;rate=16000',
  };
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const VoiceMode: React.FC<VoiceModeProps> = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0);

  const audioContextsRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const transcriptBuffer = useRef<{ user: string; model: string; history: string[] }>({ user: '', model: '', history: [] });
  const sessionRef = useRef<any>(null);
  const mountedRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    mountedRef.current = true;
    setStatus('connecting');

    const init = async () => {
      try {
        const apiKey = process.env.API_KEY;
        if (!apiKey) throw new Error("No API Key");

        const ai = new GoogleGenAI({ apiKey });
        
        const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        
        // Resume context - Crucial for mobile Chrome
        if (inputCtx.state === 'suspended') await inputCtx.resume();
        if (outputCtx.state === 'suspended') await outputCtx.resume();
        
        audioContextsRef.current = { input: inputCtx, output: outputCtx };

        const analyser = outputCtx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        let nextStartTime = 0;
        const sources = new Set<AudioBufferSourceNode>();

        const sessionPromise = ai.live.connect({
          model: AUDIO_MODEL_NAME, 
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } },
            },
            systemInstruction: "You are Protocol, a concise and efficient intelligent assistant. Keep responses brief and spoken-style.",
            inputAudioTranscription: { model: "gemini-2.0-flash" },
            outputAudioTranscription: { model: "gemini-2.0-flash" }
          },
          callbacks: {
            onopen: () => {
              if (!mountedRef.current) return;
              setStatus('connected');
              playSound('success');

              const source = inputCtx.createMediaStreamSource(stream);
              const processor = inputCtx.createScriptProcessor(4096, 1, 1);
              
              processor.onaudioprocess = (e) => {
                if (isMuted) return;
                const inputData = e.inputBuffer.getChannelData(0);
                const blobItem = createBlob(inputData);
                sessionPromise.then(session => {
                   session.sendRealtimeInput({ media: blobItem });
                });
              };

              source.connect(processor);
              processor.connect(inputCtx.destination);
            },
            onmessage: async (msg: LiveServerMessage) => {
              if (!mountedRef.current) return;

              if (msg.serverContent?.inputTranscription) {
                 transcriptBuffer.current.user += msg.serverContent.inputTranscription.text;
              }
              if (msg.serverContent?.outputTranscription) {
                 transcriptBuffer.current.model += msg.serverContent.outputTranscription.text;
              }
              if (msg.serverContent?.turnComplete) {
                 if (transcriptBuffer.current.user.trim()) transcriptBuffer.current.history.push(`User: ${transcriptBuffer.current.user}`);
                 if (transcriptBuffer.current.model.trim()) transcriptBuffer.current.history.push(`Protocol: ${transcriptBuffer.current.model}`);
                 transcriptBuffer.current.user = '';
                 transcriptBuffer.current.model = '';
              }

              const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
              if (audioData) {
                nextStartTime = Math.max(nextStartTime, outputCtx.currentTime);
                const buffer = await decodeAudioData(decode(audioData), outputCtx, 24000, 1);
                
                const source = outputCtx.createBufferSource();
                source.buffer = buffer;
                source.connect(analyser); 
                analyser.connect(outputCtx.destination);
                
                source.addEventListener('ended', () => sources.delete(source));
                source.start(nextStartTime);
                nextStartTime += buffer.duration;
                sources.add(source);
              }
            },
            onclose: () => {},
            onerror: (e) => {
               console.error("Live Error", e);
               if (mountedRef.current) setStatus('error');
            }
          }
        });
        
        sessionRef.current = sessionPromise;

      } catch (e) {
        console.error("Init failed", e);
        setStatus('error');
      }
    };

    init();

    return () => {
      mountedRef.current = false;
      sessionRef.current?.then((s: any) => s.close());
      streamRef.current?.getTracks().forEach(t => t.stop());
      audioContextsRef.current?.input.close();
      audioContextsRef.current?.output.close();
    };
  }, [isOpen]);

  useEffect(() => {
     if (!isOpen || !analyserRef.current) return;
     let animId: number;
     const draw = () => {
        if (!canvasRef.current || !analyserRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;
        
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
        const avg = sum / bufferLength;
        setVolume(avg);

        const w = canvasRef.current.width;
        const h = canvasRef.current.height;
        ctx.clearRect(0, 0, w, h);
        
        const cx = w / 2;
        const cy = h / 2;
        const radius = 50 + (avg * 0.5);

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
        ctx.fillStyle = status === 'connected' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)';
        ctx.fill();
        ctx.strokeStyle = status === 'connected' ? '#3b82f6' : '#ef4444';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.6, 0, 2 * Math.PI);
        ctx.fillStyle = status === 'connected' ? '#3b82f6' : '#ef4444';
        ctx.fill();

        animId = requestAnimationFrame(draw);
     };
     draw();
     return () => cancelAnimationFrame(animId);
  }, [isOpen, status]);

  const handleClose = () => {
     let fullLog = transcriptBuffer.current.history.join('\n');
     if (transcriptBuffer.current.user) fullLog += `\nUser: ${transcriptBuffer.current.user}`;
     if (transcriptBuffer.current.model) fullLog += `\nProtocol: ${transcriptBuffer.current.model}`;
     onClose(fullLog);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-[#050505] flex flex-col items-center justify-center animate-fade-in">
       <div className="absolute inset-0 bg-noise opacity-10 pointer-events-none"></div>
       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-900/5 blur-[120px] rounded-full pointer-events-none"></div>

       <button 
         onClick={handleClose}
         className="absolute top-6 right-6 p-2 bg-zinc-900/50 hover:bg-zinc-800 text-gray-400 hover:text-white rounded-full border border-white/5 transition-all z-20"
       >
         <X size={20} />
       </button>

       <div className="relative z-10 flex flex-col items-center gap-10">
          <div className="relative w-64 h-64 flex items-center justify-center">
             <canvas ref={canvasRef} width={400} height={400} className="absolute inset-0 w-full h-full" />
             {status === 'connecting' && (
                <div className="absolute inset-0 flex items-center justify-center">
                   <div className="w-16 h-16 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                </div>
             )}
          </div>

          <div className="flex flex-col items-center gap-2">
             <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                {status === 'connecting' ? (
                   <>
                     <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse"></div>
                     <span className="text-[9px] font-mono text-yellow-500 tracking-widest uppercase">Initializing Link</span>
                   </>
                ) : status === 'error' ? (
                   <>
                     <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                     <span className="text-[9px] font-mono text-red-500 tracking-widest uppercase">Connection Failed</span>
                   </>
                ) : (
                   <>
                     <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                     <span className="text-[9px] font-mono text-emerald-500 tracking-widest uppercase">Live Signal Active</span>
                   </>
                )}
             </div>
             <p className="text-gray-500 text-xs font-light tracking-wide">
                {status === 'connected' ? 'Listening...' : 'Establish connection...'}
             </p>
          </div>

          <div className="flex items-center gap-5">
             <button 
               onClick={() => setIsMuted(!isMuted)}
               className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all ${
                 isMuted 
                 ? 'bg-red-500/20 border-red-500 text-red-500' 
                 : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
               }`}
             >
                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
             </button>
             
             <button 
               onClick={handleClose}
               className="w-12 h-12 rounded-full flex items-center justify-center border border-white/10 bg-red-500 hover:bg-red-600 text-white transition-all shadow-lg shadow-red-500/20"
             >
                <Activity size={20} />
             </button>
          </div>
       </div>
    </div>
  );
};
