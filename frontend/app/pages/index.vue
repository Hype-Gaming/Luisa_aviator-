<script setup lang="ts">
definePageMeta({
  layout: false,
  alias: ['/dashboard', '/aviador'],
})

const signal = useAviatorSignal()
const history = useAviatorHistory()
const config = useRuntimeConfig()

const latestRound = computed(() => history.rounds.value.at(-1) ?? null)
const lastPinkRound = computed(() => [...history.rounds.value].reverse().find((round) => round.crash_point >= 10) ?? null)
const distanceSincePink = computed(() => {
  const idx = [...history.rounds.value].reverse().findIndex((round) => round.crash_point >= 10)
  return idx < 0 ? null : idx
})
const opportunityScore = computed(() => {
  const distance = distanceSincePink.value ?? 0
  const confidenceBoost = signal.confidence.value - 80
  return Math.max(42, Math.min(96, 58 + distance * 2 + confidenceBoost))
})
const opportunityLabel = computed(() => {
  if (opportunityScore.value >= 78) return 'Oportunidade Alta'
  if (opportunityScore.value >= 58) return 'Oportunidade Moderada'
  return 'Oportunidade Baixa'
})
const lastPinkLabel = computed(() => {
  if (!lastPinkRound.value) return '--'
  return new Date(lastPinkRound.value.created_at).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
})
const pinkRounds = computed(() => history.rounds.value.filter((round) => round.crash_point >= 10))
const latestPinkRounds = computed(() => [...pinkRounds.value].reverse().slice(0, 24))
const maxRound = computed(() => history.rounds.value.reduce((max, round) => Math.max(max, round.crash_point), 0))
const minRound = computed(() => history.rounds.value.reduce((min, round) => Math.min(min, round.crash_point), Number.POSITIVE_INFINITY))
const averageRound = computed(() => {
  if (!history.rounds.value.length) return 0
  const total = history.rounds.value.reduce((sum, round) => sum + round.crash_point, 0)
  return total / history.rounds.value.length
})
const lowRounds = computed(() => history.rounds.value.filter((round) => round.crash_point < 2).length)
const nowLabel = ref('--')
const isGameOpen = ref(false)
const gameUrl = ref('')
const isGameLoading = ref(false)
const gameError = ref('')

type ProbabilityKey = 'ten' | 'thirty' | 'hundred'

interface ProbabilityConfig {
  key: ProbabilityKey
  icon: string
  title: string
  description: string
  label: string
  min: number
  max: number | null
  baseOffset: number
  hotOffset: number
  duration: number
  accent: 'red' | 'pink' | 'violet'
}

interface ProbabilityAnalysis {
  pattern: string
  detail: string
  rateLabel: string
  score: number
  scoreLabel: string
  tone: 'cold' | 'warm' | 'hot'
  windowStart: string
  windowEnd: string
  roundsAnalyzed?: number
  generatedAt?: string
}

const probabilityConfigs: ProbabilityConfig[] = [
  {
    key: 'ten',
    icon: 'ph:sparkle-bold',
    title: 'Probabilidades 10X',
    description: 'Análise de probabilidade para multiplicadores 10X',
    label: '10X+',
    min: 10,
    max: null,
    baseOffset: 2,
    hotOffset: 1,
    duration: 2,
    accent: 'red',
  },
  {
    key: 'thirty',
    icon: 'ph:chart-line-up-bold',
    title: 'Probabilidades 10X a 30X',
    description: 'Análise de probabilidade para multiplicadores de 10X a 30X',
    label: '10X a 30X',
    min: 10,
    max: 30,
    baseOffset: 3,
    hotOffset: 2,
    duration: 2,
    accent: 'pink',
  },
  {
    key: 'hundred',
    icon: 'ph:rocket-launch-bold',
    title: 'Probabilidades 50X a 100X',
    description: 'Análise de probabilidade para multiplicadores de 50X a 100X',
    label: '50X a 100X',
    min: 50,
    max: 100,
    baseOffset: 5,
    hotOffset: 3,
    duration: 3,
    accent: 'violet',
  },
]

const probabilityRequestedAt = reactive<Record<ProbabilityKey, Date | null>>({
  ten: null,
  thirty: null,
  hundred: null,
})
const probabilityResults = reactive<Record<ProbabilityKey, ProbabilityAnalysis | null>>({
  ten: null,
  thirty: null,
  hundred: null,
})
const probabilityLoading = reactive<Record<ProbabilityKey, boolean>>({
  ten: false,
  thirty: false,
  hundred: false,
})
const probabilityErrors = reactive<Record<ProbabilityKey, string>>({
  ten: '',
  thirty: '',
  hundred: '',
})

