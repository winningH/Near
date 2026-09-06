const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid')
const config = require('../config')
const { resolveUploadPath, currentMonthDir } = require('../uploadPath')

const UPLOAD_DIR = config.upload.dir

const ALLOWED_MIME = new Set([
  'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp',
  'application/pdf',
  'text/plain', 'text/markdown', 'text/csv', 'application/json',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
])

const ALLOWED_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp',
  '.pdf', '.txt', '.md', '.csv', '.json',
  '.doc', '.docx', '.xls', '.xlsx'
])

// multer 把 multipart 的 filename 按 latin1 解码，中文等非 ASCII 文件名会变乱码，
// 这里还原为原始 UTF-8
function fixFilename(name) {
  if (!name || !/[\u0080-\u00FF]/.test(name)) return name
  try {
    return Buffer.from(name, 'latin1').toString('utf8')
  } catch (e) {
    return name
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 按月分目录存储（uploads/yyyyMM），目录不存在时递归创建
    const monthDir = currentMonthDir()
    try {
      fs.mkdirSync(monthDir, { recursive: true })
    } catch (e) {
      return cb(e)
    }
    req.uploadMonth = path.basename(monthDir)
    cb(null, monthDir)
  },
  filename: (req, file, cb) => {
    // 丢弃原始文件名，避免路径穿越与覆盖
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, uuidv4() + (ALLOWED_EXT.has(ext) ? ext : ''))
  }
})

const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxFileSize },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    // 以扩展名白名单为准；MIME 只作辅助判断（部分客户端会上报 octet-stream）
    const mimeOk =
      ALLOWED_MIME.has(file.mimetype) ||
      !file.mimetype ||
      file.mimetype === 'application/octet-stream'

    if (ALLOWED_EXT.has(ext) && mimeOk) {
      return cb(null, true)
    }
    return cb(new Error(`不支持的文件类型：${file.originalname}`))
  }
})

// 删除待发送区附件时同步清理落盘文件；已发送消息的附件不经过这里。
// 客户端传 /uploads/ 之后的相对路径（yyyyMM/uuid.ext 或旧文件的 uuid.ext）
router.delete('/*', (req, res) => {
  const filePath = resolveUploadPath('/uploads/' + (req.params[0] || ''))
  if (!filePath) {
    return res.status(400).json({ error: '非法的文件名' })
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: '文件不存在' })
  }

  fs.unlink(filePath, err => {
    if (err) {
      console.error('删除上传文件失败:', err)
      return res.status(500).json({ error: '删除失败' })
    }
    res.json({ ok: true })
  })
})

router.post('/', (req, res) => {
  upload.array('files', config.upload.maxFiles)(req, res, err => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          error: `文件大小不能超过 ${Math.floor(config.upload.maxFileSize / 1024 / 1024)}MB`
        })
      }
      return res.status(400).json({ error: err.message || '上传失败' })
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: '没有上传文件' })
    }

    const uploadedFiles = req.files.map(file => ({
      id: uuidv4(),
      name: fixFilename(file.originalname).slice(0, 200),
      url: '/uploads/' + (req.uploadMonth ? req.uploadMonth + '/' : '') + file.filename,
      size: file.size,
      type: file.mimetype
    }))

    res.json(uploadedFiles)
  })
})

module.exports = router
