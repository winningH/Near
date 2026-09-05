<template>
  <div>
    <transition name="drawer-fade">
      <div
        v-if="visible"
        class="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        @click="$emit('update:visible', false)" />
    </transition>

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
            :key="section.title"
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
            <div class="drawer-section-body overflow-hidden">
              <div class="px-4 py-3 text-sm dark:text-[#a0a0c0] text-slate-600">
                <p
                  v-for="(line, i) in section.lines"
                  :key="i"
                  :class="i > 0 ? 'mt-1.5' : ''"
                  class="leading-relaxed break-words">{{ line }}</p>
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
import { fetchConfig } from '../../api';

export default {
  name: 'Drawer',

  props: {
    visible: { type: Boolean, default: false },
    title: { type: String, default: '' }
  },

  data() {
    return {
      loaded: false,
      sections: [
        {
          title: '关于 Near',
          open: true,
          lines: [
            '自托管的 AI 聊天助手，前后端一体部署。',
            '版本 1.0.0'
          ]
        },
        { title: '模型与接口', open: false, lines: ['加载中…'] },
        {
          title: '使用技巧',
          open: false,
          lines: [
            'Enter 发送，Shift+Enter 换行',
            '可直接粘贴图片或文件作为附件',
            '点击「深度思考」切换到推理模型',
            '右键会话项可重命名或删除'
          ]
        },
        {
          title: '数据存储',
          open: false,
          lines: [
            '会话与消息保存在本地 SQLite：prisma/dev.db',
            '上传的附件保存在 public/uploads',
            'API Key 只保存在服务端 .env，不会下发给前端'
          ]
        }
      ]
    };
  },

  watch: {
    visible(val) {
      if (val) {
        this.$nextTick(() => this.initSectionHeights());
        this.loadConfig();
      }
    }
  },

  methods: {
    async loadConfig() {
      if (this.loaded) return;
      this.loaded = true;

      try {
        const c = await fetchConfig();
        this.sections[1].lines = [
          `接口状态：${c.configured ? '已配置 API Key' : '未配置 API Key'}`,
          `接口地址：${c.apiBase || '未配置'}`,
          `对话模型：${c.model || '未配置'}`,
          `思考模型：${c.thinkingModel || '未配置（深度思考不可用）'}`,
          `图片理解：${c.visionEnabled ? '已开启' : '已关闭'}`
        ];
      } catch (err) {
        this.sections[1].lines = ['模型信息加载失败，请确认后端服务已启动'];
      }

      this.$nextTick(() => this.initSectionHeights());
    },

    // 用选择器代替 v-for + ref：Vue 2 下 ref 数组的顺序不保证
    getBodies() {
      return this.$el.querySelectorAll('.drawer-section-body');
    },

    initSectionHeights() {
      const bodies = this.getBodies();
      this.sections.forEach((s, i) => {
        const el = bodies[i];
        if (el) el.style.height = s.open ? '' : '0px';
      });
    },

    toggleSection(index) {
      const section = this.sections[index];
      const el = this.getBodies()[index];
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
