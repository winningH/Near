<template>
  <div class="h-screen flex overflow-hidden dark:bg-[#1a1a2e] bg-slate-50">
    <Sidebar
      :conversations="conversations"
      :current-id="currentId"
      :is-collapsed="isCollapsed"
      @toggle="$emit('toggle-sidebar')"
      @select="$emit('select-conversation', $event)"
      @new-chat="$emit('new-chat')"
      @delete="$emit('delete-conversation', $event)"
      @rename="onRename"
      @user-info-click="drawerOpen = true" />

    <main class="flex-1 flex flex-col min-w-0">
      <WelcomeScreen
        v-if="messages.length === 0 && !isStreaming"
        @quick-action="$emit('quick-action', $event)" />
      <MessageList
        v-else
        :messages="messages"
        :is-streaming="isStreaming"
        :streaming-content="streamingContent"
        :streaming-reasoning="streamingReasoning"
        :error="error"
        :can-retry="canRetry"
        @dismiss-error="$emit('dismiss-error')"
        @retry="$emit('retry')" />

      <!-- 欢迎页状态下消息列表不渲染，错误横幅单独显示在输入区上方 -->
      <div v-if="error && messages.length === 0 && !isStreaming" class="max-w-3xl mx-auto w-full px-8 pb-3">
        <ErrorBanner
          :error="error"
          :can-retry="canRetry"
          @retry="$emit('retry')"
          @dismiss="$emit('dismiss-error')" />
      </div>

      <ChatInput
        :is-streaming="isStreaming"
        :think-mode="thinkMode"
        :config="config"
        @send="onSend"
        @stop="$emit('stop')"
        @notify="$emit('notify', $event)"
        @toggle-think="$emit('toggle-think')" />
    </main>

    <Drawer :visible.sync="drawerOpen" title="设置与关于" />
  </div>
</template>

<script>
  import Sidebar from './Sidebar';
  import WelcomeScreen from './WelcomeScreen';
  import MessageList from './MessageList';
  import ChatInput from './ChatInput';
  import Drawer from './Drawer';
  import ErrorBanner from './ErrorBanner';

  export default {
    name: 'ChatPanel',

    components: { Sidebar, WelcomeScreen, MessageList, ChatInput, Drawer, ErrorBanner },

    props: {
      conversations: { type: Array, default: () => [] },
      currentId: { type: String, default: null },
      messages: { type: Array, default: () => [] },
      isCollapsed: { type: Boolean, default: false },
      isStreaming: { type: Boolean, default: false },
      thinkMode: { type: Boolean, default: false },
      error: { type: String, default: null },
      canRetry: { type: Boolean, default: false },
      streamingContent: { type: String, default: '' },
      streamingReasoning: { type: String, default: '' },
      error: { type: String, default: null },
      config: {
        type: Object,
        default: () => ({
          appName: 'Near',
          model: '',
          thinkingModel: null,
          thinkingEnabled: false,
          configured: false
        })
      }
    },

    data() {
      return {
        drawerOpen: false
      };
    },

    methods: {
      onRename(id, title) {
        this.$emit('rename-conversation', id, title);
      },
      onSend(message, attachments) {
        this.$emit('send', message, attachments);
      }
    }
  };
</script>
