import { ref } from 'vue'

export interface AviatorRound {
  _id: string
  crash_point: number
  created_at: string
}

const HISTORY_PROXY_URL = (limit: number) => `/aviator-history?limit=${limit}`

function normalizeExternalHistory(payload: any, limit: number): AviatorRound[] {
  const data = Array.isArray(payload?.data) ? payload.data : []

  if (data.some((round: any) => round?.crash_point != null || round?.created_at != null)) {
    return data
      .map((round: any, index: number) => ({
        _id: String(round?._id ?? `round-${index}`),
        crash_point: Number(round?.crash_point ?? round?.multiplier ?? round?.winner),
        created_at: String(round?.created_at ?? round?.createdAt ?? new Date().toISOString()),
      }))
      .filter((round: AviatorRound) => Number.isFinite(round.crash_point))
      .sort((a: AviatorRound, b: AviatorRound) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(-limit)
  }

  const normalized: AviatorRound[] = []

  for (const doc of data) {
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

export function useAviatorHistory() {
  const rounds = ref<AviatorRound[]>([])
  const isLoading = ref(false)
  const error = ref('')

  async function fetchHistory(limit = 2000) {
    isLoading.value = true
    error.value = ''
    try {
      const external = await $fetch<any>(HISTORY_PROXY_URL(limit))
      rounds.value = normalizeExternalHistory(external, limit)
    } catch (e: any) {
      error.value = e.message || 'Erro ao carregar histórico'
      console.warn('[aviator-history]', error.value)
    } finally {
      isLoading.value = false
    }
  }

  return { rounds, isLoading, error, fetchHistory }
}
