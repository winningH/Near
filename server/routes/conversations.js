const express = require('express')
const router = express.Router()
const prisma = require('../prisma')

router.get('/', async (req, res) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { messages: { some: {} } },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, createdAt: true, updatedAt: true }
    })
    res.json(conversations)
  } catch (error) {
    console.error('获取会话列表失败:', error)
    res.status(500).json({ error: '获取会话列表失败' })
  }
})

router.post('/', async (req, res) => {
  try {
    const conversation = await prisma.conversation.create({
      data: { title: '新的对话' }
    })
    res.status(201).json(conversation)
  } catch (error) {
    console.error('创建会话失败:', error)
    res.status(500).json({ error: '创建会话失败' })
  }
})

module.exports = router
