<template>
  <div ref="scrollContainer" class="flex-1 overflow-y-auto py-5" @click="handleContentClick">
    <div v-for="msg in messages" :key="msg.id" class="py-3 animate-fade-in">
      <div
        class="max-w-3xl mx-auto flex gap-2.5"
        :class="msg.role === 'user' ? 'flex-row-reverse' : ''">
        <div
          class="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-semibold text-white"
          :class="
            msg.role === 'user'
              ? 'bg-gradient-to-br dark:from-[#6c63ff] dark:to-[#a78bfa] from-indigo-500 to-purple-500'
              : 'bg-gradient-to-br dark:from-emerald-500 dark:to-emerald-400 from-emerald-500 to-teal-400'
          ">
          {{ msg.role === 'user' ? 'U' : 'N' }}
        </div>

        <div
          class="max-w-[calc(100%-56px)] min-w-0"
          :class="msg.role === 'user' ? 'items-end flex flex-col' : ''">
          <div
            class="text-[11px] mb-1 dark:text-[#6a6a8e] text-slate-400"
            :class="msg.role === 'user' ? 'pr-0.5' : 'pl-0.5'">
            {{ msg.role === 'user' ? '你' : 'Near' }}
          </div>

          <div
            v-if="msg.attachments && msg.attachments.length > 0"
            class="flex flex-wrap gap-1.5 mb-2"
            :class="msg.role === 'user' ? 'justify-end' : ''">
            <template v-for="att in msg.attachments">
              <div
                v-if="att.type && att.type.startsWith('image/')"
                :key="att.id"
                class="relative group">
                <img
                  :src="safeUrl(att.url)"
                  :alt="att.name"
                  class="w-11 h-11 rounded-md object-cover cursor-pointer"
                  @click="openLightbox(att)" />
              </div>
              <div
                v-else
                class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs"
                :class="
                  msg.role === 'user'
                    ? 'bg-white/15 text-white/85'
                    : 'dark:bg-[#252545] bg-slate-100 dark:text-[#a0a0c0] text-slate-600'
                ">
                <span>📄</span>
                <div class="flex flex-col">
                  <span class="font-medium truncate max-w-[140px]">{{ att.name }}</span>
                  <span
                    class="text-[10px]"
                    :class="
                      msg.role === 'user' ? 'text-white/60' : 'dark:text-[#6a6a8e] text-slate-400'
                    ">
                    {{ formatFileSize(att.size) }}
                  </span>
                </div>
              </div>
            </template>
          </div>

          <div
            v-if="msg.content"
            ref="contentRefs"
            class="message-content block max-w-full px-4 py-2.5"
            :class="
              msg.role === 'user'
                ? 'rounded-[18px_18px_2px_18px] bg-gradient-to-br dark:from-[#6c63ff] dark:to-[#8b5cf6] from-indigo-500 to-purple-500 text-white'
                : 'rounded-[18px_18px_18px_2px] dark:bg-[#16213e] bg-white dark:border-[#2a2a50] border-slate-200 border text-[14.5px] leading-relaxed dark:text-[#e8e8f0] text-slate-700'
            "
            v-html="renderMessageContent(msg)"></div>
        </div>
      </div>
    </div>

    <div v-if="isStreaming" class="py-3 animate-fade-in">
      <div class="max-w-3xl mx-auto flex gap-2.5">
        <div
          class="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-semibold text-white bg-gradient-to-br dark:from-emerald-500 dark:to-emerald-400 from-emerald-500 to-teal-400">
          N
        </div>
        <div class="max-w-[calc(100%-56px)] min-w-0">
          <div class="text-[11px] mb-1 pl-0.5 dark:text-[#6a6a8e] text-slate-400">Near</div>
          <div
            ref="streamingRef"
            class="message-content block max-w-full px-4 py-2.5 rounded-[18px_18px_18px_2px] dark:bg-[#16213e] bg-white dark:border-[#2a2a50] border-slate-200 border text-[14.5px] leading-relaxed dark:text-[#e8e8f0] text-slate-700"
            v-html="streamingHtml"></div>
        </div>
      </div>
    </div>

    <div v-if="error" class="py-3 animate-fade-in">
      <div class="max-w-3xl mx-auto flex gap-2.5">
        <div
          class="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-semibold text-white bg-red-500">
          !
        </div>
        <div class="max-w-[calc(100%-56px)] min-w-0">
          <div class="text-[11px] mb-1 pl-0.5 dark:text-[#6a6a8e] text-slate-400">错误</div>
          <div
            class="message-content inline-block px-4 py-2.5 rounded-[18px_18px_18px_2px] bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-[14.5px] leading-relaxed text-red-700 dark:text-red-300">
            {{ error }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  import { formatFileSize, safeUrl, toggleHeight } from '../../utils/helpers';
  import { buildThinkingAndContent, highlightCode, escapeHtml } from '../../utils/markdown';

  export default {
    name: 'MessageList',

    props: {
      messages: { type: Array, default: () => [] },
      isStreaming: { type: Boolean, default: false },
      streamingContent: { type: String, default: '' },
      streamingReasoning: { type: String, default: '' },
      error: { type: String, default: null }
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
        if (el) el.scrollTop = el.scrollHeight;
      },

      highlightAll() {
        const refs = this.$refs.contentRefs;
        if (refs) {
          (Array.isArray(refs) ? refs : [refs]).forEach(el => {
            if (el) highlightCode(el);
          });
        }
      },

      highlightStreaming() {
        const el = this.$refs.streamingRef;
        if (el && this.isStreaming) highlightCode(el);
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
        const overlay = document.createElement('div');
        overlay.className = 'lightbox-overlay';
        overlay.style.display = 'flex';
        overlay.innerHTML =
          '<img class="lightbox-img" src="' + safeUrl(att.url) + '" alt="' + att.name + '" />';
        overlay.onclick = () => overlay.remove();
        document.addEventListener('keydown', function esc(e) {
          if (e.key === 'Escape') {
            overlay.remove();
            document.removeEventListener('keydown', esc);
          }
        });
        document.body.appendChild(overlay);
      }
    }
  };
</script>
