<script setup lang="ts">
useHead({ title: 'Simulador de Banca - Luisa Aviator' })

const bankValue = ref(1000)
const activeTab = ref<'simulador' | 'projecao'>('simulador')
const riskProfile = ref<'conservador' | 'moderado' | 'agressivo'>('moderado')

const dailyGoalPct = computed(() => {
  const pcts = { conservador: 0.025, moderado: 0.045, agressivo: 0.08 }
  return pcts[riskProfile.value]
})

const dailyGoal = computed(() => (bankValue.value * dailyGoalPct.value).toFixed(2))

// Bet panels
const betPanels = ref([
  { label: 'Aposta Principal', tab: 'aposta' as 'aposta' | 'automatico', value: 35, autoBet: false, autoCashout: '1.75' },
  { label: 'Proteção', tab: 'aposta' as 'aposta' | 'automatico', value: 15, autoBet: false, autoCashout: '7.00' },
])

const quickAmounts = [10, 20, 50, 100]

const riskProfiles = [
  { key: 'conservador', label: 'Conservador', range: '2-3% ao dia', icon: 'ph:shield-check-bold', iconColor: '#34d399' },
  { key: 'moderado', label: 'Moderado', range: '4-5% ao dia', icon: 'ph:trend-up-bold', iconColor: '#e21a82' },
  { key: 'agressivo', label: 'Agressivo', range: '6-10% ao dia', icon: 'ph:fire-bold', iconColor: '#f97316' },
]

