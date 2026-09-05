const express = require('express')
const fs = require('fs')
const path = require('path')
const router = express.Router()
const prisma = require('../prisma')
const config = require('../config')
const { v4: uuidv4 } = require('uuid')

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'public', 'uploads')
const MAX_CONTEXT_MESSAGES = Number(process.env.MAX_CONTEXT_MESSAGES) || 40
const MAX_TEXT_CHARS = 20000

const TEXT_EXT = new Set([
  '.txt', '.md', '.markdown', '.json', '.csv', '.log', '.xml', '.yaml', '.yml',
  '.js', '.ts', '.jsx', '.tsx', '.vue', '.py', '.java', '.go', '.rb', '.php',
  '.c', '.cpp', '.h', '.sql', '.sh', '.html', '.css', '.ini', '.toml', '.env'
])

function writeEvent(res, payload) {
  if (res.writableEnded || res.destroyed) return false
  try {
    res.write(`data: ${JSON.stringify(payload)}\n\n`)
    return true
  } catch (e) {
    return false
  }
}

function readTextAttachment(name, filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    const truncated = raw.length > MAX_TEXT_CHARS
    const body = truncated ? raw.slice(0, MAX_TEXT_CHARS) : raw
    const lang = path.extname(name).toLowerCase().replace('.', '') || 'text'
    return `\n\n[附件: ${name}]\n\`\`\`${lang}\n${body}${truncated ? '\n…（内容过长已截断）' : ''}\n\`\`\``
  } catch (e) {
    return `\n\n[附件: ${name}]（文件内容读取失败）`
  }
}

/**
 * 构造发给模型的 content：纯文本时返回字符串，含图片且开启视觉时返回多模态数组。
 */
function buildContent(text, attachments, withVision) {
  const list = attachments || []
  if (list.length === 0) return text || ''

  const blocks = []
  const images = []

  for (const att of list) {
    const filePath = path.join(UPLOAD_DIR, path.basename(att.url || ''))
    const exists = fs.existsSync(filePath)
    const isImage = typeof att.type === 'string' && att.type.startsWith('image/')

    if (isImage) {
      if (withVision && exists && att.size <= config.upload.visionMaxSize) {
        const base64 = fs.readFileSync(filePath).toString('base64')
        images.push({ type: 'image_url', image_url: { url: `data:${att.type};base64,${base64}` } })
      } else {
        blocks.push(`\n\n[附件: ${att.name}]（图片，未启用视觉能力）`)
      }
      continue
    }

    const ext = path.extname(att.name || '').toLowerCase()
    if (exists && TEXT_EXT.has(ext)) {
      blocks.push(readTextAttachment(att.name, filePath))
    } else {
      blocks.push(`\n\n[附件: ${att.name}]（该格式暂不支持内容解析）`)
    }
  }

  const combined = (text || '') + blocks.join('')

  if (images.length > 0) {
    const parts = []
    if (combined.trim()) parts.push({ type: 'text', text: combined })
    parts.push(...images)
    return parts
  }
  return combined
}

function touchConversation(conversationId) {
  return prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() }
  }).catch(() => {})
}

