<template>
  <div
    ref="scrollContainer"
    class="flex-1 overflow-y-auto py-5 px-8"
    @click="handleContentClick"
    @scroll="handleScroll"
  >
    <div v-for="msg in messages" :key="msg.id" class="py-3 animate-fade-in">
      <div
        class="max-w-3xl mx-auto flex gap-2.5"
        :class="msg.role === 'user' ? 'flex-row-reverse' : ''"
      >
        <div
          class="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-semibold text-white"
          :class="
            msg.role === 'user'
              ? 'bg-gradient-to-br dark:from-[#6c63ff] dark:to-[#a78bfa] from-indigo-500 to-purple-500'
              : 'bg-gradient-to-br dark:from-emerald-500 dark:to-emerald-400 from-emerald-500 to-teal-400'
          "
        >
          {{ msg.role === 'user' ? 'U' : 'N' }}
        </div>

        <div
          class="max-w-[calc(100%-56px)] min-w-0"
          :class="msg.role === 'user' ? 'items-end flex flex-col' : ''"
        >
          <div
            v-if="msg.attachments && msg.attachments.length > 0"
            class="flex flex-wrap gap-1.5 mb-2"
            :class="msg.role === 'user' ? 'justify-end' : ''"
          >
            <template v-for="att in msg.attachments">
              <div
                v-if="att.type && att.type.startsWith('image/')"
                :key="'img-' + att.id"
                class="relative group rounded-lg overflow-hidden bg-white dark:bg-[#252545] border border-slate-200 dark:border-[#2a2a50]"
              >
                <img
                  :src="safeUrl(att.url)"
                  :alt="att.name"
                  class="w-11 h-11 object-cover cursor-pointer block"
                  @click="openLightbox(att)"
                />
              </div>
              <div
                v-else
                :key="'file-' + att.id"
                class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-[#252545] border border-slate-200 dark:border-[#2a2a50] text-slate-600 dark:text-[#a0a0c0]"
              >
                <span>📄</span>
                <div class="flex flex-col">
                  <span class="font-medium truncate max-w-[140px]">{{ att.name }}</span>
                  <span class="text-[10px] dark:text-[#6a6a8e] text-slate-400">{{
                    formatFileSize(att.size)
                  }}</span>
                </div>
              </div>
            </template>
          </div>

          <div
            v-if="msg.content"
            class="message-content block max-w-full px-4 py-2.5"
            :class="
              msg.role === 'user'
                ? 'rounded-[18px_18px_2px_18px] bg-indigo-100 dark:bg-[#33335c] text-slate-800 dark:text-[#e8e8f0]'
                : 'rounded-[18px_18px_18px_2px] dark:bg-[#16213e] bg-white dark:border-[#2a2a50] border-slate-200 border text-[14.5px] leading-relaxed dark:text-[#e8e8f0] text-slate-700'
            "
            v-html="renderMessageContent(msg)"
          ></div>
        </div>
      </div>
    </div>

    <div v-if="isStreaming" class="py-3 animate-fade-in">
      <div class="max-w-3xl mx-auto flex gap-2.5">
        <div
          class="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-semibold text-white bg-gradient-to-br dark:from-emerald-500 dark:to-emerald-400 from-emerald-500 to-teal-400"
        >
          N
        </div>
        <div class="max-w-[calc(100%-56px)] min-w-0 pt-1">
          <div
            ref="streamingRef"
            class="message-content block max-w-full px-4 py-2.5 rounded-[18px_18px_18px_2px] dark:bg-[#16213e] bg-white dark:border-[#2a2a50] border-slate-200 border text-[14.5px] leading-relaxed dark:text-[#e8e8f0] text-slate-700"
            v-html="streamingHtml"
          ></div>
        </div>
      </div>
    </div>

    <!-- 错误紧跟在最后一条消息之后（即回复本该出现的位置），参考 DeepSeek 的失败样式 -->
    <div v-if="error" class="max-w-3xl mx-auto">
      <ErrorBanner
        :error="error"
        :can-retry="canRetry"
        @retry="$emit('retry')"
        @dismiss="$emit('dismiss-error')"
      />
    </div>

    <Lightbox :att="lightboxAtt" @close="lightboxAtt = null" />
  </div>
</template>

<script>
  import { formatFileSize, safeUrl, toggleHeight } from '../utils/helpers';
  import { buildThinkingAndContent, highlightCode, escapeHtml } from '../utils/markdown';
  import ErrorBanner from './ErrorBanner';
  import Lightbox from './Lightbox';

  export default {
    name: 'MessageList',

    components: { ErrorBanner, Lightbox },

    data() {
      return {
        // 用户是否贴在底部——用于决定是否跟随流式输出自动滚动
        userAtBottom: true,
        // 当前预览大图的附件，null 表示未打开
        lightboxAtt: null
      };
    },

    props: {
      messages: { type: Array, default: () => [] },
      isStreaming: { type: Boolean, default: false },
      streamingContent: { type: String, default: '' },
      streamingReasoning: { type: String, default: '' },
      error: { type: String, default: null },
      canRetry: { type: Boolean, default: false }
    },

    computed: {
      streamingHtml() {
        if (this.streamingContent || this.streamingReasoning) {
          return buildThinkingAndContent(this.streamingReasoning, this.streamingContent);
        }
        return '<div class="typing-indicator dark:bg-transparent bg-transparent"><span class="dark:bg-[#6a6a8e] bg-slate-400"></span><span class="dark:bg-[#6a6a8e] bg-slate-400"></span><span class="dark:bg-[#6a6a8e] bg-slate-400"></span></div>';
      }
    },

    watch: {
      messages: {
        handler() {
          this.scrollToBottom();
          this.$nextTick(() => this.highlightAll());
        },
        deep: true
      },
      streamingContent() {
        this.scrollToBottom();
        this.$nextTick(() => this.highlightStreaming());
      },
      streamingReasoning() {
        this.scrollToBottom();
        this.$nextTick(() => this.highlightStreaming());
      }
    },

    created() {
      this._lastHighlightAt = 0;
    },

    mounted() {
      // 初次渲染完成时滚到底（userAtBottom 默认 true）
      this.scrollToBottom();
    },

    methods: {
      formatFileSize,
      safeUrl,

      renderMessageContent(msg) {
        if (msg.role === 'user') {
          return escapeHtml(msg.content).replace(/\n/g, '<br>');
        }
        return buildThinkingAndContent(msg.reasoningContent, msg.content);
      },

      scrollToBottom() {
        const el = this.$refs.scrollContainer;
        if (!el) return;
        // 再确认一次当前距离——避免 watcher 与用户滚动之间有时序差，
        // 导致用户刚往上滚、我们又把他拽回去
        const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        if (distanceFromBottom > 50) {
          this.userAtBottom = false;
          return; // 用户已经向上滚动了，不抢
        }
        this.userAtBottom = true;
        el.scrollTop = el.scrollHeight;
      },

      handleScroll() {
        const el = this.$refs.scrollContainer;
        if (!el) return;
        // 距离底 50px 内算"贴底"——大概一条消息的高度，不会太敏感
        this.userAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 50;
      },

      // 用选择器代替 v-for + ref：Vue 2 下 v-if 会让 ref 数组顺序不可靠
      highlightAll() {
        const nodes = this.$el.querySelectorAll('.message-content');
        nodes.forEach(el => highlightCode(el));
      },

      // 流式期间节流高亮，避免每个分片都重排整段 HTML
      highlightStreaming() {
        const el = this.$refs.streamingRef;
        if (!el || !this.isStreaming) return;
        const now = Date.now();
        if (now - this._lastHighlightAt < 200) return;
        this._lastHighlightAt = now;
        highlightCode(el);
      },

      handleContentClick(e) {
        const header = e.target.closest('.thinking-header');
        if (!header) return;
        const block = header.closest('.thinking-block');
        if (!block) return;
        const body = block.querySelector('.thinking-body');
        if (!body) return;

        const isCollapsed = block.classList.contains('collapsed');
        block.classList.toggle('collapsed');
        toggleHeight(body, isCollapsed);
      },

      openLightbox(att) {
        this.lightboxAtt = att;
      }
    }
  };
</script>

<style scoped>
  .typing-indicator {
    display: inline-flex;
    gap: 5px;
    padding: 12px 18px;
  }

  .typing-indicator span {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    animation: typing 1.4s infinite ease-in-out;
  }

  .typing-indicator span:nth-child(2) {
    animation-delay: 0.2s;
  }
  .typing-indicator span:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes typing {
    0%,
    80%,
    100% {
      opacity: 0.25;
      transform: scale(0.85);
    }
    40% {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>
