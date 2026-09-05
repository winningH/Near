<template>
  <div class="py-3 animate-fade-in">
    <div class="flex gap-2.5">
      <div
        class="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-semibold text-white bg-red-500"
      >
        !
      </div>
      <div class="max-w-[calc(100%-56px)] min-w-0">
        <div
          class="text-[11px] mb-1 pl-0.5 dark:text-[#6a6a8e] text-slate-400 flex items-center gap-2"
        >
          <span>错误</span>
          <button
            v-if="canRetry"
            class="text-indigo-500 dark:text-[#a78bfa] hover:underline transition-colors"
            @click="$emit('retry')"
          >
            重试
          </button>
          <button
            class="dark:text-[#6a6a8e] text-slate-400 hover:text-red-500 transition-colors"
            title="关闭"
            @click="$emit('dismiss')"
          >
            ×
          </button>
        </div>
        <div
          class="inline-block px-4 py-2.5 rounded-[18px_18px_18px_2px] bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-[14.5px] leading-relaxed text-red-700 dark:text-red-300"
        >
          {{ error }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  export default {
    name: 'ErrorBanner',

    props: {
      error: { type: String, required: true },
      canRetry: { type: Boolean, default: false }
    }
  };
</script>
