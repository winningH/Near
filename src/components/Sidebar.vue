<template>
  <div>
    <div
      v-if="isCollapsed"
      class="w-[52px] min-w-[52px] h-full dark:bg-[#161616] bg-slate-100 dark:border-[#2e2e2e] border-slate-200 border-r flex flex-col items-center py-3 gap-2"
    >
      <button
        class="w-9 h-9 rounded-lg flex items-center justify-center transition-colors dark:hover:bg-[#262626] dark:text-[#a3a3a3] dark:hover:text-[#ececec] hover:bg-slate-200 text-slate-500 hover:text-slate-700"
        title="展开侧边栏"
        @click="$emit('toggle')"
      >
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
      <button
        class="w-9 h-9 rounded-lg flex items-center justify-center transition-colors dark:hover:bg-[#262626] dark:text-[#a3a3a3] dark:hover:text-[#ececec] hover:bg-slate-200 text-slate-500 hover:text-slate-700"
        title="新的对话"
        @click="$emit('new-chat')"
      >
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>

    <aside
      v-else
      class="w-[280px] min-w-[280px] h-full dark:bg-[#161616] bg-slate-100 dark:border-[#2e2e2e] border-slate-200 border-r flex flex-col transition-all"
    >
      <div
        class="flex items-center justify-between px-4 py-3 dark:border-b-[#2e2e2e] border-b-slate-200 border-b"
      >
        <div class="flex items-center gap-2.5">
          <svg class="w-7 h-7 dark:text-[#6c63ff] text-indigo-500" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14" stroke="currentColor" stroke-width="2" />
            <circle cx="12" cy="14" r="2" fill="currentColor" />
            <circle cx="20" cy="14" r="2" fill="currentColor" />
            <path
              d="M11 20c1.5 2 6 2 7.5 0"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
          <span
            class="text-lg font-bold dark:bg-gradient-to-r dark:from-[#6c63ff] dark:to-[#a78bfa] bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent"
            >Near</span
          >
        </div>
        <div class="flex items-center gap-1">
          <ThemeToggle />
          <button
            class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors dark:hover:bg-[#262626] dark:text-[#a3a3a3] dark:hover:text-[#ececec] hover:bg-slate-200 text-slate-500 hover:text-slate-700"
            title="折叠侧边栏"
            @click="$emit('toggle')"
          >
            <svg
              class="w-[18px] h-[18px]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </div>
      </div>

      <button
        class="mx-3 mt-3 mb-2 px-3.5 py-2.5 rounded-xl flex items-center gap-2.5 transition-all dark:border-[#2e2e2e] dark:border dark:border-dashed dark:text-[#a3a3a3] dark:hover:border-[#6c63ff] dark:hover:text-[#6c63ff] dark:hover:bg-[rgba(108,99,255,0.08)] border-slate-300 border border-dashed text-slate-500 hover:border-indigo-500 hover:text-indigo-500 hover:bg-indigo-50 text-sm"
        @click="$emit('new-chat')"
      >
        <svg
          class="w-[18px] h-[18px]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        新的对话
      </button>

      <div class="flex-1 overflow-y-auto px-2 py-1">
        <div
          class="text-[11px] font-semibold dark:text-[#6e6e6e] text-slate-400 uppercase tracking-wider px-2 py-2"
        >
          对话历史
        </div>
        <div
          v-if="conversations.length === 0"
          class="text-center py-10 dark:text-[#6e6e6e] text-slate-400 text-sm"
        >
          暂无对话
        </div>
        <div v-else>
          <div v-for="group in groupedConversations" :key="group.ym">
            <div
              class="text-[11px] font-semibold dark:text-[#6e6e6e] text-slate-400 uppercase tracking-wider px-2 pt-3 pb-1"
            >
              {{ group.ym }}
            </div>
            <div class="flex flex-col">
              <div
                v-for="conv in group.items"
                :key="conv.id"
                class="group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-colors"
                :class="
                  currentId === conv.id
                    ? 'dark:bg-[#2e2e2e] bg-slate-200 dark:text-[#ececec] text-slate-800'
                    : 'dark:text-[#a3a3a3] text-slate-600 dark:hover:bg-[#262626] hover:bg-slate-200 dark:hover:text-[#ececec] hover:text-slate-800'
                "
                @click="$emit('select', conv.id)"
                @contextmenu.prevent="handleContextMenu($event, conv.id)"
              >
                <svg
                  class="w-[18px] h-[18px] flex-shrink-0 opacity-60"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
                <span class="flex-1 truncate text-[13px]">{{ conv.title }}</span>
                <!-- 操作按钮常驻占位，仅切换透明度：避免 hover 插入按钮引起标题回流抖动 -->
                <div
                  class="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity"
                >
                  <button
                    class="w-6 h-6 rounded flex items-center justify-center transition-colors dark:hover:bg-[#262626] dark:text-[#6e6e6e] dark:hover:text-[#ececec] hover:bg-slate-300 text-slate-400 hover:text-slate-700"
                    title="重命名"
                    @click.stop="handleRename(conv.id, conv.title)"
                  >
                    <svg
                      class="w-3.5 h-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    class="w-6 h-6 rounded flex items-center justify-center transition-colors dark:hover:bg-[#262626] dark:text-[#6e6e6e] dark:hover:text-red-400 hover:bg-slate-300 text-slate-400 hover:text-red-500"
                    title="删除"
                    @click.stop="$emit('delete', conv.id)"
                  >
                    <svg
                      class="w-3.5 h-3.5"
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
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="dark:border-t-[#2e2e2e] border-t-slate-200 border-t p-3">
        <div
          class="flex items-center gap-2.5 cursor-pointer rounded-lg p-1 -m-1 transition-colors dark:hover:bg-[#262626] hover:bg-slate-200"
          @click="$emit('user-info-click')"
        >
          <div
            class="w-8 h-8 rounded-full bg-gradient-to-br dark:from-[#6c63ff] dark:to-[#a78bfa] from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold"
          >
            N
          </div>
          <span class="text-[13px] dark:text-[#a3a3a3] text-slate-500">Near 用户</span>
        </div>
      </div>
    </aside>

    <div
      v-if="contextMenu"
      class="fixed dark:bg-[#222222] bg-white dark:border-[#2e2e2e] border-slate-200 border rounded-xl p-1 min-w-[160px] shadow-xl z-50"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
    >
      <button
        class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] transition-colors dark:text-[#a3a3a3] dark:hover:bg-[#262626] dark:hover:text-[#ececec] text-slate-600 hover:bg-slate-100 hover:text-slate-800"
        @click="onContextRename"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        重命名
      </button>
      <button
        class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] transition-colors dark:text-[#a3a3a3] dark:hover:bg-red-500/10 dark:hover:text-red-400 text-slate-600 hover:bg-red-50 hover:text-red-500"
        @click="onContextDelete"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3,6 5,6 21,6" />
          <path
            d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2"
          />
        </svg>
        删除对话
      </button>
    </div>

    <div
      v-if="renameModal"
      class="fixed inset-0 dark:bg-black/60 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100]"
    >
      <div
        class="dark:bg-[#222222] bg-white dark:border-[#2e2e2e] border-slate-200 border rounded-2xl p-6 w-[380px] shadow-2xl"
      >
        <h3 class="text-lg font-semibold dark:text-[#ececec] text-slate-800 mb-4">重命名对话</h3>
        <input
          v-model="newTitle"
          type="text"
          placeholder="输入新名称"
          class="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none transition-colors dark:bg-[#222222] dark:border-[#2e2e2e] dark:border dark:text-[#ececec] dark:placeholder-[#6e6e6e] dark:focus:border-[#6c63ff] bg-slate-50 border-slate-200 border text-slate-800 placeholder-slate-400 focus:border-indigo-500"
          autofocus
          @keydown.enter="confirmRename"
          @keydown.esc="renameModal = null"
        />
        <div class="flex justify-end gap-2 mt-4">
          <button
            class="px-5 py-2 rounded-lg text-sm font-medium transition-colors dark:bg-[#262626] dark:text-[#a3a3a3] dark:hover:bg-[#2e2e2e] dark:hover:text-[#ececec] bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800"
            @click="renameModal = null"
          >
            取消
          </button>
          <button
            class="px-5 py-2 rounded-lg text-sm font-medium transition-colors dark:bg-[#6c63ff] dark:text-white dark:hover:bg-[#7b73ff] bg-indigo-500 text-white hover:bg-indigo-600"
            @click="confirmRename"
          >
            确认
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
  import ThemeToggle from './ThemeToggle.vue';
  import { formatYearMonth } from '../utils/helpers';

  const props = defineProps({
    conversations: { type: Array, default: () => [] },
    currentId: { type: String, default: null },
    isCollapsed: { type: Boolean, default: false }
  });

  // 会话按月分组（yyyy-MM）。接口按 updatedAt 倒序返回，
  // 分组保持出现顺序：最新月份在最上，组内保持原排序
  const groupedConversations = computed(() => {
    const groups = [];
    const byMonth = new Map();
    for (const conv of props.conversations) {
      const ym = formatYearMonth(conv.updatedAt || conv.createdAt);
      let group = byMonth.get(ym);
      if (!group) {
        group = { ym, items: [] };
        byMonth.set(ym, group);
        groups.push(group);
      }
      group.items.push(conv);
    }
    return groups;
  });

  const emit = defineEmits([
    'toggle',
    'select',
    'new-chat',
    'delete',
    'rename',
    'user-info-click'
  ]);

  const contextMenu = ref(null);
  const renameModal = ref(null);
  const newTitle = ref('');

  onMounted(() => {
    document.addEventListener('click', closeContextMenu);
  });

  onBeforeUnmount(() => {
    document.removeEventListener('click', closeContextMenu);
  });

  function handleContextMenu(e, id) {
    contextMenu.value = { x: e.clientX, y: e.clientY, id };
  }

  function closeContextMenu() {
    contextMenu.value = null;
  }

  function handleRename(id, title) {
    renameModal.value = { id, title };
    newTitle.value = title;
  }

  function confirmRename() {
    if (renameModal.value && newTitle.value.trim()) {
      emit('rename', renameModal.value.id, newTitle.value.trim());
      renameModal.value = null;
    }
  }

  function onContextRename() {
    const conv = props.conversations.find(c => c.id === contextMenu.value.id);
    if (conv) handleRename(conv.id, conv.title);
    contextMenu.value = null;
  }

  function onContextDelete() {
    emit('delete', contextMenu.value.id);
    contextMenu.value = null;
  }
</script>
