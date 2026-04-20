// ========== Near AI Assistant 前端逻辑 ==========

const API_BASE = '/api';  // 相对路径，自动适配部署路径

// ========== 状态管理 ==========
const state = {
  conversations: [],
  currentConversationId: null,
  attachments: [],
  isStreaming: false,
  thinkMode: false,
  isNewChat: false,
  abortController: null,
  contextMenuConvId: null,
  renameConvId: null
};

// ========== DOM 元素 ==========
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

const els = {
  sidebar: $('#sidebar'),
  sidebarCollapsed: $('#sidebarCollapsed'),
  sidebarToggle: $('#sidebarToggle'),
  sidebarExpand: $('#sidebarExpand'),
  newChatBtn: $('#newChatBtn'),
  newChatCollapsed: $('#newChatCollapsed'),
  conversationList: $('#conversationList'),
  welcomeScreen: $('#welcomeScreen'),
  chatMessages: $('#chatMessages'),
  messageInput: $('#messageInput'),
  sendBtn: $('#sendBtn'),
  attachBtn: $('#attachBtn'),
  fileInput: $('#fileInput'),
  attachmentsPreview: $('#attachmentsPreview'),
  attachmentsScrollWrapper: $('#attachmentsScrollWrapper'),
  scrollLeftBtn: $('#scrollLeftBtn'),
  scrollRightBtn: $('#scrollRightBtn'),
  thinkBtn: $('#thinkBtn'),
  contextMenu: $('#contextMenu'),
  renameModal: $('#renameModal'),
  renameInput: $('#renameInput'),
  renameConfirm: $('#renameConfirm'),
  renameCancel: $('#renameCancel')
};

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', () => {
  loadConversations();
  bindEvents();
  autoResizeTextarea();
});

// ========== 事件绑定 ==========
function bindEvents() {
  // 侧边栏折叠
  els.sidebarToggle.addEventListener('click', toggleSidebar);
  els.sidebarExpand.addEventListener('click', toggleSidebar);

  // 新建对话
  els.newChatBtn.addEventListener('click', createNewChat);
  els.newChatCollapsed.addEventListener('click', createNewChat);

  // 发送消息
  els.sendBtn.addEventListener('click', handleSend);
  els.messageInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // 文件附件
  els.attachBtn.addEventListener('click', () => els.fileInput.click());
  els.fileInput.addEventListener('change', handleFileSelect);

  // 深度思考模式切换
  els.thinkBtn.addEventListener('click', () => {
    state.thinkMode = !state.thinkMode;
    els.thinkBtn.classList.toggle('active', state.thinkMode);
    els.thinkBtn.title = state.thinkMode ? '关闭深度思考' : '开启深度思考';
  });

  // 滚动箭头
  els.scrollLeftBtn.addEventListener('click', () => {
    els.attachmentsPreview.scrollBy({ left: -200, behavior: 'smooth' });
  });
  els.scrollRightBtn.addEventListener('click', () => {
    els.attachmentsPreview.scrollBy({ left: 200, behavior: 'smooth' });
  });

  // 粘贴图片（支持 Ctrl+V 粘贴截图/图片）
  els.messageInput.addEventListener('paste', handlePaste);

  // 快捷操作
  $$('.quick-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const prompt = btn.dataset.prompt;
      els.messageInput.value = prompt;
      updateSendButton();
      handleSend();
    });
  });

  // 右键菜单
  document.addEventListener('click', () => hideContextMenu());
  document.addEventListener('contextmenu', e => {
    const item = e.target.closest('.conversation-item');
    if (item) {
      e.preventDefault();
      showContextMenu(e, item.dataset.id);
    }
  });

  $$('.context-menu-item').forEach(item => {
    item.addEventListener('click', () => {
      const action = item.dataset.action;
      if (action === 'delete') deleteConversation(state.contextMenuConvId);
      if (action === 'rename') showRenameModal(state.contextMenuConvId);
      hideContextMenu();
    });
  });

  // 重命名弹窗
  els.renameConfirm.addEventListener('click', confirmRename);
  els.renameCancel.addEventListener('click', hideRenameModal);
  els.renameInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') confirmRename();
    if (e.key === 'Escape') hideRenameModal();
  });

  // 输入框自动调整
  els.messageInput.addEventListener('input', () => {
    autoResizeTextarea();
    updateSendButton();
  });

  // 思考块折叠/展开（事件委托）
  els.chatMessages.addEventListener('click', e => {
    const header = e.target.closest('.thinking-header');
    if (header) {
      header.parentElement.classList.toggle('collapsed');
    }
  });
}

