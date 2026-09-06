<template>
  <div ref="rootEl">
    <transition name="drawer-fade">
      <div
        v-if="visible"
        class="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        @click="$emit('update:visible', false)"
      />
    </transition>

    <transition name="drawer-slide">
      <div
        v-if="visible"
        class="fixed top-0 left-0 h-full w-[350px] z-50 dark:bg-[#222222] bg-white dark:border-r-[#2e2e2e] border-r-slate-200 border-r shadow-2xl flex flex-col"
      >
        <div
          class="flex items-center justify-between px-4 py-3 dark:border-b-[#2e2e2e] border-b-slate-200 border-b"
        >
          <span class="text-sm font-semibold dark:text-[#ececec] text-slate-800"
            >版本 V{{ version }}</span
          >
          <button
            class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors dark:hover:bg-[#262626] dark:text-[#a3a3a3] dark:hover:text-[#ececec] hover:bg-slate-200 text-slate-500 hover:text-slate-700"
            @click="$emit('update:visible', false)"
          >
            <svg
              class="w-[18px] h-[18px]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto">
          <div
            v-for="(section, index) in sections"
            :key="section.title"
            class="dark:border-b-[#2e2e2e] border-b-slate-200 border-b"
          >
            <div
              class="flex items-center justify-between px-4 py-3 cursor-pointer select-none dark:hover:bg-[#262626] hover:bg-slate-100 transition-colors"
              @click="toggleSection(index)"
            >
              <span class="text-[13px] font-medium dark:text-[#ececec] text-slate-700">{{
                section.title
              }}</span>
              <svg
                class="w-4 h-4 dark:text-[#6e6e6e] text-slate-400 transition-transform duration-300"
                :class="{ 'rotate-180': section.open }"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
            <div class="drawer-section-body overflow-hidden">
              <!-- 版本记录：时间轴（限高滚动，每条文案控制字数保证单行） -->
              <div v-if="section.versions" class="px-4 py-4 versions-scroll">
                <div
                  v-for="v in section.versions"
                  :key="v.version"
                  class="relative pl-4 pb-4 border-l border-slate-200 dark:border-[#2e2e2e] last:border-transparent last:pb-0"
                >
                  <span
                    class="absolute -left-[4.5px] top-1 w-2 h-2 rounded-full ring-2 ring-white dark:ring-[#222222]"
                    :class="v.current ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-[#4a4a4a]'"
                  ></span>
                  <div class="text-[13px] font-medium dark:text-[#ececec] text-slate-700">
                    {{ v.version }}
                  </div>
                  <ul class="mt-1.5 space-y-1">
                    <li
                      v-for="item in v.items"
                      :key="item"
                      class="text-xs leading-relaxed dark:text-[#a3a3a3] text-slate-600"
                    >
                      {{ item }}
                    </li>
                  </ul>
                </div>
              </div>
              <!-- 普通分组 -->
              <div v-else class="px-4 py-3 text-sm dark:text-[#a3a3a3] text-slate-600">
                <p
                  v-for="(line, i) in section.lines"
                  :key="i"
                  :class="lineClass(line, i)"
                  class="leading-relaxed break-words"
                >
                  {{ line.num ? line.num + '. ' : '' }}{{ line.text || line }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
  import { ref, reactive, watch, nextTick } from 'vue';
  import { toggleHeight } from '../utils/helpers';

  // 当前版本：抽屉标题与版本记录的“当前”标记均取自这里，升级时只需改这一处
  const VERSION = '2.0';

  const props = defineProps({
    visible: { type: Boolean, default: false }
  });

  defineEmits(['update:visible']);

  const rootEl = ref(null);

  const version = VERSION;

  // 折叠状态参与渲染，需要响应式
  const sections = reactive([
    {
      title: '版本记录',
      open: true,
      versions: [
        {
          version: VERSION + '（当前）',
          current: true,
          items: [
            '框架升级：Vue 3 + Vite 全面重构',
            '深色模式改纯黑，新增应用图标',
            '会话按月分组，滚动与交互优化'
          ]
        },
        {
          version: '1.5',
          items: [
            '移除消息头像，配色优化',
            '窄窗口自动折叠侧栏，极窄横向滚动',
            '思考输出完自动收起；新增 CHANGELOG'
          ]
        },
        {
          version: '1.3',
          items: [
            '错误就地显示，支持一键重试',
            '附件实时反馈，图片可点击预览',
            '标题 AI 自动总结；修复中文乱码'
          ]
        },
        {
          version: '1.2',
          items: [
            '修复附件被整页刷新清空',
            '删除附件同步清理文件，未发送的附件定期清理',
            '纯文本模型带图自动降级'
          ]
        },
        {
          version: '1.1',
          items: [
            '深度思考模式，思考可折叠查看',
            '配置统一为 OPENAI_* 环境变量',
            '修复流式中断、消息丢失等问题'
          ]
        },
        {
          version: '1.0',
          items: [
            '首发：Vue2 + Express 一体部署',
            '流式对话、Markdown 渲染高亮',
            '会话管理、暗色模式、附件上传'
          ]
        }
      ]
    },
    {
      title: '使用说明',
      open: false,
      lines: [
        { text: '支持粘贴或点击附件按钮上传图片/文件', num: 1 },
        { text: '开启「深度思考」需在服务端配置思考模型', num: 2 },
        { text: 'AI 配置（服务端 .env）', bold: true },
        {
          text: '必填：OPENAI_API_KEY、OPENAI_API_BASE、OPENAI_MODEL，缺失时不会发起 AI 请求',
          num: 3
        },
        {
          text: '可选：OPENAI_THINKING_MODEL、ENABLE_VISION、CORS_ORIGIN 等，完整项见 .env.example',
          num: 4
        },
        { text: '修改 .env 后需重启服务端生效', num: 5 },
        { text: '对话与附件保存在本地（SQLite + uploads），API Key 仅存于服务端 .env', num: 6 }
      ]
    }
  ]);

  watch(
    () => props.visible,
    val => {
      if (val) {
        nextTick(() => initSectionHeights());
      }
    }
  );

  // 行样式：{ bold: true } 的行作为子标题加粗并与上下拉开间距
  function lineClass(line, i) {
    if (line && line.bold) {
      return ['mt-3', 'font-medium', 'dark:text-[#ececec]', 'text-slate-700'];
    }
    return i > 0 ? ['mt-1.5'] : [];
  }

  // 用组件根节点代替 v-for + ref：Vue 2 下 ref 数组的顺序不保证
  function getBodies() {
    return rootEl.value.querySelectorAll('.drawer-section-body');
  }

  function initSectionHeights() {
    const bodies = getBodies();
    sections.forEach((s, i) => {
      const el = bodies[i];
      if (el) el.style.height = s.open ? '' : '0px';
    });
  }

  function toggleSection(index) {
    const section = sections[index];
    const el = getBodies()[index];
    if (!el) return;

    section.open = !section.open;
    toggleHeight(el, section.open);
  }
</script>

<style scoped>
  /* 版本记录限高滚动 */
  .versions-scroll {
    max-height: 300px;
    overflow-y: auto;
  }

  .drawer-fade-enter-active,
  .drawer-fade-leave-active {
    transition: opacity 0.3s ease;
  }
  .drawer-fade-enter-from,
  .drawer-fade-leave-to {
    opacity: 0;
  }

  .drawer-slide-enter-active,
  .drawer-slide-leave-active {
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .drawer-slide-enter-from,
  .drawer-slide-leave-to {
    transform: translateX(-100%);
  }
</style>
