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
            v-if="msg.content || msg.reasoningContent"
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
        <!-- 增量渲染：累积内容按顶层块切开，已定型的块原样复用（DOM 完全静止），
             只有最后一块随分片刷新 —— 不再每 150ms 整段推倒重来。
             思考块外壳是模板静态结构，收起状态由响应式变量驱动，内容更新不会打断它。
             message-content 保证输出过程中的排版与落库后完全一致 -->
        <div
          ref="streamingRef"
          class="message-content block max-w-full text-[14.5px] leading-relaxed text-slate-800 dark:text-[#ececec]"
        >
          <div
            v-if="thinkingBlocks.length || activeThinkingHtml"
            class="thinking-block"
            :class="{ collapsed: thinkingCollapsed }"
          >
            <div class="thinking-header">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
              <span>深度思考</span>
            </div>
            <div class="thinking-body">
              <div class="thinking-body-inner">
                <div v-for="(b, i) in thinkingBlocks" :key="'t' + i" v-html="b.html"></div>
                <div v-if="activeThinkingHtml" v-html="activeThinkingHtml"></div>
              </div>
            </div>
          </div>

          <div v-for="(b, i) in contentBlocks" :key="'c' + i" v-html="b.html"></div>
          <div v-if="activeContentHtml" v-html="activeContentHtml"></div>

          <div v-if="!hasAnyStreamContent" class="typing-indicator">
            <span class="dark:bg-[#6e6e6e] bg-slate-400"></span><span class="dark:bg-[#6e6e6e] bg-slate-400"></span><span class="dark:bg-[#6e6e6e] bg-slate-400"></span>
          </div>
        </div>
      </div>
    </div>

    <!-- 中断后：最后一条是带内容的助手消息时，提供「继续生成」入口 -->
    <div v-if="canContinue && !isStreaming && lastIsAssistant" class="max-w-3xl mx-auto py-1">
      <button
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] border dark:border-[#2e2e2e] border-slate-200 dark:text-[#a3a3a3] text-slate-600 dark:hover:bg-[#262626] hover:bg-slate-100 dark:hover:text-[#ececec] hover:text-slate-800 transition-colors"
        @click="$emit('continue')"
      >
        <svg
          class="w-3.5 h-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
          <polyline points="21 3 21 8 16 8" />
        </svg>
        继续生成
      </button>
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
  import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
  import { formatFileSize, safeUrl, toggleHeight } from '../utils/helpers';
  import { buildThinkingAndContent, highlightCode, escapeHtml, renderMarkdown, splitMarkdownBlocks } from '../utils/markdown';
  import ErrorBanner from './ErrorBanner.vue';
  import Lightbox from './Lightbox.vue';

  const props = defineProps({
    messages: { type: Array, default: () => [] },
    isStreaming: { type: Boolean, default: false },
    streamingContent: { type: String, default: '' },
    streamingReasoning: { type: String, default: '' },
    error: { type: String, default: null },
    canRetry: { type: Boolean, default: false },
    canContinue: { type: Boolean, default: false }
  });

  defineEmits(['dismiss-error', 'retry', 'continue']);

  // 仅当最后一条是助手消息（有正文或思考内容）时，「继续生成」才有意义
  // （如首轮中断被回滚，最后一条是用户消息，则不显示）
  const lastIsAssistant = computed(() => {
    const last = props.messages[props.messages.length - 1];
    return !!(last && last.role === 'assistant' && (last.content || last.reasoningContent));
  });

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
  // ===== 流式渲染：增量块 =====
  // 不再「每 150ms 把整篇重新 parse 一遍再整段 v-html 覆盖」，而是按顶层块切开：
  // 已定型的块原样复用（raw 未变 → html 不变 → Vue 不 patch → DOM 完全静止），
  // 只有最后一块（仍在增长）重新渲染。已定型的代码块、思考块收起状态因此不再被冲掉。
  const RENDER_INTERVAL = 150;

  const contentBlocks = ref([]);      // [{ raw, html }] 已定型的正文块
  const activeContentHtml = ref('');  // 仍在增长的正文块
  const thinkingBlocks = ref([]);
  const activeThinkingHtml = ref('');
  // 收起/展开必须是响应式状态：此前用命令式改 class，内容一更新（v-html 重建）就被冲掉
  const thinkingCollapsed = ref(false);
  let thinkingAutoCollapsed = false;

  let lastRenderAt = 0;
  let trailingTimer = null;
  let wasStreaming = false;

  const hasAnyStreamContent = computed(
    () =>
      !!(
        activeContentHtml.value ||
        contentBlocks.value.length ||
        activeThinkingHtml.value ||
        thinkingBlocks.value.length
      )
  );

  // raw 未变的块直接复用旧对象，html 字符串相同则 Vue 不会 patch 该节点
  function mergeBlocks(prev, stableList) {
    const next = [];
    for (let i = 0; i < stableList.length; i++) {
      next.push(
        prev[i] && prev[i].raw === stableList[i]
          ? prev[i]
          : { raw: stableList[i], html: renderMarkdown(stableList[i]) }
      );
    }
    return next;
  }

  function renderStreaming() {
    const c = splitMarkdownBlocks(props.streamingContent);
    contentBlocks.value = mergeBlocks(contentBlocks.value, c.stable);
    activeContentHtml.value = c.active ? renderMarkdown(c.active) : '';

    const r = splitMarkdownBlocks(props.streamingReasoning);
    thinkingBlocks.value = mergeBlocks(thinkingBlocks.value, r.stable);
    activeThinkingHtml.value = r.active ? renderMarkdown(r.active) : '';

    // 正文开始出现说明思考已输出完，自动收起一次；用户之后手动展开不会被压回
    if (props.streamingContent && !thinkingAutoCollapsed) {
      thinkingAutoCollapsed = true;
      thinkingCollapsed.value = true;
    }
  }

  function flushStream() {
    lastRenderAt = Date.now();
    renderStreaming();
    // 渲染后同一帧内高亮：活动块重建完立刻上色，不存在「纯文本 → 上色」的闪烁窗口
    nextTick(() => {
      highlightCode(streamingRef.value);
      scrollToBottom();
    });
  }

  watch(
    () => [props.streamingContent, props.streamingReasoning, props.isStreaming],
    ([, , streaming]) => {
      if (streaming && !wasStreaming) {
        // 新一轮开始：清掉上一轮残留，收起状态一并复位
        contentBlocks.value = [];
        thinkingBlocks.value = [];
        activeContentHtml.value = '';
        activeThinkingHtml.value = '';
        thinkingCollapsed.value = false;
        thinkingAutoCollapsed = false;
        lastRenderAt = 0;
      }
      wasStreaming = streaming;

      if (!streaming) {
        // 结束时立即补齐，保证界面内容与最终落库一致
        if (trailingTimer) {
          clearTimeout(trailingTimer);
          trailingTimer = null;
        }
        flushStream();
        return;
      }

      const wait = RENDER_INTERVAL - (Date.now() - lastRenderAt);
      if (wait <= 0) {
        flushStream();
        return;
      }
      // 被节流丢掉的帧要补做，否则上游静默（模型思考、网络抖动）时最后一段会迟迟不显示
      if (trailingTimer) return;
      trailingTimer = setTimeout(() => {
        trailingTimer = null;
        if (props.isStreaming) flushStream();
      }, wait);
    },
    { immediate: true }
  );

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

  onMounted(() => {
    // 初次渲染完成时滚到底（userAtBottom 默认 true）
    scrollToBottom();
  });

  onBeforeUnmount(() => {
    // 组件可能在流式过程中被切走（如回到欢迎页），补帧定时器要清掉
    if (trailingTimer) {
      clearTimeout(trailingTimer);
      trailingTimer = null;
    }
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

  // 历史消息收起：只加 class，高度归零交给 CSS（.thinking-block.collapsed .thinking-body）。
  // 不再写 inline height —— 那会和内容更新抢控制权
  function collapseThinking(block) {
    if (block.classList.contains('collapsed')) return;
    block.classList.add('collapsed');
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

    // 流式区的思考块：状态由响应式变量驱动，内容增量更新不会把它冲掉
    if (streamingRef.value && streamingRef.value.contains(block)) {
      // 用户手动操作过之后，不再被自动收起覆盖
      thinkingAutoCollapsed = true;
      thinkingCollapsed.value = !thinkingCollapsed.value;
      return;
    }

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
