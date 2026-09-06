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

        <!-- 手风琴：两个分组互斥展开，toggleHeight 做高度动画；
             版本记录列表的最大高度 = 距抽屉底部的剩余空间（JS 实测，见 updateVersionsMaxHeight） -->
        <div ref="bodyEl" class="flex-1 overflow-y-auto">
          <!-- 使用说明 -->
          <div class="border-b dark:border-b-[#2e2e2e] border-b-slate-200 border-b">
            <div
              class="flex items-center justify-between px-4 py-1 cursor-pointer select-none dark:hover:bg-[#262626] hover:bg-slate-100 transition-colors"
              @click="toggleSection(0)"
            >
              <span class="text-[13px] font-medium dark:text-[#ececec] text-slate-700">使用说明</span>
              <div class="w-8 h-8 flex items-center justify-center">
                <svg
                  class="w-4 h-4 dark:text-[#6e6e6e] text-slate-400 transition-transform duration-300"
                  :class="{ 'rotate-180': usageOpen }"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
            </div>
            <div ref="usageBody" class="overflow-hidden">
              <div class="px-4 py-3 text-sm dark:text-[#a3a3a3] text-slate-600">
                <p
                  v-for="(line, i) in usageLines"
                  :key="i"
                  :class="lineClass(line, i)"
                  class="leading-relaxed break-words"
                >
                  {{ line.num ? line.num + '. ' : '' }}{{ line.text }}
                </p>
              </div>
            </div>
          </div>

          <!-- 版本记录：展开时列表最大高度为距抽屉底部的剩余空间，超出部分内部滚动 -->
          <div class="border-b dark:border-b-[#2e2e2e] border-b-slate-200 border-b">
            <div
              class="flex items-center justify-between px-4 py-1 cursor-pointer select-none dark:hover:bg-[#262626] hover:bg-slate-100 transition-colors"
              @click="toggleSection(1)"
            >
              <span class="text-[13px] font-medium dark:text-[#ececec] text-slate-700">版本记录</span>
              <div class="w-8 h-8 flex items-center justify-center">
                <svg
                  class="w-4 h-4 dark:text-[#6e6e6e] text-slate-400 transition-transform duration-300"
                  :class="{ 'rotate-180': versionsOpen }"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
            </div>
            <div ref="versionsBody" class="overflow-hidden">
              <div ref="versionsScroll" class="versions-scroll px-4 py-4">
                <div
                  v-for="v in versions"
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
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
  import { reactive,ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
  import { toggleHeight } from '../utils/helpers';
  import changelogRaw from '../../CHANGELOG.md?raw';

  const props =defineProps({
    visible: { type: Boolean, default: false }
  });

  defineEmits(['update:visible']);

  /**
   * 解析 CHANGELOG.md 为版本记录数组，避免「关于」与更新日志两处维护。
   * 格式约定：`## V2.0（当前）` 为版本标题（含「当前」标记），`- ` 为条目。
   */
  function parseChangelog(raw) {
    const versions = [];
    let entry = null;
    for (const line of raw.split(/\r?\n/)) {
      if (line.startsWith('## ')) {
        const title = line.slice(3).trim();
        entry = { version: title, current: title.includes('（当前）'), items: [] };
        versions.push(entry);
      } else if (entry && line.startsWith('- ')) {
        entry.items.push(line.slice(2).trim());
      }
    }
    return versions;
  }

  const versions = parseChangelog(changelogRaw);
  // 抽屉标题的版本号取自 CHANGELOG 的最新条目（去掉 V 前缀与「当前」标记）
  const version = (versions[0]?.version || '').replace('（当前）', '').replace(/^V/, '');

  const bodyEl = ref(null);
  const usageBody = ref(null);
  const versionsBody = ref(null);
  const versionsScroll = ref(null);
  // 手风琴状态：同一时间只展开一个分组
  const usageOpen = ref(false);
  const versionsOpen = ref(true);

  // 「使用说明」的序号渲染时按顺序派生，数据里无需手写
  const usageLines = computed(() => {
    let num = 0;
    return sections[0].lines.map(line => (line.bold ? line : { ...line, num: ++num }));
  });

  const sections = reactive([
    {
      title: '使用说明',
      lines: [
        { text: '支持粘贴或点击附件按钮上传图片/文件' },
        { text: '点击「深度思考」切换推理模型（需在服务端配置思考模型）' },
        { text: 'AI 配置（服务端 .env）', bold: true },
        { text: '必填：OPENAI_API_KEY、OPENAI_API_BASE、OPENAI_MODEL，缺失时不会发起 AI 请求' },
        { text: '可选：OPENAI_THINKING_MODEL、ENABLE_VISION、CORS_ORIGIN 等，完整项见 .env.example' },
        { text: '修改 .env 后需重启服务端生效' },
        { text: '对话与附件保存在本地（SQLite + uploads），API Key 仅存于服务端 .env' }
      ]
    },
    {
      title: '版本记录',
      versions
    }
  ]);

  watch(
    () => props.visible,
    val => {
      if (val) {
        nextTick(() => {
          initSectionHeights();
          updateVersionsMaxHeight();
        });
      }
    }
  );

  onMounted(() => {
    window.addEventListener('resize', updateVersionsMaxHeight);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('resize', updateVersionsMaxHeight);
  });

  // 手风琴：展开目标分组，若另一个开着则同时收起它
  function toggleSection(target) {
    if (target === 0) {
      usageOpen.value = !usageOpen.value;
      toggleHeight(usageBody.value, usageOpen.value);
      if (usageOpen.value && versionsOpen.value) {
        versionsOpen.value = false;
        toggleHeight(versionsBody.value, false);
      }
    } else {
      versionsOpen.value = !versionsOpen.value;
      toggleHeight(versionsBody.value, versionsOpen.value);
      if (versionsOpen.value && usageOpen.value) {
        usageOpen.value = false;
        toggleHeight(usageBody.value, false);
      }
    }
    // 收起/展开都会改变版本记录的可用高度，动画结束后重算
    setTimeout(updateVersionsMaxHeight, 320);
  }

  // 行样式：{ bold: true } 的行作为子标题加粗并与上下拉开间距
  function lineClass(line, i) {
    if (line && line.bold) {
      return ['mt-3', 'font-medium', 'dark:text-[#ececec]', 'text-slate-700'];
    }
    return i > 0 ? ['mt-1.5'] : [];
  }

  // 抽屉打开时按手风琴状态初始化分组体高度（收起的为 0）
  function initSectionHeights() {
    usageBody.value.style.height = usageOpen.value ? '' : '0px';
    versionsBody.value.style.height = versionsOpen.value ? '' : '0px';
  }

  // 版本记录列表的最大高度 = 距抽屉底部的剩余空间
  // （展开/收起与窗口尺寸变化都会改变该值，需重算）
  function updateVersionsMaxHeight() {
    const container = bodyEl.value;
    const list = versionsScroll.value;
    if (!container || !list) return;
    const available =
      container.getBoundingClientRect().bottom - list.getBoundingClientRect().top - 12;
    list.style.maxHeight = Math.max(160, Math.round(available)) + 'px';
  }
</script>

<style scoped>
  .versions-scroll {
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
