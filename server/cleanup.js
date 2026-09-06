const fs = require('fs')
const path = require('path')
const config = require('./config')
const prisma = require('./prisma')
const { MONTH_DIR_RE } = require('./uploadPath')

/**
 * 清理遗留的临时附件：已上传落盘、但从未随消息发送（数据库中无任何引用）、
 * 且超过保留期的文件。
 * 典型来源：上传后点了删除图标但删除请求失败、附件还在输入区时刷新/关闭了页面、
 * 以及附件文件本身（删除会话时消息级联删除，文件会遗留在磁盘上）。
 * 保留期内的文件不删——它们可能是用户还在输入区编辑、尚未发送的附件。
 * 存储位置：根目录（历史文件）与 yyyyMM 按月子目录，两者都遍历。
 */
function cleanupOrphanUploads() {
  return prisma.attachment
    .findMany({ select: { url: true } })
    .then(rows => {
      // 引用集合以 /uploads/ 之后的相对路径为键（yyyyMM/x.png 或旧文件的 x.png）
      const referenced = new Set(
        rows.map(row => String(row.url || '').split('/uploads/')[1] || '')
      )
      if (!fs.existsSync(config.upload.dir)) return 0

      const cutoff = Date.now() - config.upload.orphanRetentionHours * 3600 * 1000
      let deleted = 0

      for (const entry of fs.readdirSync(config.upload.dir, { withFileTypes: true })) {
        const entryPath = path.join(config.upload.dir, entry.name)
        if (entry.isDirectory()) {
          // 只进入按月命名的子目录，其他目录不碰
          if (!MONTH_DIR_RE.test(entry.name)) continue
          deleted += walkAndClean(entryPath, entry.name, referenced, cutoff)
          // 清理后目录为空则一并移除
          try {
            if (fs.readdirSync(entryPath).length === 0) fs.rmdirSync(entryPath)
          } catch (e) {
            // 单个目录失败不中断整体清理
          }
          continue
        }
        if (!entry.isFile()) continue
        if (isOrphan(entry.name, entryPath, referenced, cutoff)) {
          try {
            fs.unlinkSync(entryPath)
            deleted++
          } catch (e) {
            // 单个文件失败不中断整体清理
          }
        }
      }
      return deleted
    })
}

function walkAndClean(dir, relBase, referenced, cutoff) {
  let deleted = 0
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile()) continue
    const rel = relBase + '/' + entry.name
    if (isOrphan(rel, path.join(dir, entry.name), referenced, cutoff)) {
      try {
        fs.unlinkSync(path.join(dir, entry.name))
        deleted++
      } catch (e) {
        // 单个文件失败不中断整体清理
      }
    }
  }
  return deleted
}

function isOrphan(refKey, filePath, referenced, cutoff) {
  try {
    const stat = fs.statSync(filePath)
    if (!stat.isFile()) return false
    if (stat.mtimeMs > cutoff) return false
    return !referenced.has(refKey)
  } catch (e) {
    return false
  }
}

const HOUR_MS = 60 * 60 * 1000

function scheduleOrphanCleanup() {
  const run = () =>
    cleanupOrphanUploads()
      .then(count => {
        if (count > 0) console.log(`[清理] 已删除 ${count} 个未发送的遗留附件`)
      })
      .catch(err => console.error('[清理] 遗留附件清理失败:', err))

  run()
  const timer = setInterval(run, HOUR_MS)
  if (typeof timer.unref === 'function') timer.unref()
}

module.exports = { cleanupOrphanUploads, scheduleOrphanCleanup }
