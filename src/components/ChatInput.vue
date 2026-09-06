<template>
  <div
    class="px-8 pb-6 dark:bg-gradient-to-b dark:from-transparent dark:to-[#1a1a1a]/30 bg-gradient-to-b from-transparent to-white/50"
  >
    <div class="max-w-3xl mx-auto w-full">
      <div
        class="dark:bg-[#222222] bg-white dark:border-[#2e2e2e] border-slate-200 border rounded-2xl px-3 pb-3 pt-2 transition-all"
        @click="focusTextarea"
        @paste="handlePaste"
      >
        <div v-if="attachments.length > 0" class="relative mb-2.5">
          <button
            v-if="showScrollButtons"
            class="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-6 h-7 rounded-md dark:bg-[#222222]/95 dark:border-[#2e2e2e] dark:border dark:text-[#a3a3a3] bg-white border-slate-200 border text-slate-500 flex items-center justify-center"
            @click="scrollAttachments('left')"
          >
            <svg
              class="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <div
            ref="attachmentsContainer"
            class="flex gap-2 overflow-x-auto scrollbar-hide pt-1.5 pb-2 dark:border-b-[#2e2e2e] border-b-slate-100 border-b"
            :class="showScrollButtons ? 'px-7' : 'px-1'"
          >
            <div
              v-for="(att, index) in attachments"
              :key="att.id"
              class="relative flex-shrink-0 group"
              :class="
                !att.uploading && att.type && att.type.startsWith('image/')
                  ? ''
                  : 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg dark:bg-[#262626] bg-slate-100 border border-slate-200 dark:border-[#2e2e2e]'
              "
            >
              <!-- 上传中的占位：成功后替换为服务端数据，失败则整项移除 -->
              <div
                v-if="att.uploading"
                class="w-16 h-16 rounded-md dark:bg-[#222222] bg-white border border-dashed border-slate-300 dark:border-[#2e2e2e] flex items-center justify-center"
                title="上传中..."
              >
                <svg
                  class="w-5 h-5 animate-spin text-slate-400 dark:text-[#6e6e6e]"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  />
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
              <div v-else-if="att.type && att.type.startsWith('image/')" class="relative">
                <img
                  :src="safeUrl(att.url)"
                  :alt="att.name"
                  class="w-16 h-16 rounded-md object-cover cursor-pointer bg-white dark:bg-[#262626] border border-slate-200 dark:border-[#2e2e2e]"
                  title="点击预览"
                  @click="openLightbox(att)"
                />
                <button
                  class="absolute -top-1.5 -right-1.5 w-[18px] h-[18px] rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-sm"
                  title="删除附件"
                  @click="removeAttachment(index)"
                >
                  <svg
                    class="w-2.5 h-2.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3"
                    stroke-linecap="round"
                  >
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
              <template v-else>
                <span>📄</span>
                <div class="flex flex-col">
                  <span
                    class="text-xs font-medium dark:text-[#ececec] text-slate-700 truncate max-w-[100px]"
                    >{{ att.name }}</span
                  >
                  <span class="text-[10px] dark:text-[#6e6e6e] text-slate-400">{{
                    formatFileSize(att.size)
                  }}</span>
                </div>
                <button
                  class="ml-1 w-4 h-4 rounded-full dark:bg-[#222222] bg-slate-200 dark:text-[#6e6e6e] text-slate-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                  title="删除附件"
                  @click="removeAttachment(index)"
                >
                  <svg
                    class="w-2 h-2"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3"
                    stroke-linecap="round"
                  >
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </template>
            </div>
          </div>

          <button
            v-if="showScrollButtons"
            class="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-6 h-7 rounded-md dark:bg-[#222222]/95 dark:border-[#2e2e2e] dark:border dark:text-[#a3a3a3] bg-white border-slate-200 border text-slate-500 flex items-center justify-center"
            @click="scrollAttachments('right')"
          >
            <svg
              class="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>

        <textarea
          ref="textarea"
          v-model="message"
          :disabled="isStreaming"
          placeholder="发送消息..."
          rows="2"
          class="block w-full bg-transparent border-none outline-none resize-none py-2 px-1 max-h-[150px] text-[15px] leading-relaxed dark:text-[#ececec] text-slate-800 dark:placeholder-[#6e6e6e] placeholder-slate-400 caret-indigo-600 dark:caret-[#a78bfa] disabled:opacity-50"
          @keydown="handleKeyDown"
          @input="handleInput"
        />

        <div class="grid grid-cols-[1fr_auto_1fr] items-center mt-1.5 px-1 gap-2">
          <div class="justify-self-start">
            <button
              :disabled="!config.thinkingEnabled"
              :class="[
                thinkMode && config.thinkingEnabled
                  ? 'dark:bg-[rgba(108,99,255,0.08)] dark:text-[#6c63ff] dark:border-[rgba(108,99,255,0.35)] bg-indigo-50 text-indigo-600 border-indigo-200'
                  : 'dark:bg-transparent dark:text-[#a3a3a3] dark:border-[#2e2e2e] dark:hover:bg-[#262626] bg-transparent text-slate-500 border-slate-200 hover:bg-slate-50',
                !config.thinkingEnabled ? 'opacity-40 cursor-not-allowed' : ''
              ]"
              class="h-[26px] px-2.5 rounded-full text-xs transition-all border"
              :title="
                config.thinkingEnabled
                  ? thinkMode
                    ? '关闭深度思考'
                    : '开启深度思考'
                  : '服务端未配置思考模型（OPENAI_THINKING_MODEL）'
              "
              @click="$emit('toggle-think')"
            >
              深度思考
            </button>
          </div>

          <span class="text-[11px] dark:text-[#6e6e6e] text-slate-400 whitespace-nowrap"
            >按 Enter 发送，Shift+Enter 换行</span
          >

          <div class="justify-self-end flex items-center gap-2">
            <button
              :disabled="isUploading || isStreaming"
              class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors dark:text-[#6e6e6e] dark:hover:bg-[#262626] dark:hover:text-[#ececec] text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
              title="添加图片或文件"
              @click="fileInput.click()"
            >
              <svg v-if="isUploading" class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <svg
                v-else
                class="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"
                />
              </svg>
            </button>
            <input
              ref="fileInput"
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx,.json,.md"
              class="hidden"
              @change="handleFileSelect"
            />

            <button
              :disabled="(!isStreaming && !hasContent) || isUploading"
              :class="
                isStreaming
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : hasContent && !isUploading
                    ? 'dark:bg-[#6c63ff] bg-indigo-500 text-white dark:hover:bg-[#7b73ff] hover:bg-indigo-600'
                    : 'dark:bg-[#262626] bg-slate-100 dark:text-[#6e6e6e] text-slate-400 cursor-not-allowed'
              "
              class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
              :title="isUploading ? '附件上传中...' : isStreaming ? '中断生成' : '发送消息'"
              @click="handleSend"
            >
              <svg
                v-if="isStreaming"
                class="w-[18px] h-[18px]"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
              <svg v-else class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <Lightbox :att="lightboxAtt" @close="lightboxAtt = null" />
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
  import { formatFileSize, generateId, safeUrl } from '../utils/helpers';
  import { uploadFiles as uploadFilesApi, deleteUploadedFile } from '../api';
  import Lightbox from './Lightbox.vue';

  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  const props = defineProps({
    isStreaming: { type: Boolean, default: false },
    thinkMode: { type: Boolean, default: false },
    config: {
      type: Object,
      default: () => ({ thinkingEnabled: false, model: '' })
    }
  });

  const emit = defineEmits(['send', 'stop', 'toggle-think', 'notify']);

  const message = ref('');
  const attachments = ref([]);
  const isUploading = ref(false);
  const showScrollButtons = ref(false);
  // 当前预览大图的附件，null 表示未打开
  const lightboxAtt = ref(null);

  const textarea = ref(null);
  const fileInput = ref(null);
  const attachmentsContainer = ref(null);

  let resizeObserver = null;

  const hasContent = computed(() => message.value.trim() || attachments.value.length > 0);

  watch(
    attachments,
    () => {
      nextTick(() => checkOverflow());
    },
    { deep: true }
  );

  onMounted(() => {
    const el = attachmentsContainer.value;
    if (el) {
      resizeObserver = new ResizeObserver(() => checkOverflow());
      resizeObserver.observe(el);
    }
  });

  onBeforeUnmount(() => {
    if (resizeObserver) {
      resizeObserver.disconnect();
    }
  });

  // 点击缩略图预览大图（与消息列表中的图片预览同款组件）
  function openLightbox(att) {
    lightboxAtt.value = att;
  }

  function focusTextarea() {
    textarea.value.focus();
  }

  function checkOverflow() {
    const el = attachmentsContainer.value;
    if (el) {
      showScrollButtons.value = el.scrollWidth > el.clientWidth + 1;
    }
  }

  function handleSend() {
    if (props.isStreaming) {
      emit('stop');
      return;
    }
    // 还有附件在上传中：发送会引用尚未存在的文件，直接忽略
    if (isUploading.value) return;

    const trimmed = message.value.trim();
    if (!trimmed && attachments.value.length === 0) return;

    emit('send', trimmed, [...attachments.value]);
    message.value = '';
    attachments.value = [];

    const el = textarea.value;
    if (el) {
      el.style.height = 'auto';
      el.style.overflowY = 'hidden';
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput(e) {
    const target = e.target;
    target.style.height = 'auto';
    target.style.height = Math.min(target.scrollHeight, 150) + 'px';
    // 仅当内容超过最大高度时才允许滚动，避免空内容时出现垂直滚动条
    target.style.overflowY = target.scrollHeight > 150 ? 'auto' : 'hidden';
  }

  async function uploadFiles(files) {
    isUploading.value = true;
    // 乐观占位：文件先以“上传中”状态显示，成功后替换为服务端数据，失败则整组移除
    const pending = files.map(file => ({
      id: 'pending-' + generateId(),
      name: file.name,
      size: file.size,
      type: file.type,
      uploading: true
    }));
    attachments.value = [...attachments.value, ...pending];

    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    try {
      const uploaded = await uploadFilesApi(formData);
      if (!Array.isArray(uploaded) || uploaded.length !== pending.length) {
        throw new Error('上传响应异常');
      }
      // 服务端按提交顺序返回，与占位项一一对应替换。
      // 注意：Vue 3 的响应式代理会改变对象引用，不能按引用匹配，必须用唯一 id
      attachments.value = attachments.value.map(att => {
        const idx = pending.findIndex(p => p.id === att.id);
        return idx !== -1 ? uploaded[idx] : att;
      });
    } catch (err) {
      console.error('上传文件失败:', err);
      // 未上传成功的附件不留在附件区
      attachments.value = attachments.value.filter(att => !pending.some(p => p.id === att.id));
      emit('notify', '上传失败，请检查文件大小（≤10MB）与类型是否受支持');
    } finally {
      isUploading.value = false;
      if (fileInput.value) fileInput.value.value = '';
    }
  }

  async function handleFileSelect(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const oversized = files.filter(f => f.size > MAX_FILE_SIZE);
    if (oversized.length > 0) {
      emit('notify', `以下文件超过 10MB 限制：${oversized.map(f => f.name).join('、')}`);
      if (fileInput.value) fileInput.value.value = '';
      return;
    }

    await uploadFiles(files);
  }

  async function handlePaste(e) {
    const items = Array.from(
      e.clipboardData && e.clipboardData.items ? e.clipboardData.items : []
    );
    const files = [];

    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file && file.size > 0) files.push(file);
      }
    }

    if (files.length === 0) return;

    e.preventDefault();
    await uploadFiles(files);
  }

  function removeAttachment(index) {
    const att = attachments.value[index];
    attachments.value = attachments.value.filter((_, i) => i !== index);
    // 仅清理待发送的落盘文件；发送后附件归消息历史所有，不删
    if (att && att.url) {
      deleteUploadedFile(att.url).catch(() => {});
    }
  }

  function scrollAttachments(direction) {
    const el = attachmentsContainer.value;
    if (el) {
      el.scrollBy({
        left: direction === 'left' ? -200 : 200,
        behavior: 'smooth'
      });
    }
  }
</script>
