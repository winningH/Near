export function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function escapeHtml(str) {
  if (!str) return ''
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

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

export function formatDate(date) {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()

  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000))
    return minutes < 1 ? '刚刚' : minutes + '分钟前'
  }

  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000))
    return hours + '小时前'
  }

  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(diff / (24 * 60 * 60 * 1000))
    return days + '天前'
  }

  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
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
