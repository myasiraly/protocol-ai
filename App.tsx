
import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ProtocolHeader } from './components/ProtocolHeader';
import { MessageCard } from './components/MessageCard';
import { InputConsole } from './components/InputConsole';
import { LoginScreen } from './components/LoginScreen';
import { Sidebar } from './components/Sidebar';
import { Message, MessageRole, UserProfile, Attachment, ImageGenerationSize, Conversation } from './types';
import { sendMessageToSession, generateConversationTitle } from './services/geminiService';
import { playSound } from './utils/audio';

const STORAGE_KEY_USER = 'protocol_user';
const STORAGE_KEY_CONVERSATIONS = 'protocol_conversations';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USER);
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  });

  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONVERSATIONS);
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  // Default to open on desktop, closed on mobile
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 768);
  
  // Initialize current conversation to the most recent one if available
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONVERSATIONS);
      const parsed = saved ? JSON.parse(saved) : [];
      if (parsed.length > 0) {
        const sorted = parsed.sort((a: any, b: any) => b.updatedAt - a.updatedAt);
        return sorted[0].id;
      }
      return null;
    } catch (e) { return null; }
  });

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CONVERSATIONS, JSON.stringify(conversations));
  }, [conversations]);

  // Sync messages when currentConversationId changes or conversations update
  useEffect(() => {
    if (currentConversationId) {
      const conv = conversations.find(c => c.id === currentConversationId);
      if (conv) {
         setMessages(conv.messages);
      }
    } else {
      // If no ID is selected (New Protocol mode), ensure messages are clear
      setMessages([]);
    }
  }, [currentConversationId, conversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleLogin = (newUser: UserProfile) => {
    setUser(newUser);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(newUser));
  };

  const handleLogout = () => {
    playSound('click');
    setUser(null);
    setCurrentConversationId(null);
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY_USER);
  };

  const handleNewChat = () => {
    setCurrentConversationId(null);
    // Messages will be cleared by the useEffect
  };

  const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newConvs = conversations.filter(c => c.id !== id);
    setConversations(newConvs);
    if (currentConversationId === id) setCurrentConversationId(null);
  };

  const handleSendMessage = async (text: string, useDeepAgent: boolean, attachments: Attachment[], imageSize: ImageGenerationSize, isVoice: boolean) => {
    let convId = currentConversationId;
    let isNewConv = false;
    let isFirstMessage = false;

    if (!convId) {
      convId = uuidv4();
      isNewConv = true;
    }
    
    if (messages.length === 0) isFirstMessage = true;

    const newUserMessage: Message = {
      id: uuidv4(),
      role: MessageRole.USER,
      content: text,
      timestamp: Date.now(),
      attachments: attachments
    };

    // Optimistic Update
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages); 
    setIsLoading(true);

    setConversations(prev => {
      let existing = prev.find(c => c.id === convId);
      if (!existing) {
        const title = text.length > 30 ? text.substring(0, 30) + '...' : text;
        existing = {
          id: convId!,
          title: title || 'New Protocol',
          messages: updatedMessages,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        return [existing, ...prev];
      } else {
        return prev.map(c => c.id === convId ? { ...c, messages: updatedMessages, updatedAt: Date.now() } : c);
      }
    });
    
    // If it was a new conversation, set the ID so we stay in it
    if (isNewConv) setCurrentConversationId(convId);

    // Generate title in parallel if it's the first message
    if (isFirstMessage) {
      generateConversationTitle(text).then((newTitle) => {
         if (newTitle) setConversations(prev => prev.map(c => c.id === convId ? { ...c, title: newTitle } : c));
      });
    }

    try {
      if (useDeepAgent && (window as any).aistudio && !await (window as any).aistudio.hasSelectedApiKey()) {
         try { await (window as any).aistudio.openSelectKey(); } catch (e) {}
      }

      const outputModality = (isVoice && !useDeepAgent) ? 'AUDIO' : 'TEXT';

      const { text: responseText, generatedMedia, audioData } = await sendMessageToSession(
        messages, 
        text, 
        attachments, 
        imageSize,
        outputModality,
        useDeepAgent
      );

      const newProtocolMessage: Message = {
        id: uuidv4(),
        role: MessageRole.PROTOCOL,
        content: responseText,
        timestamp: Date.now(),
        generatedMedia: generatedMedia,
        audioData: audioData
      };

      const finalMessages = [...updatedMessages, newProtocolMessage];
      setMessages(finalMessages);

      setConversations(prev => prev.map(c => c.id === convId ? { ...c, messages: finalMessages, updatedAt: Date.now() } : c));
      
      playSound('message');
    } catch (error) {
      playSound('error');
      const errorMessage: Message = {
        id: uuidv4(),
        role: MessageRole.PROTOCOL,
        content: `[STATUS]: ERROR\nProtocol disconnected.`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-[#050505] text-[#e2e2e2] font-sans relative flex overflow-hidden">
      <div className="absolute inset-0 bg-noise opacity-30 pointer-events-none z-0"></div>
      
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={setCurrentConversationId}
        onDeleteConversation={handleDeleteConversation}
        onNewChat={handleNewChat}
      />

      <div className={`flex-1 flex flex-col min-h-screen relative transition-all duration-300 ${isSidebarOpen ? 'md:ml-72' : ''}`}>
        
        <ProtocolHeader 
          user={user} 
          onLogout={handleLogout} 
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />
        
        <main className="relative flex-1 flex flex-col items-center pt-24 pb-48 px-2 overflow-y-auto custom-scrollbar z-10">
          <div className="w-full max-w-3xl flex flex-col">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full opacity-30 mt-32">
                <div className="text-4xl font-bold tracking-[0.2em] mb-4 text-white">PROTOCOL</div>
                <p className="text-xs font-mono uppercase tracking-widest text-gray-500">System Ready</p>
              </div>
            )}
            {messages.map((msg) => (
              <MessageCard key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </main>

        <InputConsole 
          onSend={handleSendMessage} 
          isLoading={isLoading} 
          isSidebarOpen={isSidebarOpen} 
        />
      </div>
    </div>
  );
};

export default App;
