const API_BASE = '/api';

export async function fetchConfig() {
  const res = await fetch(`${API_BASE}/config`);
  if (!res.ok) throw new Error('获取运行配置失败');
  return res.json();
}

export async function fetchConversations() {
  const res = await fetch(`${API_BASE}/conversations`);
  if (!res.ok) throw new Error('获取对话列表失败');
  return res.json();
}

export async function fetchConversation(id) {
  const res = await fetch(`${API_BASE}/conversations/${id}`);
  if (!res.ok) throw new Error('获取对话详情失败');
  return res.json();
}

export async function createConversation() {
  const res = await fetch(`${API_BASE}/conversations`, { method: 'POST' });
  if (!res.ok) throw new Error('创建对话失败');
  return res.json();
}

export async function renameConversation(id, title) {
  const res = await fetch(`${API_BASE}/conversations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  });
  if (!res.ok) throw new Error('重命名失败');
  return res.json();
}

export async function deleteConversation(id) {
  const res = await fetch(`${API_BASE}/conversations/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('删除对话失败');
  return res.json();
}

export async function uploadFiles(formData) {
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) throw new Error('上传失败');
  return res.json();
}

export function deleteUploadedFile(url) {
  const filename = String(url || '').split('/').pop();
  if (!filename) return Promise.resolve();
  return fetch(`${API_BASE}/upload/${encodeURIComponent(filename)}`, { method: 'DELETE' })
    .then(res => {
      if (!res.ok) throw new Error('删除文件失败');
      return res.json();
    });
}

export function chatStream(conversationId, message, attachments, model, thinkMode, signal) {
  return fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId, message, attachments, model, thinkMode }),
    signal
  });
}
