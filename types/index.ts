export interface Attachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoningContent?: string;
  timestamp: string;
  attachments?: Attachment[];
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
}

export interface ChatRequest {
  conversationId: string;
  message: string;
  attachments?: Attachment[];
  model?: string;
}

export interface ChatResponse {
  id: string;
  content: string;
  reasoningContent?: string;
  done: boolean;
  error?: boolean;
}
