type ProbabilityKey = 'ten' | 'thirty' | 'hundred'

interface ProbabilityConfig {
  key: ProbabilityKey
  label: string
  min: number
  max: number | null
  baseOffset: number
  hotOffset: number
  duration: number
}

interface AviatorRound {
  _id: string
  crash_point: number
  created_at: string
}

const configs: Record<ProbabilityKey, ProbabilityConfig> = {
  ten: { key: 'ten', label: '10X+', min: 10, max: null, baseOffset: 2, hotOffset: 1, duration: 2 },
  thirty: { key: 'thirty', label: '10X a 30X', min: 10, max: 30, baseOffset: 3, hotOffset: 2, duration: 2 },
  hundred: { key: 'hundred', label: '50X a 100X', min: 50, max: 100, baseOffset: 5, hotOffset: 3, duration: 3 },
}

function normalizeExternalHistory(payload: any, limit: number): AviatorRound[] {
  const normalized: AviatorRound[] = []

  for (const doc of Array.isArray(payload?.data) ? payload.data : []) {
    const date = String(doc?.date || '')
    const results = Array.isArray(doc?.results) ? doc.results : []

    results.forEach((result: any, index: number) => {
      const crashPoint = Number(result?.multiplier ?? result?.winner)
      if (!Number.isFinite(crashPoint)) return

      const time = String(result?.Hora || '00:00:00')
      normalized.push({
        _id: `${doc?._id || date || 'external'}-${index}`,
        crash_point: crashPoint,
        created_at: date ? `${date}T${time}` : new Date().toISOString(),
      })
    })
  }

  return normalized
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(-limit)
}

function isInRange(value: number, config: ProbabilityConfig): boolean {
  if (value < config.min) return false
  return config.max == null ? true : value <= config.max
}

function formatShortTime(value: Date): string {
  return value.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

function addMinutes(value: Date, minutes: number): Date {
  return new Date(value.getTime() + minutes * 60_000)
}

function analyze(config: ProbabilityConfig, rounds: AviatorRound[], requestedAt: Date) {
  const recentRounds = rounds.slice(-80)
  const targetCount = recentRounds.filter((round) => isInRange(round.crash_point, config)).length
  const recentRate = recentRounds.length ? (targetCount / recentRounds.length) * 100 : 0
  const distance = [...rounds].reverse().findIndex((round) => isInRange(round.crash_point, config))
  const roundsSinceTarget = distance < 0 ? null : distance
  const pressure = roundsSinceTarget ?? Math.min(recentRounds.length, 18)
  const windowStart = addMinutes(requestedAt, pressure >= 12 ? config.hotOffset : config.baseOffset)
  const windowEnd = addMinutes(windowStart, config.duration)

  let pattern = 'Aguardando historico.'
  let detail = 'Carregando rodadas para calcular o padrao.'
  let tone: 'cold' | 'warm' | 'hot' = 'cold'

  if (rounds.length > 0 && roundsSinceTarget == null) {
    pattern = 'Sem alvo recente.'
    detail = `Nenhum ${config.label} apareceu no historico carregado.`
    tone = 'hot'
  } else if (roundsSinceTarget != null && roundsSinceTarget >= 14) {
    pattern = 'Padrao forte.'
    detail = `Ultimo ${config.label} foi ha ${roundsSinceTarget} rodadas.`
    tone = 'hot'
  } else if (roundsSinceTarget != null && roundsSinceTarget >= 8) {
    pattern = 'Padrao aquecendo.'
    detail = `Ultimo ${config.label} foi ha ${roundsSinceTarget} rodadas.`
    tone = 'warm'
  } else if (roundsSinceTarget != null) {
    pattern = 'Padrao normal.'
    detail = `Ultimo ${config.label} foi ha ${roundsSinceTarget} rodadas.`
  }

  const baseScore = config.min >= 50 ? 44 : config.max ? 52 : 58
  const distanceScore = Math.min(34, pressure * (config.min >= 50 ? 1.3 : 2))
  const rateScore = Math.min(14, recentRate * (config.min >= 50 ? 2.4 : 0.9))
  const score = Math.round(Math.max(34, Math.min(96, baseScore + distanceScore + rateScore)))
  const scoreLabel = score >= 78 ? 'Alta' : score >= 58 ? 'Moderada' : 'Baixa'

  return {
    pattern,
    detail,
    rateLabel: recentRounds.length ? `${recentRate.toFixed(1)}% nas ultimas ${recentRounds.length}` : '--',
    score,
    scoreLabel,
    tone,
    windowStart: formatShortTime(windowStart),
    windowEnd: formatShortTime(windowEnd),
    roundsAnalyzed: rounds.length,
    generatedAt: requestedAt.toISOString(),
  }
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ key?: ProbabilityKey; limit?: number; rounds?: AviatorRound[] }>(event)
  const key = body?.key ?? 'ten'
  const config = configs[key]

  if (!config) {
    throw createError({ statusCode: 400, statusMessage: 'Faixa de analise invalida.' })
  }

  const parsedLimit = Number(body?.limit ?? 2000)
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 2000
  const requestedAt = new Date()
  let rounds = Array.isArray(body?.rounds)
    ? body.rounds
        .map((round) => ({
          _id: String(round?._id ?? ''),
          crash_point: Number(round?.crash_point),
          created_at: String(round?.created_at ?? ''),
        }))
        .filter((round) => Number.isFinite(round.crash_point))
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .slice(-limit)
    : []

  if (rounds.length === 0) {
    const history = await fetchAviatorHistory(limit)
    rounds = history.data
  }

  return {
    success: true,
    key,
    analysis: analyze(config, rounds, requestedAt),
  }
})
