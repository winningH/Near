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
      @rename="onRename" />

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
        :error="error" />

      <ChatInput
        :is-streaming="isStreaming"
        :think-mode="thinkMode"
        @send="onSend"
        @stop="$emit('stop')"
        @toggle-think="$emit('toggle-think')" />
    </main>
  </div>
</template>

<script>
  import Sidebar from './Sidebar';
  import WelcomeScreen from './WelcomeScreen';
  import MessageList from './MessageList';
  import ChatInput from './ChatInput';

  export default {
    name: 'ChatPanel',

    components: { Sidebar, WelcomeScreen, MessageList, ChatInput },

    props: {
      conversations: { type: Array, default: () => [] },
      currentId: { type: String, default: null },
      messages: { type: Array, default: () => [] },
      isCollapsed: { type: Boolean, default: false },
      isStreaming: { type: Boolean, default: false },
      thinkMode: { type: Boolean, default: false },
      streamingContent: { type: String, default: '' },
      streamingReasoning: { type: String, default: '' },
      error: { type: String, default: null }
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
