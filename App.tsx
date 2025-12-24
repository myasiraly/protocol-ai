
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ProtocolHeader } from './components/ProtocolHeader';
import { MessageCard } from './components/MessageCard';
import { InputConsole } from './components/InputConsole';
import { LoginScreen } from './components/LoginScreen';
import { Sidebar } from './components/Sidebar';
import { IntegrationsModal } from './components/IntegrationsModal';
import { TrainingModal } from './components/TrainingModal';
import { SettingsModal } from './components/SettingsModal';
import { Message, MessageRole, UserProfile, Attachment, Conversation, MessageVersion, Integration, TrainingConfig } from './types';
import { sendMessageToSession, generateConversationTitle } from './services/geminiService';
import { playSound } from './utils/audio';
import { auth, db, updateConversationTitle, deleteAllUserConversations, saveUserTrainingConfig, getUserTrainingConfig } from './services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';

const DEFAULT_INTEGRATIONS: Integration[] = [
  { id: '1', name: 'Google Workspace', icon: 'mail', description: 'Gmail, Calendar, Drive access', isConnected: false },
  { id: '2', name: 'GitHub', icon: 'github', description: 'Repositories, Issues, PRs', isConnected: false },
  { id: '3', name: 'Slack', icon: 'slack', description: 'Channel messaging & Huddles', isConnected: false },
  { id: '4', name: 'Notion', icon: 'notion', description: 'Workspace pages & databases', isConnected: false },
  { id: '5', name: 'Figma', icon: 'figma', description: 'Design files & comments', isConnected: false },
];