function formatShortTime(value: Date): string {
  return value.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function addMinutes(value: Date, minutes: number): Date {
  return new Date(value.getTime() + minutes * 60_000)
}

function isInProbabilityRange(value: number, config: ProbabilityConfig): boolean {
  if (value < config.min) return false
  return config.max == null ? true : value <= config.max
}

async function requestProbabilityAnalysis(key: ProbabilityKey) {
  probabilityRequestedAt[key] = new Date()
  probabilityLoading[key] = true
  probabilityErrors[key] = ''

  try {
    const [response] = await Promise.all([
      $fetch<{ success: boolean; key: ProbabilityKey; analysis: ProbabilityAnalysis }>('/probability-analysis', {
        method: 'POST',
        body: {
          key,
          limit: 2000,
          rounds: history.rounds.value,
        },
      }),
      new Promise((resolve) => setTimeout(resolve, 1200)),
    ])

    probabilityResults[key] = response.analysis
  } catch (err: any) {
    probabilityErrors[key] = err?.data?.message || err?.statusMessage || err?.message || 'Não foi possível analisar agora.'
    probabilityResults[key] = buildProbabilityAnalysis(probabilityConfigs.find((config) => config.key === key) ?? probabilityConfigs[0])
  } finally {
    probabilityLoading[key] = false
  }
}

function buildProbabilityAnalysis(config: ProbabilityConfig): ProbabilityAnalysis {
  const rounds = history.rounds.value
  const recentRounds = rounds.slice(-80)
  const targetCount = recentRounds.filter((round) => isInProbabilityRange(round.crash_point, config)).length
  const recentRate = recentRounds.length ? (targetCount / recentRounds.length) * 100 : 0
  const distance = [...rounds].reverse().findIndex((round) => isInProbabilityRange(round.crash_point, config))
  const roundsSinceTarget = distance < 0 ? null : distance
  const requestedAt = probabilityRequestedAt[config.key]
  const baseTime = requestedAt ?? new Date()
  const pressure = roundsSinceTarget ?? Math.min(recentRounds.length, 18)
  const windowStart = addMinutes(baseTime, pressure >= 12 ? config.hotOffset : config.baseOffset)
  const windowEnd = addMinutes(windowStart, config.duration)

  let pattern = 'Aguardando histórico.'
  let detail = 'Carregando rodadas para calcular o padrão.'
  let tone: ProbabilityAnalysis['tone'] = 'cold'

  if (rounds.length > 0 && roundsSinceTarget == null) {
    pattern = 'Sem alvo recente.'
    detail = `Nenhum ${config.label} apareceu no histórico carregado.`
    tone = 'hot'
  } else if (roundsSinceTarget != null && roundsSinceTarget >= 14) {
    pattern = 'Padrão forte.'
    detail = `Último ${config.label} foi há ${roundsSinceTarget} rodadas.`
    tone = 'hot'
  } else if (roundsSinceTarget != null && roundsSinceTarget >= 8) {
    pattern = 'Padrão aquecendo.'
    detail = `Último ${config.label} foi há ${roundsSinceTarget} rodadas.`
    tone = 'warm'
  } else if (roundsSinceTarget != null) {
    pattern = 'Padrão normal.'
    detail = `Último ${config.label} foi há ${roundsSinceTarget} rodadas.`
  }

  const baseScore = config.min >= 50 ? 44 : config.max ? 52 : 58
  const distanceScore = Math.min(34, pressure * (config.min >= 50 ? 1.3 : 2))
  const rateScore = Math.min(14, recentRate * (config.min >= 50 ? 2.4 : 0.9))
  const score = Math.round(Math.max(34, Math.min(96, baseScore + distanceScore + rateScore)))
  const scoreLabel = score >= 78 ? 'Alta' : score >= 58 ? 'Moderada' : 'Baixa'

  return {
    pattern,
    detail,
    rateLabel: recentRounds.length ? `${recentRate.toFixed(1)}% nas últimas ${recentRounds.length}` : '--',
    score,
    scoreLabel,
    tone,
    windowStart: formatShortTime(windowStart),
    windowEnd: formatShortTime(windowEnd),
  }
}

const probabilityAnalyses = computed(() => {
  return probabilityConfigs.reduce((acc, config) => {
    acc[config.key] = probabilityResults[config.key] ?? buildProbabilityAnalysis(config)
    return acc
  }, {} as Record<ProbabilityKey, ProbabilityAnalysis>)
})

const tenXAnalysisRequestedAt = computed(() => probabilityRequestedAt.ten)
const tenXAnalysis = computed(() => probabilityAnalyses.value.ten)

function requestTenXAnalysis() {
  requestProbabilityAnalysis('ten')
}

function extractGameUrl(data: any): string | null {
  if (data?.game_url) return data.game_url

  if (data?.payload?.gameURL) {
    const url = data.payload.gameURL
    if (url.startsWith('<!') || url.startsWith('<html')) return null
    return url
  }

  if (data?.payload?.launchOptions?.game_url) return data.payload.launchOptions.game_url

  return null
}

async function loadGame() {
  const token = localStorage.getItem('access_token') || localStorage.getItem('userToken')
  const cookieKey = localStorage.getItem('cookie_key') || localStorage.getItem('cookieKey')
  const sessionExpiresAt = Number(localStorage.getItem('sessionExpiresAt') || '0')

  gameUrl.value = ''

  if (!token || !cookieKey || (sessionExpiresAt > 0 && Date.now() > sessionExpiresAt - 60_000)) {
    gameError.value = 'Sua sessão expirou. Faça login novamente.'
    return
  }

  try {
    isGameLoading.value = true
    gameError.value = ''

    const data = await $fetch<any>('https://routes-eb.grupoautoma.com/api/start-game/', {
      params: {
        slug: 'spribe/aviator',
        platform: 'WEB',
        use_demo: '0',
      },
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Cactus-Cookie-Key': cookieKey,
      },
    })

    const url = extractGameUrl(data)

    if (!url) {
      gameError.value = 'Não foi possível obter a URL do jogo.'
      return
    }

    gameUrl.value = url
  } catch (err: any) {
    const status = err?.response?.status || err?.statusCode
    if (status === 401 || status === 403) {
      gameError.value = 'Sua sessão expirou. Faça login novamente.'
    } else {
      gameError.value = err?.data?.message || err?.message || 'Erro ao carregar o jogo.'
    }
  } finally {
    isGameLoading.value = false
  }
}

function toggleGame() {
  isGameOpen.value = !isGameOpen.value
  if (isGameOpen.value && !isGameLoading.value) {
    loadGame()
  }
}

useHead({
  title: 'Luisa Aviator - Aviator Prime',
  meta: [
    { name: 'description', content: 'Dashboard Aviator Prime com sinais em tempo real, histórico de velas e análise estatística.' },
    { name: 'theme-color', content: '#050507' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1' },
  ],
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap' },
  ]
})

let historyInterval: ReturnType<typeof setInterval> | null = null
let clockInterval: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  signal.connect()
  await history.fetchHistory(2000)
  historyInterval = setInterval(() => history.fetchHistory(2000), 20_000)
  const updateClock = () => {
    nowLabel.value = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }
  updateClock()
  clockInterval = setInterval(updateClock, 30_000)
})

onUnmounted(() => {
  signal.disconnect()
  if (historyInterval) clearInterval(historyInterval)
  if (clockInterval) clearInterval(clockInterval)
})
</script>

