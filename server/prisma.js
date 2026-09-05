const { PrismaClient } = require('@prisma/client')
const config = require('./config')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: config.databaseUrl
    }
  }
})

module.exports = prisma
