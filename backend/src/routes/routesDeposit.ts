import { FastifyInstance } from 'fastify'
import { Deposit } from '../models/Deposit.js'

const ROUTES_API = process.env.ROUTES_API_BASE || 'https://routes-eb.grupoautoma.com'

function getAuthHeaders(request: any) {
  const authorization = request.headers.authorization as string | undefined
  const cookieKey = request.headers['x-cactus-cookie-key'] as string | undefined
  const brandSlug = (request.headers['x-brand-slug'] as string | undefined) || 'bateu'
  const baseDomain = (request.headers['x-base-domain'] as string | undefined) || 'bet.br'

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Brand-Slug': brandSlug,
    'X-Base-Domain': baseDomain,
  }

  if (authorization) headers.Authorization = authorization
  if (cookieKey) headers['X-Cactus-Cookie-Key'] = cookieKey

  return { headers, authorization, cookieKey, brandSlug, baseDomain }
}

function normalizeDepositPayload(payload: any, amount: number) {
  const data = payload?.data || payload || {}
  const transactionId = String(
    data.transaction_id ||
    data.transactionId ||
    data.id ||
    ''
  )

  return {
    transaction_id: transactionId,
    qr_code: data.qr_code || data.qrcode || data.qrCode || '',
    br_code: data.br_code || data.brcode || data.copy_paste || data.pix_code || '',
    amount,
    user_id: data.user_id || data.userId || '',
  }
}

export default async function routesDepositRoutes(fastify: FastifyInstance) {
  fastify.post('/', async (request, reply) => {
    const body = request.body as any
    const rawAmount = Number(String(body?.amount || '').replace(',', '.'))
    const amount = Number.isFinite(rawAmount) && rawAmount > 0 ? rawAmount : 0

    if (amount <= 0) {
      return reply.status(400).send({ success: false, message: 'Valor de deposito invalido.' })
    }

    const { headers, authorization, cookieKey, brandSlug, baseDomain } = getAuthHeaders(request)
    if (!authorization) {
      return reply.status(401).send({ success: false, message: 'Token de autorizacao ausente.' })
    }
    if (!cookieKey) {
      return reply.status(401).send({ success: false, message: 'Cookie key ausente.' })
    }

    try {
      const res = await fetch(`${ROUTES_API}/api/deposit`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ amount: String(amount) }),
      })
      const payload = await res.json() as any

      if (!res.ok) {
        return reply.status(res.status).send({
          success: false,
          message: payload?.message || payload?.error || 'Erro ao gerar PIX.',
          data: payload,
        })
      }

      const pix = normalizeDepositPayload(payload, amount)
      if (!pix.transaction_id) {
        return reply.status(502).send({
          success: false,
          message: 'Resposta de deposito sem transacao.',
          data: payload,
        })
      }

      await Deposit.findOneAndUpdate(
        { transactionId: pix.transaction_id },
        {
          slug: body?.slug || brandSlug,
          transactionId: pix.transaction_id,
          userId: String(body?.user_id || pix.user_id || ''),
          userName: body?.user_name || '',
          userEmail: body?.user_email || '',
          amount,
          status: 'pending',
          token: authorization.replace(/^Bearer\s+/i, ''),
          cookieKey: String(cookieKey || ''),
          brandSlug,
          baseDomain,
        },
        { upsert: true, new: true }
      )

      return reply.send(pix)
    } catch (err: any) {
      fastify.log.error(err)
      return reply.status(500).send({ success: false, message: err.message || 'Erro inesperado ao gerar PIX.' })
    }
  })

  fastify.get('/:transactionId/status', async (request, reply) => {
    const params = request.params as any
    const transactionId = String(params?.transactionId || '')
    if (!transactionId) {
      return reply.status(400).send({ success: false, message: 'transaction_id obrigatorio.' })
    }

    const { headers } = getAuthHeaders(request)

    try {
      const res = await fetch(`${ROUTES_API}/api/deposit/${encodeURIComponent(transactionId)}/status`, { headers })
      const payload = await res.json() as any
      const status = payload?.data?.status || payload?.status || 'pending'

      if (status === 'approved' || status === 'completed' || status === 'PAID') {
        await Deposit.findOneAndUpdate({ transactionId }, { $set: { status: 'approved' } })
      } else if (status === 'expired' || status === 'failed' || status === 'cancelled') {
        await Deposit.findOneAndUpdate({ transactionId }, { $set: { status } })
      }

      return reply.status(res.ok ? 200 : res.status).send({
        success: res.ok,
        status,
        ...(payload?.data || payload),
      })
    } catch (err: any) {
      fastify.log.error(err)
      return reply.status(500).send({ success: false, message: err.message || 'Erro ao consultar deposito.' })
    }
  })
}