<template>
  <main class="dashboard-shell">
    <div class="dashboard-inner">
      <section class="dashboard-header glass-card">
        <div class="header-title-row">
          <div class="brand-lockup">
            <img src="/luisa-logo.png" alt="Luisa Aviator" class="dashboard-logo">
            <div>
              <h1>Dashboard Aviator Prime</h1>
              <p>Análise Estatística Avançada</p>
            </div>
          </div>
          <div class="status-pill">
            <Icon name="ph:broadcast-bold" />
            <span>{{ signal.statusLabel.value }}</span>
          </div>
        </div>

        <div class="dashboard-actions">
          <button class="refresh-btn" type="button" :disabled="history.isLoading.value" @click="history.fetchHistory(2000)">
            <Icon v-if="history.isLoading.value" name="svg-spinners:90-ring-with-bg" />
            <Icon v-else name="ph:arrows-clockwise-bold" />
            <span>ATUALIZAR</span>
          </button>
          <div class="metric-chip pink-chip">
            <small>Última rosa</small>
            <strong>{{ lastPinkLabel }}</strong>
          </div>
          <div class="metric-chip">
            <small>Atualizado</small>
            <strong>{{ nowLabel }}</strong>
          </div>
          <button class="sound-chip" type="button" aria-label="Alternar som">
            <Icon name="ph:speaker-slash-bold" />
          </button>
        </div>
      </section>

      <section class="game-collapsible">
        <button class="play-card" type="button" @click="toggleGame">
          <span>
            <Icon name="ph:game-controller-bold" />
            <strong>{{ isGameOpen ? 'Minimizar Jogo' : 'Jogar Aviator Prime' }}</strong>
          </span>
          <Icon :name="isGameOpen ? 'ph:caret-up-bold' : 'ph:caret-down-bold'" />
        </button>
        <div v-if="isGameOpen" class="game-frame glass-card">
          <div v-if="isGameLoading" class="game-frame-state">
            <Icon name="svg-spinners:90-ring-with-bg" />
            <strong>Carregando Aviator Prime</strong>
          </div>

          <div v-else-if="gameError" class="game-frame-state">
            <Icon name="ph:warning-circle-bold" />
            <strong>{{ gameError }}</strong>
            <div class="game-frame-actions">
              <button type="button" class="primary-btn" @click="loadGame">Tentar novamente</button>
              <NuxtLink to="/auth" class="secondary-btn">Fazer login</NuxtLink>
            </div>
          </div>

          <iframe
            v-else-if="gameUrl"
            :src="gameUrl"
            class="game-frame-iframe"
            title="Aviator Prime"
            allow="autoplay; fullscreen; clipboard-write"
            allowfullscreen
            frameborder="0"
          />
        </div>
      </section>

      <a :href="config.public.telegramLink" target="_blank" rel="noopener noreferrer" class="live-card">
        <div class="live-orb">
          <Icon name="ph:broadcast-bold" />
        </div>
        <div class="live-copy">
          <div>
            <strong>Lives ao Vivo</strong>
          </div>
          <p>Todos os dias ao vivo, confira os horários no canal</p>
        </div>
        <div class="telegram-btn">
          <Icon name="ph:telegram-logo-fill" />
          <span>Acessar Canal</span>
        </div>
      </a>

      <a href="https://go.aff.bateu.bet.br/1bpk3rbp?utm_campaign=aplicativo" target="_blank" rel="noopener noreferrer" class="book-card">
        O histórico do jogo e da Casa <strong>Bateu Bet</strong>, casa 100% regulamentada,
        <span>abra clicando aqui</span>
        <Icon name="ph:arrow-square-out-bold" />
      </a>

      <section class="opportunity-card">
        <div class="op-icon">
          <Icon name="ph:warning-bold" />
        </div>
        <div class="op-copy">
          <div class="op-title-row">
            <strong>{{ opportunityLabel }}</strong>
            <span>{{ opportunityScore }}/100</span>
          </div>
          <p>
            Distância atual:
            {{ distanceSincePink == null ? '--' : distanceSincePink }}
            rodadas - Zona frequente ativa
          </p>
        </div>
      </section>

      <section class="analysis-grid probability-grid">
        <article
          v-for="card in probabilityConfigs"
          :key="card.key"
          class="analysis-card analysis-card-live"
          :class="[`analysis-${card.accent}`, `analysis-${probabilityAnalyses[card.key].tone}`]"
        >
          <div class="analysis-head">
            <Icon :name="card.icon" />
            <div>
              <h2>{{ card.title }}</h2>
              <p>{{ card.description }}</p>
            </div>
          </div>

          <div v-if="probabilityLoading[card.key]" class="analysis-scanning">
            <div class="scan-radar">
              <Icon name="ph:radar-bold" />
            </div>
            <div class="scan-copy">
              <strong>Analisando padrão</strong>
              <span>Consultando histórico da API</span>
            </div>
            <div class="scan-lines">
              <span />
              <span />
              <span />
            </div>
          </div>

          <div v-else-if="probabilityRequestedAt[card.key]" class="analysis-result">
            <div class="analysis-result-top">
              <div class="analysis-result-line">
                <Icon name="ph:chart-bar-bold" />
                <span>{{ probabilityAnalyses[card.key].pattern }}</span>
              </div>
              <span class="analysis-score">
                {{ probabilityAnalyses[card.key].scoreLabel }}
                {{ probabilityAnalyses[card.key].score }}/100
              </span>
            </div>

            <p>{{ probabilityAnalyses[card.key].detail }}</p>
            <small>Frequência: {{ probabilityAnalyses[card.key].rateLabel }}</small>
            <small v-if="probabilityAnalyses[card.key].roundsAnalyzed">
              API: {{ probabilityAnalyses[card.key].roundsAnalyzed }} rodadas analisadas
            </small>
            <small v-if="probabilityErrors[card.key]" class="analysis-error">
              {{ probabilityErrors[card.key] }}
            </small>

            <div class="analysis-entry">
              <div>
                <Icon name="ph:target-bold" />
                <span>Sugestão de entrada:</span>
              </div>
              <strong>
                <Icon name="ph:alarm-bold" />
                {{ probabilityAnalyses[card.key].windowStart }}
                <Icon name="ph:arrow-right-bold" />
                {{ probabilityAnalyses[card.key].windowEnd }}
              </strong>
            </div>
          </div>

          <div v-else class="analysis-preview">
            <span>
              <small>Alvo</small>
              <strong>{{ card.label }}</strong>
            </span>
            <span>
              <small>Leitura</small>
              <strong>{{ probabilityAnalyses[card.key].scoreLabel }}</strong>
            </span>
          </div>

          <button type="button" :disabled="probabilityLoading[card.key]" @click="requestProbabilityAnalysis(card.key)">
            <Icon v-if="probabilityLoading[card.key]" name="svg-spinners:90-ring-with-bg" />
            <Icon v-else name="ph:sparkle-bold" />
            <span>
              {{ probabilityLoading[card.key]
                ? 'Analisando'
                : probabilityRequestedAt[card.key] ? 'Atualizar Análise' : 'Solicitar Análise' }}
            </span>
          </button>
        </article>
      </section>

      <section class="analysis-grid legacy-analysis">
        <article class="analysis-card analysis-card-live">
          <Icon name="ph:sparkle-bold" />
          <h2>Probabilidades 10X</h2>
          <p>Análise de probabilidade para multiplicadores 10X</p>

          <div v-if="tenXAnalysisRequestedAt" class="analysis-result">
            <div class="analysis-result-line">
              <Icon name="ph:chart-bar-bold" />
              <span>{{ tenXAnalysis.pattern }}</span>
            </div>
            <p>{{ tenXAnalysis.detail }}</p>
            <small>Frequência: {{ tenXAnalysis.rateLabel }}</small>

            <div class="analysis-entry">
              <div>
                <Icon name="ph:target-bold" />
                <span>Sugestão de entrada:</span>
              </div>
              <strong>
                <Icon name="ph:alarm-bold" />
                {{ tenXAnalysis.windowStart }}
                <Icon name="ph:arrow-right-bold" />
                {{ tenXAnalysis.windowEnd }}
              </strong>
            </div>
          </div>

          <button type="button" @click="requestTenXAnalysis">
            <Icon name="ph:sparkle-bold" />
            <span>{{ tenXAnalysisRequestedAt ? 'Atualizar Análise' : 'Solicitar Análise' }}</span>
          </button>
        </article>
        <article class="analysis-card">
          <Icon name="ph:chart-line-up-bold" />
          <h2>Probabilidades 10X a 30X</h2>
          <p>Análise de probabilidade para multiplicadores de 10X a 30X</p>
          <button type="button">
            <Icon name="ph:sparkle-bold" />
            <span>Solicitar Análise</span>
          </button>
        </article>
        <article class="analysis-card">
          <Icon name="ph:rocket-launch-bold" />
          <h2>Probabilidades 50X a 100X</h2>
          <p>Análise de probabilidade para multiplicadores de 50X a 100X</p>
          <button type="button">
            <Icon name="ph:sparkle-bold" />
            <span>Solicitar Análise</span>
          </button>
        </article>
      </section>

      <section class="dashboard-grid">
        <div class="dashboard-main-column">
          <div class="pink-panel glass-card">
            <div class="section-title">
              <Icon name="ph:sparkle-bold" />
              <h2>Velas Rosas (10x+)</h2>
              <strong>{{ pinkRounds.length }}</strong>
            </div>
            <div v-if="latestPinkRounds.length" class="pink-grid">
              <span v-for="round in latestPinkRounds" :key="round._id">
                {{ round.crash_point.toFixed(1) }}x
              </span>
            </div>
            <p v-else class="empty-note">Nenhuma vela rosa encontrada.</p>
          </div>

          <RoundHistory
            :rounds="history.rounds.value"
            :is-loading="history.isLoading.value"
          />
        </div>

        <aside class="stats-column">
          <div class="stats-card glass-card">
            <div class="section-title compact">
              <Icon name="ph:squares-four-bold" />
              <h2>Indicadores Estatísticos</h2>
            </div>
            <div class="stats-grid">
              <span><small>Média</small><strong>{{ averageRound.toFixed(2) }}x</strong></span>
              <span><small>Máximo</small><strong>{{ maxRound.toFixed(2) }}x</strong></span>
              <span><small>Mínimo</small><strong>{{ Number.isFinite(minRound) ? minRound.toFixed(2) : '0.00' }}x</strong></span>
              <span><small>Baixas</small><strong>{{ lowRounds }}</strong></span>
            </div>
          </div>

          <div class="stats-card glass-card">
            <div class="section-title compact">
              <Icon name="ph:chart-bar-bold" />
              <h2>Distâncias Mais Frequentes</h2>
            </div>
            <div class="distance-list">
              <span v-for="distance in [4, 7, 9, 13, 18]" :key="distance">
                <strong>{{ distance }}</strong>
                <small>rodadas</small>
              </span>
            </div>
          </div>
        </aside>
      </section>

      <footer class="av-footer">
        <p>Luisa Aviator | Análise estatística do histórico</p>
        <p>Esta ferramenta analisa exclusivamente dados históricos. Não constitui incentivo ou recomendação.</p>
      </footer>
    </div>
  </main>
