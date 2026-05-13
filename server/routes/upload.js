const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid')

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'public', 'uploads')

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true })
    }
    cb(null, UPLOAD_DIR)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, uuidv4() + ext)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
})

router.post('/', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: '没有上传文件' })
    }

    const uploadedFiles = req.files.map(file => ({
      id: uuidv4(),
      name: file.originalname,
      url: '/uploads/' + file.filename,
      size: file.size,
      type: file.mimetype
    }))

    res.json(uploadedFiles)
  } catch (error) {
    console.error('上传文件失败:', error)
    res.status(500).json({ error: '上传文件失败' })
  }
})

module.exports = router