const bancaFormatted = computed(() =>
  Number(bankValue.value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
)
const goalFormatted = computed(() =>
  Number(dailyGoal.value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
)

// Projeção tab
const projScenario = ref<'otimista' | 'realista' | 'pessimista'>('realista')
const scenarioRates = { otimista: 0.05, realista: 0.035, pessimista: 0.02 }
const metaRate = 0.05

const projMonth = ref(new Date().getMonth())
const projYear = ref(new Date().getFullYear())

const projMonthLabel = computed(() => {
  const d = new Date(projYear.value, projMonth.value, 1)
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    .replace(/^\w/, c => c.toUpperCase())
    .replace(' de ', ' De ')
})

function prevMonth() {
  if (projMonth.value === 0) { projMonth.value = 11; projYear.value-- }
  else projMonth.value--
}
function nextMonth() {
  if (projMonth.value === 11) { projMonth.value = 0; projYear.value++ }
  else projMonth.value++
}

const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

const projectionRows = computed(() => {
  const rate = scenarioRates[projScenario.value]
  const daysInMonth = new Date(projYear.value, projMonth.value + 1, 0).getDate()
  const rows = []
  let banca = bankValue.value
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(projYear.value, projMonth.value, d)
    const dayName = weekdays[date.getDay()]
    const dateStr = `${String(d).padStart(2, '0')}/${String(projMonth.value + 1).padStart(2, '0')}`
    const meta = banca * metaRate
    const gain = banca * rate
    const finalBanca = banca + gain
    rows.push({ day: d, dayName, dateStr, saldoInicial: banca, meta, saldoFinal: finalBanca })
    banca = finalBanca
  }
  return rows
})

const projFinalBalance = computed(() => {
  const rows = projectionRows.value
  return rows.length ? rows[rows.length - 1].saldoFinal : bankValue.value
})

const projGain = computed(() => projFinalBalance.value - bankValue.value)

const today = new Date()
function isToday(row: { day: number }) {
  return projYear.value === today.getFullYear() && projMonth.value === today.getMonth() && row.day === today.getDate()
}

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>

<template>
  <main class="banca-page">
    <!-- Page Header -->
    <div class="banca-header">
      <h1>Simulador de Banca</h1>
      <p>Simule sua evolução de banca e veja projeções</p>
    </div>

    <!-- Stats Bar -->
    <div class="banca-stats-bar">
      <div class="banca-stats-glow" aria-hidden="true" />
      <div class="banca-stat">
        <span class="stat-label">
          <span class="stat-icon-wrap red"><Icon name="ph:wallet-bold" class="stat-icon" /></span>
          Banca Simulada
        </span>
        <strong class="stat-value red">R$ {{ bancaFormatted }}</strong>
      </div>
      <div class="banca-stat">
        <span class="stat-label">
          <span class="stat-icon-wrap blue"><Icon name="ph:target-bold" class="stat-icon" /></span>
          Meta Diária
        </span>
        <strong class="stat-value blue">R$ {{ goalFormatted }}</strong>
      </div>
    </div>

    <!-- Tab switcher -->
    <div class="banca-tabs">
      <button class="banca-tab" :class="{ active: activeTab === 'simulador' }" type="button" @click="activeTab = 'simulador'">
        <Icon name="ph:calculator-bold" /> Simulador
      </button>
      <button class="banca-tab" :class="{ active: activeTab === 'projecao' }" type="button" @click="activeTab = 'projecao'">
        <Icon name="ph:trend-up-bold" /> Projeção
      </button>
    </div>

    <!-- ══════════════ SIMULADOR ══════════════ -->
    <div v-if="activeTab === 'simulador'" class="banca-body">

      <!-- Valor da Banca -->
      <div class="banca-field">
        <label class="banca-label">Valor da Banca (R$)</label>
        <div class="banca-input-wrap">
          <span class="banca-input-prefix">R$</span>
          <input v-model.number="bankValue" type="number" min="1" class="banca-input" placeholder="1000">
        </div>
      </div>

      <!-- Perfil de Risco -->
      <div class="banca-field">
        <label class="banca-label">Perfil de Risco</label>
        <div class="risk-grid">
          <button
            v-for="profile in riskProfiles"
            :key="profile.key"
            type="button"
            class="risk-card"
            :class="{ active: riskProfile === profile.key }"
            @click="riskProfile = profile.key as any"
          >
            <div class="risk-icon-wrap" :style="{ background: profile.key === riskProfile ? `${profile.iconColor}22` : 'rgba(255,255,255,0.06)' }">
              <Icon :name="profile.icon" :style="{ color: profile.iconColor }" />
            </div>
            <strong>{{ profile.label }}</strong>
            <span>{{ profile.range }}</span>
          </button>
        </div>
      </div>

      <!-- Bet Panels (loop) -->
      <div class="bet-grid">
        <div v-for="(panel, idx) in betPanels" :key="idx" class="bet-panel">
          <span class="bet-panel-label">{{ panel.label }}</span>

          <div class="bet-panel-tabs">
            <button class="bet-tab" :class="{ active: panel.tab === 'aposta' }" type="button" @click="panel.tab = 'aposta'">Aposta</button>
            <button class="bet-tab" :class="{ active: panel.tab === 'automatico' }" type="button" @click="panel.tab = 'automatico'">Automático</button>
          </div>

          <div class="bet-stepper">
            <button class="step-btn" type="button" @click="panel.value = Math.max(1, panel.value - 1)">
              <Icon name="ph:minus-bold" />
            </button>
            <input v-model.number="panel.value" type="number" class="step-input" min="1">
            <button class="step-btn" type="button" @click="panel.value++">
              <Icon name="ph:plus-bold" />
            </button>
          </div>

          <div class="bet-quick-row">
            <button
              v-for="amt in quickAmounts"
              :key="amt"
              class="quick-chip"
              :class="{ active: panel.value === amt }"
              type="button"
              @click="panel.value = amt"
            >
              {{ amt }}
            </button>
          </div>

          <button class="bet-action-btn" type="button">
            <span>Aposta</span>
            <strong>{{ panel.value.toFixed(2) }} BRL</strong>
          </button>

          <div class="bet-bottom-row">
            <div class="auto-bet-toggle">
              <span class="auto-label">Aposta<br>automática</span>
              <button class="toggle-btn" type="button" :class="{ on: panel.autoBet }" @click="panel.autoBet = !panel.autoBet">
                <span class="toggle-thumb" />
              </button>
            </div>
            <div class="levantar-auto">
              <span class="auto-label">Levantar<br>Auto</span>
              <div class="levantar-pill">
                <input v-model="panel.autoCashout" type="text" class="levantar-input">
                <span class="levantar-x">&times;</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recommended values bar -->
      <div class="banca-recommended">
        <span>Valores recomendados:</span>
        <span class="rec-red">Proteção 1.75x–2.5x</span>
        <span class="rec-dot">&bull;</span>
        <span class="rec-blue">Buscar 7x–12x</span>
      </div>
    </div>

    <!-- ══════════════ PROJEÇÃO ══════════════ -->
    <div v-else class="banca-body">
      <div class="proj-section-title">
        <Icon name="ph:lightning-bold" class="proj-title-icon" />
        Projeção Mensal
      </div>

      <!-- Controls card -->
      <div class="proj-controls-card">
        <div class="proj-controls">
          <div class="proj-month-nav">
            <button type="button" class="month-nav-btn" @click="prevMonth"><Icon name="ph:caret-left-bold" /></button>
            <span class="month-pill">{{ projMonthLabel }}</span>
            <button type="button" class="month-nav-btn" @click="nextMonth"><Icon name="ph:caret-right-bold" /></button>
          </div>
          <div class="proj-scenarios">
            <button
              v-for="s in (['otimista', 'realista', 'pessimista'] as const)"
              :key="s"
              type="button"
              class="scenario-btn"
              :class="{ active: projScenario === s }"
              @click="projScenario = s"
            >
              {{ s.charAt(0).toUpperCase() + s.slice(1) }}
            </button>
          </div>
        </div>

        <!-- Projected final balance -->
        <div class="proj-final">
          <div class="proj-final-text">
            <span class="proj-final-label">Saldo final projetado</span>
            <strong class="proj-final-value">R$ {{ fmt(projFinalBalance) }}</strong>
            <span class="proj-final-gain">+R$ {{ fmt(projGain) }} no mês</span>
          </div>
        </div>
      </div>

      <!-- Table -->
      <div class="proj-table-wrap">
        <table class="proj-table">
          <thead>
            <tr>
              <th>Dia</th>
              <th>Data</th>
              <th>Saldo Inicial</th>
              <th>Meta</th>
              <th>Saldo Final</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in projectionRows" :key="row.day" :class="{ 'today-row': isToday(row) }">
              <td class="td-day">{{ String(row.day).padStart(2, '0') }}</td>
              <td class="td-date"><span class="td-weekday">{{ row.dayName }},</span>{{ row.dateStr }}</td>
              <td>R$ {{ fmt(row.saldoInicial) }}</td>
              <td class="td-meta">+R$ {{ fmt(row.meta) }}</td>
              <td class="td-final">R$ {{ fmt(row.saldoFinal) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </main>
</template>

<style scoped>
/* ============================================================
   BANCA PAGE — Simulador + Projeção
   ============================================================ */

/* Hide number-input spinners globally for this page */
input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type="number"] { -moz-appearance: textfield; }

.banca-page {
  width: min(900px, 100%);
  margin: 0 auto;
  padding: 0 0 6rem;
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

/* ── Header ──────────────────────────────────────────────────── */
.banca-header h1 {
  font-size: 1.35rem;
  font-weight: 800;
  color: #fff;
  margin: 0 0 0.2rem;
}

.banca-header p {
  font-size: 0.82rem;
  color: rgba(255, 255, 255, 0.45);
  margin: 0;
}

/* ── Stats Bar ───────────────────────────────────────────────── */
.banca-stats-bar {
  position: relative;
  overflow: hidden;
  background: #0f0b0b;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 16px;
  padding: 1.25rem 2rem;
  display: flex;
  align-items: center;
  justify-content: space-evenly;
}

.banca-stats-glow {
  position: absolute;
  top: 0;
  left: 0;
  width: 50%;
  height: 100%;
  background: linear-gradient(to right, rgba(140, 15, 15, 0.45) 0%, transparent 100%);
  pointer-events: none;
}

.banca-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  flex: 1;
  text-align: center;
  position: relative;
  z-index: 1;
}

.stat-label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 600;
}

.stat-icon-wrap {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.stat-icon-wrap.red  { background: rgba(226, 26, 130, 0.18); }
.stat-icon-wrap.blue { background: rgba(59, 130, 246, 0.18); }

.stat-icon-wrap .stat-icon {
  width: 13px !important;
  height: 13px !important;
}

.stat-icon-wrap.red  .stat-icon { color: #e21a82 !important; }
.stat-icon-wrap.blue .stat-icon { color: #3b82f6 !important; }

.stat-value {
  font-size: 1.65rem;
  font-weight: 900;
  line-height: 1;
}

.stat-value.red  { color: #e21a82; }
.stat-value.blue { color: #3b82f6; }

/* ── Tabs ────────────────────────────────────────────────────── */
.banca-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: #141418;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 0.3rem;
  gap: 0.3rem;
}

.banca-tab {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  height: 40px;
  border-radius: 10px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.85rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.banca-tab.active {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.banca-tab svg,
.banca-tab .iconify {
  width: 15px !important;
  height: 15px !important;
}

/* ── Body ────────────────────────────────────────────────────── */
.banca-body {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

/* ── Field ───────────────────────────────────────────────────── */
.banca-field {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.banca-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.65);
}

.banca-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.banca-input-prefix {
  position: absolute;
  left: 1rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.35);
  pointer-events: none;
}

.banca-input {
  width: 100%;
  height: 46px;
  background: #141418;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: #fff;
  font-size: 0.95rem;
  font-weight: 600;
  font-family: inherit;
  padding: 0 1rem 0 2.75rem;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.banca-input:focus {
  outline: none;
  border-color: rgba(226, 26, 130, 0.4);
  box-shadow: 0 0 0 3px rgba(226, 26, 130, 0.08);
}

/* ── Risk Grid ───────────────────────────────────────────────── */
.risk-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.65rem;
}

.risk-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.55rem;
  padding: 1rem 0.75rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: #141418;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s, transform 0.15s;
  font-family: inherit;
  text-align: center;
}

.risk-card:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.14);
}

.risk-card.active {
  border-color: #e21a82;
  background: rgba(226, 26, 130, 0.07);
}

.risk-card.active:hover {
  background: rgba(226, 26, 130, 0.1);
}

.risk-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 1.25rem;
  transition: background 0.2s;
}

.risk-icon-wrap svg,
.risk-icon-wrap .iconify {
  width: 22px !important;
  height: 22px !important;
}

.risk-card strong {
  font-size: 0.88rem;
  font-weight: 700;
  color: #fff;
}

.risk-card span {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.45);
}

/* ── Bet Grid ────────────────────────────────────────────────── */
.bet-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.bet-panel {
  background: #141418;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.bet-panel-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.35);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  text-align: center;
}

/* Bet panel tabs */
.bet-panel-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 8px;
  padding: 0.2rem;
  gap: 0.2rem;
}

