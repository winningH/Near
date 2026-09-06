require('dotenv').config()

/** 缺失的必填环境变量名 */
const missing = []

/** 读取必填项，缺失时记入 missing */
function required(name) {
  const value = process.env[name]
  if (value === undefined || String(value).trim() === '') {
    missing.push(name)
    return ''
  }
  return String(value).trim()
}

/** 读取可选项，缺省时用 fallback */
function optional(name, fallback = '') {
  const value = process.env[name]
  if (value === undefined || String(value).trim() === '') return fallback
  return String(value).trim()
}

// ---- 必填：缺任何一项都不发起 AI 请求 ----
const apiKey = required('OPENAI_API_KEY')
const rawBase = required('OPENAI_API_BASE')
const model = required('OPENAI_MODEL')

// 上面三项读完后 missing 才收集完整
const aiConfigured = missing.length === 0

const apiBase = rawBase.replace(/\/+$/, '')
// 兼容两种写法：base 以 /v1 结尾（OpenAI 官方风格）或不带版本号（自建网关风格）
const chatUrl = apiBase
  ? /\/v\d+[a-z]*$/.test(apiBase)
    ? `${apiBase}/chat/completions`
    : `${apiBase}/v1/chat/completions`
  : ''

// 深度思考的关闭参数（未勾选深度思考时附加，用于显式关闭模型默认开启的思考）。
// 不同服务商的思考参数差异巨大，且必须是对象（不是 boolean）：
//   智谱 GLM-4.5    {"thinking":{"type":"disabled"}}   ← 默认思考 ON
//   DeepSeek-R1    {"thinking":{"type":"disabled"}}
//   通义 qwen3      {"enable_thinking":false}
// 注：Zhipu 服务端拒绝 boolean（传 thinking:false 会 400），必须用 type 形式的对象。
// 开启思考默认不传参数——大多数"支持思考"的模型默认就是开启的。
let thinkingOffParams = null
const thinkingOffParamsRaw = optional('OPENAI_THINKING_OFF_PARAMS')
if (thinkingOffParamsRaw) {
  try {
    const parsed = JSON.parse(thinkingOffParamsRaw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      thinkingOffParams = parsed
    } else {
      console.warn('[配置] OPENAI_THINKING_OFF_PARAMS 必须是 JSON 对象，已忽略')
    }
  } catch (e) {
    console.warn('[配置] OPENAI_THINKING_OFF_PARAMS 不是合法 JSON，已忽略')
  }
}

const path = require('path')

module.exports = {
  /** 缺失的必填变量名，供启动提示与接口报错使用 */
  missing,
  /** AI 配置是否完整；为 false 时不发起任何 AI 请求 */
  aiConfigured,

  port: Number(optional('PORT', '3001')) || 3001,
  databaseUrl: optional('DATABASE_URL', 'file:./dev.db'),

  ai: {
    apiKey,
    apiBase,
    chatUrl,
    model,
    // 留空表示不支持深度思考
    thinkingModel: optional('OPENAI_THINKING_MODEL'),
    // 关闭思考时附加的参数（默认开启思考的模型需显式关闭），
    // 如智谱 {"thinking":{"type":"disabled"}}；OpenAI/DeepSeek 一般无需此参数
    thinkingOffParams,
    temperature: Number(optional('OPENAI_TEMPERATURE', '0.7')) || 0.7,
    // 图片以 base64 送入多模态模型；若模型不支持视觉，设为 false
    enableVision: optional('ENABLE_VISION', 'true').toLowerCase() !== 'false'
  },

  // 允许访问的前端来源；为空表示允许所有（仅建议本地开发）
  corsOrigins: optional('CORS_ORIGIN')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),

  security: {
    // 每分钟每 IP 的请求上限
    chatRateLimit: Number(optional('CHAT_RATE_LIMIT', '30')) || 30,
    uploadRateLimit: Number(optional('UPLOAD_RATE_LIMIT', '30')) || 30
  },

  upload: {
    // 存放在 public/ 之外：public/ 下的文件会被前端 dev server（Vite）直接伺服，
    // 上传目录暴露在公开路径不合适，也会被构建工具监听
    dir: path.resolve(__dirname, '..', 'uploads'),
    maxFileSize: Number(optional('MAX_FILE_SIZE', String(10 * 1024 * 1024))) || 10 * 1024 * 1024,
    maxFiles: Number(optional('MAX_FILES', '10')) || 10,
    // 上传后从未随消息发送（数据库无引用）的文件属于遗留临时文件，
    // 超过该时长（小时）即由定期清理删除。保留期是为了避免误删
    // 用户还在输入区编辑、尚未发送的附件
    orphanRetentionHours: Number(optional('UPLOAD_RETENTION_HOURS', '24')) || 24,
    // 超过该大小的图片不做 base64 内联，避免请求体过大
    visionMaxSize: 5 * 1024 * 1024
  }
}
