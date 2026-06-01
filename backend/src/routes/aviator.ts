import { FastifyPluginAsync } from 'fastify'
import { AviatorRoundModel } from '../models/AviatorRound.js'

const EXTERNAL_HISTORY_URL = 'https://casino-data.grupoautoma.com/results?collection=spribe&game=aviatorlotogreen&limit=2000'

type NormalizedRound = {
  _id: string
  crash_point: number
  created_at: string
  color?: string
  source?: string
}

function normalizeExternalHistory(payload: any, limit: number): NormalizedRound[] {
  const rounds: NormalizedRound[] = []

  for (const doc of Array.isArray(payload?.data) ? payload.data : []) {
    const date = String(doc?.date || '')
    const results = Array.isArray(doc?.results) ? doc.results : []

    results.forEach((result: any, index: number) => {
      const multiplier = Number(result?.multiplier ?? result?.winner)
      if (!Number.isFinite(multiplier)) return

      const time = String(result?.Hora || '00:00:00')
      const createdAt = date ? `${date}T${time}` : new Date().toISOString()

      rounds.push({
        _id: `${doc?._id || date || 'external'}-${index}`,
        crash_point: multiplier,
        created_at: createdAt,
        color: result?.color,
        source: 'casino-data',
      })
    })
  }

  return rounds
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(-limit)
}

async function fetchExternalHistory(limit: number): Promise<NormalizedRound[]> {
  const res = await fetch(EXTERNAL_HISTORY_URL, {
    headers: {
      Accept: 'application/json, text/plain, */*',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari',
    },
  })

  if (!res.ok) {
    throw new Error(`Historico externo retornou ${res.status}`)
  }

  return normalizeExternalHistory(await res.json(), limit)
}

const aviatorRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/history', async (req, reply) => {
    const limit = Math.min(Number((req.query as any).limit) || 30, 2000)

    try {
      const rounds = await AviatorRoundModel
        .find({})
        .sort({ created_at: -1 })
        .limit(limit)
        .lean()

      if (rounds.length > 0) {
        return reply.send({ success: true, data: rounds.reverse(), source: 'mongo' })
      }

      const externalRounds = await fetchExternalHistory(limit)
      return reply.send({ success: true, data: externalRounds, source: 'casino-data' })
    } catch (e: any) {
      req.log.warn({ err: e }, 'Falha ao carregar historico Aviator')
      return reply.send({
        success: true,
        data: [],
        source: 'empty',
        warning: e.message || 'Historico indisponivel',
      })
    }
  })
}

export default aviatorRoutes
