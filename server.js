const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

// 加载 .env 配置
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;
const BASE_PATH = process.env.BASE_PATH || '';   // 部署时设为 '/Near'

// ========== LongCat AI 配置 ==========
const LONGCAT_API_BASE = process.env.LONGCAT_API_BASE || 'https://api.longcat.chat/openai';
const LONGCAT_API_KEY  = process.env.LONGCAT_API_KEY || '';
const LONGCAT_MODEL    = process.env.LONGCAT_MODEL || 'LongCat-Flash-Chat';

// 中间件
app.use(cors());
app.use(express.json());

// 挂载静态资源和路由到子路径
if (BASE_PATH) {
  // 带子路径：所有路由和静态文件都在 /Near 之下
  app.use(BASE_PATH, express.static(path.join(__dirname, 'public')));
} else {
  app.use(express.static(path.join(__dirname, 'public')));
}

// uploads 路径（始终在根路径，供前端通过相对路径引用）
app.use(`${BASE_PATH}/uploads`, express.static(path.join(__dirname, 'uploads')));

// 确保上传目录存在
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 文件上传配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB 限制
});

// 持久化会话存储（JSON 文件）
const DATA_FILE = path.join(__dirname, 'data', 'conversations.json');
const dataDir = path.dirname(DATA_FILE);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

function loadConversations() {
  try {
    if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch (e) {
    console.warn('加载会话数据失败:', e.message);
  }
  return {};
}

function saveConversations() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(conversations, null, 2), 'utf-8');
}

let conversations = loadConversations();

// ========== API 路由 ==========
const apiRouter = express.Router();

