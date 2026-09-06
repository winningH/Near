<template>
  <div
    ref="rootEl"
    class="flex-1 overflow-y-auto py-5 px-8"
    @click="handleContentClick"
    @scroll="handleScroll"
    @wheel="handleWheel"
  >
    <div
      v-for="msg in messages"
      :key="msg.id"
      class="py-3 animate-fade-in"
      :data-msg-id="msg.id"
    >
      <div class="max-w-3xl mx-auto" :class="msg.role === 'user' ? 'flex flex-col items-end' : ''">
          <div
            v-if="msg.attachments && msg.attachments.length > 0"
            class="flex flex-wrap gap-1.5 mb-2"
            :class="msg.role === 'user' ? 'justify-end' : ''"
          >
            <template v-for="att in msg.attachments">
              <div
                v-if="att.type && att.type.startsWith('image/')"
                :key="'img-' + att.id"
                class="relative group rounded-lg overflow-hidden bg-white dark:bg-[#262626] border border-slate-200 dark:border-[#2e2e2e]"
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
                class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-[#262626] border border-slate-200 dark:border-[#2e2e2e] text-slate-600 dark:text-[#a3a3a3]"
              >
                <span>📄</span>
                <div class="flex flex-col">
                  <span class="font-medium truncate max-w-[140px]">{{ att.name }}</span>
                  <span class="text-[10px] dark:text-[#6e6e6e] text-slate-400">{{
                    formatFileSize(att.size)
                  }}</span>
                </div>
              </div>
            </template>
          </div>

          <div
            v-if="msg.content"
            class="message-content block max-w-full"
            :class="
              msg.role === 'user'
                ? 'rounded-[20px] bg-indigo-50 dark:bg-[#2e2e2e] px-4 py-2.5 text-slate-800 dark:text-[#ececec]'
                : 'py-0.5 text-[14.5px] leading-relaxed text-slate-800 dark:text-[#ececec]'
            "
            v-html="renderMessageContent(msg)"
          ></div>
      </div>
    </div>

    <div v-if="isStreaming" class="py-3 animate-fade-in">
      <div class="max-w-3xl mx-auto">
        <div
          ref="streamingRef"
          class="message-content block max-w-full py-0.5 text-[14.5px] leading-relaxed text-slate-800 dark:text-[#ececec]"
          v-html="streamingHtml"
        ></div>
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

<script setup>
  import { ref, computed, watch, onMounted, nextTick } from 'vue';
  import { formatFileSize, safeUrl, toggleHeight } from '../utils/helpers';
  import { buildThinkingAndContent, highlightCode, escapeHtml } from '../utils/markdown';
  import ErrorBanner from './ErrorBanner.vue';
  import Lightbox from './Lightbox.vue';

  const props = defineProps({
    messages: { type: Array, default: () => [] },
    isStreaming: { type: Boolean, default: false },
    streamingContent: { type: String, default: '' },
    streamingReasoning: { type: String, default: '' },
    error: { type: String, default: null },
    canRetry: { type: Boolean, default: false }
  });

  defineEmits(['dismiss-error', 'retry']);

  // 组件根节点：既是 markdown 查询范围，也是滚动容器（滚动跟随依赖它）
  const rootEl = ref(null);
  const streamingRef = ref(null);

  // 用户是否贴在底部——只由用户的滚动行为改变，代码的跟随滚动不影响它
  const userAtBottom = ref(true);
  // 上次处理的滚动位置：程序跟随只会让 scrollTop 变大或不变，
  // 因此「位置上移」必然是用户在向上滚；而内容长高带来的距离漂移不改变判定
  let lastScrollTop = 0;
  // 当前预览大图的附件，null 表示未打开
  const lightboxAtt = ref(null);
  // 已自动收起思考块的消息 id：同一批消息内只自动收一次，不跟用户手动展开打架。
  // 换一批消息（切换/重载会话）时必须重置——DOM 会按默认展开重新渲染，
  // 否则再次打开历史会话时收起逻辑被旧记录跳过，思考块就「自动展开」了
  let autoCollapsed = {};
  // 流式期间节流高亮，避免每个分片都重排整段 HTML
  let lastHighlightAt = 0;

  const streamingHtml = computed(() => {
    if (props.streamingContent || props.streamingReasoning) {
      return buildThinkingAndContent(props.streamingReasoning, props.streamingContent);
    }
    return '<div class="typing-indicator dark:bg-transparent bg-transparent"><span class="dark:bg-[#6e6e6e] bg-slate-400"></span><span class="dark:bg-[#6e6e6e] bg-slate-400"></span><span class="dark:bg-[#6e6e6e] bg-slate-400"></span></div>';
  });

  // immediate：从欢迎页首次进入会话时组件是新挂载的，需要对初始消息就执行
  // 高亮与思考块收起（watcher 默认不响应初始值）
  watch(
    () => props.messages,
    (val, oldVal) => {
      // 数组整体更换 = 切换/重载会话：重置收起记录，重新应用「默认收起」
      if (val !== oldVal) autoCollapsed = {};
      // 会话切换/新消息落库都视为新一轮内容：重置为贴底跟随
      userAtBottom.value = true;
      nextTick(() => {
        highlightAll();
        collapseFinishedThinking();
        scrollToBottom();
      });
    },
    { deep: true, immediate: true }
  );

  watch(
    () => props.streamingContent,
    () => {
      nextTick(() => {
        highlightStreaming();
        autoCollapseStreamingThinking();
        scrollToBottom();
      });
    }
  );

  watch(
    () => props.streamingReasoning,
    () => {
      nextTick(() => {
        highlightStreaming();
        autoCollapseStreamingThinking();
        scrollToBottom();
      });
    }
  );

  onMounted(() => {
    // 初次渲染完成时滚到底（userAtBottom 默认 true）
    scrollToBottom();
  });

  function renderMessageContent(msg) {
    if (msg.role === 'user') {
      return escapeHtml(msg.content).replace(/\n/g, '<br>');
    }
    return buildThinkingAndContent(msg.reasoningContent, msg.content);
  }

  function scrollToBottom() {
    const el = rootEl.value;
    // 用户上滑期间不跟，是否跟随便 userAtBottom 标志而非实时距离：
    // 大分段一次渲染的高度随时可能超过阈值，按距离判断会「跟一下就断」
    if (!el || !userAtBottom.value) return;
    el.scrollTop = el.scrollHeight;
    lastScrollTop = el.scrollTop;
  }

  function handleScroll() {
    const el = rootEl.value;
    if (!el) return;
    const top = el.scrollTop;
    const goingUp = top < lastScrollTop - 1;
    lastScrollTop = top;
    const dist = Math.round(el.scrollHeight - top - el.clientHeight);
    if (goingUp && dist > 50) {
      // 用户向上滚且已离开底部
      userAtBottom.value = false;
    } else if (dist <= 50) {
      // 距离底 50px 内算"贴底"
      userAtBottom.value = true;
    }
    // 其余情况（内容长高导致的距离增大）不改变判定
  }

  // 滚轮向上是明确的"离开底部"意图：立即停跟，不等 scroll 事件，
  // 避免快速流式时分片的程序滚动抢在前面把用户滚回去
  function handleWheel(e) {
    if (e.deltaY < 0) userAtBottom.value = false;
  }

  // 直接在组件根节点范围内查询，避免为每条消息挂 ref
  function highlightAll() {
    if (!rootEl.value) return;
    const nodes = rootEl.value.querySelectorAll('.message-content');
    nodes.forEach(el => highlightCode(el));
  }

  function highlightStreaming() {
    const el = streamingRef.value;
    if (!el || !props.isStreaming) return;
    const now = Date.now();
    if (now - lastHighlightAt < 200) return;
    lastHighlightAt = now;
    highlightCode(el);
  }

  // 立即收起思考块（不带动画）：高度直接归零，避免每 token 重渲染时反复触发动画
  function collapseThinking(block) {
    if (block.classList.contains('collapsed')) return;
    block.classList.add('collapsed');
    const body = block.querySelector('.thinking-body');
    if (body) body.style.height = '0px';
  }

  // 流式期间：正文一旦出现，说明思考已全部输出，自动收起思考块
  function autoCollapseStreamingThinking() {
    if (!props.streamingContent) return;
    const el = streamingRef.value;
    if (!el) return;
    const block = el.querySelector('.thinking-block');
    if (block) collapseThinking(block);
  }

  // 历史消息：思考与正文齐全的，说明思考已完整输出，默认收起
  function collapseFinishedThinking() {
    if (!rootEl.value) return;
    rootEl.value.querySelectorAll('[data-msg-id]').forEach(wrapper => {
      const id = wrapper.dataset.msgId;
      if (!id || autoCollapsed[id]) return;
      const block = wrapper.querySelector('.thinking-block');
      // 只有思考后面跟着正文（思考已完整输出）才收起
      if (!block || !wrapper.querySelector('.answer-content')) return;
      autoCollapsed[id] = true;
      collapseThinking(block);
    });
  }

  function handleContentClick(e) {
    const header = e.target.closest('.thinking-header');
    if (!header) return;
    const block = header.closest('.thinking-block');
    if (!block) return;
    const body = block.querySelector('.thinking-body');
    if (!body) return;

    const isCollapsed = block.classList.contains('collapsed');
    block.classList.toggle('collapsed');
    toggleHeight(body, isCollapsed);
  }

  function openLightbox(att) {
    lightboxAtt.value = att;
  }
</script>
