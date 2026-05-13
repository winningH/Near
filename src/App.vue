<template>
  <div id="app">
    <ChatPanel
      :conversations="conversations"
      :current-id="currentId"
      :messages="messages"
      :is-collapsed="isCollapsed"
      :is-streaming="isStreaming"
      :think-mode="thinkMode"
      :streaming-content="streamingContent"
      :streaming-reasoning="streamingReasoning"
      :error="error"
      @toggle-sidebar="isCollapsed = !isCollapsed"
      @select-conversation="handleSelectConversation"
      @new-chat="handleNewChat"
      @delete-conversation="handleDeleteConversation"
      @rename-conversation="handleRenameConversation"
      @send="handleSendMessage"
      @stop="handleStopStreaming"
      @toggle-think="thinkMode = !thinkMode"
      @quick-action="handleQuickAction" />
  </div>
</template>

<script>
  import ChatPanel from './components/ChatPanel';
  import { generateId } from './utils/helpers';
  import {
    fetchConversations,
    fetchConversation,
    renameConversation,
    deleteConversation,
    chatStream
  } from './api';

  const THINKING_MODEL = 'LongCat-Flash-Thinking-2601';

  export default {
    name: 'App',

    components: { ChatPanel },

    data() {
      return {
        conversations: [],
        currentId: null,
        messages: [],
        isCollapsed: false,
        isStreaming: false,
        thinkMode: false,
        streamingContent: '',
        streamingReasoning: '',
        isLoading: true,
        error: null,
        abortController: null
      };
    },

    mounted() {
      this.loadConversations();
      this.initTheme();
    },

    methods: {
      initTheme() {
        const saved = localStorage.getItem('near-theme');
        if (
          saved === 'dark' ||
          (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)
        ) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },

      async loadConversations() {
        try {
          this.conversations = await fetchConversations();
        } catch (err) {
          console.error('加载对话列表失败:', err);
        } finally {
          this.isLoading = false;
        }
      },

      async loadMessages(id) {
        try {
          const data = await fetchConversation(id);
          this.messages = data.messages || [];
        } catch (err) {
          console.error('加载消息失败:', err);
        }
      },

      handleSelectConversation(id) {
        this.currentId = id;
        this.loadMessages(id);
      },

      handleNewChat() {
        this.currentId = null;
        this.messages = [];
      },

      async handleDeleteConversation(id) {
        try {
          await deleteConversation(id);
          this.conversations = this.conversations.filter(c => c.id !== id);
          if (this.currentId === id) {
            this.currentId = null;
            this.messages = [];
          }
        } catch (err) {
          console.error('删除对话失败:', err);
        }
      },

      async handleRenameConversation(id, title) {
        try {
          await renameConversation(id, title);
          const conv = this.conversations.find(c => c.id === id);
          if (conv) conv.title = title;
        } catch (err) {
          console.error('重命名对话失败:', err);
        }
      },

      async handleSendMessage(content, attachments) {
        let conversationId = this.currentId;

        if (!conversationId) {
          conversationId = generateId();
          this.currentId = conversationId;
        }

        this.error = null;

        this.messages.push({
          id: generateId(),
          role: 'user',
          content: content,
          attachments: attachments,
          timestamp: new Date().toISOString()
        });

        this.isStreaming = true;
        this.streamingContent = '';
        this.streamingReasoning = '';

        this.abortController = new AbortController();

        try {
          const res = await chatStream(
            conversationId,
            content,
            attachments,
            this.thinkMode ? THINKING_MODEL : undefined
          );

          if (!res.ok) {
            const errorText = await res.text();
            throw new Error('发送消息失败: ' + res.status + ' ' + errorText);
          }

          const reader = res.body.getReader();
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
                    this.streamingContent = data.content;
                  }
                  if (data.reasoning_content !== undefined) {
                    this.streamingReasoning = data.reasoning_content;
                  }
                  if (data.done) {
                    this.loadConversations();
                    if (conversationId) {
                      this.loadMessages(conversationId);
                    }
                  }
                } catch (e) {
                  console.warn('解析 SSE 数据失败:', e);
                }
              }
            }
          }
        } catch (err) {
          if (err.name === 'AbortError') {
            console.log('用户中断生成');
          } else {
            console.error('聊天请求失败:', err);
            this.error = err.message || '请求失败，请检查网络连接或 API 配置';
          }
        } finally {
          this.isStreaming = false;
          this.streamingContent = '';
          this.streamingReasoning = '';
          this.abortController = null;
        }
      },

      handleStopStreaming() {
        if (this.abortController) {
          this.abortController.abort();
        }
      },

      handleQuickAction(prompt) {
        this.handleSendMessage(prompt, []);
      }
    }
  };
</script>
