require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')
const chatRoute = require('./routes/chat')
const conversationsRoute = require('./routes/conversations')
const conversationDetailRoute = require('./routes/conversationDetail')
const uploadRoute = require('./routes/upload')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, '..', 'public', 'uploads')))

app.use('/api/chat', chatRoute)
app.use('/api/conversations', conversationsRoute)
app.use('/api/conversations', conversationDetailRoute)
app.use('/api/upload', uploadRoute)

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
