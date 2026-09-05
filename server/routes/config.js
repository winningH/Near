const express = require('express')
const router = express.Router()
const config = require('../config')

// 供前端展示当前运行配置（不返回任何密钥）
router.get('/', (req, res) => {
  res.json({
    appName: config.appName,
    model: config.ai.model,
    thinkingModel: config.ai.thinkingModel || null,
    thinkingEnabled: Boolean(config.ai.thinkingModel),
    apiBase: config.ai.apiBase,
    configured: Boolean(config.ai.apiKey),
    visionEnabled: config.ai.enableVision
  })
})

module.exports = router
