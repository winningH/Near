/**
 * 简易内存滑动窗口限流（按 IP）。
 * 单实例部署够用；多实例请换成 Redis。
 */
function rateLimit({ windowMs = 60 * 1000, max = 30 } = {}) {
  const hits = new Map()

  const timer = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of hits.entries()) {
      if (now - entry.start > windowMs) hits.delete(key)
    }
  }, windowMs)
  if (typeof timer.unref === 'function') timer.unref()

  return function rateLimitMiddleware(req, res, next) {
    const key = req.ip || (req.connection && req.connection.remoteAddress) || 'unknown'
    const now = Date.now()
    const entry = hits.get(key)

    if (!entry || now - entry.start > windowMs) {
      hits.set(key, { start: now, count: 1 })
      return next()
    }

    entry.count += 1
    if (entry.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((windowMs - (now - entry.start)) / 1000)))
      return res.status(429).json({ error: '请求过于频繁，请稍后再试' })
    }
    return next()
  }
}

module.exports = rateLimit