router.post('/', async (req, res) => {
  const { conversationId, message, attachments, model: reqModel } = req.body || {}

  if (!conversationId) {
    return res.status(400).json({ error: '缺少 conversationId' })
  }
  if (!config.ai.apiKey) {
    return res.status(500).json({ error: '服务端未配置 OPENAI_API_KEY，请在 .env 中填写后重启' })
  }

  // 只允许使用服务端配置过的模型，避免客户端任意指定模型
  const allowedModels = [config.ai.model, config.ai.thinkingModel].filter(Boolean)
  const useModel = allowedModels.includes(reqModel) ? reqModel : config.ai.model

  let conversation
  try {
    conversation = await prisma.conversation.findUnique({ where: { id: conversationId } })
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { id: conversationId, title: '新的对话' }
      })
    }

    await prisma.message.create({
      data: {
        role: 'user',
        content: message || '',
        conversationId,
        attachments: {
          create: (attachments || []).map(att => ({
            name: String(att.name || '').slice(0, 200),
            url: String(att.url || ''),
            size: Number(att.size) || 0,
            type: String(att.type || '')
          }))
        }
      }
    })
    await touchConversation(conversationId)
  } catch (error) {
    console.error('保存用户消息失败:', error)
    return res.status(500).json({ error: '保存消息失败' })
  }

  // 首条用户消息用来自动作标题
  try {
    const userMessageCount = await prisma.message.count({ where: { conversationId, role: 'user' } })
    if (userMessageCount === 1) {
      let title = String(message || '').trim().replace(/\s+/g, ' ')
      if (!title && Array.isArray(attachments) && attachments.length > 0) {
        title = attachments.map(a => a.name).join(', ')
      }
      if (title) {
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { title: title.length > 30 ? title.slice(0, 30) + '…' : title }
        })
      }
    }
  } catch (error) {
    console.error('生成会话标题失败:', error)
  }

  const aiMsgId = uuidv4()
  let fullContent = ''
  let fullReasoning = ''

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  if (typeof res.flushHeaders === 'function') res.flushHeaders()

  // 客户端断开连接（用户点击“停止生成”）：打标记并取消上游请求
  let aborted = false
  const upstreamController = new AbortController()
  res.on('close', () => {
    if (!res.writableEnded) {
      aborted = true
      upstreamController.abort()
    }
  })

  const saveAssistantMessage = async () => {
    if (!fullContent && !fullReasoning) return
    try {
      await prisma.message.create({
        data: {
          id: aiMsgId,
          role: 'assistant',
          content: fullContent,
          reasoningContent: fullReasoning || null,
          conversationId
        }
      })
      await touchConversation(conversationId)
    } catch (error) {
      console.error('保存助手消息失败:', error)
    }
  }

  try {
    // 取最近 N 条：先按时间倒序取，再翻转成正序
    const recentMessages = await prisma.message.findMany({
      where: { conversationId, role: { in: ['user', 'assistant'] } },
      orderBy: { timestamp: 'desc' },
      take: MAX_CONTEXT_MESSAGES,
      include: { attachments: true }
    })
    recentMessages.reverse()

    const messagesForAI = recentMessages
      .filter(m => m.role === 'user' || m.content)
      .map((m, index, arr) => {
        // 仅最后一条用户消息携带图片，节省 token
        const withVision = config.ai.enableVision && m.role === 'user' && index === arr.length - 1
        return {
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: buildContent(m.content, m.attachments, withVision)
        }
      })

    console.log(`[Chat] 模型 ${useModel}，上下文 ${messagesForAI.length} 条`)

    const isThinking =
      Boolean(config.ai.thinkingModel) && useModel === config.ai.thinkingModel

    const requestBody = {
      model: useModel,
      messages: messagesForAI,
      temperature: config.ai.temperature,
      stream: true
    }
    // 部分服务商需要通过参数开启思考（如 enable_thinking / reasoning_effort）
    if (isThinking && config.ai.thinkingParams) {
      Object.assign(requestBody, config.ai.thinkingParams)
    }

    const apiRes = await fetch(config.ai.chatUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.ai.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      signal: upstreamController.signal
    })

    if (!apiRes.ok) {
      const errText = await apiRes.text()
      console.error('AI 接口错误:', apiRes.status, errText.slice(0, 500))
      throw new Error(`AI 服务返回错误 (${apiRes.status}): ${errText.slice(0, 300)}`)
    }

    const reader = apiRes.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (!aborted) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (aborted) break
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data:')) continue
        const data = trimmed.slice(5).trim()
        if (data === '[DONE]') continue

        try {
          const parsed = JSON.parse(data)
          const delta = parsed.choices && parsed.choices[0] && parsed.choices[0].delta
          // 兼容不同厂商字段：reasoning_content / reasoning
          const content = (delta && delta.content) || ''
          const reasoning = (delta && (delta.reasoning_content || delta.reasoning)) || ''

          if (content) fullContent += content
          if (reasoning) fullReasoning += reasoning

          if (content || reasoning) {
            writeEvent(res, {
              id: aiMsgId,
              content: fullContent,
              reasoning_content: fullReasoning,
              done: false
            })
          }
        } catch (e) {
          // 忽略无法解析的分片
        }
      }
    }

    if (aborted) {
      // 用户中断：保留已生成的部分内容，保证上下文连续
      console.log('[Chat] 客户端中断生成')
      await saveAssistantMessage()
      return
    }

    await saveAssistantMessage()

    writeEvent(res, {
      id: aiMsgId,
      content: fullContent,
      reasoning_content: fullReasoning || undefined,
      done: true
    })
    res.end()
  } catch (error) {
    if (aborted || error.name === 'AbortError') {
      console.log('[Chat] 请求被中断')
      await saveAssistantMessage()
      return
    }

    console.error('聊天请求失败:', error)
    if (!res.headersSent) {
      return res.status(502).json({ error: error.message || 'AI 服务请求失败' })
    }
    writeEvent(res, {
      id: aiMsgId,
      content: `请求失败: ${error.message}`,
      done: true,
      error: true
    })
    if (!res.writableEnded) res.end()
  }
})

module.exports = router
