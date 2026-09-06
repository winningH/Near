export function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/** 过滤危险的 URL 协议，防止注入 */
export function safeUrl(url) {
  if (!url) return ''
  const trimmed = url.trim().toLowerCase()
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:')
  ) {
    return ''
  }
  return url
}

export function formatFileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

/** yyyy-MM，用于会话列表的月份分组 */
export function formatYearMonth(date) {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * 高度折叠/展开动画
 * @param {HTMLElement} el - 目标元素
 * @param {boolean} expanding - true 展开，false 收起
 * @param {number} duration - 动画时长(ms)
 */
export function toggleHeight(el, expanding, duration = 300) {
  if (expanding) {
    el.style.height = '0px'
    el.offsetHeight // 强制回流
    el.style.transition = `height ${duration}ms ease`
    el.style.height = el.scrollHeight + 'px'
    const onEnd = () => {
      el.style.height = ''
      el.style.transition = ''
      el.removeEventListener('transitionend', onEnd)
    }
    el.addEventListener('transitionend', onEnd)
  } else {
    el.style.height = el.scrollHeight + 'px'
    el.offsetHeight // 强制回流
    el.style.transition = `height ${duration}ms ease`
    el.style.height = '0px'
    const onEnd = () => {
      el.style.transition = ''
      el.removeEventListener('transitionend', onEnd)
    }
    el.addEventListener('transitionend', onEnd)
  }
}
