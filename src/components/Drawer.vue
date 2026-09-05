<template>
  <div>
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
        class="fixed top-0 left-0 h-full w-[350px] z-50 dark:bg-[#16213e] bg-white dark:border-r-[#2a2a50] border-r-slate-200 border-r shadow-2xl flex flex-col"
      >
        <div
          class="flex items-center justify-between px-4 py-3 dark:border-b-[#2a2a50] border-b-slate-200 border-b"
        >
          <span class="text-sm font-semibold dark:text-[#e8e8f0] text-slate-800"
            >版本 V{{ version }}</span
          >
          <button
            class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors dark:hover:bg-[#252545] dark:text-[#a0a0c0] dark:hover:text-[#e8e8f0] hover:bg-slate-200 text-slate-500 hover:text-slate-700"
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
            class="dark:border-b-[#2a2a50] border-b-slate-200 border-b"
          >
            <div
              class="flex items-center justify-between px-4 py-3 cursor-pointer select-none dark:hover:bg-[#252545] hover:bg-slate-100 transition-colors"
              @click="toggleSection(index)"
            >
              <span class="text-[13px] font-medium dark:text-[#e8e8f0] text-slate-700">{{
                section.title
              }}</span>
              <svg
                class="w-4 h-4 dark:text-[#6a6a8e] text-slate-400 transition-transform duration-300"
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
              <!-- 版本记录：时间轴 -->
              <div v-if="section.versions" class="px-4 py-4">
                <div
                  v-for="v in section.versions"
                  :key="v.version"
                  class="relative pl-4 pb-4 border-l border-slate-200 dark:border-[#2a2a50] last:border-transparent last:pb-0"
                >
                  <span
                    class="absolute -left-[4.5px] top-1 w-2 h-2 rounded-full ring-2 ring-white dark:ring-[#16213e]"
                    :class="v.current ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-[#4a4a6e]'"
                  ></span>
                  <div class="text-[13px] font-medium dark:text-[#e8e8f0] text-slate-700">
                    {{ v.version }}
                  </div>
                  <ul class="mt-1.5 space-y-1">
                    <li
                      v-for="item in v.items"
                      :key="item"
                      class="text-xs leading-relaxed break-words dark:text-[#a0a0c0] text-slate-600"
                    >
                      {{ item }}
                    </li>
                  </ul>
                </div>
              </div>
              <!-- 普通分组 -->
              <div v-else class="px-4 py-3 text-sm dark:text-[#a0a0c0] text-slate-600">
                <p
                  v-for="(line, i) in section.lines"
                  :key="i"
                  :class="lineClass(line, i)"
                  class="leading-relaxed break-words"
                >
                  {{ line.text || line }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
  import { toggleHeight } from '../utils/helpers';
  import { fetchConfig } from '../api';

  // 当前版本：抽屉标题与版本记录的“当前”标记均取自这里，升级时只需改这一处
  const VERSION = '1.5';

  // 使用说明的固定部分；“服务状态”子块由 loadConfig 在抽屉打开时动态补充
  const USAGE_TIPS = [
    'Enter 发送，Shift+Enter 换行',
    '支持粘贴或点击附件按钮上传图片/文件',
    '点击「深度思考」切换推理模型（需在服务端配置思考模型）'
  ];

  export default {
    name: 'Drawer',

    props: {
      visible: { type: Boolean, default: false }
    },

    data() {
      return {
        version: VERSION,
        loaded: false,
        sections: [
          {
            title: '版本记录',
            open: true,
            versions: [
              {
                version: VERSION + '（当前）',
                current: true,
                items: [
                  '移除消息头像，消息列表与 Markdown 排版配色向主流 AI 产品看齐',
                  '窗口小于 800px 自动折叠侧边栏，大于 800px 自动展开；小于 660px 出现横向滚动条',
                  '深度思考输出完毕后自动收起思考内容',
                  '新增 CHANGELOG.md 更新日志，与「关于」的版本记录保持一致'
                ]
              },
              {
                version: '1.3',
                items: [
                  '错误消息就地显示、支持一键重试；首轮发送失败不再进入历史',
                  '附件上传实时反馈：上传中占位、失败自动移除；图片可点击预览',
                  '会话标题由 AI 自动总结；修复中文文件名乱码',
                  '消息气泡浅色化、去除名称标签；窄窗口限制最小宽度'
                ]
              },
              {
                version: '1.2',
                items: [
                  '修复开发模式下附件区被整页刷新清空的问题（上传目录迁移）',
                  '删除附件同步清理文件；过期未发送附件定期自动清理',
                  '欢迎页快捷提示词；输入区布局重排',
                  '纯文本模型收到图片自动降级，保证对话不中断'
                ]
              },
              {
                version: '1.1',
                items: [
                  '深度思考模式：切换推理模型，思考过程可折叠查看',
                  '配置统一为 OPENAI_* 环境变量，缺失时启动明确提示',
                  '修复流式中断、消息丢失、代码块撑宽等问题'
                ]
              },
              {
                version: '1.0',
                items: [
                  '首发：自托管 AI 对话助手，Vue 2 + Express + SQLite 一体部署',
                  '流式对话、Markdown 渲染与代码高亮',
                  '会话管理与本地保存、暗色模式、附件上传'
                ]
              }
            ]
          },
          {
            title: '使用说明',
            open: false,
            lines: [
              ...USAGE_TIPS,
              { text: 'AI 配置（服务端 .env）', bold: true },
              {
                text: '必填：OPENAI_API_KEY、OPENAI_API_BASE、OPENAI_MODEL，缺失时服务不会发起 AI 请求'
              },
              {
                text: '可选：OPENAI_THINKING_MODEL（深度思考）、ENABLE_VISION（图片理解）、CORS_ORIGIN（前端来源）等，完整项见 .env.example'
              },
              { text: '修改 .env 后需重启服务端生效' },
              { text: '服务状态', bold: true },
              { text: '加载中…' }
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
      // 行样式：{ bold: true } 的行作为子标题加粗并与上下拉开间距
      lineClass(line, i) {
        if (line && line.bold) {
          return ['mt-3', 'font-medium', 'dark:text-[#e8e8f0]', 'text-slate-700'];
        }
        return i > 0 ? ['mt-1.5'] : [];
      },

      async loadConfig() {
        if (this.loaded) return;
        this.loaded = true;

        const section = this.sections.find(s => s.title === '使用说明');
        const statusIndex = section.lines.findIndex(
          line => typeof line === 'object' && line.text === '服务状态'
        );

        try {
          const c = await fetchConfig();
          section.lines = [
            ...section.lines.slice(0, statusIndex),
            { text: '服务状态', bold: true },
            {
              text: `对话模型：${c.model || '未配置'}${c.thinkingModel ? `（思考：${c.thinkingModel}）` : ''}`
            },
            { text: `图片理解：${c.visionEnabled ? '已开启' : '未开启'}` },
            {
              text: `接口地址：${c.apiBase || '未配置'}${c.configured ? '（已配置 API Key）' : ''}`
            },
            { text: '对话与附件保存在本地（SQLite + uploads），API Key 仅存于服务端 .env' }
          ];
        } catch (err) {
          section.lines = [
            ...section.lines.slice(0, statusIndex),
            { text: '服务状态', bold: true },
            { text: '模型信息加载失败，请确认后端服务已启动' }
          ];
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
