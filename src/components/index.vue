<template>
  <div class="h-screen flex min-w-[660px] dark:bg-[#1a1a1a] bg-slate-50">
    <Sidebar
      :conversations="conversations"
      :current-id="currentId"
      :is-collapsed="isCollapsed"
      @toggle="$emit('toggle-sidebar')"
      @select="$emit('select-conversation', $event)"
      @new-chat="$emit('new-chat')"
      @delete="$emit('delete-conversation', $event)"
      @rename="onRename"
      @user-info-click="drawerOpen = true"
    />

    <main class="flex-1 flex flex-col min-w-0">
      <WelcomeScreen v-if="messages.length === 0 && !isStreaming" @send="onSend" />
      <MessageList
        v-else
        :messages="messages"
        :is-streaming="isStreaming"
        :streaming-content="streamingContent"
        :streaming-reasoning="streamingReasoning"
        :error="error"
        :can-retry="canRetry"
        :can-continue="canContinue"
        @dismiss-error="$emit('dismiss-error')"
        @retry="$emit('retry')"
        @continue="$emit('continue')"
      />

      <!-- 欢迎页状态下消息列表不渲染，错误横幅单独显示在输入区上方 -->
      <div
        v-if="error && messages.length === 0 && !isStreaming"
        class="max-w-3xl mx-auto w-full px-8 pb-3"
      >
        <ErrorBanner
          :error="error"
          :can-retry="canRetry"
          @retry="$emit('retry')"
          @dismiss="$emit('dismiss-error')"
        />
      </div>

      <ChatInput
        :is-streaming="isStreaming"
        :think-mode="thinkMode"
        :config="config"
        @send="onSend"
        @stop="$emit('stop')"
        @notify="$emit('notify', $event)"
        @toggle-think="$emit('toggle-think')"
      />
    </main>

    <Drawer v-model:visible="drawerOpen" />
  </div>
</template>

<script setup>
  import { ref } from 'vue';
  import Sidebar from './Sidebar.vue';
  import WelcomeScreen from './WelcomeScreen.vue';
  import MessageList from './MessageList.vue';
  import ChatInput from './ChatInput.vue';
  import Drawer from './Drawer.vue';
  import ErrorBanner from './ErrorBanner.vue';

  defineProps({
    conversations: { type: Array, default: () => [] },
    currentId: { type: String, default: null },
    messages: { type: Array, default: () => [] },
    isCollapsed: { type: Boolean, default: false },
    isStreaming: { type: Boolean, default: false },
    thinkMode: { type: Boolean, default: false },
    error: { type: String, default: null },
    canRetry: { type: Boolean, default: false },
    canContinue: { type: Boolean, default: false },
    streamingContent: { type: String, default: '' },
    streamingReasoning: { type: String, default: '' },
    config: {
      type: Object,
      default: () => ({
        model: '',
        thinkingModel: null,
        thinkingEnabled: false,
        configured: false
      })
    }
  });

  const emit = defineEmits([
    'toggle-sidebar',
    'select-conversation',
    'new-chat',
    'delete-conversation',
    'rename-conversation',
    'send',
    'stop',
    'toggle-think',
    'dismiss-error',
    'retry',
    'notify'
  ]);

  const drawerOpen = ref(false);

  function onRename(id, title) {
    emit('rename-conversation', id, title);
  }

  function onSend(message, attachments) {
    emit('send', message, attachments);
  }
</script>
