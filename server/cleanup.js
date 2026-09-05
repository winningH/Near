const fs = require('fs')
const path = require('path')
const config = require('./config')
const prisma = require('./prisma')

/**
 * 清理孤儿上传文件：落盘后从未随消息发送（数据库无引用）且超过保留期的文件。
 * 典型来源：上传后点了删除图标但请求失败、待发送时刷新/关闭页面、
 * 以及附件文件本身（删除会话时消息级联删除，文件会遗留）。
 * 保留期内的文件不删——它们可能是用户还在输入区编辑、尚未发送的附件。
 */
function cleanupOrphanUploads() {
  return prisma.attachment
    .findMany({ select: { url: true } })
    .then(rows => {
      const referenced = new Set(rows.map(row => path.basename(row.url)))
      if (!fs.existsSync(config.upload.dir)) return 0

      const cutoff = Date.now() - config.upload.orphanRetentionHours * 3600 * 1000
      let deleted = 0

      for (const name of fs.readdirSync(config.upload.dir)) {
        const filePath = path.join(config.upload.dir, name)
        try {
          const stat = fs.statSync(filePath)
          if (!stat.isFile()) continue
          if (stat.mtimeMs > cutoff) continue
          if (referenced.has(name)) continue
          fs.unlinkSync(filePath)
          deleted++
        } catch (e) {
          // 单个文件失败不中断整体清理
        }
      }
      return deleted
    })
}

const HOUR_MS = 60 * 60 * 1000

function scheduleOrphanCleanup() {
  const run = () =>
    cleanupOrphanUploads()
      .then(count => {
        if (count > 0) console.log(`[清理] 已删除 ${count} 个未发送的孤儿附件`)
      })
      .catch(err => console.error('[清理] 孤儿附件清理失败:', err))

  run()
  const timer = setInterval(run, HOUR_MS)
  if (typeof timer.unref === 'function') timer.unref()
}

module.exports = { cleanupOrphanUploads, scheduleOrphanCleanup }
