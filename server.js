const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 4000;

// 中间件
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

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

// 获取所有会话（只返回有消息的）
app.get('/api/conversations', (req, res) => {
  const list = Object.values(conversations)
    .filter(c => c.messages.length > 0)
    .map(c => ({ id: c.id, title: c.title, createdAt: c.createdAt }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(list);
});

// 获取单个会话详情
app.get('/api/conversations/:id', (req, res) => {
  const conv = conversations[req.params.id];
  if (!conv) return res.status(404).json({ error: '会话不存在' });
  res.json(conv);
});

// 创建新会话
app.post('/api/conversations', (req, res) => {
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
app.delete('/api/conversations/:id', (req, res) => {
  delete conversations[req.params.id];
  saveConversations();
  res.json({ success: true });
});

// 重命名会话
app.patch('/api/conversations/:id', (req, res) => {
  const conv = conversations[req.params.id];
  if (!conv) return res.status(404).json({ error: '会话不存在' });
  conv.title = req.body.title || conv.title;
  saveConversations();
  res.json(conv);
});

// 文件上传
app.post('/api/upload', upload.array('files', 5), (req, res) => {
  const files = req.files.map(f => ({
    id: uuidv4(),
    name: f.originalname,
    url: `/uploads/${f.filename}`,
    size: f.size,
    type: f.mimetype
  }));
  res.json(files);
});

// AI 对话接口（流式响应模拟）
app.post('/api/chat', (req, res) => {
  const { conversationId, message, attachments } = req.body;

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

  // 生成 AI 回复
  const aiReply = generateAIResponse(message, attachments);

  // 直接通过 socket 写入 SSE 流（绕过 Express 缓冲问题）
  const socket = res.socket;
  const headers = [
    'HTTP/1.1 200 OK',
    'Content-Type: text/event-stream',
    'Cache-Control: no-cache',
    'Connection: keep-alive',
    'X-Accel-Buffering: no',
    'Access-Control-Allow-Origin: *',
    'X-Powered-By: Express',
    '',
    ''
  ].join('\r\n');
  socket.write(headers);

  const aiMsgId = uuidv4();
  let fullContent = '';
  let index = 0;
  const chars = aiReply.split('');

  // 使用 setInterval 逐字发送
  const intervalId = setInterval(() => {
    if (index < chars.length) {
      const chunkSize = Math.min(Math.floor(Math.random() * 3) + 1, chars.length - index);
      const chunk = chars.slice(index, index + chunkSize).join('');
      fullContent += chunk;
      index += chunkSize;

      socket.write(
        `data: ${JSON.stringify({ id: aiMsgId, content: fullContent, done: false })}\n\n`
      );
    } else {
      clearInterval(intervalId);

      // 保存 AI 消息
      const aiMsg = {
        id: aiMsgId,
        role: 'assistant',
        content: fullContent,
        timestamp: new Date().toISOString()
      };
      conv.messages.push(aiMsg);
      saveConversations();

      socket.write(
        `data: ${JSON.stringify({ id: aiMsgId, content: fullContent, done: true })}\n\n`
      );
      socket.end();
    }
  }, 30);

  // 处理客户端中断
  socket.on('close', () => {
    clearInterval(intervalId);
  });
});

// ========== AI 回复生成（模拟） ==========

function generateAIResponse(message, attachments) {
  const lowerMsg = message.toLowerCase();

  // 附件处理
  if (attachments && attachments.length > 0) {
    const fileNames = attachments.map(a => a.name).join('、');
    return `我已收到您上传的文件：${fileNames}。\n\n感谢您的分享！目前我是模拟 AI 助手，暂时无法深入分析文件内容。在接入真实的 AI 模型后，我将能够为您：\n\n1. **分析文档内容** - 提取关键信息和摘要\n2. **处理图片** - 识别图片中的内容和文字\n3. **解析数据文件** - 帮您理解和分析数据\n\n请问您希望我对这些文件做什么？`;
  }

  // 基于关键词的智能回复
  if (lowerMsg.includes('你好') || lowerMsg.includes('hello') || lowerMsg.includes('hi')) {
    // return '你好！👋 我是 **Near**，您的 AI 助手。\n\n我可以帮助您：\n- 💬 回答各种问题\n- 📝 撰写和编辑文本\n- 💡 提供创意和建议\n- 🔍 分析和总结信息\n\n有什么我可以帮您的吗？';
    return '你好！我是AI 助手';
  }

  if (lowerMsg.includes('你是谁') || lowerMsg.includes('介绍')) {
    return '我是 **Near**，一个 AI 智能助手。\n\n### 关于我\n- 🤖 我是一个基于大语言模型的 AI 助手\n- 🎯 我的目标是帮助您解决问题、提高效率\n- 💡 我可以处理文本、代码、创意等多种任务\n- 🔄 我会持续学习和改进\n\n目前我处于演示模式，回复内容为预设模拟。接入真实 AI 模型后，我将能够提供更加智能和精准的服务。';
  }

  if (lowerMsg.includes('代码') || lowerMsg.includes('编程') || lowerMsg.includes('code')) {
    return '当然可以帮您处理编程相关的问题！💻\n\n我支持多种编程语言，包括但不限于：\n\n| 语言 | 擅长领域 |\n|------|----------|\n| JavaScript/TypeScript | 前端、Node.js |\n| Python | 数据科学、AI |\n| Java | 后端服务 |\n| Go | 高性能服务 |\n| Rust | 系统编程 |\n\n请告诉我您具体需要什么帮助，比如：\n- 编写特定功能的代码\n- 调试和修复 bug\n- 代码优化建议\n- 算法实现\n\n我会尽力为您提供高质量的代码和解释！';
  }

  if (
    lowerMsg.includes('写') &&
    (lowerMsg.includes('文章') || lowerMsg.includes('文案') || lowerMsg.includes('邮件'))
  ) {
    return '好的，我可以帮您撰写各类文本内容！✍️\n\n请告诉我以下信息，以便我更好地为您服务：\n\n1. **文本类型** - 文章、文案、邮件、报告等\n2. **主题内容** - 您想写什么\n3. **风格要求** - 正式、轻松、专业等\n4. **字数要求** - 大概的篇幅\n5. **目标受众** - 面向谁\n\n有了这些信息，我就能为您生成高质量的文本内容了！';
  }

  if (lowerMsg.includes('翻译')) {
    return '我可以帮您进行多语言翻译！🌍\n\n支持的语言包括：\n- 🇨🇳 中文 ↔ 🇺🇸 英语\n- 🇨🇳 中文 ↔ 🇯🇵 日语\n- 🇨🇳 中文 ↔ 🇰🇷 韩语\n- 🇨🇳 中文 ↔ 🇫🇷 法语\n- 🇨🇳 中文 ↔ 🇩🇪 德语\n- 以及更多语言...\n\n请直接发送您需要翻译的内容，并告诉我目标语言即可！';
  }

  // 默认回复
  const responses = [
    `感谢您的提问！这是一个很好的问题。\n\n关于"${message.slice(0, 20)}"，我有以下思考：\n\n1. **理解需求** - 我需要更全面地了解您的具体需求\n2. **提供方案** - 基于我的知识，我可以提供多个角度的分析\n3. **持续互动** - 我们可以进一步深入讨论\n\n目前我是模拟 AI 助手，接入真实模型后将提供更精准的回答。您还有什么想了解的吗？`,

    `您提出了一个有趣的话题！🤔\n\n关于这个问题，我建议我们可以从以下几个方面来思考：\n\n### 分析\n- 首先需要明确问题的核心要点\n- 其次考虑不同角度的可能方案\n- 最后评估各方案的优劣\n\n### 建议\n我建议您可以从最基础的部分开始，逐步深入。如果有具体的问题或困惑，随时告诉我，我会尽力帮助您！\n\n> 💡 提示：更具体的问题通常能获得更有针对性的回答。`,

    `好的，让我来帮您分析一下这个问题。📚\n\n**核心要点：**\n您提到的内容涉及多个层面，让我逐一分析：\n\n1. 从**实用性**角度来看，这是值得关注的\n2. 从**创新性**角度来看，也有很大的探索空间\n3. 从**可行性**角度来看，需要考虑具体条件\n\n如果您能提供更多细节，我可以给出更有针对性的建议。期待您的进一步说明！`
  ];

  return responses[Math.floor(Math.random() * responses.length)];
}

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 Near AI Assistant 服务已启动`);
  console.log(`   本地访问: http://localhost:${PORT}`);
});
