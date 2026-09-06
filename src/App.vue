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
    />
  </div>
</template>

<script setup>
  import { ref, onMounted, onBeforeUnmount } from 'vue';
  import ChatPanel from './components/index.vue';
  import { generateId } from './utils/helpers';
  import {
    fetchConversations,
    fetchConversation,
    fetchConfig,
    renameConversation,
    deleteConversation,
    chatStream
  } from './api';

  const conversations = ref([]);
  const currentId = ref(null);
  const messages = ref([]);
  const isCollapsed = ref(false);
  const isStreaming = ref(false);
  const thinkMode = ref(false);
  const streamingContent = ref('');
  const streamingReasoning = ref('');
  const error = ref(null);
  // 最近一次失败的消息，供错误横幅上的“重试”复用
  const lastFailed = ref(null);
  const runtimeConfig = ref({
    model: '',
    thinkingModel: null,
    thinkingEnabled: false,
    configured: false,
    apiBase: ''
  });

  let abortController = null;
  let mediaQuery = null;
  let sidebarMq = null;

  function applyTheme(isDark) {
    document.documentElement.classList.toggle('dark', isDark);

    // 代码高亮配色跟随应用主题
    const darkLink = document.getElementById('hljs-dark');
    const lightLink = document.getElementById('hljs-light');
    if (darkLink) darkLink.media = isDark ? 'all' : 'not all';
    if (lightLink) lightLink.media = isDark ? 'not all' : 'all';
  }

  function onSystemThemeChange(e) {
    applyTheme(e.matches);
  }

  function initTheme() {
    const saved = localStorage.getItem('near-theme');
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    if (saved === 'dark' || saved === 'light') {
      applyTheme(saved === 'dark');
    } else {
      applyTheme(mediaQuery.matches);
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', onSystemThemeChange);
      }
    }
  }

  // 窗口 <800px 自动折叠侧边栏，>800px 自动展开；
  // <660px 时由布局最小宽度（ChatPanel 的 min-w）触发 #app 的横向滚动条
  function onSidebarBreakpoint(e) {
    isCollapsed.value = e.matches;
  }

  function initSidebarAutoCollapse() {
    sidebarMq = window.matchMedia('(max-width: 800px)');
    isCollapsed.value = sidebarMq.matches;
    if (sidebarMq.addEventListener) {
      sidebarMq.addEventListener('change', onSidebarBreakpoint);
    } else if (sidebarMq.addListener) {
      sidebarMq.addListener(onSidebarBreakpoint);
    }
  }

  async function loadConfig() {
    try {
      runtimeConfig.value = await fetchConfig();
      if (!runtimeConfig.value.thinkingEnabled) {
        thinkMode.value = false;
      }
    } catch (err) {
      console.error('加载运行配置失败:', err);
    }
  }

  async function loadConversations() {
    try {
      conversations.value = await fetchConversations();
    } catch (err) {
      console.error('加载对话列表失败:', err);
    }
  }

  async function loadMessages(id) {
    try {
      const data = await fetchConversation(id);
      messages.value = data.messages || [];
    } catch (err) {
      console.error('加载消息失败:', err);
    }
  }

  function handleSelectConversation(id) {
    if (isStreaming.value) return;
    currentId.value = id;
    error.value = null;
    loadMessages(id);
  }

  function handleNewChat() {
    currentId.value = null;
    messages.value = [];
    error.value = null;
  }

  async function handleDeleteConversation(id) {
    try {
      await deleteConversation(id);
      conversations.value = conversations.value.filter(c => c.id !== id);
      if (currentId.value === id) {
        currentId.value = null;
        messages.value = [];
      }
    } catch (err) {
      console.error('删除对话失败:', err);
      error.value = '删除对话失败，请重试';
    }
  }

  async function handleRenameConversation(id, title) {
    try {
      await renameConversation(id, title);
      const conv = conversations.value.find(c => c.id === id);
      if (conv) conv.title = title;
    } catch (err) {
      console.error('重命名对话失败:', err);
    }
  }

  function handleToggleThink() {
    if (!runtimeConfig.value.thinkingEnabled) {
      error.value = '当前未在服务端配置思考模型（OPENAI_THINKING_MODEL），深度思考不可用';
      return;
    }
    thinkMode.value = !thinkMode.value;
  }

  async function handleSendMessage(content, attachments) {
    if (isStreaming.value) return;

    let conversationId = currentId.value;
    if (!conversationId) {
      conversationId = generateId();
      currentId.value = conversationId;
    }

    error.value = null;

    const localMsg = {
      id: generateId(),
      role: 'user',
      content: content,
      attachments: attachments,
      timestamp: new Date().toISOString()
    };
    messages.value.push(localMsg);

    isStreaming.value = true;
    streamingContent.value = '';
    streamingReasoning.value = '';
    abortController = new AbortController();

    const model =
      thinkMode.value && runtimeConfig.value.thinkingModel
        ? runtimeConfig.value.thinkingModel
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
        thinkMode.value,
        abortController.signal
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
              error.value = data.content || '生成失败';
              lastFailed.value = { content, attachments, localMsgId: localMsg.id };
              rolledBack = !!data.rolledBack;
            } else {
              if (data.content !== undefined) streamingContent.value = data.content;
              if (data.reasoning_content !== undefined)
                streamingReasoning.value = data.reasoning_content;
            }
            if (data.done) {
              completed = true;
              if (!rolledBack) {
                await loadConversations();
                await loadMessages(conversationId);
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
          await loadConversations();
          await loadMessages(conversationId);
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('用户中断生成');
      } else {
        console.error('聊天请求失败:', err);
        error.value = err.message || '请求失败，请检查网络连接或 API 配置';
        lastFailed.value = { content, attachments, localMsgId: localMsg.id };
        rolledBack = !!err.rolledBack;
      }
    } finally {
      isStreaming.value = false;
      streamingContent.value = '';
      streamingReasoning.value = '';
      abortController = null;
      // 本次发送没出过错才清掉失败记录，保证横幅上的“重试”始终有据可依
      if (!error.value) lastFailed.value = null;
      // 异常或中断时也要同步一次，避免已落库的回复在界面上丢失。
      // 回滚的首轮除外：消息已从库中删除，刷新会把界面清空回欢迎页
      if (!completed && !rolledBack) {
        loadConversations();
        loadMessages(conversationId);
      }
    }
  }

  function handleRetry() {
    if (!lastFailed.value || isStreaming.value) return;
    const { content, attachments, localMsgId } = lastFailed.value;
    // 失败轮未入库时旧气泡仅存于本地：先移除再重发，避免重试后出现两条
    if (localMsgId) {
      messages.value = messages.value.filter(m => m.id !== localMsgId);
    }
    handleSendMessage(content, attachments);
  }

  function handleStopStreaming() {
    if (abortController) {
      abortController.abort();
    }
  }

  onMounted(() => {
    initTheme();
    initSidebarAutoCollapse();
    loadConversations();
    loadConfig();
  });

  onBeforeUnmount(() => {
    if (mediaQuery && mediaQuery.removeEventListener) {
      mediaQuery.removeEventListener('change', onSystemThemeChange);
    }
    if (sidebarMq && sidebarMq.removeEventListener) {
      sidebarMq.removeEventListener('change', onSidebarBreakpoint);
    }
  });
</script>

<style scoped>
  #app {
    width: 100%;
    height: 100%;
    overflow-x: auto;
    overflow-y: hidden;
  }
</style>
