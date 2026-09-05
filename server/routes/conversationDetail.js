const express = require('express')
const router = express.Router()
const prisma = require('../prisma')

router.get('/:id', async (req, res) => {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: req.params.id },
      include: {
        messages: {
          orderBy: { timestamp: 'asc' },
          include: { attachments: true }
        }
      }
    })
    if (!conversation) {
      return res.status(404).json({ error: '会话不存在' })
    }
    res.json(conversation)
  } catch (error) {
    console.error('获取会话详情失败:', error)
    res.status(500).json({ error: '获取会话详情失败' })
  }
})

router.patch('/:id', async (req, res) => {
  const { title } = req.body || {}
  if (typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: '标题不能为空' })
  }

  try {
    const conversation = await prisma.conversation.update({
      where: { id: req.params.id },
      data: { title: title.trim().slice(0, 200) }
    })
    res.json(conversation)
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '会话不存在' })
    }
    console.error('更新会话失败:', error)
    res.status(500).json({ error: '更新会话失败' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await prisma.conversation.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '会话不存在' })
    }
    console.error('删除会话失败:', error)
    res.status(500).json({ error: '删除会话失败' })
  }
})

module.exports = router
