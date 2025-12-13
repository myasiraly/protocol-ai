
import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ProtocolHeader } from './components/ProtocolHeader';
import { MessageCard } from './components/MessageCard';
import { InputConsole } from './components/InputConsole';
import { LoginScreen } from './components/LoginScreen';
import { Sidebar } from './components/Sidebar';
import { Message, MessageRole, UserProfile, Attachment, ImageGenerationSize, Conversation } from './types';
import { createChatSession, sendMessageToSession, generateConversationTitle, ChatSession } from './services/geminiService';
import { playSound } from './utils/audio';

const STORAGE_KEY_USER = 'protocol_user';
const STORAGE_KEY_CONVERSATIONS = 'protocol_conversations';

const App: React.FC = () => {
  // --- STATE ---
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

  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatSessionRef = useRef<ChatSession | null>(null);
  const activeModelRef = useRef<string | null>(null);

  // --- EFFECTS ---

  // Persist conversations
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CONVERSATIONS, JSON.stringify(conversations));
  }, [conversations]);

  // Load selected conversation
  useEffect(() => {
    // Reset the chat session reference when switching conversations
    chatSessionRef.current = null;
    activeModelRef.current = null;

    if (currentConversationId) {
      const conv = conversations.find(c => c.id === currentConversationId);
      if (conv) {
        setMessages(conv.messages);
      }
    } else {
      if (conversations.length > 0) {
        const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
        setCurrentConversationId(sorted[0].id);
      } else {
        setMessages([]);
      }
    }
  }, [currentConversationId]); // Dependent only on ID change

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- HANDLERS ---

  const handleLogin = (newUser: UserProfile) => {
    setUser(newUser);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(newUser));
  };

  const handleLogout = () => {
    playSound('click');
    setUser(null);
    setCurrentConversationId(null);
    setMessages([]);
    chatSessionRef.current = null;
    localStorage.removeItem(STORAGE_KEY_USER);
  };

  const handleNewChat = () => {
    const newId = uuidv4();
    // We don't need to create the conversation object yet, logic handles it on first message
    setCurrentConversationId(null);
    setMessages([]);
    chatSessionRef.current = null;
  };

  const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newConvs = conversations.filter(c => c.id !== id);
    setConversations(newConvs);
    
    if (currentConversationId === id) {
      setCurrentConversationId(null);
    }
  };

  const handleSendMessage = async (text: string, useDeepAgent: boolean, attachments: Attachment[], imageSize: ImageGenerationSize) => {
    let convId = currentConversationId;
    let isNewConv = false;
    let isFirstMessage = false;

    // Create new conversation ID if needed
    if (!convId) {
      convId = uuidv4();
      isNewConv = true;
    }
    
    if (messages.length === 0) {
      isFirstMessage = true;
    }

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

    // Update conversation list/preview
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
    
    if (isNewConv) setCurrentConversationId(convId);

    try {
      // Check for Veo Key requirement
      if (useDeepAgent && (window as any).aistudio && !await (window as any).aistudio.hasSelectedApiKey()) {
         try {
           await (window as any).aistudio.openSelectKey();
         } catch (e) {
           console.warn("Key selection cancelled", e);
         }
      }

      // --- CHAT SESSION MANAGEMENT ---
      const targetModel = useDeepAgent ? 'deep-agent' : 'standard';
      
      // If no session exists, OR model switched, create a new one with accumulated history
      if (!chatSessionRef.current || activeModelRef.current !== targetModel) {
        // We pass 'messages' (the history BEFORE this new user message)
        // because createChatSession sets up context. 
        // Then we call sendMessage to add the new turn.
        chatSessionRef.current = createChatSession(messages, useDeepAgent);
        activeModelRef.current = targetModel;
      }

      const { text: responseText, generatedMedia } = await sendMessageToSession(
        chatSessionRef.current, 
        text, 
        attachments, 
        imageSize
      );

      const newProtocolMessage: Message = {
        id: uuidv4(),
        role: MessageRole.PROTOCOL,
        content: responseText,
        timestamp: Date.now(),
        generatedMedia: generatedMedia
      };

      const finalMessages = [...updatedMessages, newProtocolMessage];
      setMessages(finalMessages);

      setConversations(prev => prev.map(c => c.id === convId ? { ...c, messages: finalMessages, updatedAt: Date.now() } : c));
      
      // --- AUTO-TITLER ---
      if (isFirstMessage) {
        generateConversationTitle(finalMessages)
          .then((newTitle) => {
             if (newTitle) {
               setConversations(prev => prev.map(c => c.id === convId ? { ...c, title: newTitle } : c));
             }
          })
          .catch(err => console.error("Auto-titling failed", err));
      }

      playSound('message');
    } catch (error) {
      console.error("Protocol Error:", error);
      playSound('error');
      const errorMessage: Message = {
        id: uuidv4(),
        role: MessageRole.PROTOCOL,
        content: `[STATUS]: FAILED\n[ERROR]: Protocol Disconnected.\n[ACTION]: Re-initializing secure session...`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
      // Force session reset on error
      chatSessionRef.current = null;
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-protocol-bg text-protocol-accent font-sans selection:bg-sky-500/30 selection:text-white relative overflow-hidden flex">
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
        <div className="fixed inset-0 bg-grid-canvas opacity-[0.08] pointer-events-none z-0"></div>
        <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-sky-900/5 blur-[120px] pointer-events-none z-0"></div>
        
        <ProtocolHeader 
          user={user} 
          onLogout={handleLogout} 
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />
        
        <main className="relative pt-36 pb-56 px-4 md:px-0 flex flex-col items-center flex-1 z-10 overflow-y-auto custom-scrollbar">
          <div className="w-full max-w-4xl flex flex-col gap-6">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center opacity-40 mt-20 animate-fade-in">
                <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                   <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-sky-500/50">
                     <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                   </svg>
                </div>
                <h2 className="text-xl font-mono font-bold tracking-widest text-slate-500 uppercase">Protocol Initialized</h2>
                <p className="text-sm text-slate-600 mt-2 font-mono">Awaiting directives...</p>
              </div>
            )}
            {messages.map((msg) => (
              <MessageCard key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} className="h-8" />
          </div>
        </main>

        <InputConsole onSend={handleSendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default App;
