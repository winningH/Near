<template>
  <div class="py-3 animate-fade-in">
    <div
      class="inline-flex items-center gap-2.5 max-w-full px-4 py-2.5 rounded-[18px_18px_18px_2px] bg-red-50 dark:bg-red-900/20 text-[14.5px] leading-relaxed text-[#f56c6c]"
    >
      <span class="min-w-0 break-words">{{ error }}</span>
      <!-- 重试 / 关闭以图标内嵌在气泡尾部；-mr 抵消按钮盒内边留白，使左右视觉间距一致 -->
      <span class="flex items-center gap-0.5 shrink-0 -mr-2">
        <button
          v-if="canRetry"
          class="w-6 h-6 rounded-md flex items-center justify-center transition-colors hover:bg-black/5 dark:hover:bg-white/10 text-[#909399] hover:text-[#606266] dark:hover:text-[#c0c4cc]"
          title="重试"
          @click="$emit('retry')"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
            <polyline points="21 3 21 8 16 8" />
          </svg>
        </button>
        <button
          class="w-6 h-6 rounded-md flex items-center justify-center transition-colors hover:bg-black/5 dark:hover:bg-white/10 text-[#909399] hover:text-[#606266] dark:hover:text-[#c0c4cc]"
          title="关闭"
          @click="$emit('dismiss')"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </span>
    </div>
  </div>
</template>

<script setup>
  defineProps({
    error: { type: String, required: true },
    canRetry: { type: Boolean, default: false }
  });

  defineEmits(['retry', 'dismiss']);
</script>
