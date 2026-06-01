import dotenv from 'dotenv'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import mongoose from 'mongoose'
import { fileURLToPath } from 'url'
import { dirname, join, resolve } from 'path'
import { existsSync, mkdirSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env'
dotenv.config({ path: resolve(__dirname, '..', envFile) })

const { default: slugRoutes } = await import('./routes/slugs.js')
const { default: depositRoutes } = await import('./routes/deposits.js')
const { default: gameImagesRoutes } = await import('./routes/gameImages.js')
const { default: usersRoutes } = await import('./routes/users.js')
const { default: gamesRoutes } = await import('./routes/games.js')
const { default: adminAuthRoutes } = await import('./routes/adminAuth.js')
const { default: solicitationRoutes } = await import('./routes/solicitations.js')
const { default: settingsRoutes }    = await import('./routes/settings.js')
const { default: signalBotsRoutes } = await import('./routes/signalBots.js')
const { default: aviatorRoutes } = await import('./routes/aviator.js')
const { default: walletRoutes } = await import('./routes/wallet.js')
const { default: routesDepositRoutes } = await import('./routes/routesDeposit.js')
const { default: routesAuthRoutes } = await import('./routes/routesAuth.js')
const { startDepositJob }    = await import('./jobs/depositStatusJob.js')
const { startSignalBotJob } = await import('./jobs/signalBotJob.js')

// ============================================
// Config
// ============================================
const PORT = Number(process.env.PORT) || 3013
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/aplicativo-eb'
const API_URL = process.env.API_URL || `http://localhost:${PORT}`

// ============================================
// Fastify Instance
// ============================================
const fastify = Fastify({
  logger: true,
  bodyLimit: 10 * 1024 * 1024 // 10MB
})

// ============================================
// Plugins
// ============================================

// CORS
const CORS_ORIGINS = [
  // Local dev
  `http://localhost:${process.env.APLICATIVO_PORT || 3000}`,
  `http://localhost:${process.env.PAINEL_PORT     || 3001}`,
  `http://localhost:${PORT}`,
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3012',
  'https://routes-eb.grupoautoma.com',
  // Produção
  'https://app.aviatorprime.com',
  'https://admin-interno.millioncassinogpt.com.br',
  'https://routes-eb.grupoautoma.com',
  'https://aviador.millioncassinogpt.com.br',
]

await fastify.register(cors, {
  origin: (origin, cb) => {
    // Permite requests sem origin (mobile apps, Postman, server-to-server)
    if (!origin) return cb(null, true)
    if (CORS_ORIGINS.includes(origin)) return cb(null, true)
    // Em dev, também permite qualquer localhost
    if (process.env.NODE_ENV !== 'production' && /^http:\/\/localhost(:\d+)?$/.test(origin)) {
      return cb(null, true)
    }
    cb(new Error(`CORS: origem não permitida — ${origin}`), false)
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Cactus-Cookie-Key', 'X-Brand-Slug', 'X-Base-Domain'],
  credentials: true,
})

// Multipart (file uploads)
await fastify.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
})

// Static files (uploaded logos)
const uploadsDir = join(__dirname, '..', 'uploads')
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true })
}
await fastify.register(fastifyStatic, {
  root: uploadsDir,
  prefix: '/uploads/',
  decorateReply: false
})

// ============================================
// Routes
// ============================================
await fastify.register(slugRoutes,      { prefix: '/api/slugs' })
await fastify.register(depositRoutes,   { prefix: '/api/deposits' })
await fastify.register(gameImagesRoutes,{ prefix: '/api/game-images' })
await fastify.register(usersRoutes,     { prefix: '/api/users' })
await fastify.register(gamesRoutes,     { prefix: '/api/games' })
await fastify.register(adminAuthRoutes,    { prefix: '/api/admin/auth' })
await fastify.register(solicitationRoutes, { prefix: '/api/solicitations' })
await fastify.register(settingsRoutes,      { prefix: '/api/settings' })
await fastify.register(signalBotsRoutes,   { prefix: '/api/signal-bots' })
await fastify.register(aviatorRoutes,      { prefix: '/api/aviator' })
await fastify.register(walletRoutes,       { prefix: '/api/wallet' })
await fastify.register(routesDepositRoutes,{ prefix: '/api/deposit' })
await fastify.register(routesAuthRoutes,   { prefix: '/api/auth' })

// Health check
fastify.get('/api/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
  mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  apiUrl: API_URL
}))

// ============================================
// Start Server
// ============================================
const start = async () => {
  try {
    // Connect MongoDB
    console.log(`📦 Connecting to MongoDB: ${MONGO_URI}`)
    await mongoose.connect(MONGO_URI)
    console.log('✅ MongoDB connected!')

    // Start Fastify
    await fastify.listen({ port: PORT, host: '0.0.0.0' })
    console.log(`🚀 API running at ${API_URL}`)

    // Inicia job de verificação de depósitos pendentes
    startDepositJob()

    // Inicia serviço de envio de sinais via Telegram
    startSignalBotJob()
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down...')
  await fastify.close()
  await mongoose.disconnect()
  process.exit(0)
})

start()
