const express = require('express')
const fs = require('fs')
const path = require('path')
const router = express.Router()
const prisma = require('../prisma')
const config = require('../config')
const { v4: uuidv4 } = require('uuid')
const { resolveUploadPath } = require('../uploadPath')

const MAX_CONTEXT_MESSAGES = Number(process.env.MAX_CONTEXT_MESSAGES) || 40
const MAX_TEXT_CHARS = 20000

// 继续生成的指令：让模型从被中断的回复处直接续写，不重复已有内容
const CONTINUE_PROMPT =
  '你上一条回复被用户中断了。请从中断处直接继续输出剩余内容，保持连贯，不要重复已有内容，也不要添加任何前缀或说明。'

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
    // 兼容历史根目录文件与按月分目录（yyyyMM）的新文件；非法/越界 URL 视为不存在
    const filePath = resolveUploadPath(att.url)
    const exists = !!filePath && fs.existsSync(filePath)
    const isImage = typeof att.type === 'string' && att.type.startsWith('image/')

    if (isImage) {
      if (withVision && exists && att.size <= config.upload.visionMaxSize) {
        const base64 = fs.readFileSync(filePath).toString('base64')
        images.push({ type: 'image_url', image_url: { url: `data:${att.type};base64,${base64}` } })
      } else {
        blocks.push(`\n\n[附件: ${att.name}]（图片，当前模型不支持视觉，无法读取其内容）`)
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

/**
 * 首轮即失败时回滚：会话里只剩这条没有回复的用户消息时不留历史，
 * 避免反复报错在侧边栏堆积空会话。count>1 说明是中途失败，保留上下文。
 * 返回是否发生了回滚，供前端区分：回滚的消息仅存于本地界面，不刷新消息列表。
 */
async function rollbackIfFirstRoundFailure(conversationId) {
  try {
    const count = await prisma.message.count({ where: { conversationId } })
    if (count === 1) {
      await prisma.conversation.delete({ where: { id: conversationId } })
      console.log('[Chat] 首轮失败，已回滚会话')
      return true
    }
  } catch (e) {
    console.error('回滚首轮失败会话:', e)
  }
  return false
}

/**
 * 首轮对话成功后，让模型把对话总结成简短标题，替换掉临时的“用户输入/文件名”标题。
 * 失败时静默保留临时标题，不影响主流程。
 */
async function generateAiTitle(conversationId, source) {
  try {
    const res = await fetch(config.ai.chatUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.ai.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.ai.model,
        messages: [
          {
            role: 'system',
            content: '你是会话标题生成器。根据对话内容生成一个简短标题，要求：不超过16个字，概括主题，直接输出标题本身，不要引号、句号或其他任何多余文字。'
          },
          { role: 'user', content: String(source || '').slice(0, 800) }
        ],
        temperature: 0.3,
        stream: false,
        max_tokens: 512,
        // 思考模型（如 glm-4.5-air）会先输出 reasoning_content，小 max_tokens 会被思考耗尽，
        // 复用应用级的思考关闭参数让标题直接出结果
        ...(config.ai.thinkingOffParams || {})
      }),
      signal: AbortSignal.timeout(15000)
    })
    if (!res.ok) {
      console.warn('[Chat] 标题生成请求失败:', res.status, (await res.text()).slice(0, 200))
      return
    }
    const data = await res.json()
    const message = data.choices && data.choices[0] && data.choices[0].message
    const raw = String((message && (message.content || message.reasoning_content)) || '')
    const title = raw.trim().replace(/\s+/g, ' ').slice(0, 30)
    if (title) {
      await prisma.conversation.update({ where: { id: conversationId }, data: { title } })
    }
  } catch (e) {
    console.warn('[Chat] 生成会话标题失败:', e.message)
  }
}