const DEFAULT_TRAINING_CONFIG: TrainingConfig = {
  identity: "You are an elite expert in your field.",
  objectives: "Provide accurate, high-quality information.",
  constraints: "Avoid verbosity. Be precise.",
  tone: "Professional and concise.",
  isEnabled: false
};

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  
  // Default to Light Mode
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [textSize, setTextSize] = useState<'12px' | '14px' | '16px'>('16px');

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 768);
  
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false); 
  const [isIncognito, setIsIncognito] = useState(false);
  
  const [isIntegrationsOpen, setIsIntegrationsOpen] = useState(false);
  const [isTrainingOpen, setIsTrainingOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [integrations, setIntegrations] = useState<Integration[]>(DEFAULT_INTEGRATIONS);
  const [trainingConfig, setTrainingConfig] = useState<TrainingConfig>(DEFAULT_TRAINING_CONFIG);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Ref to track the last update from Firestore to avoid redundant rollbacks
  const lastSyncTimestampRef = useRef<number>(0);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    document.documentElement.style.fontSize = textSize;
  }, [textSize]);

  const toggleTheme = () => {
    playSound('click');
    setIsDarkMode(!isDarkMode);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser && firebaseUser.emailVerified) {
          setUser({
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            email: firebaseUser.email || '',
            picture: firebaseUser.photoURL || undefined
          });

          try {
             const savedConfig = await getUserTrainingConfig(firebaseUser.uid);
             if (savedConfig) {
                setTrainingConfig(savedConfig);
             }
          } catch (configError) {
             console.warn("Training config load failed (non-critical):", configError);
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Critical Auth Error:", err);
        setUser(null);
      } finally {
        setIsAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setConversations([]);
      return;
    }

    const q = query(
      collection(db, 'users', user.uid, 'conversations'), 
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convs = snapshot.docs.map(doc => doc.data() as Conversation);
      setConversations(convs);
    });

    return () => unsubscribe();
  }, [user]);

  // Enhanced sync logic: only update messages from conversations if the conversation actually changes or is strictly newer
  useEffect(() => {
    if (currentConversationId) {
      const conv = conversations.find(c => c.id === currentConversationId);
      if (conv) {
         if (!isLoading && (conv.updatedAt > lastSyncTimestampRef.current || messages.length !== conv.messages.length)) {
             setMessages(conv.messages);
             lastSyncTimestampRef.current = conv.updatedAt;
         }
         setIsIncognito(false); 
      }
    } else {
      if (!isIncognito) {
         setMessages([]);
         lastSyncTimestampRef.current = 0;
      }
    }
  }, [currentConversationId, conversations, isLoading]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleLogout = async () => {
    playSound('click');
    try {
      await signOut(auth);
      setCurrentConversationId(null);
      setMessages([]);
      setConversations([]);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  const handleNewChat = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setIsIncognito(false);
  };

  const handleToggleIncognito = () => {
      if (isIncognito) {
          setIsIncognito(false);
          setMessages([]); 
          setCurrentConversationId(null);
      } else {
          setIsIncognito(true);
          setCurrentConversationId(null);
          setMessages([]);
      }
  };

  const handleToggleIntegration = (id: string) => {
      setIntegrations(prev => prev.map(i => i.id === id ? { ...i, isConnected: !i.isConnected } : i));
  };

  const handleSaveTrainingConfig = async (newConfig: TrainingConfig) => {
      setTrainingConfig(newConfig);
      if (user) {
         setIsSaving(true);
         await saveUserTrainingConfig(user.uid, newConfig);
         setTimeout(() => setIsSaving(false), 800);
      }
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    
    if (currentConversationId === id) {
        setCurrentConversationId(null);
        setMessages([]);
    }

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'conversations', id));
      playSound('click');
    } catch (error) {
      console.error("Error deleting conversation", error);
      playSound('error');
    }
  };

  const handleRenameConversation = async (id: string, newTitle: string) => {
    if (!user) return;
    try {
        setIsSaving(true);
        await updateConversationTitle(user.uid, id, newTitle);
        playSound('success');
    } catch (error) {
        console.error("Rename failed", error);
        playSound('error');
    } finally {
        setTimeout(() => setIsSaving(false), 800);
    }
  };

  const handleExportData = () => {
      if (conversations.length === 0) {
          playSound('error');
          return;
      }
      const dataStr = JSON.stringify(conversations, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `protocol_archive_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      playSound('success');
  };

  const handleClearAllHistory = async () => {
      if (!user) return;
      try {
          await deleteAllUserConversations(user.uid);
          setMessages([]);
          setCurrentConversationId(null);
          playSound('success');
      } catch (error) {
          console.error("Clear all failed", error);
          playSound('error');
      }
  };

  const saveConversationToCloud = async (conv: Conversation) => {
    if (!user) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'users', user.uid, 'conversations', conv.id), conv);
      lastSyncTimestampRef.current = conv.updatedAt;
    } catch (error) {
      console.error("Failed to save conversation to cloud", error);
    } finally {
        setTimeout(() => setIsSaving(false), 800);
    }
  };

  const handleRegenerate = async (messageId: string) => {
    if (!user || isLoading) return;
    const msgIndex = messages.findIndex(m => m.id === messageId);
    if (msgIndex === -1) return;
    const messageToRegenerate = messages[msgIndex];
    if (messageToRegenerate.role !== MessageRole.PROTOCOL) return;
    const history = messages.slice(0, msgIndex);
    const lastUserMsg = history[history.length - 1];
    if (!lastUserMsg || lastUserMsg.role !== MessageRole.USER) return;

    setIsLoading(true);
    playSound('click');

    const connectedTools = integrations.filter(i => i.isConnected).map(i => i.name);

    try {
        const prevHistory = history.slice(0, history.length - 1);
        const { text: responseText, generatedMedia, audioData } = await sendMessageToSession(
            prevHistory,
            lastUserMsg.content,
            lastUserMsg.attachments,
            'TEXT', 
            false, 
            connectedTools,
            trainingConfig
        );
        const newVersion: MessageVersion = {
            content: responseText,
            timestamp: Date.now(),
            generatedMedia,
            audioData
        };
        const updatedMessages = [...messages];
        const targetMsg = { ...updatedMessages[msgIndex] };
        if (!targetMsg.versions) {
            targetMsg.versions = [{
                content: targetMsg.content,
                timestamp: targetMsg.timestamp,
                generatedMedia: targetMsg.generatedMedia,
                audioData: targetMsg.audioData
            }];
        }
        targetMsg.versions.push(newVersion);
        targetMsg.currentVersionIndex = targetMsg.versions.length - 1;
        targetMsg.content = newVersion.content;
        targetMsg.generatedMedia = newVersion.generatedMedia;
        targetMsg.audioData = newVersion.audioData;

        updatedMessages[msgIndex] = targetMsg;
        setMessages(updatedMessages);

        if (!isIncognito && currentConversationId) {
             const conv = conversations.find(c => c.id === currentConversationId);
             if (conv) {
                 const updatedConv = {
                    ...conv,
                    messages: updatedMessages,
                    updatedAt: Date.now()
                 };
                 await saveConversationToCloud(updatedConv);
             }
        }
        playSound('message');
    } catch (e) {
        console.error("Regeneration failed", e);
        playSound('error');
    } finally {
        setIsLoading(false);
    }
  };

  const handleSendMessage = useCallback(async (text: string, useDeepAgent: boolean, attachments: Attachment[], isVoice: boolean) => {
    if (!user) return;
    let convId = currentConversationId;
    let isNewConv = false;
    let isFirstMessage = false;

    if (!convId && !isIncognito) {
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

    // Optimistically update UI
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages); 
    setIsLoading(true);

    if (isNewConv && !isIncognito) {
        setCurrentConversationId(convId);
    }

    let currentConversation: Conversation | null = null;
    if (!isIncognito && convId) {
        const existing = conversations.find(c => c.id === convId);
        if (!existing) {
          const initialTitle = "New Briefing...";
          currentConversation = {
              id: convId,
              title: initialTitle,
              messages: updatedMessages,
              createdAt: Date.now(),
              updatedAt: Date.now()
          };
        } else {
          currentConversation = {
              ...existing,
              messages: updatedMessages,
              updatedAt: Date.now()
          };
        }
        
        // Initial save to Firestore
        await saveConversationToCloud(currentConversation);
        
        // Handle Title Generation for the first message
        if (isFirstMessage) {
            generateConversationTitle(text).then((newTitle) => {
                if (newTitle && currentConversation) {
                    currentConversation.title = newTitle;
                    // Persist the 3-word title to Firestore immediately
                    saveConversationToCloud(currentConversation); 
                }
            });
        }
    }

    const connectedTools = integrations.filter(i => i.isConnected).map(i => i.name);

    try {
      if (useDeepAgent && (window as any).aistudio && !await (window as any).aistudio.hasSelectedApiKey()) {
         try { await (window as any).aistudio.openSelectKey(); } catch (e) {}
      }
      const outputModality = (isVoice && !useDeepAgent) ? 'AUDIO' : 'TEXT';
      
      const { text: responseText, generatedMedia, audioData } = await sendMessageToSession(
        messages, 
        text, 
        attachments, 
        outputModality,
        useDeepAgent,
        connectedTools,
        trainingConfig
      );
      
      const newProtocolMessage: Message = {
        id: uuidv4(),
        role: MessageRole.PROTOCOL,
        content: responseText,
        timestamp: Date.now(),
        generatedMedia: generatedMedia,
        audioData: audioData,
        versions: [{ 
            content: responseText,
            timestamp: Date.now(),
            generatedMedia,
            audioData
        }],
        currentVersionIndex: 0
      };
      
      const finalMessages = [...updatedMessages, newProtocolMessage];
      setMessages(finalMessages);
      
      // Save AI response to Firestore
      if (!isIncognito && currentConversation) {
        currentConversation.messages = finalMessages;
        currentConversation.updatedAt = Date.now();
        await saveConversationToCloud(currentConversation);
      }
      playSound('message');
    } catch (error: any) {
      playSound('error');
      const errorMessage: Message = {
        id: uuidv4(),
        role: MessageRole.PROTOCOL,
        content: error.message || `[STATUS]: ERROR\nProtocol disconnected.`,
        timestamp: Date.now()
      };
      const messagesWithError = [...updatedMessages, errorMessage];
      setMessages(messagesWithError);
      if (!isIncognito && currentConversation) {
        currentConversation.messages = messagesWithError;
        currentConversation.updatedAt = Date.now();
        await saveConversationToCloud(currentConversation);
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentConversationId, messages, conversations, user, isIncognito, integrations, trainingConfig]);

  if (isAuthLoading) {
     return (
        <div className="h-[100dvh] w-full bg-protocol-obsidian flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
               <div className="w-8 h-8 border-2 border-protocol-border border-t-protocol-platinum rounded-full animate-spin"></div>
               <div className="text-[10px] font-mono text-protocol-muted uppercase tracking-widest animate-pulse">Initializing Protocol...</div>
            </div>
        </div>
     );
  }

  if (!user) return <LoginScreen />;

  return (
    <div className="h-[100dvh] bg-protocol-obsidian text-protocol-platinum font-sans relative flex overflow-hidden transition-colors duration-300">
      <div className="absolute inset-0 bg-noise opacity-30 pointer-events-none z-0 mix-blend-overlay"></div>
      
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={setCurrentConversationId}
        onDeleteConversation={handleDeleteConversation}
        onNewChat={handleNewChat}
        onRenameConversation={handleRenameConversation}
        onExportData={handleExportData}
        onClearAllHistory={handleClearAllHistory}
      />

      <IntegrationsModal
         isOpen={isIntegrationsOpen}
         onClose={() => setIsIntegrationsOpen(false)}
         integrations={integrations}
         onToggle={handleToggleIntegration}
      />

      <TrainingModal
         isOpen={isTrainingOpen}
         onClose={() => setIsTrainingOpen(false)}
         config={trainingConfig}
         onSave={handleSaveTrainingConfig}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={user}
        onOpenTraining={() => setIsTrainingOpen(true)}
        textSize={textSize}
        onSetTextSize={setTextSize}
      />

      <div className={`flex-1 flex flex-col h-full relative transition-all duration-300 ${isSidebarOpen ? 'md:ml-72' : ''}`}>
        
        <ProtocolHeader 
          user={user} 
          onLogout={handleLogout} 
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isLoading={isLoading}
          isSaving={isSaving}
          onOpenTraining={() => setIsTrainingOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
        />
        
        <main className="relative flex-1 flex flex-col items-center pt-24 pb-48 px-4 overflow-y-auto custom-scrollbar z-10">
          <div className="w-full max-w-4xl flex flex-col">
            
            {messages.length === 0 && (
              <div className="w-full h-[60vh] flex flex-col items-center justify-center animate-fade-in opacity-20 select-none pointer-events-none">
                 <h1 className="text-5xl md:text-7xl font-heading font-bold tracking-tighter text-protocol-platinum mb-4 transition-colors">PROTOCOL</h1>
                 <p className="text-[10px] md:text-xs font-mono uppercase tracking-[0.4em] text-protocol-platinum/60">
                    {isIncognito ? "Secure Channel Active" : "Your AI Chief of Staff."}
                 </p>
              </div>
            )}

            {messages.map((msg) => (
              <MessageCard 
                key={msg.id} 
                message={msg} 
                onRegenerate={handleRegenerate}
                isLoading={isLoading}
                userName={user?.name.split(' ')[0]}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </main>

        <InputConsole 
          onSend={handleSendMessage} 
          isLoading={isLoading} 
          isSidebarOpen={isSidebarOpen}
          isIncognito={isIncognito}
          onToggleIncognito={handleToggleIncognito}
          onOpenIntegrations={() => setIsIntegrationsOpen(true)}
        />
      </div>
    </div>
  );
};

export default App;
