
import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ProtocolHeader } from './components/ProtocolHeader';
import { MessageCard } from './components/MessageCard';
import { InputConsole } from './components/InputConsole';
import { LoginScreen } from './components/LoginScreen';
import { Message, MessageRole, UserProfile, Attachment, ImageGenerationSize } from './types';
import { sendMessageToProtocol } from './services/geminiService';
import { playSound } from './utils/audio';

const App: React.FC = () => {
  // Initialize user from localStorage for persistence
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('protocol_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Failed to load session", e);
      return null;
    }
  });
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleLogin = (newUser: UserProfile) => {
    setUser(newUser);
    localStorage.setItem('protocol_user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    playSound('click');
    setUser(null);
    setMessages([]); // Clear session history on logout
    localStorage.removeItem('protocol_user');
  };

  const handleSendMessage = async (text: string, useDeepAgent: boolean, attachments: Attachment[], imageSize: ImageGenerationSize) => {
    const newUserMessage: Message = {
      id: uuidv4(),
      role: MessageRole.USER,
      content: text,
      timestamp: Date.now(),
      attachments: attachments
    };

    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      // Check for Veo Key requirement if DeepAgent is active, just in case they ask for video immediately
      if (useDeepAgent && (window as any).aistudio && !await (window as any).aistudio.hasSelectedApiKey()) {
         try {
           await (window as any).aistudio.openSelectKey();
         } catch (e) {
           console.warn("Key selection cancelled or failed", e);
         }
      }

      const { text: responseText, generatedMedia } = await sendMessageToProtocol(messages, text, useDeepAgent, attachments, imageSize);

      const newProtocolMessage: Message = {
        id: uuidv4(),
        role: MessageRole.PROTOCOL,
        content: responseText,
        timestamp: Date.now(),
        generatedMedia: generatedMedia
      };

      setMessages(prev => [...prev, newProtocolMessage]);
      playSound('message');
    } catch (error) {
      console.error("Protocol Error:", error);
      playSound('error');
      const errorMessage: Message = {
        id: uuidv4(),
        role: MessageRole.PROTOCOL,
        content: `[STATUS]: FAILED\n[ERROR]: Unable to reach cognitive core.\n[ACTION]: Retry connection.`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-protocol-bg text-protocol-accent font-sans selection:bg-sky-500/30 selection:text-white relative overflow-hidden">
      
      {/* Canvas Background Effects */}
      <div className="fixed inset-0 bg-grid-canvas opacity-[0.08] pointer-events-none z-0"></div>
      
      {/* Ambient Glows */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-sky-900/5 blur-[120px] pointer-events-none z-0"></div>
      
      <ProtocolHeader user={user} onLogout={handleLogout} />
      
      <main className="relative pt-36 pb-56 px-4 md:px-0 flex flex-col items-center min-h-screen z-10 overflow-y-auto custom-scrollbar">
        <div className="w-full max-w-4xl flex flex-col gap-6">
          {messages.map((msg) => (
            <MessageCard key={msg.id} message={msg} />
          ))}
          <div ref={messagesEndRef} className="h-8" />
        </div>
      </main>

      <InputConsole onSend={handleSendMessage} isLoading={isLoading} />
    </div>
  );
};

export default App;