// ========== 侧边栏 ==========
function toggleSidebar() {
  const isCollapsed = els.sidebar.classList.toggle('collapsed');
  els.sidebarCollapsed.classList.toggle('visible', isCollapsed);
}

// ========== 会话管理 ==========
async function loadConversations() {
  try {
    const res = await fetch(`${API_BASE}/conversations`);
    state.conversations = await res.json();
    renderConversationList();
  } catch (err) {
    console.error('加载会话失败:', err);
  }
}

function createNewChat() {
  // 不再立即创建服务端会话，只重置到欢迎页
  state.currentConversationId = null;
  state.isNewChat = true;
  showWelcome();
  // 清除列表高亮
  $$('.conversation-item').forEach(el => el.classList.remove('active'));
}

// 同步会话到历史列表（发送首条消息后调用）
async function syncConversationToList(convId) {
  const exists = state.conversations.find(c => c.id === convId);
  if (!exists) {
    try {
      const res = await fetch(`${API_BASE}/conversations/${convId}`);
      if (res.ok) {
        const conv = await res.json();
        state.conversations.unshift({ id: conv.id, title: conv.title, createdAt: conv.createdAt });
        renderConversationList();
      }
    } catch (err) {
      console.error('同步会话失败:', err);
    }
  }
}

async function switchConversation(id) {
  state.currentConversationId = id;

  // 更新列表高亮
  $$('.conversation-item').forEach(el => {
    el.classList.toggle('active', el.dataset.id === id);
  });

  // 加载消息
  try {
    const res = await fetch(`${API_BASE}/conversations/${id}`);
    const conv = await res.json();
    renderMessages(conv.messages);
  } catch (err) {
    console.error('加载消息失败:', err);
  }
}

async function deleteConversation(id) {
  try {
    await fetch(`${API_BASE}/conversations/${id}`, { method: 'DELETE' });
    state.conversations = state.conversations.filter(c => c.id !== id);

    if (state.currentConversationId === id) {
      state.currentConversationId = null;
      showWelcome();
    }

    renderConversationList();
  } catch (err) {
    console.error('删除会话失败:', err);
  }
}

// ========== 重命名 ==========
function showRenameModal(id) {
  state.renameConvId = id;
  const conv = state.conversations.find(c => c.id === id);
  if (conv) {
    els.renameInput.value = conv.title;
    els.renameModal.style.display = 'flex';
    els.renameInput.focus();
    els.renameInput.select();
  }
}

function hideRenameModal() {
  els.renameModal.style.display = 'none';
  state.renameConvId = null;
}