// 获取所有会话（只返回有消息的）
apiRouter.get('/conversations', (req, res) => {
  const list = Object.values(conversations)
    .filter(c => c.messages.length > 0)
    .map(c => ({ id: c.id, title: c.title, createdAt: c.createdAt }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(list);
});

// 获取单个会话详情
apiRouter.get('/conversations/:id', (req, res) => {
  const conv = conversations[req.params.id];
  if (!conv) return res.status(404).json({ error: '会话不存在' });
  res.json(conv);
});

// 创建新会话
apiRouter.post('/conversations', (req, res) => {
  const id = uuidv4();
  conversations[id] = {
    id,
    title: '新的对话',
    messages: [],
    createdAt: new Date().toISOString()
  };
  saveConversations();
  res.status(201).json(conversations[id]);
});

// 删除会话
apiRouter.delete('/conversations/:id', (req, res) => {
  delete conversations[req.params.id];
  saveConversations();
  res.json({ success: true });
});

// 重命名会话
apiRouter.patch('/conversations/:id', (req, res) => {
  const conv = conversations[req.params.id];
  if (!conv) return res.status(404).json({ error: '会话不存在' });
  conv.title = req.body.title || conv.title;
  saveConversations();
  res.json(conv);
});

// 文件上传
apiRouter.post('/upload', upload.array('files', 5), (req, res) => {
  const files = req.files.map(f => ({
    id: uuidv4(),
    name: f.originalname,
    url: `${BASE_PATH}/uploads/${f.filename}`,
    size: f.size,
    type: f.mimetype
  }));
  res.json(files);
});

// AI 对话接口（流式调用 LongCat）
apiRouter.post('/chat', async (req, res) => {
  const { conversationId, message, attachments, model: reqModel } = req.body;

  // 根据前端传入的 model 决定使用的模型
  const useModel = reqModel || LONGCAT_MODEL;
  console.log(`[Chat] 使用模型: ${useModel}`);

  // 如果会话不存在，自动创建
  let conv = conversations[conversationId];
  if (!conv) {
    conv = {
      id: conversationId,
      title: '新的对话',
      messages: [],
      createdAt: new Date().toISOString()
    };
    conversations[conversationId] = conv;
  }

  // 保存用户消息
  const userMsg = {
    id: uuidv4(),
    role: 'user',
    content: message,
    attachments: attachments || [],
    timestamp: new Date().toISOString()
  };
  conv.messages.push(userMsg);

  // 更新会话标题（首次消息时）
  if (conv.messages.filter(m => m.role === 'user').length === 1) {
    let title = message.trim();
    if (!title && attachments && attachments.length > 0) {
      title = attachments.map(a => a.name).join(', ');
    }
    conv.title = (title || '新的对话').slice(0, 30) + ((title || '').length > 30 ? '...' : '');
  }

  // 设置 SSE 响应头（禁用所有层级的缓冲）
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // 禁用 Express/Node.js 的响应缓冲，确保数据立即推送到客户端
  res.flushHeaders();

  const aiMsgId = uuidv4();
  let fullContent = '';
  let fullReasoning = '';

  // 强制刷新缓冲区到 socket
  function flushResponse() {
    if (typeof res.flush === 'function') {
      res.flush();
    } else if (res.socket) {
      // 备选方案：通过底层 socket 刷新
      res.socket.uncork?.();
    }
  }

  try {
    // 构建发给 LongCat 的消息历史（最近 20 轮，控制上下文长度）
    const recentMessages = conv.messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-40)
      .map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      }));

    // 如果有附件，将附件信息拼入当前用户消息
    let userContent = message;
    if (attachments && attachments.length > 0) {
      const attInfo = attachments.map(a => `[附件: ${a.name}]`).join(' ');
      userContent += '\n\n' + attInfo;
    }
    // 更新最后一条 user 消息内容为带附件的版本
    if (recentMessages.length > 0 && recentMessages[recentMessages.length - 1].role === 'user') {
      recentMessages[recentMessages.length - 1].content = userContent;
    }

    // 调用 LongCat API（流式）
    const apiRes = await fetch(`${LONGCAT_API_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LONGCAT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: useModel,
        messages: recentMessages,
        max_tokens: 2048,
        temperature: 0.7,
        stream: true
      })
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      console.error('LongCat API 错误:', apiRes.status, errText);
      throw new Error(`AI 服务返回错误 (${apiRes.status})`);
    }

    // 读取 SSE 流并转发给客户端
    const reader = apiRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta;
          const content = delta?.content || '';
          const reasoning = delta?.reasoning_content || '';
          if (content) {
            fullContent += content;
          }
          if (reasoning) {
            fullReasoning += reasoning;
          }
          if (content || reasoning) {
            res.write(`data: ${JSON.stringify({ id: aiMsgId, content: fullContent, reasoning_content: fullReasoning, done: false })}\n\n`);
            flushResponse();
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
    }

    // 流结束，保存 AI 消息
    const aiMsg = {
      id: aiMsgId,
      role: 'assistant',
      content: fullContent,
      reasoning_content: fullReasoning || undefined,
      timestamp: new Date().toISOString()
    };
    conv.messages.push(aiMsg);
    saveConversations();

    res.write(`data: ${JSON.stringify({ id: aiMsgId, content: fullContent, reasoning_content: fullReasoning || undefined, done: true })}\n\n`);
    res.end();

  } catch (err) {
    console.error('LongCat 调用失败:', err.message);
    const errorMsg = `请求失败: ${err.message}`;
    res.write(`data: ${JSON.stringify({ id: aiMsgId, content: errorMsg, done: true, error: true })}\n\n`);
    res.end();
  }
});

// 挂载 API 路由到子路径
app.use(`${BASE_PATH}/api`, apiRouter);

// 子路径访问时：/Near -> 302 到 /Near/（确保静态文件正常加载）
if (BASE_PATH) {
  app.get(BASE_PATH, (req, res) => {
    res.redirect(301, req.originalUrl + '/');
  });
}

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 Near AI Assistant 服务已启动`);
  console.log(`   本地访问: http://localhost:${PORT}`);
  console.log(`   AI 模型:  ${LONGCAT_MODEL} (${LONGCAT_API_BASE})`);
  if (!LONGCAT_API_KEY) {
    console.warn('   ⚠️  未设置 LONGCAT_API_KEY，AI 调用将失败');
    console.warn('      请设置环境变量或在 .env 中配置 API Key');
  } else {
    console.log('   ✓ API Key 已配置');
  }
});
