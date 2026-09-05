const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid')
const config = require('../config')

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'public', 'uploads')

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

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true })
    }
    cb(null, UPLOAD_DIR)
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
      name: file.originalname.slice(0, 200),
      url: '/uploads/' + file.filename,
      size: file.size,
      type: file.mimetype
    }))

    res.json(uploadedFiles)
  })
})

module.exports = router
