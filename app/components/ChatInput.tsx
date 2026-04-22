'use client';

import { useState, useRef, useCallback } from 'react';
import { Attachment } from '@/types';
import { formatFileSize } from '@/lib/utils';

interface ChatInputProps {
  onSend: (message: string, attachments: Attachment[]) => void;
  onStop: () => void;
  isStreaming: boolean;
  thinkMode: boolean;
  onToggleThink: () => void;
}

export function ChatInput({ onSend, onStop, isStreaming, thinkMode, onToggleThink }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentsRef = useRef<HTMLDivElement>(null);

  const handleSend = useCallback(() => {
    if (isStreaming) {
      onStop();
      return;
    }

    const trimmedMessage = message.trim();
    if (!trimmedMessage && attachments.length === 0) return;

    onSend(trimmedMessage, attachments);
    setMessage('');
    setAttachments([]);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [message, attachments, isStreaming, onSend, onStop]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleInput = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    target.style.height = 'auto';
    target.style.height = Math.min(target.scrollHeight, 150) + 'px';
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('上传失败');
      }

      const uploaded = await res.json();
      setAttachments(prev => [...prev, ...uploaded]);
    } catch (err) {
      console.error('上传文件失败:', err);
      alert('上传文件失败');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, []);

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imageFiles: File[] = [];

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }

    if (imageFiles.length === 0) return;

    e.preventDefault();
    setIsUploading(true);

    const formData = new FormData();
    imageFiles.forEach(file => {
      formData.append('files', file);
    });

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('上传失败');
      }

      const uploaded = await res.json();
      setAttachments(prev => [...prev, ...uploaded]);
    } catch (err) {
      console.error('粘贴图片上传失败:', err);
      alert('粘贴图片失败');
    } finally {
      setIsUploading(false);
    }
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  const scrollAttachments = useCallback((direction: 'left' | 'right') => {
    if (attachmentsRef.current) {
      const scrollAmount = 200;
      attachmentsRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  }, []);

  const hasContent = message.trim() || attachments.length > 0;

  return (
    <div className="px-8 pb-6 dark:bg-gradient-to-b dark:from-transparent dark:to-[#1a1a2e]/30 bg-gradient-to-b from-transparent to-white/50">
      <div className="max-w-3xl mx-auto">
        <div className="dark:bg-[#1e1e3a] bg-white dark:border-[#2a2a50] border-slate-200 border rounded-2xl p-3 
          transition-all focus-within:border-indigo-500 focus-within:ring-2 
          dark:focus-within:ring-[rgba(108,99,255,0.3)] focus-within:ring-indigo-500/20">
          
          {/* 附件预览 */}
          {attachments.length > 0 && (
            <div className="relative mb-2.5">
              {/* 左滚动按钮 */}
              {attachments.length > 3 && (
                <button
                  onClick={() => scrollAttachments('left')}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-6 h-7 rounded-md
                    dark:bg-[#1e1e3a]/95 dark:border-[#2a2a50] dark:border dark:text-[#a0a0c0]
                    bg-white border-slate-200 border text-slate-500
                    flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ opacity: attachments.length > 3 ? 1 : undefined }}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
              )}

              <div
                ref={attachmentsRef}
                className="flex gap-2 overflow-x-auto scrollbar-hide px-7 pb-2 dark:border-b-[#2a2a50] border-b-slate-100 border-b"
              >
                {attachments.map((att, index) => (
                  <div
                    key={att.id}
                    className={`relative flex-shrink-0 group ${att.type?.startsWith('image/') ? '' : 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg dark:bg-[#252545] bg-slate-100'}`}
                  >
                    {att.type?.startsWith('image/') ? (
                      <div className="relative">
                        <img
                          src={att.url}
                          alt={att.name}
                          className="w-16 h-16 rounded-md object-cover"
                        />
                        <button
                          onClick={() => removeAttachment(index)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white
                            flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <>
                        <span>📄</span>
                        <div className="flex flex-col">
                          <span className="text-xs font-medium dark:text-[#e8e8f0] text-slate-700 truncate max-w-[100px]">
                            {att.name}
                          </span>
                          <span className="text-[10px] dark:text-[#6a6a8e] text-slate-400">
                            {formatFileSize(att.size)}
                          </span>
                        </div>
                        <button
                          onClick={() => removeAttachment(index)}
                          className="ml-1 w-4 h-4 rounded-full dark:bg-[#1e1e3a] bg-slate-200 dark:text-[#6a6a8e] text-slate-400
                            flex items-center justify-center text-xs hover:bg-red-500 hover:text-white transition-colors"
                        >
                          ×
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* 右滚动按钮 */}
              {attachments.length > 3 && (
                <button
                  onClick={() => scrollAttachments('right')}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-6 h-7 rounded-md
                    dark:bg-[#1e1e3a]/95 dark:border-[#2a2a50] dark:border dark:text-[#a0a0c0]
                    bg-white border-slate-200 border text-slate-500
                    flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ opacity: attachments.length > 3 ? 1 : undefined }}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* 输入行 */}
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              onInput={handleInput}
              onPaste={handlePaste}
              placeholder="给 Near 发送消息..."
              rows={1}
              disabled={isStreaming}
              className="flex-1 bg-transparent border-none outline-none resize-none py-2 px-1
                text-[15px] leading-relaxed dark:text-[#e8e8f0] text-slate-800
                dark:placeholder-[#6a6a8e] placeholder-slate-400
                disabled:opacity-50"
              style={{ minHeight: '24px', maxHeight: '150px' }}
            />

            {/* 附件按钮 */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isStreaming}
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors
                dark:text-[#6a6a8e] dark:hover:bg-[#252545] dark:hover:text-[#e8e8f0]
                text-slate-400 hover:bg-slate-100 hover:text-slate-600
                disabled:opacity-50"
              title="添加图片或文件"
            >
              {isUploading ? (
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                </svg>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx,.json,.md"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* 发送/停止按钮 */}
            <button
              onClick={handleSend}
              disabled={!isStreaming && !hasContent}
              className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all
                ${isStreaming
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : hasContent
                    ? 'dark:bg-[#6c63ff] bg-indigo-500 text-white dark:hover:bg-[#7b73ff] hover:bg-indigo-600'
                    : 'dark:bg-[#252545] bg-slate-100 dark:text-[#6a6a8e] text-slate-400 cursor-not-allowed'
                }`}
              title={isStreaming ? '中断生成' : '发送消息'}
            >
              {isStreaming ? (
                <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : (
                <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              )}
            </button>
          </div>

          {/* 底部工具栏 */}
          <div className="flex items-center justify-between mt-1.5 px-1">
            <button
              onClick={onToggleThink}
              className={`h-[26px] px-2.5 rounded-full text-xs transition-all border
                ${thinkMode
                  ? 'dark:bg-[rgba(108,99,255,0.08)] dark:text-[#6c63ff] dark:border-[rgba(108,99,255,0.35)] bg-indigo-50 text-indigo-600 border-indigo-200'
                  : 'dark:bg-transparent dark:text-[#a0a0c0] dark:border-[#2a2a50] dark:hover:bg-[#252545] bg-transparent text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
              title={thinkMode ? '关闭深度思考' : '开启深度思考'}
            >
              深度思考
            </button>
            <span className="text-[11px] dark:text-[#6a6a8e] text-slate-400">
              按 Enter 发送，Shift+Enter 换行
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
