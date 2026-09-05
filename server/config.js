require('dotenv').config()

/**
 * 取第一个非空的环境变量值。
 */
function pick(...names) {
  for (const name of names) {
    const value = process.env[name]
    if (value !== undefined && String(value).trim() !== '') return String(value).trim()
  }
  return ''
}

const rawBase = pick('OPENAI_API_BASE') || 'https://api.openai.com/v1'
const apiBase = rawBase.replace(/\/+$/, '')

// 兼容两种写法：base 以 /v1 结尾（OpenAI 官方风格）或不带版本号（自建网关风格）
const chatUrl = /\/v\d+[a-z]*$/.test(apiBase)
  ? `${apiBase}/chat/completions`
  : `${apiBase}/v1/chat/completions`

const corsOrigins = pick('CORS_ORIGIN')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

let thinkingParams = null
const thinkingParamsRaw = pick('OPENAI_THINKING_PARAMS')
if (thinkingParamsRaw) {
  try {
    const parsed = JSON.parse(thinkingParamsRaw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      thinkingParams = parsed
    }
  } catch (e) {
    console.warn('[配置] OPENAI_THINKING_PARAMS 不是合法的 JSON 对象，已忽略')
  }
}

module.exports = {
  appName: pick('APP_NAME') || 'Near',
  port: Number(pick('PORT')) || 3001,
  databaseUrl: pick('DATABASE_URL') || 'file:./dev.db',

  ai: {
    apiBase,
    chatUrl,
    apiKey: pick('OPENAI_API_KEY'),
    model: pick('OPENAI_MODEL') || 'gpt-4o-mini',
    thinkingModel: pick('OPENAI_THINKING_MODEL'),
    // 部分服务商用请求参数而非独立模型开启思考，如 {"enable_thinking":true}、{"reasoning_effort":"high"}
    thinkingParams,
    temperature: Number(pick('OPENAI_TEMPERATURE')) || 0.7,
    // 图片以 base64 送入多模态模型；若模型不支持视觉，可设为 false
    enableVision: pick('ENABLE_VISION').toLowerCase() !== 'false'
  },

  // 为空表示允许所有来源（仅建议本地开发）
  corsOrigins,

  security: {
    // 每分钟每 IP 的请求上限
    chatRateLimit: Number(pick('CHAT_RATE_LIMIT')) || 30,
    uploadRateLimit: Number(pick('UPLOAD_RATE_LIMIT')) || 30
  },

  upload: {
    maxFileSize: Number(pick('MAX_FILE_SIZE')) || 10 * 1024 * 1024,
    maxFiles: Number(pick('MAX_FILES')) || 10,
    // 超过该大小的图片不做 base64 内联，避免请求体过大
    visionMaxSize: 5 * 1024 * 1024
  }
}
