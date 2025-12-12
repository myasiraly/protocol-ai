
export enum MessageRole {
  USER = 'user',
  PROTOCOL = 'protocol'
}

export interface Attachment {
  type: 'image' | 'video';
  mimeType: string;
  data?: string; // base64 string
  uri?: string; // for video urls
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  attachments?: Attachment[];
  generatedMedia?: Attachment[];
}

export interface UserProfile {
  name: string;
  email: string;
  picture?: string;
}

export interface ProtocolState {
  messages: Message[];
  isLoading: boolean;
  user: UserProfile | null;
}