</template>

<style scoped>
/* ============================================================
   DESIGN SYSTEM — clean dark, no glass / no backdrop-filter
   Card bg: #141418  |  Border: rgba(255,255,255,0.08)  |  Radius: 14px
   Accent red: #e21a82  |  Pink: #ff65b7  |  Muted: rgba(255,255,255,0.45)
   ============================================================ */

/* ── Entry Animations ───────────────────────────────────────── */
@keyframes slide-up-fade {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes shimmer-sweep {
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
}

@keyframes orb-ring {
  0%   { transform: scale(1);   opacity: 0.6; }
  100% { transform: scale(2.4); opacity: 0; }
}

@keyframes scan-pulse {
  0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 var(--analysis-accent-soft, rgba(226, 26, 130, 0.18)); }
  50% { transform: scale(1.06); box-shadow: 0 0 0 10px rgba(255, 255, 255, 0); }
}

@keyframes scan-line {
  0% { transform: translateX(-110%); opacity: 0; }
  20% { opacity: 1; }
  100% { transform: translateX(110%); opacity: 0; }
}

@keyframes scan-dots {
  0%, 100% { opacity: 0.35; transform: translateY(0); }
  50% { opacity: 1; transform: translateY(-2px); }
}

/* ── Shell & Layout ─────────────────────────────────────────── */
.dashboard-shell {
  width: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 0.75rem 0.75rem calc(6rem + env(safe-area-inset-bottom));
  overflow-x: hidden;
}

.dashboard-inner {
  width: min(1800px, 100%);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
}

/* ── Base card ──────────────────────────────────────────────── */
.glass-card {
  background: var(--av-surface);
  border: 1px solid var(--av-border-subtle);
  border-radius: 14px;
}

/* ── Staggered entry for dashboard sections ─────────────────── */
.dashboard-header    { animation: slide-up-fade 0.4s ease both 0s; }
.game-collapsible    { animation: slide-up-fade 0.4s ease both 0.14s; }
.live-card           { animation: slide-up-fade 0.4s ease both 0.2s; }
.book-card           { animation: slide-up-fade 0.4s ease both 0.26s; }
.opportunity-card    { animation: slide-up-fade 0.4s ease both 0.32s; }
.analysis-grid       { animation: slide-up-fade 0.4s ease both 0.38s; }
.dashboard-grid      { animation: slide-up-fade 0.4s ease both 0.44s; }
.av-footer           { animation: slide-up-fade 0.4s ease both 0.5s; }

