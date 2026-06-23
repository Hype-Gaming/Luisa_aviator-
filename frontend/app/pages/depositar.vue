<script setup lang="ts">
type DepositStatus = 'idle' | 'generating' | 'pending' | 'approved' | 'expired' | 'error'

interface PixDetails {
  transaction_id: string
  qr_code?: string
  br_code?: string
  amount: number
}

useHead({ title: 'Depositar - Luisa Aviator' })

const config = useRuntimeConfig()
const amount = ref('')
const status = ref<DepositStatus>('idle')
const pix = ref<PixDetails | null>(null)
const error = ref('')
const countdown = ref(400)
const showApprovedModal = ref(false)
const quickValues = [50, 100, 200, 500]

let statusTimer: ReturnType<typeof setInterval> | null = null
let countdownTimer: ReturnType<typeof setInterval> | null = null

const countdownLabel = computed(() => {
  const minutes = Math.floor(countdown.value / 60)
  const seconds = countdown.value % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

const progress = computed(() => Math.max(0, Math.min(100, ((400 - countdown.value) / 400) * 100)))

function parseAmount(value: string) {
  const normalized = value.replace(/[^\d,.\s]/g, '').replace(/\s+/g, '').replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function authHeaders() {
  const token = localStorage.getItem('access_token') || localStorage.getItem('userToken')
  const cookieKey = localStorage.getItem('cookie_key') || localStorage.getItem('cookieKey')
  const brandSlug = localStorage.getItem('brandSlug') || 'bateu'
  const baseDomain = localStorage.getItem('baseDomain') || 'bet.br'
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Brand-Slug': brandSlug,
    'X-Base-Domain': baseDomain,
  }
  if (token) headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`
  if (cookieKey) headers['X-Cactus-Cookie-Key'] = cookieKey
  return headers
}

function clearTimers() {
  if (statusTimer) clearInterval(statusTimer)
  if (countdownTimer) clearInterval(countdownTimer)
  statusTimer = null
  countdownTimer = null
}

function resetDeposit() {
  clearTimers()
  amount.value = ''
  pix.value = null
  error.value = ''
  status.value = 'idle'
  countdown.value = 400
  showApprovedModal.value = false
}

async function copyPix() {
  if (!pix.value?.br_code) return
  await navigator.clipboard.writeText(pix.value.br_code)
}

async function checkStatus() {
  if (!pix.value?.transaction_id) return
  try {
    const response = await $fetch<{ success?: boolean, status?: string }>(
      `${config.public.apiBase}/api/deposit/${encodeURIComponent(pix.value.transaction_id)}/status`,
      {
        headers: authHeaders(),
      }
    )
    const remoteStatus = response.status
    if (remoteStatus === 'approved' || remoteStatus === 'completed' || remoteStatus === 'PAID') {
      clearTimers()
      status.value = 'approved'
      showApprovedModal.value = true
    } else if (remoteStatus === 'expired' || remoteStatus === 'failed' || remoteStatus === 'cancelled') {
      clearTimers()
      status.value = remoteStatus === 'expired' ? 'expired' : 'error'
      error.value = remoteStatus === 'expired' ? 'Tempo esgotado. Gere um novo PIX.' : 'Pagamento não aprovado.'
    }
  } catch {
    // Mantém o polling silencioso para não interromper o usuário durante o pagamento.
  }
}

function startPolling() {
  clearTimers()
  countdown.value = 400
  statusTimer = setInterval(checkStatus, 5_000)
  countdownTimer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) {
      clearTimers()
      status.value = 'expired'
      error.value = 'Tempo esgotado. Gere um novo PIX.'
    }
  }, 1_000)
  void checkStatus()
}

async function generatePix() {
  const parsedAmount = parseAmount(amount.value)
  if (parsedAmount <= 0) {
    error.value = 'Por favor, informe um valor válido.'
    status.value = 'error'
    return
  }

  const headers = authHeaders()
  if (!headers.Authorization) {
    error.value = 'Você precisa estar logado para fazer um depósito.'
    status.value = 'error'
    return
  }

  try {
    status.value = 'generating'
    error.value = ''
    const response = await $fetch<{ success?: boolean, data?: PixDetails } | PixDetails>(
      `${config.public.apiBase}/api/deposit`,
      {
        method: 'POST',
        headers,
        body: {
          amount: String(parsedAmount),
          user_id: Number(localStorage.getItem('user_id') || '0'),
          slug: localStorage.getItem('brandSlug') || 'bateu',
          user_name: localStorage.getItem('user_name') || localStorage.getItem('name') || '',
          user_email: localStorage.getItem('user_email') || localStorage.getItem('email') || '',
        },
      }
    )
    const data = 'data' in response && response.data ? response.data : response as PixDetails
    if (!data.transaction_id) throw new Error('Resposta de depósito sem transação.')
    pix.value = data
    status.value = 'pending'
    startPolling()
  } catch (err: any) {
    status.value = 'error'
    error.value = err?.data?.message || err?.message || 'Erro ao gerar PIX. Tente novamente.'
  }
}

onUnmounted(clearTimers)
</script>

<template>
  <main class="deposit-page">
    <section v-if="status === 'generating'" class="deposit-center">
      <div class="glass-panel deposit-loading">
        <Icon name="svg-spinners:90-ring-with-bg" />
        <p>Gerando PIX, aguarde...</p>
      </div>
    </section>

    <section v-else-if="pix && (status === 'pending' || status === 'expired' || status === 'approved')" class="deposit-card">
      <div class="deposit-title">
        <Icon name="ph:qr-code-bold" />
        <h1>Depósito PIX</h1>
        <p v-if="status === 'pending'">Pague em: <strong>{{ countdownLabel }}</strong></p>
        <p v-else-if="status === 'expired'">Tempo esgotado. Gere um novo PIX.</p>
        <p v-else>Depósito aprovado!</p>
      </div>

      <div v-if="status === 'pending'" class="deposit-progress">
        <span :style="{ width: `${progress}%` }" />
      </div>

      <div class="qr-box">
        <img v-if="pix.qr_code" :src="pix.qr_code" alt="QR Code PIX">
        <div v-else class="qr-empty">QR Code não disponível</div>
      </div>

      <strong class="deposit-amount">
        R$ {{ Number(pix.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
      </strong>

      <div v-if="pix.br_code" class="copy-code">
        <span>Código Copia e Cola</span>
        <p>{{ pix.br_code }}</p>
      </div>

      <div class="deposit-actions">
        <button type="button" class="primary-btn" :disabled="status === 'expired' || !pix.br_code" @click="copyPix">
          <Icon name="ph:copy-bold" />
          Copiar Código PIX
        </button>
        <button type="button" class="ghost-btn" @click="resetDeposit">
          <Icon name="ph:wallet-bold" />
          Novo Depósito
        </button>
      </div>

      <small v-if="status === 'pending'">Verificando pagamento automaticamente a cada 5 segundos...</small>
    </section>

    <section v-else class="deposit-card">
      <div class="deposit-title">
        <Icon name="ph:qr-code-bold" />
        <h1>Depósito PIX</h1>
        <p>Informe o valor para gerar o QR Code</p>
      </div>

      <label class="deposit-field">
        <span>Valor do Depósito</span>
        <input v-model="amount" type="text" inputmode="decimal" placeholder="Ex.: 50,00" @keydown.enter="generatePix">
      </label>

      <p v-if="error" class="form-error">{{ error }}</p>

      <div class="quick-grid">
        <button v-for="value in quickValues" :key="value" type="button" @click="amount = String(value)">
          R$ {{ value }},00
        </button>
      </div>

      <button type="button" class="primary-btn wide" @click="generatePix">
        <Icon name="ph:qr-code-bold" />
        Gerar PIX
      </button>
    </section>

    <div v-if="showApprovedModal" class="modal-backdrop" role="dialog" aria-modal="true">
      <div class="approved-modal">
        <div class="success-icon"><Icon name="ph:party-popper-bold" /></div>
        <h2>Depósito Confirmado!</h2>
        <p>Seu depósito foi processado com sucesso.</p>
        <strong v-if="pix">R$ {{ Number(pix.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</strong>
        <button type="button" class="primary-btn wide" @click="resetDeposit">
          <Icon name="ph:check-circle-bold" />
          Fechar
        </button>
      </div>
    </div>
  </main>
</template>
