import { marked } from 'marked'
import hljs from 'highlight.js'

// 让 marked 不解析内联 HTML，全部转义为纯文本显示
// 注意：marked v4 的 renderer.html 收到的是字符串（v5+ 才改为 token 对象）
marked.use({
  renderer: {
    html(text) {
      return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
    }
  }
})

export function renderMarkdown(text) {
  if (!text) return ''
  try {
    return marked.parse(text, {
      breaks: true,
      gfm: true,
    })
  } catch (e) {
    return escapeHtml(text).replace(/\n/g, '<br>')
  }
}

export function escapeHtml(str) {
  if (!str) return ''
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

/**
 * 把累积文本切成「已稳定的顶层块」+「仍在增长的活动块」。
 *
 * 流式输出时每收到一段就把整篇重新 parse 一次，再整段 v-html 覆盖 —— 这是抖动的根源：
 * 代码块高亮被反复抹掉、思考块收起状态被冲掉、内容越长重排越贵。
 * 切成块之后：除最后一块外的所有块在内容上已经定型（后面还有新 token 说明它们结束了），
 * 可以只渲染一次并原样复用；只有最后一块随分片刷新。
 *
 * 实测（marked@4）：稳定块前缀在后续 tick 中逐字不变，因此按索引复用是安全的。
 *
 * @returns {{ stable: string[], active: string }} stable 已定型的块原文，active 仍在增长的块原文
 */
export function splitMarkdownBlocks(text) {
  if (!text) return { stable: [], active: '' }
  let tokens
  try {
    tokens = marked.lexer(text, { breaks: true, gfm: true })
  } catch (e) {
    return { stable: [], active: text }
  }
  const all = []
  for (const t of tokens) {
    if (!t.raw || t.type === 'space') continue
    all.push(t.raw)
  }
  const active = all.pop() || ''
  return { stable: all, active }
}

export function buildThinkingAndContent(reasoning, content) {
  let html = ''
  if (reasoning && reasoning.trim()) {
    html += '<div class="thinking-block">' +
      '<div class="thinking-header">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>' +
      '<span>深度思考</span>' +
      '</div>' +
      '<div class="thinking-body"><div class="thinking-body-inner">' + renderMarkdown(reasoning) + '</div></div>' +
      '</div>'
  }
  if (content && content.trim()) {
    html += '<div class="answer-content">' + renderMarkdown(content) + '</div>'
  }
  return html
}

export function highlightCode(container) {
  if (!container) return
  container.querySelectorAll('pre code').forEach(block => {
    // hljs 对已高亮元素会跳过并输出 error 日志；这里显式跳过，
    // 已定型的块才不会被反复处理，重复调用也就没有副作用了
    if (block.dataset.highlighted) return
    hljs.highlightElement(block)
  })
}
