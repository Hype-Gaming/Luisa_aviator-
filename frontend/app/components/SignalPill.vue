<script setup lang="ts">
const signal = useAviatorSignal()
const history = useAviatorHistory()

const open = ref(true)
let historyInterval: ReturnType<typeof setInterval> | null = null

// Quantas pílulas mostrar na tira de estatísticas
const STRIP_SIZE = 14
// Quantas rodadas o catalogador analisa para as estatísticas
const CATALOG_SIZE = 50

// Cor da pílula por faixa de multiplicador (mesmo esquema do RoundHistory)
function candleColor(v: number): string {
  if (v >= 10) return '#ff4fb3'
  if (v >= 2) return '#8b5cf6'
  return '#3b82f6'
}

function fmt(v: number): string {
  return v >= 10 ? v.toFixed(1) : v.toFixed(2)
}

// Últimas velas (mais recente à esquerda), limitadas ao tamanho da tira
const strip = computed(() =>
  [...history.rounds.value].reverse().slice(0, STRIP_SIZE),
)

// Catalogador: estatísticas das últimas CATALOG_SIZE rodadas
const catalog = computed(() => {
  const sample = history.rounds.value.slice(-CATALOG_SIZE)
  const n = sample.length
  let blue = 0
  let purple = 0
  let pink = 0
  for (const r of sample) {
    if (r.crash_point >= 10) pink++
    else if (r.crash_point >= 2) purple++
    else blue++
  }
  return { n, blue, purple, pink, pinkPct: n ? Math.round((pink / n) * 100) : 0 }
})

// Valor numérico da última vela (usado no banner de status)
const lastValue = computed(() => {
  const last = history.rounds.value.at(-1)
  return last ? fmt(last.crash_point) : '--'
})

// Banner de status derivado do estado do sinal ao vivo
type Banner = { label: string; icon: string; tone: 'green' | 'red' | 'signal' | 'idle'; value: string }

const banner = computed<Banner>(() => {
  switch (signal.status.value) {
    case 'win':
      return { label: 'Green', icon: 'ph:check-fat-fill', tone: 'green', value: lastValue.value }
    case 'loss':
      return { label: 'Red', icon: 'ph:x-circle-fill', tone: 'red', value: lastValue.value }
    case 'signal':
    case 'alert':
      return {
        label: signal.statusLabel.value || 'Entrada confirmada',
        icon: 'ph:target-bold',
        tone: 'signal',
        value: signal.signalText.value || lastValue.value,
      }
    default:
      return { label: 'Aguardando sinal', icon: 'ph:broadcast-bold', tone: 'idle', value: lastValue.value }
  }
})

onMounted(() => {
  signal.connect()
  history.fetchHistory(200)
  historyInterval = setInterval(() => history.fetchHistory(200), 15_000)
})

onUnmounted(() => {
  signal.disconnect()
  if (historyInterval) clearInterval(historyInterval)
})
</script>

<template>
  <div class="sp-wrap">
    <!-- Banner de status -->
    <div class="sp-banner" :class="`sp-${banner.tone}`">
      <span class="sp-banner-label">
        <Icon :name="banner.icon" />
        {{ banner.label }}
      </span>
      <strong class="sp-banner-value">{{ banner.value }}</strong>
    </div>

    <!-- Tira de estatísticas -->
    <div class="sp-stats">
      <button type="button" class="sp-stats-head" @click="open = !open">
        <Icon name="ph:chart-bar-bold" class="sp-stats-icon" />
        <span class="sp-stats-title">ESTATÍSTICAS</span>
        <span class="sp-stats-count">{{ catalog.n }} / {{ CATALOG_SIZE }}</span>
        <span class="sp-stats-spacer" />
        <Icon :name="open ? 'ph:caret-up-bold' : 'ph:caret-down-bold'" class="sp-stats-caret" />
      </button>

      <!-- Catalogador: % rosas + contagem por faixa -->
      <div v-show="open" class="sp-catalog">
        <span class="sp-cat-stat">
          <Icon name="ph:sparkle-fill" />
          {{ catalog.pinkPct }}% rosas
        </span>
        <span class="sp-cat-counts">
          <span class="sp-cat-count" style="--c:#3b82f6" title="Azuis (< 2x)">{{ catalog.blue }}</span>
          <span class="sp-cat-count" style="--c:#8b5cf6" title="Roxas (2–10x)">{{ catalog.purple }}</span>
          <span class="sp-cat-count" style="--c:#ff4fb3" title="Rosas (≥ 10x)">{{ catalog.pink }}</span>
        </span>
      </div>

      <div v-show="open" class="sp-strip">
        <span
          v-for="(r, i) in strip"
          :key="r._id || i"
          class="sp-mult"
          :style="{ '--candle': candleColor(r.crash_point) }"
        >
          {{ fmt(r.crash_point) }}
        </span>
        <span v-if="strip.length === 0" class="sp-strip-empty">Carregando histórico…</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sp-wrap {
  width: 100%;
  display: flex;
  flex-direction: column;
  flex: 0 0 auto;
}

