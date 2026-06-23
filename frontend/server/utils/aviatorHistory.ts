export interface AviatorRound {
  _id: string
  crash_point: number
  created_at: string
  color?: string
  source?: string
}

const EXTERNAL_HISTORY_URL = 'https://casino-data.grupoautoma.com/results'
const DEFAULT_LIMIT = 2000
const MAX_LIMIT = 2000

// O upstream agrupa as rodadas por `date`, mas o array `results` é um buffer rolante
// (mais novo → mais velho) que dá a VOLTA na meia-noite: a cauda contém o fim do dia
// ANTERIOR ainda carimbado com a data de hoje. Concatenar `date + Hora` cru faz as
// rodadas de ontem à noite parecerem as mais recentes. Aqui detectamos a virada e
// recuamos a data, fixando o fuso de Brasília (-03:00) pra ordenação ficar correta.
const BRT_OFFSET = '-03:00'

function horaToSeconds(hora: string): number {
  const [h, m, s] = hora.split(':').map((n) => Number(n))
  return (h || 0) * 3600 + (m || 0) * 60 + (s || 0)
}

function shiftIsoDate(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`)
  if (!Number.isFinite(d.getTime())) return isoDate
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function toFiniteLimit(value: unknown): number {
  const parsed = Number(value ?? DEFAULT_LIMIT)
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT
  return Math.min(Math.floor(parsed), MAX_LIMIT)
}

export function resolveAviatorLimit(value: unknown): number {
  return toFiniteLimit(value)
}

export function normalizeAviatorHistory(payload: any, limit = DEFAULT_LIMIT): AviatorRound[] {
  const safeLimit = toFiniteLimit(limit)
  const data = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : []

  if (data.some((round: any) => round?.crash_point != null || round?.created_at != null)) {
    return data
      .map((round: any, index: number) => ({
        _id: String(round?._id ?? `round-${index}`),
        crash_point: Number(round?.crash_point ?? round?.multiplier ?? round?.winner),
        created_at: String(round?.created_at ?? round?.createdAt ?? new Date().toISOString()),
        color: round?.color,
        source: round?.source,
      }))
      .filter((round: AviatorRound) => Number.isFinite(round.crash_point))
      .sort((a: AviatorRound, b: AviatorRound) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(-safeLimit)
  }

  const normalized: AviatorRound[] = []

  for (const doc of data) {
    const date = String(doc?.date || '')
    const results = Array.isArray(doc?.results) ? doc.results : []

    // results vem do mais novo pro mais velho; ao percorrer, quando a hora SOBE em vez
    // de descer, cruzamos a meia-noite indo pro passado → recua um dia.
    let dayOffset = 0
    let prevSecs: number | null = null

    results.forEach((result: any, index: number) => {
      const time = String(result?.Hora || '00:00:00')
      const secs = horaToSeconds(time)
      if (prevSecs !== null && secs > prevSecs) dayOffset -= 1
      prevSecs = secs

      const crashPoint = Number(result?.multiplier ?? result?.winner)
      if (!Number.isFinite(crashPoint)) return

      const realDate = date ? shiftIsoDate(date, dayOffset) : ''
      normalized.push({
        _id: `${doc?._id || date || 'external'}-${index}`,
        crash_point: crashPoint,
        created_at: realDate ? `${realDate}T${time}${BRT_OFFSET}` : new Date().toISOString(),
        color: result?.color,
        source: 'casino-data',
      })
    })
  }

  return normalized
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(-safeLimit)
}

async function fetchFromExternal(limit: number): Promise<{ data: AviatorRound[]; source: string }> {
  const response = await $fetch<any>(EXTERNAL_HISTORY_URL, {
    query: {
      collection: 'spribe',
      game: 'aviatorlotogreen',
      limit,
    },
    headers: {
      accept: 'application/json, text/plain, */*',
      'accept-language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      'cache-control': 'no-cache',
      pragma: 'no-cache',
      referer: 'https://casino-data.grupoautoma.com/',
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36',
    },
  })

  return {
    data: normalizeAviatorHistory(response, limit),
    source: 'casino-data',
  }
}

export async function fetchAviatorHistory(limit: number): Promise<{ data: AviatorRound[]; source: string; warning?: string }> {
  try {
    return await fetchFromExternal(limit)
  } catch (error: any) {
    return {
      data: [],
      source: 'empty',
      warning: error?.statusMessage || error?.message || 'Historico indisponivel.',
    }
  }
}
