const express = require('express')
const router = express.Router()
const config = require('../config')

// 供前端展示当前运行配置（不返回任何密钥）
router.get('/', (req, res) => {
  res.json({
    // AI 配置是否完整（缺任何必填项都是 false）
    configured: config.aiConfigured,
    // 缺失的必填变量名，便于前端提示具体缺什么
    missing: config.missing,
    model: config.ai.model || null,
    thinkingModel: config.ai.thinkingModel || null,
    thinkingEnabled: Boolean(config.ai.thinkingModel),
    apiBase: config.ai.apiBase || null,
    visionEnabled: config.ai.enableVision
  })
})

module.exports = router
