'use client';

import { useRef, useEffect, useCallback } from 'react';
import { Message, Attachment } from '@/types';
import { formatFileSize, safeUrl } from '@/lib/utils';
import { buildThinkingAndContent } from '@/lib/markdown';
import hljs from 'highlight.js';

interface MessageListProps {
  messages: Message[];
  isStreaming: boolean;
  streamingContent?: string;
  streamingReasoning?: string;
}

function AttachmentItem({ att, isUser }: { att: Attachment; isUser: boolean }) {
  const isImage = att.type?.startsWith('image/');

  if (isImage) {
    return (
      <div className="relative group">
        <img
          src={safeUrl(att.url)}
          alt={att.name}
          className="w-11 h-11 rounded-md object-cover cursor-pointer"
          onClick={() => {
            // 图片预览
            const overlay = document.createElement('div');
            overlay.className = 'lightbox-overlay';
            overlay.style.display = 'flex';
            overlay.innerHTML = `<img class="lightbox-img" src="${safeUrl(att.url)}" alt="${att.name}" />`;
            overlay.onclick = () => overlay.remove();
            document.addEventListener('keydown', function esc(e) {
              if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', esc);
              }
            });
            document.body.appendChild(overlay);
          }}
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs
      ${isUser 
        ? 'bg-white/15 text-white/85' 
        : 'dark:bg-[#252545] bg-slate-100 dark:text-[#a0a0c0] text-slate-600'
      }`}
    >
      <span>📄</span>
      <div className="flex flex-col">
        <span className="font-medium truncate max-w-[140px]">{att.name}</span>
        <span className={`text-[10px] ${isUser ? 'text-white/60' : 'dark:text-[#6a6a8e] text-slate-400'}`}>
          {formatFileSize(att.size)}
        </span>
      </div>
    </div>
  );
}

function MessageItem({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block as HTMLElement);
      });
    }
  }, [message.content, message.reasoningContent]);

  return (
    <div className={`py-3 animate-fade-in ${isUser ? '' : ''}`}>
      <div className={`max-w-3xl mx-auto px-8 flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
        {/* 头像 */}
        <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-semibold text-white
          ${isUser 
            ? 'bg-gradient-to-br dark:from-[#6c63ff] dark:to-[#a78bfa] from-indigo-500 to-purple-500' 
            : 'bg-gradient-to-br dark:from-emerald-500 dark:to-emerald-400 from-emerald-500 to-teal-400'
          }`}
        >
          {isUser ? 'U' : 'N'}
        </div>

        {/* 消息内容 */}
        <div className={`max-w-[calc(100%-56px)] min-w-0 ${isUser ? 'items-end flex flex-col' : ''}`}>
          {/* 角色名 */}
          <div className={`text-[11px] mb-1 ${isUser ? 'pr-0.5' : 'pl-0.5'}
            dark:text-[#6a6a8e] text-slate-400`}
          >
            {isUser ? '你' : 'Near'}
          </div>

          {/* 附件 */}
          {message.attachments && message.attachments.length > 0 && (
            <div className={`flex flex-wrap gap-1.5 mb-2 ${isUser ? 'justify-end' : ''}`}>
              {message.attachments.map((att) => (
                <AttachmentItem key={att.id} att={att} isUser={isUser} />
              ))}
            </div>
          )}

          {/* 消息文本 */}
          {message.content && (
            <div
              ref={contentRef}
              className={`message-content inline-block px-4 py-2.5
                ${isUser
                  ? 'rounded-[18px_18px_2px_18px] bg-gradient-to-br dark:from-[#6c63ff] dark:to-[#8b5cf6] from-indigo-500 to-purple-500 text-white'
                  : 'rounded-[18px_18px_18px_2px] dark:bg-[#16213e] bg-white dark:border-[#2a2a50] border-slate-200 border text-[14.5px] leading-relaxed dark:text-[#e8e8f0] text-slate-700'
                }`}
              dangerouslySetInnerHTML={{
                __html: isUser
                  ? message.content.replace(/\n/g, '<br>')
                  : buildThinkingAndContent(message.reasoningContent, message.content)
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export function MessageList({ messages, isStreaming, streamingContent, streamingReasoning }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const streamingRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent, streamingReasoning]);

  // 高亮流式内容的代码
  useEffect(() => {
    if (streamingRef.current && isStreaming) {
      streamingRef.current.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block as HTMLElement);
      });
    }
  }, [streamingContent, streamingReasoning, isStreaming]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto py-5">
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}

      {/* 流式消息 */}
      {isStreaming && (
        <div className="py-3 animate-fade-in">
          <div className="max-w-3xl mx-auto px-8 flex gap-2.5">
            <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-semibold text-white
              bg-gradient-to-br dark:from-emerald-500 dark:to-emerald-400 from-emerald-500 to-teal-400">
              N
            </div>
            <div className="max-w-[calc(100%-56px)] min-w-0">
              <div className="text-[11px] mb-1 pl-0.5 dark:text-[#6a6a8e] text-slate-400">Near</div>
              <div
                ref={streamingRef}
                className="message-content inline-block px-4 py-2.5 rounded-[18px_18px_18px_2px] 
                  dark:bg-[#16213e] bg-white dark:border-[#2a2a50] border-slate-200 border 
                  text-[14.5px] leading-relaxed dark:text-[#e8e8f0] text-slate-700"
                dangerouslySetInnerHTML={{
                  __html: streamingContent || streamingReasoning
                    ? buildThinkingAndContent(streamingReasoning, streamingContent)
                    : '<div class="typing-indicator dark:bg-transparent bg-transparent"><span class="dark:bg-[#6a6a8e] bg-slate-400"></span><span class="dark:bg-[#6a6a8e] bg-slate-400"></span><span class="dark:bg-[#6a6a8e] bg-slate-400"></span></div>'
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
