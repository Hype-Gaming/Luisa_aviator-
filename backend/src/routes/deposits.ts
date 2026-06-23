import { FastifyInstance } from 'fastify'
import { Deposit } from '../models/Deposit.js'

export default async function depositRoutes(fastify: FastifyInstance) {

  // GET /api/deposits/ranking — ranking de depósitos aprovados por slug e período
  fastify.get('/ranking', async (request, reply) => {
    const { slug, period } = request.query as { slug?: string; period?: string }

    if (!slug) return reply.status(400).send({ success: false, message: 'slug é obrigatório' })

    // Define a janela de tempo
    const now = new Date()
    let dateFrom: Date | null = null
    if (period === 'daily') {
      dateFrom = new Date(now); dateFrom.setHours(0, 0, 0, 0)
    } else if (period === 'weekly') {
      dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else if (period === 'monthly') {
      dateFrom = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    const matchStage: any = { slug, status: 'approved' }
    if (dateFrom) matchStage.createdAt = { $gte: dateFrom }

    const results = await Deposit.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$userId',
          userName: { $last: '$userEmail' },    // usa email como identificador
          displayName: { $last: '$userName' },  // nome para exibir
          total: { $sum: '$amount' },
          deposits: { $sum: 1 },
        }
      },
      { $sort: { total: -1 } },
      { $limit: 50 }
    ])

    return { success: true, data: results }
  })

  // POST /api/deposits — registra um depósito (chamado pelo front após gerar o PIX)
  fastify.post('/', async (request, reply) => {
    const { slug, transactionId, userId, userName, userEmail, amount, token, cookieKey, brandSlug, baseDomain } = request.body as any

    if (!slug || !transactionId) {
      return reply.status(400).send({ success: false, message: 'slug e transactionId são obrigatórios' })
    }

    try {
      await Deposit.findOneAndUpdate(
        { transactionId },
        {
          slug,
          transactionId,
          userId: String(userId || ''),
          userName: userName || '',
          userEmail: userEmail || '',
          amount: Number(amount) || 0,
          status: 'pending',
          token: token || '',
          cookieKey: String(cookieKey || ''),
          brandSlug: String(brandSlug || 'bateu'),
          baseDomain: String(baseDomain || 'bet.br'),
        },
        { upsert: true, new: true }
      )
      return { success: true }
    } catch (err: any) {
      fastify.log.error(err)
      return reply.status(500).send({ success: false, message: err.message })
    }
  })

  // PATCH /api/deposits/:transactionId — atualiza status para approved
  fastify.patch('/:transactionId', async (request, reply) => {
    const { transactionId } = request.params as any
    const { status } = request.body as any

    if (!transactionId) return reply.status(400).send({ success: false, message: 'transactionId obrigatório' })

    try {
      await Deposit.findOneAndUpdate({ transactionId }, { $set: { status: status || 'approved' } })
      return { success: true }
    } catch (err: any) {
      return reply.status(500).send({ success: false, message: err.message })
    }
  })

  // GET /api/deposits — lista depósitos (filtro por slug opcional)
  fastify.get('/', async (request) => {
    const { slug } = request.query as any
    const filter = slug ? { slug } : {}
    const deposits = await Deposit.find(filter).sort({ createdAt: -1 }).limit(100)
    return { success: true, data: deposits }
  })
}
