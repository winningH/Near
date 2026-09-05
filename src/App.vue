<template>
  <div id="app">
    <ChatPanel
      :conversations="conversations"
      :current-id="currentId"
      :messages="messages"
      :is-collapsed="isCollapsed"
      :is-streaming="isStreaming"
      :think-mode="thinkMode"
      :config="runtimeConfig"
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
      @toggle-think="handleToggleThink"
      @dismiss-error="error = null"
      @retry="handleRetry"
      :can-retry="!!lastFailed"
      @notify="error = $event"
      @quick-action="handleQuickAction" />
  </div>
</template>

<script>
  import ChatPanel from './components';
  import { generateId } from './utils/helpers';
  import {
    fetchConversations,
    fetchConversation,
    fetchConfig,
    renameConversation,
    deleteConversation,
    chatStream
  } from './api';

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
        // 最近一次失败的消息，供错误横幅上的“重试”复用
        lastFailed: null,
        abortController: null,
        runtimeConfig: {
          appName: 'Near',
          model: '',
          thinkingModel: null,
          thinkingEnabled: false,
          configured: false,
          apiBase: ''
        }
      };
    },

    mounted() {
      this.initTheme();
      this.loadConversations();
      this.loadConfig();
    },

    beforeDestroy() {
      if (this.mediaQuery && this.mediaQuery.removeEventListener) {
        this.mediaQuery.removeEventListener('change', this.onSystemThemeChange);
      }
    },

    methods: {
      initTheme() {
        const saved = localStorage.getItem('near-theme');
        this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        if (saved === 'dark' || saved === 'light') {
          this.applyTheme(saved === 'dark');
        } else {
          this.applyTheme(this.mediaQuery.matches);
          if (this.mediaQuery.addEventListener) {
            this.mediaQuery.addEventListener('change', this.onSystemThemeChange);
          }
        }
      },

      applyTheme(isDark) {
        document.documentElement.classList.toggle('dark', isDark);

        // 代码高亮配色跟随应用主题
        const darkLink = document.getElementById('hljs-dark');
        const lightLink = document.getElementById('hljs-light');
        if (darkLink) darkLink.media = isDark ? 'all' : 'not all';
        if (lightLink) lightLink.media = isDark ? 'not all' : 'all';
      },

      onSystemThemeChange(e) {
        this.applyTheme(e.matches);
      },

      async loadConfig() {
        try {
          this.runtimeConfig = await fetchConfig();
          if (!this.runtimeConfig.thinkingEnabled) {
            this.thinkMode = false;
          }
        } catch (err) {
          console.error('加载运行配置失败:', err);
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
        if (this.isStreaming) return;
        this.currentId = id;
        this.error = null;
        this.loadMessages(id);
      },

      handleNewChat() {
        this.currentId = null;
        this.messages = [];
        this.error = null;
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
          this.error = '删除对话失败，请重试';
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

      handleToggleThink() {
        if (!this.runtimeConfig.thinkingEnabled) {
          this.error = '当前未在服务端配置思考模型（OPENAI_THINKING_MODEL），深度思考不可用';
          return;
        }
        this.thinkMode = !this.thinkMode;
      },

      async handleSendMessage(content, attachments) {
        if (this.isStreaming) return;

        let conversationId = this.currentId;
        if (!conversationId) {
          conversationId = generateId();
          this.currentId = conversationId;
        }

        this.error = null;

        const localMsg = {
          id: generateId(),
          role: 'user',
          content: content,
          attachments: attachments,
          timestamp: new Date().toISOString()
        };
        this.messages.push(localMsg);

        this.isStreaming = true;
        this.streamingContent = '';
        this.streamingReasoning = '';
        this.abortController = new AbortController();

        const model =
          this.thinkMode && this.runtimeConfig.thinkingModel
            ? this.runtimeConfig.thinkingModel
            : undefined;

        let completed = false;
        // 首轮失败被服务端回滚：消息只存在于本地界面，不能刷新列表，否则会被清空回欢迎页
        let rolledBack = false;

        try {
          const res = await chatStream(
            conversationId,
            content,
            attachments,
            model,
            this.thinkMode,
            this.abortController.signal
          );

          if (!res.ok) {
            const errorText = await res.text();
            let message = '发送消息失败: ' + res.status;
            let serverRolledBack = false;
            try {
              const parsed = JSON.parse(errorText);
              if (parsed && parsed.error) message = parsed.error;
              serverRolledBack = !!(parsed && parsed.rolledBack);
            } catch (e) {
              if (errorText) message += ' ' + errorText.slice(0, 200);
            }
            const err = new Error(message);
            err.rolledBack = serverRolledBack;
            throw err;
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
              if (!trimmed.startsWith('data: ')) continue;
              try {
                const data = JSON.parse(trimmed.slice(6));
                if (data.error) {
                  // 错误事件只进错误横幅，不作为流式增量渲染，
                  // 否则错误文字会在气泡里闪现一下又随流结束消失
                  this.error = data.content || '生成失败';
                  this.lastFailed = { content, attachments, localMsgId: localMsg.id };
                  rolledBack = !!data.rolledBack;
                } else {
                  if (data.content !== undefined) this.streamingContent = data.content;
                  if (data.reasoning_content !== undefined) this.streamingReasoning = data.reasoning_content;
                }
                if (data.done) {
                  completed = true;
                  if (!rolledBack) {
                    await this.loadConversations();
                    await this.loadMessages(conversationId);
                  }
                }
              } catch (e) {
                console.warn('解析 SSE 数据失败:', e);
              }
            }
          }

          if (!completed) {
            completed = true;
            if (!rolledBack) {
              await this.loadConversations();
              await this.loadMessages(conversationId);
            }
          }
        } catch (err) {
          if (err.name === 'AbortError') {
            console.log('用户中断生成');
          } else {
            console.error('聊天请求失败:', err);
            this.error = err.message || '请求失败，请检查网络连接或 API 配置';
            this.lastFailed = { content, attachments, localMsgId: localMsg.id };
            rolledBack = !!err.rolledBack;
          }
        } finally {
          this.isStreaming = false;
          this.streamingContent = '';
          this.streamingReasoning = '';
          this.abortController = null;
          // 本次发送没出过错才清掉失败记录，保证横幅上的“重试”始终有据可依
          if (!this.error) this.lastFailed = null;
          // 异常或中断时也要同步一次，避免已落库的回复在界面上丢失。
          // 回滚的首轮除外：消息已从库中删除，刷新会把界面清空回欢迎页
          if (!completed && !rolledBack) {
            this.loadConversations();
            this.loadMessages(conversationId);
          }
        }
      },

      handleRetry() {
        if (!this.lastFailed || this.isStreaming) return;
        const { content, attachments, localMsgId } = this.lastFailed;
        // 失败轮未入库时旧气泡仅存于本地：先移除再重发，避免重试后出现两条
        if (localMsgId) {
          this.messages = this.messages.filter(m => m.id !== localMsgId);
        }
        this.handleSendMessage(content, attachments);
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
