<template>
  <div class="px-8 pb-6 dark:bg-gradient-to-b dark:from-transparent dark:to-[#1a1a2e]/30 bg-gradient-to-b from-transparent to-white/50">
    <div class="max-w-3xl mx-auto">
      <div
        ref="inputContainer"
        class="dark:bg-[#1e1e3a] bg-white dark:border-[#2a2a50] border-slate-200 border rounded-2xl p-3
          transition-all focus-within:border-indigo-500 focus-within:ring-2
          dark:focus-within:ring-[rgba(108,99,255,0.3)] focus-within:ring-indigo-500/20"
        @click="focusTextarea"
        @paste="handlePaste"
      >
        <div v-if="attachments.length > 0" class="relative mb-2.5">
          <button
            v-if="showScrollButtons"
            class="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-6 h-7 rounded-md
              dark:bg-[#1e1e3a]/95 dark:border-[#2a2a50] dark:border dark:text-[#a0a0c0]
              bg-white border-slate-200 border text-slate-500
              flex items-center justify-center"
            @click="scrollAttachments('left')"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <div
            ref="attachmentsContainer"
            class="flex gap-2 overflow-x-auto scrollbar-hide px-7 pb-2 dark:border-b-[#2a2a50] border-b-slate-100 border-b"
          >
            <div
              v-for="(att, index) in attachments"
              :key="att.id"
              class="relative flex-shrink-0 group"
              :class="att.type && att.type.startsWith('image/') ? '' : 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg dark:bg-[#252545] bg-slate-100'"
            >
              <div v-if="att.type && att.type.startsWith('image/')" class="relative">
                <img :src="att.url" :alt="att.name" class="w-16 h-16 rounded-md object-cover" />
                <button
                  class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white
                    flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  @click="removeAttachment(index)"
                >×</button>
              </div>
              <template v-else>
                <span>📄</span>
                <div class="flex flex-col">
                  <span class="text-xs font-medium dark:text-[#e8e8f0] text-slate-700 truncate max-w-[100px]">{{ att.name }}</span>
                  <span class="text-[10px] dark:text-[#6a6a8e] text-slate-400">{{ formatFileSize(att.size) }}</span>
                </div>
                <button
                  class="ml-1 w-4 h-4 rounded-full dark:bg-[#1e1e3a] bg-slate-200 dark:text-[#6a6a8e] text-slate-400
                    flex items-center justify-center text-xs hover:bg-red-500 hover:text-white transition-colors"
                  @click="removeAttachment(index)"
                >×</button>
              </template>
            </div>
          </div>

          <button
            v-if="showScrollButtons"
            class="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-6 h-7 rounded-md
              dark:bg-[#1e1e3a]/95 dark:border-[#2a2a50] dark:border dark:text-[#a0a0c0]
              bg-white border-slate-200 border text-slate-500
              flex items-center justify-center"
            @click="scrollAttachments('right')"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>

        <div class="flex items-end gap-2">
          <textarea
            ref="textarea"
            v-model="message"
            :disabled="isStreaming"
            placeholder="发送消息..."
            rows="1"
            class="flex-1 bg-transparent border-none outline-none resize-none py-2 px-1
              text-[15px] leading-relaxed dark:text-[#e8e8f0] text-slate-800
              dark:placeholder-[#6a6a8e] placeholder-slate-400
              disabled:opacity-50"
            style="min-height: 24px; max-height: 150px"
            @keydown="handleKeyDown"
            @input="handleInput"
          />

          <button
            :disabled="isUploading || isStreaming"
            class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors
              dark:text-[#6a6a8e] dark:hover:bg-[#252545] dark:hover:text-[#e8e8f0]
              text-slate-400 hover:bg-slate-100 hover:text-slate-600
              disabled:opacity-50"
            title="添加图片或文件"
            @click="$refs.fileInput.click()"
          >
            <svg v-if="isUploading" class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <svg v-else class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
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
            :disabled="!isStreaming && !hasContent"
            :class="isStreaming
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : hasContent
                ? 'dark:bg-[#6c63ff] bg-indigo-500 text-white dark:hover:bg-[#7b73ff] hover:bg-indigo-600'
                : 'dark:bg-[#252545] bg-slate-100 dark:text-[#6a6a8e] text-slate-400 cursor-not-allowed'"
            class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
            :title="isStreaming ? '中断生成' : '发送消息'"
            @click="handleSend"
          >
            <svg v-if="isStreaming" class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
            <svg v-else class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>

        <div class="flex items-center justify-between mt-1.5 px-1">
          <button
            :disabled="!config.thinkingEnabled"
            :class="[
              thinkMode && config.thinkingEnabled
                ? 'dark:bg-[rgba(108,99,255,0.08)] dark:text-[#6c63ff] dark:border-[rgba(108,99,255,0.35)] bg-indigo-50 text-indigo-600 border-indigo-200'
                : 'dark:bg-transparent dark:text-[#a0a0c0] dark:border-[#2a2a50] dark:hover:bg-[#252545] bg-transparent text-slate-500 border-slate-200 hover:bg-slate-50',
              !config.thinkingEnabled ? 'opacity-40 cursor-not-allowed' : ''
            ]"
            class="h-[26px] px-2.5 rounded-full text-xs transition-all border"
            :title="config.thinkingEnabled
              ? (thinkMode ? '关闭深度思考' : '开启深度思考')
              : '服务端未配置思考模型（OPENAI_THINKING_MODEL）'"
            @click="$emit('toggle-think')"
          >深度思考</button>
          <span class="text-[11px] dark:text-[#6a6a8e] text-slate-400">按 Enter 发送，Shift+Enter 换行</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { formatFileSize } from '../../utils/helpers'
import { uploadFiles as uploadFilesApi } from '../../api'

const MAX_FILE_SIZE = 10 * 1024 * 1024

export default {
  name: 'ChatInput',

  props: {
    isStreaming: { type: Boolean, default: false },
    thinkMode: { type: Boolean, default: false },
    config: {
      type: Object,
      default: () => ({ thinkingEnabled: false, model: '' })
    }
  },

  data() {
    return {
      message: '',
      attachments: [],
      isUploading: false,
      showScrollButtons: false,
      resizeObserver: null
    }
  },

  computed: {
    hasContent() {
      return this.message.trim() || this.attachments.length > 0
    }
  },

  watch: {
    attachments: {
      handler() {
        this.$nextTick(() => this.checkOverflow())
      },
      deep: true
    }
  },

  mounted() {
    const el = this.$refs.attachmentsContainer
    if (el) {
      this.resizeObserver = new ResizeObserver(() => this.checkOverflow())
      this.resizeObserver.observe(el)
    }
  },

  beforeDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
    }
  },

  methods: {
    formatFileSize,

    focusTextarea() {
      this.$refs.textarea.focus()
    },

    checkOverflow() {
      const el = this.$refs.attachmentsContainer
      if (el) {
        this.showScrollButtons = el.scrollWidth > el.clientWidth + 1
      }
    },

    handleSend() {
      if (this.isStreaming) {
        this.$emit('stop')
        return
      }

      const trimmed = this.message.trim()
      if (!trimmed && this.attachments.length === 0) return

      this.$emit('send', trimmed, [...this.attachments])
      this.message = ''
      this.attachments = []

      const textarea = this.$refs.textarea
      if (textarea) textarea.style.height = 'auto'
    },

    handleKeyDown(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        this.handleSend()
      }
    },

    handleInput(e) {
      const target = e.target
      target.style.height = 'auto'
      target.style.height = Math.min(target.scrollHeight, 150) + 'px'
    },

    async uploadFiles(files) {
      this.isUploading = true
      const formData = new FormData()
      files.forEach(file => formData.append('files', file))

      try {
        const uploaded = await uploadFilesApi(formData)
        this.attachments = [...this.attachments, ...uploaded]
      } catch (err) {
        console.error('上传文件失败:', err)
        this.$emit('notify', '上传失败，请检查文件大小（≤10MB）与类型是否受支持')
      } finally {
        this.isUploading = false
        if (this.$refs.fileInput) this.$refs.fileInput.value = ''
      }
    },

    async handleFileSelect(e) {
      const files = Array.from(e.target.files || [])
      if (files.length === 0) return

      const oversized = files.filter(f => f.size > MAX_FILE_SIZE)
      if (oversized.length > 0) {
        this.$emit('notify', `以下文件超过 10MB 限制：${oversized.map(f => f.name).join('、')}`)
        if (this.$refs.fileInput) this.$refs.fileInput.value = ''
        return
      }

      await this.uploadFiles(files)
    },

    async handlePaste(e) {
      const items = Array.from(e.clipboardData && e.clipboardData.items ? e.clipboardData.items : [])
      const files = []

      for (const item of items) {
        if (item.kind === 'file') {
          const file = item.getAsFile()
          if (file && file.size > 0) files.push(file)
        }
      }

      if (files.length === 0) return

      e.preventDefault()
      await this.uploadFiles(files)
    },

    removeAttachment(index) {
      this.attachments = this.attachments.filter((_, i) => i !== index)
    },

    scrollAttachments(direction) {
      const el = this.$refs.attachmentsContainer
      if (el) {
        el.scrollBy({
          left: direction === 'left' ? -200 : 200,
          behavior: 'smooth'
        })
      }
    }
  }
}
</script>
