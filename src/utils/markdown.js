import { marked } from 'marked'
import hljs from 'highlight.js'

// 让 marked 不解析内联 HTML，全部转义为纯文本显示
marked.use({
  renderer: {
    html(token) {
      return token.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
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
  container.querySelectorAll('pre code').forEach(block => {
    hljs.highlightElement(block)
  })
}