/* ── Dashboard Header ───────────────────────────────────────── */
.dashboard-header {
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  min-width: 0;
}

.header-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-width: 0;
}

.brand-lockup {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  min-width: 0;
}

.dashboard-logo {
  width: 44px;
  height: 44px;
  object-fit: contain;
  border-radius: 10px;
  background: transparent;
  padding: 0.15rem;
  flex: 0 0 auto;
}

.dashboard-header h1 {
  font-size: 1.05rem;
  line-height: 1.15;
  font-weight: 900;
  color: var(--av-text);
  overflow-wrap: anywhere;
}

.dashboard-header p {
  margin-top: 0.2rem;
  color: var(--av-text-muted);
  font-size: 0.72rem;
}

/* ── Status Pill ────────────────────────────────────────────── */
.status-pill {
  display: none;
  align-items: center;
  gap: 0.45rem;
  border: 1px solid rgba(34, 197, 94, 0.28);
  background: rgba(34, 197, 94, 0.08);
  color: #22c55e;
  border-radius: 999px;
  padding: 0.4rem 0.75rem;
  font-size: 0.78rem;
  font-weight: 700;
  white-space: nowrap;
}

.status-pill svg,
.status-pill .iconify {
  width: 14px !important;
  height: 14px !important;
}

/* ── Dashboard Actions Row ──────────────────────────────────── */
.dashboard-actions {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  overflow-x: auto;
  padding-bottom: 0.1rem;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.dashboard-actions::-webkit-scrollbar {
  display: none;
}

.refresh-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  height: 42px;
  min-width: 44px;
  padding: 0 0.85rem;
  border-radius: 10px;
  background: #e21a82;
  color: #fff;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  white-space: nowrap;
  border: none;
  cursor: pointer;
  transition: opacity 0.15s;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.refresh-btn svg,
.refresh-btn .iconify {
  width: 16px !important;
  height: 16px !important;
}

.refresh-btn span {
  display: none;
}

/* ── Metric Chip ────────────────────────────────────────────── */
.metric-chip {
  min-height: 42px;
  display: inline-flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.08rem;
  border: 1px solid var(--av-border-subtle);
  border-radius: 10px;
  background: var(--av-glass);
  padding: 0 0.75rem;
  white-space: nowrap;
}

.metric-chip small {
  color: var(--av-text-muted);
  font-size: 0.62rem;
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.metric-chip strong {
  color: var(--av-text);
  font-size: 0.82rem;
  font-weight: 800;
}

/* ── Pink Chip ──────────────────────────────────────────────── */
.pink-chip {
  display: inline-flex;
  align-items: flex-start;
  color: #ff65b7;
  border-color: rgba(255, 101, 183, 0.35);
  background: rgba(255, 101, 183, 0.08);
}

.pink-chip small {
  color: rgba(255, 101, 183, 0.65);
}

.pink-chip strong {
  color: #ff65b7;
}

/* ── Sound Chip ─────────────────────────────────────────────── */
.sound-chip {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 10px;
  flex: 0 0 auto;
  border: 1px solid var(--av-border-subtle);
  background: var(--av-glass);
  color: var(--av-text-muted);
  cursor: pointer;
}

.sound-chip svg,
.sound-chip .iconify {
  width: 16px !important;
  height: 16px !important;
}

/* ── Game Collapsible ───────────────────────────────────────── */
.game-collapsible {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* ── Play Card ──────────────────────────────────────────────── */
.play-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
  min-height: 50px;
  padding: 0 1.1rem;
  border-radius: 14px;
  background: var(--av-surface);
  border: 1px solid rgba(226, 26, 130, 0.35);
  color: var(--av-text);
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 700;
  transition: border-color 0.15s;
}

.play-card:hover {
  border-color: rgba(226, 26, 130, 0.6);
}

.play-card span {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  min-width: 0;
}

.play-card svg,
.play-card .iconify {
  color: #e21a82;
  width: 18px !important;
  height: 18px !important;
}

/* ── Game Frame ─────────────────────────────────────────────── */
.game-frame {
  height: min(72vh, 720px);
  min-height: 420px;
  display: grid;
  place-items: center;
  overflow: hidden;
  padding: 0;
  text-align: center;
  color: var(--av-text-muted);
}

.game-frame-state {
  display: grid;
  place-items: center;
  align-content: center;
  gap: 0.75rem;
  width: 100%;
  height: 100%;
  padding: 1.25rem;
}

.game-frame-iframe {
  width: 100%;
  height: 100%;
  border: 0;
  background: #000;
}

.game-frame-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.6rem;
  width: 100%;
}

.game-frame-actions .primary-btn,
.game-frame-actions .secondary-btn {
  min-height: 44px;
  border-radius: 10px;
  padding: 0 1rem;
  border: 0;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 800;
  text-decoration: none;
  cursor: pointer;
}

.game-frame-actions .primary-btn {
  background: #e21a82;
  color: #fff;
}

.game-frame-actions .secondary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--av-border-subtle);
  background: var(--av-glass);
  color: var(--av-text);
}

.game-frame svg,
.game-frame .iconify {
  color: #e21a82;
  width: 24px !important;
  height: 24px !important;
}

.game-frame strong {
  color: var(--av-text);
  font-size: 1rem;
  font-weight: 800;
}

.game-frame p {
  font-size: 0.82rem;
  line-height: 1.5;
  max-width: 26ch;
}

/* ── Live Card ──────────────────────────────────────────────── */
.live-card {
  position: relative;
  overflow: hidden;
  border-radius: 14px;
  border: 1px solid rgba(226, 26, 130, 0.35);
  min-height: 110px;
  padding: 1rem 1.25rem;
  display: grid;
  grid-template-columns: 52px 1fr auto;
  align-items: center;
  gap: 1rem;
  background: linear-gradient(110deg, #1a0d1e 0%, #2a0e1a 55%, #1f0c10 100%);
  text-decoration: none;
  color: #fff;
  min-width: 0;
}

/* ── Live Orb ───────────────────────────────────────────────── */
.live-orb {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(226, 26, 130, 0.18);
  border: 1px solid rgba(226, 26, 130, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ff7478;
  flex-shrink: 0;
}

.live-orb::before,
.live-orb::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1.5px solid rgba(226, 26, 130, 0.5);
  animation: orb-ring 2s ease-out infinite;
}

.live-orb::after {
  animation-delay: 1s;
}

.live-orb svg,
.live-orb .iconify {
  width: 18px !important;
  height: 18px !important;
}

/* ── Live Copy ──────────────────────────────────────────────── */
.live-copy div {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
}

.live-copy strong {
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--av-text);
  overflow-wrap: anywhere;
}