.bet-tab {
  height: 32px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.45);
  font-size: 0.78rem;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.bet-tab.active {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

/* Stepper */
.bet-stepper {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.step-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.7);
  display: grid;
  place-items: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s, border-color 0.15s;
}

.step-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.18);
}

.step-btn svg,
.step-btn .iconify {
  width: 14px !important;
  height: 14px !important;
}

.step-input {
  flex: 1;
  height: 40px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #fff;
  font-size: 0.95rem;
  font-weight: 700;
  font-family: inherit;
  text-align: center;
  padding: 0;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.step-input:focus {
  outline: none;
  border-color: rgba(255, 255, 255, 0.25);
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.05);
}

/* Quick amount chips */
.bet-quick-row {
  display: flex;
  gap: 0.35rem;
}

.quick-chip {
  flex: 1;
  height: 30px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.75rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.quick-chip:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.22);
}

.quick-chip.active {
  background: rgba(34, 197, 94, 0.15);
  border-color: rgba(34, 197, 94, 0.4);
  color: #4ade80;
}

/* Action button */
.bet-action-btn {
  width: 100%;
  height: 54px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  color: #fff;
  font-family: inherit;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.05rem;
  transition: opacity 0.15s, transform 0.1s;
}

.bet-action-btn:hover { opacity: 0.92; }
.bet-action-btn:active { transform: scale(0.98); }

