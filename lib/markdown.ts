import { marked } from 'marked';
import hljs from 'highlight.js';

// 允许的安全标签白名单
const SAFE_TAGS = new Set([
  'p', 'br', 'b', 'i', 'em', 'strong', 'u', 's', 'del',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'blockquote',
  'pre', 'code',
  'a', 'img',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'hr', 'div', 'span', 'sup', 'sub'
]);

const SAFE_ATTRS = new Set(['href', 'src', 'alt', 'title', 'class', 'id']);

export function sanitizeHTML(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;

  function clean(node: Node) {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const element = child as Element;

        if (!SAFE_TAGS.has(element.tagName.toLowerCase())) {
          const frag = document.createDocumentFragment();
          while (element.firstChild) {
            frag.appendChild(element.firstChild);
          }
          node.replaceChild(frag, element);
          continue;
        }

        Array.from(element.attributes).forEach(attr => {
          if (!SAFE_ATTRS.has(attr.name.toLowerCase())) {
            element.removeAttribute(attr.name);
          }

          const val = attr.value.trim().toLowerCase();
          if (
            (attr.name === 'href' || attr.name === 'src') &&
            (val.startsWith('javascript:') ||
              val.startsWith('data:') ||
              val.startsWith('vbscript:'))
          ) {
            element.removeAttribute(attr.name);
          }
        });

        clean(element);
      }
    }
  }

  clean(tmp);
  return tmp.innerHTML;
}

export function renderMarkdown(text: string): string {
  if (!text) return '';
  try {
    marked.setOptions({
      breaks: true,
      gfm: true,
      highlight: function (code: string, lang: string) {
        if (lang && hljs.getLanguage(lang)) {
          return hljs.highlight(code, { language: lang }).value;
        }
        return hljs.highlightAuto(code).value;
      }
    });
    return sanitizeHTML(marked.parse(text) as string);
  } catch (e) {
    return escapeHtml(text).replace(/\n/g, '<br>');
  }
}

export function escapeHtml(str: string): string {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function buildThinkingAndContent(reasoning?: string, content?: string): string {
  let html = '';
  if (reasoning && reasoning.trim()) {
    html += `<div class="thinking-block">
      <div class="thinking-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
        <span>深度思考</span>
      </div>
      <div class="thinking-body">${renderMarkdown(reasoning)}</div>
    </div>`;
  }
  if (content && content.trim()) {
    html += `<div class="answer-content">${renderMarkdown(content)}</div>`;
  }
  return html;
}

export function highlightCode(container: HTMLElement) {
  container.querySelectorAll('pre code').forEach(block => {
    hljs.highlightElement(block as HTMLElement);
  });
}
