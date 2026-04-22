import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

const LONGCAT_API_BASE = process.env.LONGCAT_API_BASE || 'https://api.longcat.chat/openai';
const LONGCAT_API_KEY = process.env.LONGCAT_API_KEY || '';
const LONGCAT_MODEL = process.env.LONGCAT_MODEL || 'LongCat-Flash-Chat';

export async function POST(request: NextRequest) {
  const { conversationId, message, attachments, model: reqModel } = await request.json();

  const useModel = reqModel || LONGCAT_MODEL;
  console.log(`[Chat] 使用模型: ${useModel}`);

  // 查找或创建会话
  let conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { messages: true }
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        id: conversationId,
        title: '新的对话',
      },
      include: { messages: true }
    });
  }

  // 保存用户消息
  const userMsg = await prisma.message.create({
    data: {
      role: 'user',
      content: message,
      conversationId: conversationId,
      attachments: {
        create: attachments?.map((att: any) => ({
          name: att.name,
          url: att.url,
          size: att.size,
          type: att.type,
        })) || []
      }
    },
    include: { attachments: true }
  });

  // 更新会话标题（首次消息时）
  const userMessageCount = await prisma.message.count({
    where: {
      conversationId: conversationId,
      role: 'user'
    }
  });

  if (userMessageCount === 1) {
    let title = message.trim();
    if (!title && attachments && attachments.length > 0) {
      title = attachments.map((a: any) => a.name).join(', ');
    }
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        title: (title || '新的对话').slice(0, 30) + ((title || '').length > 30 ? '...' : '')
      }
    });
  }

  // 创建流式响应
  const encoder = new TextEncoder();
  const aiMsgId = uuidv4();
  let fullContent = '';
  let fullReasoning = '';

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 获取最近的消息历史
        const recentMessages = await prisma.message.findMany({
          where: {
            conversationId: conversationId,
            OR: [
              { role: 'user' },
              { role: 'assistant' }
            ]
          },
          orderBy: { timestamp: 'asc' },
          take: 40,
          include: { attachments: true }
        });

        // 构建发送给 AI 的消息
        const messagesForAI = recentMessages.map(m => {
          let content = m.content;
          if (m.attachments && m.attachments.length > 0) {
            const attInfo = m.attachments.map(a => `[附件: ${a.name}]`).join(' ');
            content += '\n\n' + attInfo;
          }
          return {
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content
          };
        });

        // 调用 LongCat API
        const apiRes = await fetch(`${LONGCAT_API_BASE}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LONGCAT_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: useModel,
            messages: messagesForAI,
            temperature: 0.7,
            stream: true
          })
        });

        if (!apiRes.ok) {
          const errText = await apiRes.text();
          console.error('LongCat API 错误:', apiRes.status, errText);
          throw new Error(`AI 服务返回错误 (${apiRes.status})`);
        }

        const reader = apiRes.body?.getReader();
        if (!reader) {
          throw new Error('无法读取响应流');
        }

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

              if (content) fullContent += content;
              if (reasoning) fullReasoning += reasoning;

              if (content || reasoning) {
                const response = {
                  id: aiMsgId,
                  content: fullContent,
                  reasoning_content: fullReasoning,
                  done: false
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(response)}\n\n`));
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }

        // 保存 AI 消息到数据库
        await prisma.message.create({
          data: {
            id: aiMsgId,
            role: 'assistant',
            content: fullContent,
            reasoningContent: fullReasoning || null,
            conversationId: conversationId,
          }
        });

        // 发送完成信号
        const finalResponse = {
          id: aiMsgId,
          content: fullContent,
          reasoning_content: fullReasoning || undefined,
          done: true
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalResponse)}\n\n`));
        controller.close();

      } catch (error: any) {
        console.error('聊天请求失败:', error);
        const errorResponse = {
          id: aiMsgId,
          content: `请求失败: ${error.message}`,
          done: true,
          error: true
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorResponse)}\n\n`));
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