.live-copy span {
  padding: 0.22rem 0.55rem;
  border-radius: 999px;
  background: rgba(226, 26, 130, 0.25);
  color: #ffd1d3;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.live-copy p {
  margin-top: 0.4rem;
  color: var(--av-text-muted);
  font-size: 0.82rem;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

/* ── Telegram Button ────────────────────────────────────────── */
.telegram-btn {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  border-radius: 12px;
  background: #229ed9;
  color: #fff;
  min-height: 44px;
  padding: 0 0.9rem;
  font-size: 0.82rem;
  font-weight: 800;
  white-space: nowrap;
  min-width: 0;
}

.telegram-btn svg,
.telegram-btn .iconify {
  width: 16px !important;
  height: 16px !important;
}

/* ── Book Card ──────────────────────────────────────────────── */
.book-card {
  display: block;
  border-radius: 14px;
  background: linear-gradient(
    105deg,
    #e21a82 0%,
    #e21a82 40%,
    rgba(255, 180, 182, 0.35) 50%,
    #e21a82 60%,
    #e21a82 100%
  );
  background-size: 200% auto;
  color: #fff;
  padding: 1rem 1.25rem;
  text-align: center;
  font-size: 0.875rem;
  line-height: 1.5;
  text-decoration: none;
  animation: shimmer-sweep 3.5s linear infinite;
  overflow-wrap: anywhere;
}

.book-card span {
  text-decoration: underline;
  font-weight: 800;
}

.book-card svg,
.book-card .iconify {
  display: inline-block;
  vertical-align: -2px;
  width: 16px !important;
  height: 16px !important;
}

/* ── Opportunity Card ───────────────────────────────────────── */
.opportunity-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-radius: 14px;
  background: var(--av-surface);
  border: 1px solid rgba(249, 115, 22, 0.35);
  min-width: 0;
}

.op-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: rgba(249, 115, 22, 0.14);
  border: 1px solid rgba(249, 115, 22, 0.22);
  color: #fb923c;
  flex-shrink: 0;
}

.op-icon svg,
.op-icon .iconify {
  width: 18px !important;
  height: 18px !important;
}

.op-copy {
  flex: 1;
  min-width: 0;
}

.op-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.op-title-row strong {
  color: #fb923c;
  font-size: 0.95rem;
  font-weight: 800;
  min-width: 0;
  overflow-wrap: anywhere;
}

.op-title-row span {
  border-radius: 999px;
  background: rgba(249, 115, 22, 0.14);
  color: #ffd3ad;
  font-size: 0.72rem;
  font-weight: 800;
  padding: 0.22rem 0.65rem;
  white-space: nowrap;
}

.op-copy p {
  margin-top: 0.4rem;
  color: var(--av-text-muted);
  font-size: 0.82rem;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

/* ── Analysis Grid ──────────────────────────────────────────── */
.analysis-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}

.legacy-analysis {
  display: none;
}

.analysis-card {
  padding: 1.1rem 1.25rem;
  border-radius: 14px;
  background: var(--av-surface);
  border: 1px solid var(--av-border-subtle);
  min-width: 0;
}

.analysis-card-live {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.analysis-card-live::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 3px;
  background: var(--analysis-accent, #e21a82);
}

.analysis-red {
  --analysis-accent: #e21a82;
  --analysis-accent-soft: rgba(226, 26, 130, 0.14);
  --analysis-accent-border: rgba(226, 26, 130, 0.3);
}

.analysis-pink {
  --analysis-accent: #ff65b7;
  --analysis-accent-soft: rgba(255, 101, 183, 0.14);
  --analysis-accent-border: rgba(255, 101, 183, 0.3);
}

.analysis-violet {
  --analysis-accent: #8b5cf6;
  --analysis-accent-soft: rgba(139, 92, 246, 0.14);
  --analysis-accent-border: rgba(139, 92, 246, 0.3);
}

.analysis-hot {
  border-color: var(--analysis-accent-border);
  box-shadow: 0 0 24px color-mix(in srgb, var(--analysis-accent), transparent 82%);
}

.analysis-head {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  min-width: 0;
}

.analysis-head > svg,
.analysis-head > .iconify {
  flex: 0 0 auto;
  width: 24px !important;
  height: 24px !important;
  color: var(--analysis-accent, #e21a82);
}

.analysis-head div {
  min-width: 0;
}

.analysis-card > svg,
.analysis-card > .iconify {
  color: #e21a82;
  width: 24px !important;
  height: 24px !important;
  margin-bottom: 0.65rem;
}

.analysis-card h2 {
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--av-text);
  margin-bottom: 0.5rem;
  overflow-wrap: anywhere;
}

.analysis-card p {
  color: var(--av-text-muted);
  margin: 0 0 1rem;
  line-height: 1.5;
  font-size: 0.82rem;
}

.analysis-result {
  display: grid;
  gap: 0.55rem;
  margin: 0;
  padding: 0.85rem;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.045);
  border: 1px solid rgba(255, 255, 255, 0.075);
  color: var(--av-text);
  min-width: 0;
}

.analysis-scanning {
  position: relative;
  overflow: hidden;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  align-items: center;
  gap: 0.75rem;
  min-height: 124px;
  margin: 0;
  padding: 0.9rem;
  border-radius: 10px;
  background:
    linear-gradient(100deg, rgba(255,255,255,0.03), var(--analysis-accent-soft, rgba(226, 26, 130, 0.14)), rgba(255,255,255,0.03));
  border: 1px solid var(--analysis-accent-border, rgba(255, 255, 255, 0.075));
  color: var(--av-text);
}

.scan-radar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--analysis-accent-soft, rgba(226, 26, 130, 0.14));
  color: var(--analysis-accent, #e21a82);
  animation: scan-pulse 1.4s ease-in-out infinite;
}

.scan-radar svg,
.scan-radar .iconify {
  width: 20px !important;
  height: 20px !important;
}

.scan-copy {
  display: grid;
  gap: 0.25rem;
  min-width: 0;
}

.scan-copy strong {
  color: var(--av-text);
  font-size: 0.9rem;
  font-weight: 900;
}

.scan-copy span {
  color: var(--av-text-muted);
  font-size: 0.76rem;
}