.bet-action-btn span {
  font-size: 0.75rem;
  font-weight: 600;
  opacity: 0.85;
}

.bet-action-btn strong {
  font-size: 1rem;
  font-weight: 800;
}

/* Bottom row */
.bet-bottom-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.auto-label {
  font-size: 0.68rem;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.3;
}

.auto-bet-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.toggle-btn {
  width: 36px;
  height: 20px;
  border-radius: 999px;
  border: none;
  background: rgba(255, 255, 255, 0.12);
  position: relative;
  cursor: pointer;
  transition: background 0.25s;
  flex-shrink: 0;
}

.toggle-btn.on { background: #22c55e; }

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.toggle-btn.on .toggle-thumb { transform: translateX(16px); }

.levantar-auto {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.levantar-pill {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  overflow: hidden;
  height: 30px;
  transition: border-color 0.2s;
}

.levantar-pill:focus-within {
  border-color: rgba(255, 255, 255, 0.25);
}

.levantar-input {
  width: 44px;
  height: 100%;
  background: transparent;
  border: none;
  color: #fff;
  font-size: 0.82rem;
  font-weight: 700;
  font-family: inherit;
  text-align: center;
  padding: 0 0.25rem;
}

.levantar-input:focus { outline: none; }

.levantar-x {
  padding: 0 0.4rem;
  color: rgba(255, 255, 255, 0.45);
  font-size: 0.8rem;
  font-weight: 700;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  height: 100%;
  display: flex;
  align-items: center;
}

/* Recommended values */
.banca-recommended {
  text-align: center;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  flex-wrap: wrap;
  padding: 0.65rem 0;
}

.rec-red  { color: #f87171; font-weight: 600; }
.rec-blue { color: #60a5fa; font-weight: 600; }
.rec-dot  { color: rgba(255, 255, 255, 0.25); }

/* ── Projeção ────────────────────────────────────────────────── */
.proj-section-title {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.92rem;
  font-weight: 800;
  color: #fff;
}

.proj-title-icon {
  width: 16px !important;
  height: 16px !important;
  color: #e21a82;
}

.proj-controls-card {
  background: #141418;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 1rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.proj-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.proj-month-nav {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.month-nav-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.6);
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: background 0.15s;
}

.month-nav-btn:hover { background: rgba(255, 255, 255, 0.1); }

.month-nav-btn svg,
.month-nav-btn .iconify {
  width: 13px !important;
  height: 13px !important;
}

.month-pill {
  background: #e21a82;
  color: #fff;
  font-size: 0.78rem;
  font-weight: 700;
  padding: 0.3rem 0.85rem;
  border-radius: 999px;
  white-space: nowrap;
}

.proj-scenarios {
  display: flex;
  gap: 0.35rem;
}

.scenario-btn {
  height: 30px;
  padding: 0 0.75rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.78rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.scenario-btn:hover {
  background: rgba(255, 255, 255, 0.07);
  color: rgba(255, 255, 255, 0.7);
}

.scenario-btn.active {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  color: #fff;
}

/* Final balance */
.proj-final {
  background: rgba(226, 26, 130, 0.06);
  border: 1px solid rgba(226, 26, 130, 0.12);
  border-radius: 10px;
  padding: 0.85rem 1rem;
}

.proj-final-text {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.proj-final-label {
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.4);
  font-weight: 600;
}

.proj-final-value {
  font-size: 1.5rem;
  font-weight: 900;
  color: #e21a82;
  line-height: 1.1;
}

.proj-final-gain {
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.35);
}

/* Projeção table */
.proj-table-wrap {
  background: #141418;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  overflow: hidden;
  max-height: 560px;
  overflow-y: auto;
}

/* Custom scrollbar for table */
.proj-table-wrap::-webkit-scrollbar { width: 4px; }
.proj-table-wrap::-webkit-scrollbar-track { background: transparent; }
.proj-table-wrap::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.12); border-radius: 999px; }

.proj-table {
  width: 100%;
  border-collapse: collapse;
}

.proj-table th {
  padding: 0.6rem 0.85rem;
  font-size: 0.72rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.4);
  text-align: left;
  background: #141418;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  text-transform: capitalize;
  position: sticky;
  top: 0;
  z-index: 1;
}

.proj-table td {
  padding: 0.55rem 0.85rem;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.75);
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  transition: background 0.15s;
}

