'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { WelcomeScreen } from './components/WelcomeScreen';
import { MessageList } from './components/MessageList';
import { ChatInput } from './components/ChatInput';
import { Conversation, Message, Attachment } from '@/types';
import { generateId } from '@/lib/utils';

const THINKING_MODEL = 'LongCat-Flash-Thinking-2601';

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [thinkMode, setThinkMode] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingReasoning, setStreamingReasoning] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const abortControllerRef = useRef<AbortController | null>(null);

  // 加载对话列表
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const res = await fetch('/api/conversations');
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (err) {
      console.error('加载对话列表失败:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 加载特定对话的消息
  const loadMessages = async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('加载消息失败:', err);
    }
  };

  // 选择对话
  const handleSelectConversation = useCallback((id: string) => {
    setCurrentId(id);
    loadMessages(id);
  }, []);

  // 新建对话
  const handleNewChat = useCallback(() => {
    setCurrentId(null);
    setMessages([]);
  }, []);

  // 删除对话
  const handleDeleteConversation = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setConversations(prev => prev.filter(c => c.id !== id));
        if (currentId === id) {
          setCurrentId(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error('删除对话失败:', err);
    }
  }, [currentId]);

  // 重命名对话
  const handleRenameConversation = useCallback(async (id: string, title: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (res.ok) {
        setConversations(prev =>
          prev.map(c => (c.id === id ? { ...c, title } : c))
        );
      }
    } catch (err) {
      console.error('重命名对话失败:', err);
    }
  }, []);

  // 发送消息
  const handleSendMessage = useCallback(async (content: string, attachments: Attachment[]) => {
    let conversationId = currentId;

    // 如果没有当前对话，创建新对话ID
    if (!conversationId) {
      conversationId = generateId();
      setCurrentId(conversationId);
    }

    // 添加用户消息到界面
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content,
      attachments,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsStreaming(true);
    setStreamingContent('');
    setStreamingReasoning('');

    // 创建 AbortController
    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          message: content,
          attachments,
          model: thinkMode ? THINKING_MODEL : undefined,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        throw new Error('发送消息失败');
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error('无法读取响应');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              if (data.content !== undefined) {
                setStreamingContent(data.content);
              }
              if (data.reasoning_content !== undefined) {
                setStreamingReasoning(data.reasoning_content);
              }
              if (data.done) {
                // 刷新对话列表和消息
                loadConversations();
                if (conversationId) {
                  loadMessages(conversationId);
                }
              }
            } catch (e) {
              console.warn('解析 SSE 数据失败:', e);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('用户中断生成');
      } else {
        console.error('聊天请求失败:', err);
      }
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
      setStreamingReasoning('');
      abortControllerRef.current = null;
    }
  }, [currentId, thinkMode]);

  // 停止生成
  const handleStopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // 快捷操作
  const handleQuickAction = useCallback((prompt: string) => {
    handleSendMessage(prompt, []);
  }, [handleSendMessage]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center dark:bg-[#1a1a2e] bg-slate-50">
        <div className="flex items-center gap-3 dark:text-[#a0a0c0] text-slate-500">
          <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          加载中...
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden dark:bg-[#1a1a2e] bg-slate-50">
      <Sidebar
        conversations={conversations}
        currentId={currentId}
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed(!isCollapsed)}
        onSelect={handleSelectConversation}
        onNewChat={handleNewChat}
        onDelete={handleDeleteConversation}
        onRename={handleRenameConversation}
      />

      <main className="flex-1 flex flex-col min-w-0">
        {messages.length === 0 && !isStreaming ? (
          <WelcomeScreen onQuickAction={handleQuickAction} />
        ) : (
          <MessageList
            messages={messages}
            isStreaming={isStreaming}
            streamingContent={streamingContent}
            streamingReasoning={streamingReasoning}
          />
        )}

        <ChatInput
          onSend={handleSendMessage}
          onStop={handleStopStreaming}
          isStreaming={isStreaming}
          thinkMode={thinkMode}
          onToggleThink={() => setThinkMode(!thinkMode)}
        />
      </main>
    </div>
  );
}
