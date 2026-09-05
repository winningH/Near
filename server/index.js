require('dotenv').config()
const express = require('express')
const path = require('path')
const fs = require('fs')
const config = require('./config')
const prisma = require('./prisma')
const rateLimit = require('./middleware/rateLimit')
const chatRoute = require('./routes/chat')
const conversationsRoute = require('./routes/conversations')
const conversationDetailRoute = require('./routes/conversationDetail')
const uploadRoute = require('./routes/upload')
const configRoute = require('./routes/config')
const { scheduleOrphanCleanup } = require('./cleanup')

const app = express()

// 未处理的 Promise 拒绝不应直接杀掉进程
process.on('unhandledRejection', err => {
  console.error('[未处理的 Promise 拒绝]', err)
})

app.disable('x-powered-by')
app.use(express.json({ limit: '2mb' }))

// CORS：白名单来自 CORS_ORIGIN，留空则允许所有来源
const allowedOrigins = config.corsOrigins
app.use((req, res, next) => {
  const origin = req.headers.origin
  if (allowedOrigins.length === 0) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*')
  } else if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

app.use('/uploads', express.static(config.upload.dir))

app.use('/api/config', configRoute)
app.use(
  '/api/chat',
  rateLimit({ windowMs: 60 * 1000, max: config.security.chatRateLimit }),
  chatRoute
)
app.use('/api/conversations', conversationsRoute)
app.use('/api/conversations', conversationDetailRoute)
app.use(
  '/api/upload',
  rateLimit({ windowMs: 60 * 1000, max: config.security.uploadRateLimit }),
  uploadRoute
)

app.use('/api', (req, res) => {
  res.status(404).json({ error: '接口不存在' })
})

// 生产环境：构建产物存在时提供静态服务
const distPath = path.join(__dirname, '..', 'dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get(/^\/(?!api|uploads).*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

app.use((err, req, res, next) => {
  console.error('[服务器错误]', err)
  if (res.headersSent) return next(err)
  res.status(500).json({ error: '服务器内部错误' })
})

const server = app.listen(config.port, () => {
  console.log(`[Near] 后端已启动 http://localhost:${config.port}`)
  if (config.aiConfigured) {
    console.log(`[Near] AI 接口 ${config.ai.chatUrl}  模型 ${config.ai.model}`)
  } else {
    console.warn(`[Near] 缺少必填配置：${config.missing.join('、')}`)
    console.warn('[Near] AI 功能不可用，请在 .env 中补全后重启')
  }
})

function shutdown(signal) {
  console.log(`\n收到 ${signal}，正在退出...`)
  server.close(async () => {
    await prisma.$disconnect().catch(() => {})
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 5000).unref()
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

scheduleOrphanCleanup()

module.exports = server