async function confirmRename() {
  const newTitle = els.renameInput.value.trim();
  if (!newTitle || !state.renameConvId) return;

  try {
    await fetch(`${API_BASE}/conversations/${state.renameConvId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle })
    });

    const conv = state.conversations.find(c => c.id === state.renameConvId);
    if (conv) conv.title = newTitle;
    renderConversationList();
    hideRenameModal();
  } catch (err) {
    console.error('重命名失败:', err);
  }
}

// ========== 右键菜单 ==========
function showContextMenu(e, id) {
  state.contextMenuConvId = id;
  const menu = els.contextMenu;
  menu.style.display = 'block';
  menu.style.left = e.clientX + 'px';
  menu.style.top = e.clientY + 'px';

  // 防止超出屏幕
  requestAnimationFrame(() => {
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      menu.style.left = e.clientX - rect.width + 'px';
    }
    if (rect.bottom > window.innerHeight) {
      menu.style.top = e.clientY - rect.height + 'px';
    }
  });
}

function hideContextMenu() {
  els.contextMenu.style.display = 'none';
}

// ========== 渲染会话列表 ==========
function renderConversationList() {
  const list = els.conversationList;
  if (state.conversations.length === 0) {
    list.innerHTML = '<div class="empty-state">暂无对话</div>';
    return;
  }

  list.innerHTML = state.conversations
    .map(conv => {
      const id = escapeAttr(conv.id);
      return `
    <div class="conversation-item ${conv.id === state.currentConversationId ? 'active' : ''}"
         data-id="${id}"
         onclick="switchConversation('${id}')">
      <svg class="conv-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
      <span class="conv-title">${escapeHtml(conv.title)}</span>
      <div class="conv-actions">
        <button class="conv-action-btn" onclick="event.stopPropagation(); showRenameModal('${id}')" title="重命名">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="conv-action-btn danger" onclick="event.stopPropagation(); deleteConversation('${id}')" title="删除">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  `;
    })
    .join('');
}

// ========== 渲染消息 ==========
function renderMessages(messages) {
  if (!messages || messages.length === 0) {
    showWelcome();
    return;
  }

  els.welcomeScreen.style.display = 'none';
  els.chatMessages.style.display = 'block';

  els.chatMessages.innerHTML = messages.map(msg => createMessageHTML(msg)).join('');
  scrollToBottom();
}

function showWelcome() {
  els.welcomeScreen.style.display = 'flex';
  els.chatMessages.style.display = 'none';
}

function createMessageHTML(msg) {
  const isUser = msg.role === 'user';
  const avatarContent = isUser ? 'U' : 'N';
  const roleName = isUser ? '你' : 'Near';

  let attachmentsHTML = '';
  if (msg.attachments && msg.attachments.length > 0) {
    attachmentsHTML =
      '<div class="message-attachments">' +
      msg.attachments
        .map(att => {
          if (att.type && att.type.startsWith('image/')) {
            return `<div class="attachment-item"><img src="${safeUrl(att.url)}" alt="${escapeHtml(att.name)}"></div>`;
          }
          return `<div class="attachment-item">
          <div class="file-icon">📄</div>
          <div class="file-info">
            <span class="file-name">${escapeHtml(att.name)}</span>
            <span class="file-size">${formatFileSize(att.size)}</span>
          </div>
        </div>`;
        })
        .join('') +
      '</div>';
  }

  const contentHTML = isUser
    ? escapeHtml(msg.content).replace(/\n/g, '<br>')
    : buildThinkingAndContent(msg.reasoning_content, msg.content);
  // 纯文件消息时，不渲染空内容气泡
  const contentDiv = msg.content ? `<div class="message-content">${contentHTML}</div>` : '';

  return `
    <div class="message ${msg.role}">
      <div class="message-inner">
        <div class="message-avatar">${avatarContent}</div>
        <div class="message-body">
          <div class="message-role">${roleName}</div>
          ${attachmentsHTML}
          ${contentDiv}
        </div>
      </div>
    </div>
  `;
}

// ========== 发送消息 ==========
async function handleSend() {
  // 如果正在流式输出，则中断
  if (state.isStreaming) {
    stopStreaming();
    return;
  }

  const message = els.messageInput.value.trim();
  if (!message && state.attachments.length === 0) return;

  // 如果没有当前会话，生成新会话ID
  if (!state.currentConversationId) {
    state.currentConversationId = generateId();
  }

  // 准备附件
  const attachments = [...state.attachments];

  // 清空输入
  els.messageInput.value = '';
  clearAttachments();
  autoResizeTextarea();
  updateSendButton();

  // 显示用户消息
  els.welcomeScreen.style.display = 'none';
  els.chatMessages.style.display = 'block';

  // 仅在新会话首条消息时清空残留内容
  if (state.isNewChat) {
    els.chatMessages.innerHTML = '';
    state.isNewChat = false;
  }

  const userMsg = {
    id: generateId(),
    role: 'user',
    content: message,
    attachments: attachments,
    timestamp: new Date().toISOString()
  };

  appendMessage(userMsg);

  // 添加 AI 占位消息
  const aiMsgEl = appendAIMessage();

  // 发送到服务器（流式）
  const model = state.thinkMode ? 'LongCat-Flash-Thinking-2601' : null;
  await streamChat(state.currentConversationId, message, attachments, aiMsgEl, model);
}

async function streamChat(conversationId, message, attachments, aiMsgEl, model) {
  state.isStreaming = true;
  state.abortController = new AbortController();
  updateSendButton();

  const contentEl = aiMsgEl.querySelector('.message-content');
  contentEl.innerHTML =
    '<div class="typing-indicator"><span></span><span></span><span></span></div>';

  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: state.abortController.signal,
      body: JSON.stringify({
        conversationId,
        message,
        attachments,
        model
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Chat API 错误响应:', res.status, errorText);
      throw new Error(`服务器返回错误: ${res.status}`);
    }

    if (!res.body) {
      throw new Error('浏览器不支持流式读取');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let fullReasoning = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });

      buffer += chunk;

      const lines = buffer.split('\n');

      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmed.slice(6));
            if (data.content !== undefined) fullContent = data.content;
            if (data.reasoning_content !== undefined) fullReasoning = data.reasoning_content;
            // 实时渲染（思考内容 + 回答内容）
            contentEl.innerHTML = buildThinkingAndContent(fullReasoning, fullContent);
            highlightCode(contentEl);
            scrollToBottom();
          } catch (e) {
            console.warn('SSE 解析异常:', e, trimmed);
          }
        }
      }
    }

    // 流结束后的最终渲染
    contentEl.innerHTML = buildThinkingAndContent(fullReasoning, fullContent);
    highlightCode(contentEl);
  } catch (err) {
    if (err.name === 'AbortError') {
      // 用户中断
      const currentText = contentEl.textContent || '';
      if (currentText) {
        contentEl.innerHTML = renderMarkdown(currentText + '\n\n*[已中断]*');
        highlightCode(contentEl);
      } else {
        contentEl.innerHTML = '<em style="color: var(--text-muted);">已中断生成</em>';
      }
    } else {
      console.error('聊天请求失败:', err);
      contentEl.innerHTML = `<em style="color: var(--danger);">请求失败: ${escapeHtml(err.message)}</em>`;
    }
  } finally {
    state.isStreaming = false;
    state.abortController = null;
    updateSendButton();

    // 将新会话加入历史列表
    await syncConversationToList(conversationId);
  }
}

function stopStreaming() {
  if (state.abortController) {
    state.abortController.abort();
  }
}

function appendMessage(msg) {
  const html = createMessageHTML(msg);
  els.chatMessages.insertAdjacentHTML('beforeend', html);
  scrollToBottom();
}

function appendAIMessage() {
  const uniqueId = 'ai-msg-' + generateId();
  const html = `
    <div class="message assistant" id="${uniqueId}">
      <div class="message-inner">
        <div class="message-avatar">N</div>
        <div class="message-body">
          <div class="message-role">Near</div>
          <div class="message-content">
            <div class="typing-indicator"><span></span><span></span><span></span></div>
          </div>
        </div>
      </div>
    </div>
  `;
  els.chatMessages.insertAdjacentHTML('beforeend', html);
  scrollToBottom();
  return document.getElementById(uniqueId);
}

// ========== 文件附件 ==========
async function handleFileSelect(e) {
  const files = Array.from(e.target.files);
  if (files.length === 0) return;

  const formData = new FormData();
  files.forEach(f => formData.append('files', f));

  try {
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData
    });
    const uploaded = await res.json();

    state.attachments.push(...uploaded);
    renderAttachmentsPreview();
    updateSendButton();
  } catch (err) {
    console.error('上传文件失败:', err);
  }

  // 清空 input 以允许重复选择
  e.target.value = '';
}

// 粘贴图片处理
async function handlePaste(e) {
  const items = Array.from(e.clipboardData?.items || []);
  const imageFiles = [];

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) imageFiles.push(file);
    }
  }

  if (imageFiles.length === 0) return;

  // 阻止默认粘贴行为（避免图片 base64 塞入输入框）
  e.preventDefault();

  // 上传粘贴的图片
  const formData = new FormData();
  imageFiles.forEach(f => formData.append('files', f));

  try {
    const res = await fetch(`${API_BASE}/upload`, { method: 'POST', body: formData });
    const uploaded = await res.json();
    state.attachments.push(...uploaded);
    renderAttachmentsPreview();
    updateSendButton();
  } catch (err) {
    console.error('粘贴图片上传失败:', err);
  }
}

function renderAttachmentsPreview() {
  if (state.attachments.length === 0) {
    els.attachmentsScrollWrapper.style.display = 'none';
    els.attachmentsPreview.style.display = 'none';
    return;
  }

  els.attachmentsScrollWrapper.style.display = 'block';
  els.attachmentsPreview.style.display = 'flex';
  els.attachmentsPreview.innerHTML = state.attachments
    .map((att, idx) => {
      if (att.type && att.type.startsWith('image/')) {
        return `
        <div class="preview-item image-preview" onclick="previewImage('${safeUrl(att.url)}')">
          <img src="${safeUrl(att.url)}" alt="${escapeHtml(att.name)}">
          <button class="preview-remove" onclick="event.stopPropagation(); removeAttachment(${idx})">×</button>
        </div>
      `;
      }
      return `
      <div class="preview-item">
        <span>📄 ${escapeHtml(att.name)}</span>
        <button class="preview-remove" onclick="removeAttachment(${idx})">×</button>
      </div>
    `;
    })
    .join('');

  // 检测是否需要显示滚动箭头
  requestAnimationFrame(() => checkScrollOverflow());
}

function checkScrollOverflow() {
  const el = els.attachmentsPreview;
  const wrapper = els.attachmentsScrollWrapper;
  if (!el || el.style.display === 'none') {
    wrapper.classList.remove('show-arrows');
    return;
  }
  // 滚动区域溢出时才显示箭头
  if (el.scrollWidth > el.clientWidth) {
    wrapper.classList.add('show-arrows');
  } else {
    wrapper.classList.remove('show-arrows');
  }
}

function removeAttachment(index) {
  state.attachments.splice(index, 1);
  renderAttachmentsPreview();
  updateSendButton();
}

function clearAttachments() {
  state.attachments = [];
  els.attachmentsScrollWrapper.style.display = 'none';
  els.attachmentsPreview.style.display = 'none';
  els.attachmentsPreview.innerHTML = '';
}

// ========== 图片预览灯箱 ==========
function previewImage(url) {
  // 创建/显示全屏预览
  let overlay = document.getElementById('imageLightbox');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'imageLightbox';
    overlay.className = 'lightbox-overlay';
    overlay.innerHTML = '<img class="lightbox-img" src="" alt="预览">';
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeImagePreview();
    });
    document.body.appendChild(overlay);
  }

  overlay.querySelector('.lightbox-img').src = url;
  overlay.style.display = 'flex';

  // ESC 关闭
  const onEsc = (e) => {
    if (e.key === 'Escape') { closeImagePreview(); document.removeEventListener('keydown', onEsc); }
  };
  document.addEventListener('keydown', onEsc);
}

function closeImagePreview() {
  const overlay = document.getElementById('imageLightbox');
  if (overlay) {
    overlay.style.display = 'none';
    overlay.querySelector('.lightbox-img').src = '';
  }
}

// ========== 辅助函数 ==========
function updateSendButton() {
  const hasContent = els.messageInput.value.trim() || state.attachments.length > 0;

  if (state.isStreaming) {
    els.sendBtn.disabled = false;
    els.sendBtn.classList.add('stopping');
    els.sendBtn.querySelector('.icon-send').style.display = 'none';
    els.sendBtn.querySelector('.icon-stop').style.display = 'block';
    els.sendBtn.title = '中断生成';
  } else {
    els.sendBtn.disabled = !hasContent;
    els.sendBtn.classList.remove('stopping');
    els.sendBtn.querySelector('.icon-send').style.display = 'block';
    els.sendBtn.querySelector('.icon-stop').style.display = 'none';
    els.sendBtn.title = '发送消息';
  }
}

function autoResizeTextarea() {
  const ta = els.messageInput;
  ta.style.height = 'auto';
  ta.style.height = Math.min(ta.scrollHeight, 150) + 'px';
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
  });
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// 转义插入到 HTML 属性中的值（防止引号逃逸）
function escapeAttr(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// 校验安全 URL（只允许 http(s): 和相对路径，阻止 javascript: / data:)
function safeUrl(url) {
  if (!url) return '';
  const trimmed = url.trim().toLowerCase();
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:')
  ) {
    return '';
  }
  return url;
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function generateId() {
  // 生成 UUID v4 格式，与后端一致
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ========== Markdown 渲染 ==========
// 允许的安全标签白名单
const SAFE_TAGS = new Set([
  'p',
  'br',
  'b',
  'i',
  'em',
  'strong',
  'u',
  's',
  'del',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'blockquote',
  'pre',
  'code',
  'a',
  'img',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'hr',
  'div',
  'span',
  'sup',
  'sub'
]);
const SAFE_ATTRS = new Set(['href', 'src', 'alt', 'title', 'class', 'id']);

function sanitizeHTML(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;

  // 递归清理节点
  function clean(node) {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        // 移除不在白名单中的标签（保留内容）
        if (!SAFE_TAGS.has(child.tagName.toLowerCase())) {
          const frag = document.createDocumentFragment();
          while (child.firstChild) frag.appendChild(child.firstChild);
          node.replaceChild(frag, child);
          continue;
        }
        // 清理属性：只保留安全属性，并校验 href/src 协议
        for (const attr of Array.from(child.attributes)) {
          if (!SAFE_ATTRS.has(attr.name.toLowerCase())) {
            child.removeAttribute(attr.name);
          }
          // 阻止 javascript: / data: / vbscript: 协议
          const val = attr.value.trim().toLowerCase();
          if (
            (attr.name === 'href' || attr.name === 'src') &&
            (val.startsWith('javascript:') ||
              val.startsWith('data:') ||
              val.startsWith('vbscript:'))
          ) {
            child.removeAttribute(attr.name);
          }
        }
        clean(child); // 递归处理子节点
      }
      // 移除 script / style 等危险文本节点（通过标签已处理）
    }
  }

  clean(tmp);
  return tmp.innerHTML;
}

function renderMarkdown(text) {
  if (!text) return '';
  try {
    marked.setOptions({
      breaks: true,
      gfm: true,
      highlight: function (code, lang) {
        if (lang && hljs.getLanguage(lang)) {
          return hljs.highlight(code, { language: lang }).value;
        }
        return hljs.highlightAuto(code).value;
      }
    });
    return sanitizeHTML(marked.parse(text));
  } catch (e) {
    return escapeHtml(text).replace(/\n/g, '<br>');
  }
}

function highlightCode(container) {
  container.querySelectorAll('pre code').forEach(block => {
    hljs.highlightElement(block);
  });
}

// 构建思考内容 + 正式回答的 HTML
function buildThinkingAndContent(reasoning, content) {
  let html = '';
  if (reasoning && reasoning.trim()) {
    html += `<div class="thinking-block">
      <div class="thinking-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
        <span>深度思考</span>
      </div>
      <div class="thinking-body">${renderMarkdown(reasoning)}</div>
    </div>`;
  }
  if (content && content.trim()) {
    html += `<div class="answer-content">${renderMarkdown(content)}</div>`;
  }
  return html;
}
