const path = require('path')
const config = require('./config')

const UPLOAD_DIR = config.upload.dir

// 落盘文件名固定为 uuid（+可选扩展名），日期子目录名为 yyyyMM
const FILENAME_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(\.[a-z0-9]+)?$/i
const MONTH_DIR_RE = /^\d{6}$/

/**
 * 从附件 URL（/uploads/[yyyyMM/]uuid.ext）解析出 UPLOAD_DIR 内的绝对路径。
 * 兼容历史无日期目录的旧文件；非法或越界（路径穿越）返回 null。
 */
function resolveUploadPath(url) {
  const rel = String(url || '').split('/uploads/')[1] || ''
  const segments = rel.split('/').filter(Boolean)
  const filename = segments.pop() || ''
  if (!FILENAME_RE.test(filename)) return null
  if (segments.some(segment => !MONTH_DIR_RE.test(segment))) return null

  const root = path.resolve(UPLOAD_DIR)
  const resolved = path.resolve(root, ...segments, filename)
  if (!resolved.startsWith(root + path.sep)) return null
  return resolved
}

/** 当前月份的存储子目录（yyyyMM） */
function currentMonthDir() {
  const now = new Date()
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  return path.join(UPLOAD_DIR, ym)
}

module.exports = { UPLOAD_DIR, FILENAME_RE, MONTH_DIR_RE, resolveUploadPath, currentMonthDir }
