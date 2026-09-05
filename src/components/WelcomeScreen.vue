<template>
  <div class="flex-1 flex items-center justify-center">
    <div class="text-center max-w-[600px] px-10 w-full">
      <svg
        class="w-[72px] h-[72px] mx-auto mb-6 dark:text-[#6c63ff] text-indigo-500 dark:drop-shadow-[0_0_20px_rgba(108,99,255,0.3)] drop-shadow-[0_0_20px_rgba(99,102,241,0.2)]"
        viewBox="0 0 64 64"
        fill="none"
      >
        <circle cx="32" cy="32" r="28" stroke="currentColor" stroke-width="2.5" />
        <circle cx="24" cy="28" r="3.5" fill="currentColor" />
        <circle cx="40" cy="28" r="3.5" fill="currentColor" />
        <path
          d="M22 40c3 4 12 4 15 0"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
        />
      </svg>

      <h1
        class="text-[32px] font-bold mb-2 dark:bg-gradient-to-r dark:from-[#6c63ff] dark:via-[#a78bfa] dark:to-[#f472b6] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent"
      >
        你好，我是 Near
      </h1>

      <p class="text-base dark:text-[#6a6a8e] text-slate-400 mb-10">
        你的 AI 智能助手，随时为你解答问题、提供帮助
      </p>

      <!-- 一级视图：分类卡片 -->
      <transition name="fade" mode="out-in">
        <div
          v-if="!selectedAction"
          key="categories"
          class="grid grid-cols-2 gap-3 max-w-[480px] mx-auto"
        >
          <button
            v-for="action in quickActions"
            :key="action.text"
            class="flex items-center gap-2.5 px-5 py-3.5 rounded-xl transition-all text-left dark:bg-[#16213e] dark:border-[#2a2a50] dark:border dark:text-[#a0a0c0] dark:hover:border-[#6c63ff] dark:hover:bg-[#252545] dark:hover:text-[#e8e8f0] bg-white border-slate-200 border text-slate-600 hover:border-indigo-500 hover:bg-slate-50 hover:text-slate-800 hover:-translate-y-0.5"
            @click="selectAction(action)"
          >
            <span class="text-xl">{{ action.icon }}</span>
            <span class="text-sm font-medium">{{ action.text }}</span>
          </button>
        </div>

        <!-- 二级视图：建议词列表 -->
        <div v-else :key="selectedAction.text" class="max-w-[480px] mx-auto text-left">
          <button
            class="flex items-center gap-1.5 mb-4 text-sm dark:text-[#6a6a8e] text-slate-400 dark:hover:text-[#a0a0c0] hover:text-slate-600 transition-colors"
            @click="back"
          >
            <svg
              class="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M15 18l-6-6 6-6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span>返回</span>
          </button>

          <div class="flex items-center gap-2 mb-1">
            <span class="text-2xl">{{ selectedAction.icon }}</span>
            <h2 class="text-xl font-semibold dark:text-[#e8e8f0] text-slate-800">
              {{ selectedAction.text }}
            </h2>
          </div>
          <p class="text-sm mb-5 dark:text-[#6a6a8e] text-slate-400">
            {{ selectedAction.desc }}
          </p>

          <div class="flex flex-col gap-2">
            <button
              v-for="(prompt, idx) in selectedAction.prompts"
              :key="idx"
              class="text-left px-4 py-3 rounded-xl text-sm transition-all dark:bg-[#16213e] dark:border-[#2a2a50] dark:border dark:text-[#a0a0c0] dark:hover:border-[#6c63ff] dark:hover:bg-[#252545] dark:hover:text-[#e8e8f0] bg-white border-slate-200 border text-slate-600 hover:border-indigo-500 hover:bg-slate-50 hover:text-slate-800"
              @click="$emit('quick-action', prompt)"
            >
              {{ prompt }}
            </button>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script>
  export default {
    name: 'WelcomeScreen',

    data() {
      return {
        selectedAction: null,
        quickActions: [
          {
            icon: '💻',
            text: '写代码',
            desc: '辅助编码、调试与解释',
            prompts: [
              '用 JavaScript 写一个防抖函数，并解释它的使用场景',
              '用 Python 写一个批量重命名文件的脚本',
              '写一个 SQL 查询，按月统计订单总额',
              '写一个 React Hook，用于监听窗口尺寸变化'
            ]
          },
          {
            icon: '🌍',
            text: '翻译',
            desc: '中英互译、润色与术语解释',
            prompts: [
              '把"这个需求下周上线"翻译成得体的英文商务表达',
              '英译中：The release is blocked by a flaky test',
              '把"接口报错了"改写成对客户说的委婉说法',
              '解释 break the ice 的来源，并给两个例句'
            ]
          },
          {
            icon: '✍️',
            text: '写文章',
            desc: '博客、邮件、文案与大纲',
            prompts: [
              '写一篇关于"为什么需要设计系统"的技术博客开头',
              '写一封告知客户项目延期的邮件，附上补救方案',
              '给我一份"在线教育 App"的 PRD 大纲',
              '为面向小团队的会议纪要工具写一段产品文案'
            ]
          },
          {
            icon: '💡',
            text: '分析问题',
            desc: '排查、评估、对比与拆解',
            prompts: [
              '分析前端首屏加载慢的常见原因与排查思路',
              '对比 REST 和 GraphQL 在移动端场景下的取舍',
              '我想做个笔记应用，帮我拆解 MVP 该做哪些功能',
              '评估在现有 Express 项目里引入 TypeScript 的成本与收益'
            ]
          }
        ]
      };
    },

    methods: {
      selectAction(action) {
        this.selectedAction = action;
      },
      back() {
        this.selectedAction = null;
      }
    }
  };
</script>

<style scoped>
  .fade-enter-active,
  .fade-leave-active {
    transition:
      opacity 0.18s ease,
      transform 0.18s ease;
  }
  .fade-enter,
  .fade-leave-to {
    opacity: 0;
    transform: translateY(6px);
  }
</style>
