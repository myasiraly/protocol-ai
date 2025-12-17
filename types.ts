
export enum MessageRole {
  USER = 'user',
  PROTOCOL = 'protocol'
}

export interface Attachment {
  type: 'image' | 'video' | 'audio' | 'file';
  mimeType: string;
  data?: string; // base64 string
  uri?: string; // for video urls
  name?: string; // file name for display
}

export interface MessageVersion {
  content: string;
  timestamp: number;
  generatedMedia?: Attachment[];
  audioData?: string;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string; // Current displayed content
  timestamp: number;
  isStreaming?: boolean;
  attachments?: Attachment[];
  generatedMedia?: Attachment[];
  audioData?: string; // Base64 audio from native model generation
  
  // New: Drafts/Versions support
  versions?: MessageVersion[];
  currentVersionIndex?: number;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  picture?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface ProtocolState {
  messages: Message[];
  isLoading: boolean;
  user: UserProfile | null;
}

export interface Integration {
  id: string;
  name: string;
  icon: 'mail' | 'calendar' | 'hard-drive' | 'github' | 'slack' | 'figma' | 'notion';
  description: string;
  isConnected: boolean;
}

export interface TrainingConfig {
  identity: string;
  objectives: string;
  constraints: string;
  tone: string;
  isEnabled: boolean;
}