/* ── Banner ── */
.sp-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.5rem 1rem;
  min-height: 44px;
  text-align: center;
  background: #0a0e0a;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.sp-banner-label {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.95rem;
  font-weight: 800;
}

.sp-banner-label svg,
.sp-banner-label .iconify {
  width: 18px !important;
  height: 18px !important;
}

.sp-banner-value {
  font-size: 0.95rem;
  font-weight: 800;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.sp-green {
  background: linear-gradient(180deg, rgba(34, 197, 94, 0.12), #06120a);
}
.sp-green .sp-banner-label,
.sp-green .sp-banner-value { color: #22c55e; }

.sp-red {
  background: linear-gradient(180deg, rgba(239, 68, 68, 0.12), #140707);
}
.sp-red .sp-banner-label,
.sp-red .sp-banner-value { color: #f87171; }

.sp-signal {
  background: linear-gradient(180deg, rgba(226, 26, 130, 0.14), #160710);
}
.sp-signal .sp-banner-label,
.sp-signal .sp-banner-value { color: #ff52a8; }

.sp-idle {
  background: #0c0c10;
}
.sp-idle .sp-banner-label,
.sp-idle .sp-banner-value { color: rgba(255, 255, 255, 0.55); }

/* ── Estatísticas ── */
.sp-stats {
  background: #0c0c10;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.sp-stats-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem 0.85rem;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--av-text, #fff);
  font-family: inherit;
}

.sp-stats-icon {
  width: 16px !important;
  height: 16px !important;
  color: #22c55e;
  flex: 0 0 auto;
}

.sp-stats-title {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: var(--av-text, #fff);
}

.sp-stats-count {
  font-size: 0.7rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.4);
}

.sp-stats-spacer { flex: 1; }

.sp-stats-caret {
  width: 16px !important;
  height: 16px !important;
  color: rgba(255, 255, 255, 0.4);
  flex: 0 0 auto;
}

/* ── Catalogador ── */
.sp-catalog {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 0.85rem 0.5rem;
}

.sp-cat-stat {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.72rem;
  font-weight: 800;
  color: #ff4fb3;
  background: color-mix(in srgb, #ff4fb3, transparent 86%);
  border: 1px solid color-mix(in srgb, #ff4fb3, transparent 55%);
  border-radius: 999px;
  padding: 0.2rem 0.6rem;
  white-space: nowrap;
}

.sp-cat-stat svg,
.sp-cat-stat .iconify {
  width: 13px !important;
  height: 13px !important;
}

.sp-cat-counts {
  display: inline-flex;
  gap: 5px;
  margin-left: auto;
}

.sp-cat-count {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.72rem;
  font-weight: 800;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: var(--c);
  background: color-mix(in srgb, var(--c), transparent 88%);
  border: 1px solid color-mix(in srgb, var(--c), transparent 58%);
  border-radius: 6px;
  padding: 0.18rem 0.45rem;
}

.sp-cat-count::before {
  content: '';
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--c);
}

.sp-strip {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 0 0.85rem 0.6rem;
  overflow-x: auto;
  scrollbar-width: none;
}
.sp-strip::-webkit-scrollbar { display: none; }

.sp-mult {
  flex: 0 0 auto;
  min-width: 38px;
  padding: 0.3rem 0.4rem;
  border-radius: 7px;
  text-align: center;
  font-size: 0.78rem;
  font-weight: 800;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: var(--candle);
  background: color-mix(in srgb, var(--candle), transparent 86%);
  border: 1px solid color-mix(in srgb, var(--candle), transparent 45%);
}

.sp-strip-empty {
  font-size: 0.74rem;
  color: rgba(255, 255, 255, 0.4);
  padding: 0.2rem 0;
}

@media (max-width: 520px) {
  .sp-banner { min-height: 40px; }
  .sp-banner-label,
  .sp-banner-value { font-size: 0.88rem; }
  .sp-mult { min-width: 34px; font-size: 0.74rem; }
}
</style>
