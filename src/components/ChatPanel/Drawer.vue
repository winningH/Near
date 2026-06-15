<template>
  <div>
    <!-- 遮罩层 -->
    <transition name="drawer-fade">
      <div
        v-if="visible"
        class="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        @click="$emit('update:visible', false)" />
    </transition>

    <!-- 抽屉 -->
    <transition name="drawer-slide">
      <div
        v-if="visible"
        class="fixed top-0 left-0 h-full w-[320px] z-50
          dark:bg-[#16213e] bg-white dark:border-r-[#2a2a50] border-r-slate-200 border-r shadow-2xl
          flex flex-col">
        <div class="flex items-center justify-between px-4 py-3 dark:border-b-[#2a2a50] border-b-slate-200 border-b">
          <span class="text-sm font-semibold dark:text-[#e8e8f0] text-slate-800">{{ title }}</span>
          <button
            class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors
              dark:hover:bg-[#252545] dark:text-[#a0a0c0] dark:hover:text-[#e8e8f0]
              hover:bg-slate-200 text-slate-500 hover:text-slate-700"
            @click="$emit('update:visible', false)">
            <svg class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div class="flex-1 overflow-y-auto">
          <div
            v-for="(section, index) in sections"
            :key="index"
            class="dark:border-b-[#2a2a50] border-b-slate-200 border-b">
            <div
              class="flex items-center justify-between px-4 py-3 cursor-pointer select-none
                dark:hover:bg-[#252545] hover:bg-slate-100 transition-colors"
              @click="toggleSection(index)">
              <span class="text-[13px] font-medium dark:text-[#e8e8f0] text-slate-700">{{ section.title }}</span>
              <svg
                class="w-4 h-4 dark:text-[#6a6a8e] text-slate-400 transition-transform duration-300"
                :class="{ 'rotate-180': section.open }"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
            <div
              ref="sectionBodies"
              class="overflow-hidden">
              <div class="px-4 py-3 text-sm dark:text-[#a0a0c0] text-slate-600">
                {{ section.content }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import { toggleHeight } from '../../utils/helpers';

export default {
  name: 'Drawer',

  props: {
    visible: { type: Boolean, default: false },
    title: { type: String, default: '' }
  },

  data() {
    return {
      sections: [
        { title: '基本信息', content: '这里是基本信息的内容，用于展示用户的基本资料。', open: true },
        { title: '使用统计', content: '对话总数：128 | 消息总数：1,024 | 使用天数：45', open: false },
        { title: '偏好设置', content: '当前主题：暗色 | 语言：简体中文 | 模型：LongCat-Flash', open: false },
        { title: '关于', content: 'Near 是一个 AI 聊天助手，致力于提供流畅的对话体验。版本：1.0.0', open: false }
      ]
    };
  },

  watch: {
    visible(val) {
      if (val) {
        this.$nextTick(() => this.initSectionHeights());
      }
    }
  },

  methods: {
    initSectionHeights() {
      this.sections.forEach((s, i) => {
        const el = this.$refs.sectionBodies?.[i];
        if (el) el.style.height = s.open ? '' : '0px';
      });
    },

    toggleSection(index) {
      const section = this.sections[index];
      const el = this.$refs.sectionBodies?.[index];
      if (!el) return;

      section.open = !section.open;
      toggleHeight(el, section.open);
    }
  }
};
</script>

<style scoped>
.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 0.3s ease;
}
.drawer-fade-enter,
.drawer-fade-leave-to {
  opacity: 0;
}

.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.drawer-slide-enter,
.drawer-slide-leave-to {
  transform: translateX(-100%);
}
</style>