.scan-copy strong::after {
  content: '...';
  display: inline-block;
  width: 1.2rem;
  animation: scan-dots 0.85s ease-in-out infinite;
}

.scan-lines {
  grid-column: 1 / -1;
  display: grid;
  gap: 0.35rem;
  padding-top: 0.2rem;
}

.scan-lines span {
  position: relative;
  overflow: hidden;
  height: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
}

.scan-lines span::before {
  content: '';
  position: absolute;
  inset: 0;
  width: 62%;
  border-radius: inherit;
  background: linear-gradient(90deg, transparent, var(--analysis-accent, #e21a82), transparent);
  animation: scan-line 1.1s ease-in-out infinite;
}

.scan-lines span:nth-child(2)::before {
  animation-delay: 0.16s;
}

.scan-lines span:nth-child(3)::before {
  animation-delay: 0.32s;
}

.analysis-result-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.7rem;
  min-width: 0;
}

.analysis-result-line {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.84rem;
  color: var(--av-text);
}

.analysis-result-line svg,
.analysis-result-line .iconify,
.analysis-entry svg,
.analysis-entry .iconify {
  flex: 0 0 auto;
  width: 16px !important;
  height: 16px !important;
}

.analysis-result-line span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.analysis-score {
  flex: 0 0 auto;
  border-radius: 999px;
  background: var(--analysis-accent-soft, rgba(226, 26, 130, 0.14));
  border: 1px solid var(--analysis-accent-border, rgba(226, 26, 130, 0.3));
  color: var(--analysis-accent, #e21a82);
  padding: 0.2rem 0.55rem;
  font-size: 0.68rem;
  font-weight: 900;
  line-height: 1.25;
  white-space: nowrap;
}

.analysis-result p {
  margin: 0;
  color: var(--av-text);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.8rem;
}

.analysis-result small {
  color: var(--av-text-muted);
  font-size: 0.72rem;
}

.analysis-error {
  color: #fca5a5 !important;
}

.analysis-entry {
  display: grid;
  gap: 0.55rem;
  padding-top: 0.4rem;
}

.analysis-entry div,
.analysis-entry strong {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.analysis-entry div {
  color: var(--av-text);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.82rem;
}

.analysis-entry strong {
  flex-wrap: wrap;
  color: var(--analysis-accent, #ff52a8);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 1.15rem;
  line-height: 1.25;
}

.analysis-preview {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
  margin-top: auto;
}

.analysis-preview span {
  display: grid;
  gap: 0.2rem;
  border-radius: 10px;
  background: var(--analysis-accent-soft, rgba(226, 26, 130, 0.12));
  border: 1px solid var(--analysis-accent-border, rgba(226, 26, 130, 0.24));
  padding: 0.65rem;
  min-width: 0;
}

.analysis-preview small {
  color: var(--av-text-muted);
  font-size: 0.68rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.analysis-preview strong {
  color: var(--analysis-accent, #e21a82);
  font-size: 0.9rem;
  font-weight: 900;
  overflow-wrap: anywhere;
}

.analysis-card button {
  width: 100%;
  min-height: 50px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  background: #e21a82;
  color: #fff;
  font-weight: 800;
  font-size: 0.95rem;
  border: none;
  cursor: pointer;
  transition: background 0.15s, transform 0.15s;
  text-align: center;
}

.analysis-card button svg,
.analysis-card button .iconify {
  width: 20px !important;
  height: 20px !important;
  flex-shrink: 0;
}

.analysis-card button:hover {
  background: #ef292d;
  transform: translateY(-1px);
}

.analysis-card button:disabled {
  opacity: 0.72;
  cursor: wait;
  transform: none;
}

/* ── Dashboard Grid ─────────────────────────────────────────── */
.dashboard-grid {
  display: grid;
  gap: 1rem;
}

.dashboard-main-column,
.stats-column {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* ── Pink Panel (Velas Rosas) ───────────────────────────────── */
.pink-panel {
  padding: 1rem 1.25rem;
}

/* ── Stats Card ─────────────────────────────────────────────── */
.stats-card {
  padding: 1rem 1.25rem;
}

/* ── Section Title ──────────────────────────────────────────── */
.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.9rem;
}

.section-title h2 {
  flex: 1;
  min-width: 0;
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--av-text);
}

.section-title svg,
.section-title .iconify {
  color: #ff65b7;
  flex: 0 0 auto;
  width: 18px !important;
  height: 18px !important;
}

.section-title > strong {
  color: #ff65b7;
  font-size: 0.875rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.section-title.compact h2 {
  font-size: 0.875rem;
}

/* ── Pink Grid ──────────────────────────────────────────────── */
.pink-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.45rem;
  max-height: 180px;
  overflow: auto;
}

.pink-grid span {
  border-radius: 8px;
  background: rgba(236, 72, 153, 0.12);
  border: 1px solid rgba(236, 72, 153, 0.28);
  color: #ffd6ef;
  padding: 0.5rem 0.25rem;
  text-align: center;
  font-weight: 800;
  font-size: 0.82rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.empty-note {
  color: var(--av-text-muted);
  text-align: center;
  font-size: 0.82rem;
  padding: 0.75rem 0;
}

/* ── Stats Grid ─────────────────────────────────────────────── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
}

.stats-grid span {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  border: 1px solid var(--av-border-subtle);
  background: var(--av-glass);
  border-radius: 10px;
  padding: 0.75rem;
}

.stats-grid small {
  display: block;
  color: var(--av-text-muted);
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.stats-grid strong {
  display: block;
  color: var(--av-text);
  font-size: 1rem;
  font-weight: 800;
}

/* ── Distance List ──────────────────────────────────────────── */
.distance-list {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.distance-list span {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border: 1px solid var(--av-border-subtle);
  background: var(--av-glass);
  border-radius: 10px;
  padding: 0.65rem 0.85rem;
}

.distance-list small {
  color: var(--av-text-muted);
  font-size: 0.72rem;
}

.distance-list strong {
  color: #e21a82;
  font-size: 1rem;
  font-weight: 800;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

/* ── Footer ─────────────────────────────────────────────────── */
.av-footer {
  text-align: center;
  font-size: 0.72rem;
  color: var(--av-text-muted);
  line-height: 1.65;
  padding-top: 0.5rem;
}

html.light-mode .dashboard-shell {
  color: #15151c;
}

html.light-mode .glass-card,
html.light-mode .play-card,
html.light-mode .opportunity-card,
html.light-mode .analysis-card {
  background: #ffffff;
  border-color: rgba(15, 18, 28, 0.09);
  box-shadow: 0 14px 34px rgba(15, 18, 28, 0.07);
}

html.light-mode .dashboard-logo {
  background: #050507;
}

html.light-mode .dashboard-header h1,
html.light-mode .metric-chip strong,
html.light-mode .play-card,
html.light-mode .game-frame strong,
html.light-mode .analysis-card h2,
html.light-mode .section-title h2,
html.light-mode .stats-grid strong {
  color: #15151c;
}

html.light-mode .dashboard-header p,
html.light-mode .metric-chip small,
html.light-mode .game-frame,
html.light-mode .op-copy p,
html.light-mode .analysis-card p,
html.light-mode .empty-note,
html.light-mode .distance-list small,
html.light-mode .av-footer {
  color: #677183;
}

html.light-mode .metric-chip,
html.light-mode .sound-chip,
html.light-mode .stats-grid span,
html.light-mode .distance-list span {
  background: #f5f7fb;
  border-color: rgba(15, 18, 28, 0.08);
}

html.light-mode .sound-chip {
  color: #677183;
}

html.light-mode .pink-chip {
  background: rgba(236, 72, 153, 0.1);
  border-color: rgba(236, 72, 153, 0.24);
}

html.light-mode .play-card:hover {
  border-color: rgba(226, 26, 130, 0.45);
  background: #fff8f8;
}

html.light-mode .game-frame {
  background: #ffffff;
}

html.light-mode .game-frame-actions .secondary-btn {
  background: #f5f7fb;
  border-color: rgba(15, 18, 28, 0.1);
  color: #313744;
}

html.light-mode .live-card {
  background: linear-gradient(110deg, #fff5f6 0%, #ffffff 48%, #f5f8ff 100%);
  border-color: rgba(226, 26, 130, 0.18);
  color: #15151c;
  box-shadow: 0 14px 34px rgba(15, 18, 28, 0.07);
}

html.light-mode .live-copy strong {
  color: #15151c;
}

html.light-mode .live-copy p {
  color: #677183;
}

html.light-mode .live-orb {
  background: rgba(226, 26, 130, 0.1);
}

html.light-mode .op-title-row span {
  background: rgba(249, 115, 22, 0.12);
  color: #9a4b10;
}

html.light-mode .analysis-result {
  background: #f5f7fb;
  border-color: rgba(15, 18, 28, 0.08);
}

html.light-mode .analysis-scanning {
  background: linear-gradient(100deg, #f5f7fb, var(--analysis-accent-soft, rgba(226, 26, 130, 0.12)), #f5f7fb);
}

html.light-mode .analysis-preview span {
  background: #f5f7fb;
}

html.light-mode .analysis-result-line,
html.light-mode .analysis-result p,
html.light-mode .scan-copy strong,
html.light-mode .analysis-entry div {
  color: #15151c;
}

html.light-mode .pink-grid span {
  background: rgba(236, 72, 153, 0.09);
  color: #bf2c7d;
}

html.light-mode :deep(.rh-time) {
  color: rgba(21, 21, 28, 0.55);
}

/* ── Media Query: 640px ─────────────────────────────────────── */
@media (min-width: 640px) {
  .dashboard-shell {
    padding: 1rem 1rem calc(6rem + env(safe-area-inset-bottom));
  }

  .status-pill {
    display: inline-flex;
  }

  .refresh-btn span {
    display: inline;
  }

  .pink-grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}

@media (max-width: 520px) {
  .dashboard-shell {
    padding: 0.6rem 0.6rem calc(5.5rem + env(safe-area-inset-bottom));
  }

  .dashboard-inner {
    gap: 0.75rem;
  }

  .dashboard-header,
  .pink-panel,
  .stats-card,
  .analysis-card {
    padding: 0.9rem;
    border-radius: 12px;
  }

  .header-title-row {
    align-items: flex-start;
  }

  .dashboard-logo {
    width: 38px;
    height: 38px;
    border-radius: 9px;
  }

  .dashboard-header h1 {
    font-size: 0.98rem;
  }

  .dashboard-header p {
    font-size: 0.7rem;
  }

  .metric-chip {
    min-width: 112px;
    padding: 0 0.65rem;
  }

  .refresh-btn,
  .sound-chip {
    width: 42px;
    flex: 0 0 42px;
    padding: 0;
  }

  .live-card {
    grid-template-columns: 44px minmax(0, 1fr);
    gap: 0.8rem;
    padding: 0.95rem;
  }

  .game-frame {
    height: calc(100dvh - 132px);
    min-height: 520px;
    border-radius: 12px;
  }

  .live-orb {
    width: 42px;
    height: 42px;
  }

  .telegram-btn {
    grid-column: 1 / -1;
    width: 100%;
    justify-content: center;
  }

  .book-card {
    padding: 0.9rem;
    font-size: 0.82rem;
  }

  .opportunity-card {
    align-items: flex-start;
    padding: 0.9rem;
    gap: 0.75rem;
  }

  .op-icon {
    width: 42px;
    height: 42px;
  }

  .op-title-row {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.4rem;
  }

  .analysis-card button {
    min-height: 46px;
    font-size: 0.88rem;
  }

  .analysis-result-top {
    flex-direction: column;
    gap: 0.5rem;
  }

  .analysis-score {
    align-self: flex-start;
  }

  .analysis-entry strong {
    font-size: 1rem;
  }

  .section-title {
    align-items: flex-start;
  }

  .section-title h2 {
    font-size: 0.88rem;
  }

  .pink-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .stats-grid {
    gap: 0.5rem;
  }

  .stats-grid span {
    padding: 0.65rem;
  }
}

/* ── Media Query: 920px ─────────────────────────────────────── */
@media (min-width: 920px) {
  .dashboard-shell {
    padding: 1.25rem 1.25rem 2rem;
  }

  .dashboard-header {
    padding: 1rem 1.25rem;
  }

  .dashboard-header h1 {
    font-size: 1.1rem;
  }

  .analysis-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .analysis-card {
    display: flex;
    flex-direction: column;
  }

  .analysis-card button {
    margin-top: auto;
  }

  .dashboard-grid {
    grid-template-columns: minmax(0, 1.45fr) minmax(300px, 0.55fr);
    align-items: start;
  }

  .stats-column {
    position: sticky;
    top: 90px;
  }

  .live-card {
    grid-template-columns: 52px 1fr auto;
  }
}
</style>