router.post('/', async (req, res) => {
  const { conversationId, message, attachments, model: reqModel, thinkMode, continue: isContinue } = req.body || {}

  if (!conversationId) {
    return res.status(400).json({ error: '缺少 conversationId' })
  }
  // 配置不全时直接返回：不落库、不发起任何 AI 请求
  if (!config.aiConfigured) {
    return res.status(500).json({
      error: `服务端缺少必填配置：${config.missing.join('、')}，请检查 .env 后重启`
    })
  }

  // 只允许使用服务端配置过的模型，避免客户端任意指定模型
  const allowedModels = [config.ai.model, config.ai.thinkingModel].filter(Boolean)

  // 是否开启深度思考：以【前端开关】为准，而非模型名匹配。
  // 必须服务端配置过思考模型，开关才生效。
  // 继续生成不开启思考：思考针对的是原始任务，续写只需接上内容
  const wantThink = Boolean(thinkMode)
  const isThinking = wantThink && Boolean(config.ai.thinkingModel) && !isContinue

  const useModel =
    (reqModel && allowedModels.includes(reqModel))
      ? reqModel
      : (isThinking && config.ai.thinkingModel ? config.ai.thinkingModel : config.ai.model)

  // 继续生成：定位最近一条被中断的助手消息，续写内容将合并回该消息
  let continueTarget = null
  if (isContinue) {
    continueTarget = await prisma.message.findFirst({
      where: { conversationId, role: 'assistant', interrupted: true },
      orderBy: { timestamp: 'desc' }
    })
    if (!continueTarget) {
      return res.status(400).json({ error: '没有可继续生成的中断回复' })
    }
  }

  let conversation
  try {
    conversation = await prisma.conversation.findUnique({ where: { id: conversationId } })
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { id: conversationId, title: '新的对话' }
      })
    }

    // 继续生成：不落库新的用户消息，仅以现有上下文（含被中断的部分回复）请求续写
    if (!isContinue) {
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
    }
  } catch (error) {
    console.error('保存用户消息失败:', error)
    return res.status(500).json({ error: '保存消息失败' })
  }

  // 首条用户消息用来自动作标题（临时标题，首轮回复成功后会被 AI 总结替换）
  let isFirstRound = false
  let titleSource = String(message || '').trim().replace(/\s+/g, ' ')
  if (!titleSource && Array.isArray(attachments) && attachments.length > 0) {
    titleSource = attachments.map(a => a.name).join(', ')
  }
  if (!isContinue) {
    try {
      const userMessageCount = await prisma.message.count({ where: { conversationId, role: 'user' } })
      if (userMessageCount === 1) {
        isFirstRound = true
        if (titleSource) {
          await prisma.conversation.update({
            where: { id: conversationId },
            data: { title: titleSource.length > 30 ? titleSource.slice(0, 30) + '…' : titleSource }
          })
        }
      }
    } catch (error) {
      console.error('生成会话标题失败:', error)
    }
  }

  // 继续生成时沿用被中断原消息的 id，SSE 事件与最终落库都对应到同一条回复
  const aiMsgId = continueTarget ? continueTarget.id : uuidv4()
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

  // 保存助手消息：续写模式把新内容追加回被中断的原消息（完成后清除中断标记），
  // 原文为空时整体替换；中断时保留 interrupted 标记以便再次续写；普通模式新建消息
  const saveAssistantMessage = async (interrupted = false) => {
    if (!fullContent && !fullReasoning) return
    try {
      if (continueTarget) {
        const origin = await prisma.message.findUnique({ where: { id: continueTarget.id } })
        const appending = !!(origin.content && fullContent)
        await prisma.message.update({
          where: { id: continueTarget.id },
          data: {
            content: appending ? (origin.content || '') + fullContent : (fullContent || origin.content || ''),
            reasoningContent: appending
              ? ((origin.reasoningContent || '') + fullReasoning) || null
              : fullReasoning || origin.reasoningContent || null,
            interrupted
          }
        })
      } else {
        await prisma.message.create({
          data: {
            id: aiMsgId,
            role: 'assistant',
            content: fullContent,
            reasoningContent: fullReasoning || null,
            interrupted,
            conversationId
          }
        })
      }
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

    const buildMessages = withVision =>
      recentMessages
        .filter(m => m.role === 'user' || m.content)
        .map((m, index, arr) => {
          // 仅最后一条用户消息携带图片，节省 token
          const useVision = withVision && config.ai.enableVision && m.role === 'user' && index === arr.length - 1
          return {
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: buildContent(m.content, m.attachments, useVision)
          }
        })

    let messagesForAI = buildMessages(true)

    // 继续生成：在上下文末尾追加续写指令，让模型从被中断的回复处直接续写；
    // 原文为空（仅思考内容被中断）时改为重新完整回答
    if (isContinue) {
      const prompt = continueTarget.content
        ? CONTINUE_PROMPT
        : '你刚才的回答还没有输出就被中断了。请重新完整地回答用户最初的问题。'
      messagesForAI = [...messagesForAI, { role: 'user', content: prompt }]
    }

    console.log(`[Chat] 模型 ${useModel}，上下文 ${messagesForAI.length} 条${isContinue ? '（继续生成）' : ''}`)

    const requestBody = {
      model: useModel,
      temperature: config.ai.temperature,
      stream: true
    }
    // 未勾选深度思考时，附加显式关闭参数（如智谱 {"thinking":{"type":"disabled"}}）。
    // 智谱等接口拒绝 boolean 形式（传 thinking:false 会 400），必须用对象。
    // 勾选时依赖模型默认行为（GLM-4.5 等推理模型默认即思考），无需附加任何参数。
    if (!isThinking && config.ai.thinkingOffParams) {
      Object.assign(requestBody, config.ai.thinkingOffParams)
    }

    const callChatApi = () =>
      fetch(config.ai.chatUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.ai.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...requestBody, messages: messagesForAI }),
        signal: upstreamController.signal
      })

    let apiRes = await callChatApi()

    // 纯文本模型收到 image_url 多模态内容会报 400（如智谱 1210 "content.type 参数非法"）。
    // 此时去掉图片降级为纯文本重试一次，保证消息流程不中断
    if (!apiRes.ok && apiRes.status === 400 && messagesForAI.some(m => Array.isArray(m.content))) {
      const firstError = await apiRes.text()
      console.warn('[Chat] 模型不支持图片输入，降级为纯文本重试。原始错误:', firstError.slice(0, 300))
      messagesForAI = buildMessages(false)
      apiRes = await callChatApi()
    }

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
      // 用户中断：保留已生成的部分内容并打上中断标记，保证上下文连续且可「继续生成」
      console.log('[Chat] 客户端中断生成')
      await saveAssistantMessage(true)
      // 一个字都没生成就中断的首轮，同样不留空会话
      if (!fullContent && !fullReasoning) await rollbackIfFirstRoundFailure(conversationId)
      return
    }

    await saveAssistantMessage()

    // 首轮对话成功：用模型总结标题（等它完成再发 done，前端刷新侧边栏就能拿到新标题）
    if (isFirstRound) {
      await generateAiTitle(conversationId, `用户：${titleSource || '（发送了附件）'}\n助手：${fullContent}`)
    }

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
      await saveAssistantMessage(true)
      if (!fullContent && !fullReasoning) await rollbackIfFirstRoundFailure(conversationId)
      return
    }

    console.error('聊天请求失败:', error)
    // 先落库已生成的部分内容（与用户中断的行为一致），避免界面重载后丢失
    await saveAssistantMessage()
    // 首轮就报错：回滚用户消息与会话，不进历史记录
    const rolledBack = await rollbackIfFirstRoundFailure(conversationId)
    if (!res.headersSent) {
      return res.status(502).json({ error: error.message || 'AI 服务请求失败', rolledBack })
    }
    writeEvent(res, {
      id: aiMsgId,
      content: `请求失败: ${error.message}`,
      done: true,
      error: true,
      rolledBack
    })
    if (!res.writableEnded) res.end()
  }
})

module.exports = router
