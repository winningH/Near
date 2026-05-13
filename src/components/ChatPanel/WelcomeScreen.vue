<template>
  <div class="flex-1 flex items-center justify-center">
    <div class="text-center max-w-[600px] px-10">
      <svg
        class="w-[72px] h-[72px] mx-auto mb-6 dark:text-[#6c63ff] text-indigo-500
          dark:drop-shadow-[0_0_20px_rgba(108,99,255,0.3)] drop-shadow-[0_0_20px_rgba(99,102,241,0.2)]"
        viewBox="0 0 64 64"
        fill="none"
      >
        <circle cx="32" cy="32" r="28" stroke="currentColor" stroke-width="2.5" />
        <circle cx="24" cy="28" r="3.5" fill="currentColor" />
        <circle cx="40" cy="28" r="3.5" fill="currentColor" />
        <path d="M22 40c3 4 12 4 15 0" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
      </svg>

      <h1 class="text-[32px] font-bold mb-2 dark:bg-gradient-to-r dark:from-[#6c63ff] dark:via-[#a78bfa] dark:to-[#f472b6]
        bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
        你好，我是 Near
      </h1>

      <p class="text-base dark:text-[#6a6a8e] text-slate-400 mb-10">
        你的 AI 智能助手，随时为你解答问题、提供帮助
      </p>

      <div class="grid grid-cols-2 gap-3 max-w-[480px] mx-auto">
        <button
          v-for="action in quickActions"
          :key="action.text"
          class="flex items-center gap-2.5 px-5 py-3.5 rounded-xl transition-all text-left
            dark:bg-[#16213e] dark:border-[#2a2a50] dark:border dark:text-[#a0a0c0]
            dark:hover:border-[#6c63ff] dark:hover:bg-[#252545] dark:hover:text-[#e8e8f0]
            bg-white border-slate-200 border text-slate-600
            hover:border-indigo-500 hover:bg-slate-50 hover:text-slate-800
            hover:-translate-y-0.5"
          @click="$emit('quick-action', action.prompt)"
        >
          <span class="text-xl">{{ action.icon }}</span>
          <span class="text-sm font-medium">{{ action.text }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'WelcomeScreen',

  data() {
    return {
      quickActions: [
        { icon: '💻', text: '写代码', prompt: '帮我写一段 Python 代码' },
        { icon: '🌍', text: '翻译', prompt: '帮我翻译一段文字' },
        { icon: '✍️', text: '写文章', prompt: '帮我写一篇文章' },
        { icon: '💡', text: '分析问题', prompt: '帮我分析一个问题' }
      ]
    }
  }
}
</script>