.proj-table tbody tr:hover td {
  background: rgba(255, 255, 255, 0.02);
}

.proj-table tr.today-row td {
  background: rgba(226, 26, 130, 0.14);
  color: #fff;
}

.proj-table tr.today-row:hover td {
  background: rgba(226, 26, 130, 0.18);
}

.td-day {
  font-weight: 800;
  color: rgba(255, 255, 255, 0.5);
  width: 32px;
}

.proj-table tr.today-row .td-day {
  color: #f87171;
}

.td-date { white-space: nowrap; }

.td-weekday {
  display: block;
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.4);
}

.proj-table tr.today-row .td-weekday {
  color: rgba(255, 150, 150, 0.7);
}

.td-meta { color: rgba(255, 255, 255, 0.5); }

.td-final {
  color: #60a5fa;
  font-weight: 700;
}

.proj-table tr.today-row .td-final {
  color: #93c5fd;
}

/* ── Responsive ──────────────────────────────────────────────── */
@media (max-width: 700px) {
  .risk-grid { grid-template-columns: 1fr; }
  .bet-grid { grid-template-columns: 1fr; }
  .banca-stats-bar {
    flex-direction: column;
    gap: 1rem;
    padding: 1.1rem 1.25rem;
  }
  .banca-stats-glow {
    width: 100%;
    height: 50%;
    background: linear-gradient(to bottom, rgba(140, 15, 15, 0.4) 0%, transparent 100%);
  }
  .proj-controls { flex-direction: column; align-items: flex-start; }
  .proj-table th:nth-child(3),
  .proj-table td:nth-child(3) { display: none; }
}
</style>
