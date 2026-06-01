import { ref, onUnmounted } from 'vue'

export type SignalStatus = 'idle' | 'loading' | 'signal' | 'alert' | 'win' | 'loss' | 'cancelled'

const WS_URL = 'wss://ws-signals.grupoautoma.com/ws'
const SUBSCRIBE = { type: 'subscribe', name: 'aviator-spribe-default', collection: 'aviator_spribe' }
const STORAGE_KEY = 'aviator_signal_state'
const SIGNAL_STATUSES = new Set(['signal', 'alert', 'win', 'loss', 'cancelled'])

export function useAviatorSignal() {
  const status = ref<SignalStatus>('loading')
  const signalText = ref('')
  const statusLabel = ref('AGUARDANDO SINAL')
  const greens = ref<number | null>(null)
  const confidence = ref(88)
  const isConnected = ref(false)

  let ws: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectDelay = 3000
  let destroyed = false

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        status: status.value,
        signalText: signalText.value,
        statusLabel: statusLabel.value,
        greens: greens.value,
        confidence: confidence.value,
        savedAt: Date.now(),
      }))
    } catch {}
  }

  function restoreState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const cached = JSON.parse(raw)
      if (Date.now() - (cached.savedAt ?? 0) > 30 * 60 * 1000) {
        localStorage.removeItem(STORAGE_KEY)
        return
      }
      status.value = cached.status ?? 'idle'
      signalText.value = cached.signalText ?? ''
      statusLabel.value = cached.statusLabel ?? 'AGUARDANDO SINAL'
      greens.value = cached.greens ?? null
      confidence.value = cached.confidence ?? 88
    } catch {}
  }

  function applySignal(data: any) {
    const s = String(data?.status ?? '').toLowerCase()
    if (!SIGNAL_STATUSES.has(s)) return false

    if (s === 'signal' || s === 'alert') {
      status.value = s as SignalStatus
      signalText.value = (data.message ?? '').trim()
      statusLabel.value = s === 'alert' ? 'FIQUE ATENTO' : 'ENTRADA CONFIRMADA'
      greens.value = data.greens != null ? Number(data.greens) : null
      confidence.value = data.assertividade
        ? parseInt(String(data.assertividade).replace('%', '')) || confidence.value
        : Math.floor(Math.random() * (95 - 87 + 1)) + 87
      saveState()
    } else if (s === 'win') {
      status.value = 'win'
      signalText.value = (data.message ?? '').trim() || 'GREEN'
      statusLabel.value = 'WIN - GREEN'
      greens.value = null
      saveState()
    } else if (s === 'loss') {
      status.value = 'loss'
      signalText.value = (data.message ?? '').trim() || 'LOSS'
      statusLabel.value = 'LOSS'
      greens.value = null
      saveState()
    } else if (s === 'cancelled') {
      status.value = 'cancelled'
      signalText.value = ''
      statusLabel.value = 'Padrão cancelado'
      greens.value = null
      saveState()
    }

    return true
  }

  function handleMessage(raw: string) {
    let data: any
    try { data = JSON.parse(raw) } catch { return }

    if (data.type === 'subscribed') {
      isConnected.value = true
      if (status.value === 'loading') status.value = 'idle'
      return
    }

    if (data.type === 'history') {
      const signals = Array.isArray(data.signals) ? data.signals : []
      const latest = [...signals].reverse().find((item) => SIGNAL_STATUSES.has(String(item?.status ?? '').toLowerCase()))
      if (latest) applySignal(latest)
      else if (status.value === 'loading') status.value = 'idle'
      return
    }

    applySignal(data)
  }

  function connect() {
    if (destroyed || ws) return
    restoreState()

    let url = WS_URL
    if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
      url = url.replace(/^ws:\/\//i, 'wss://')
    }

    ws = new WebSocket(url)

    ws.onopen = () => {
      isConnected.value = true
      reconnectDelay = 3000
      ws?.send(JSON.stringify(SUBSCRIBE))
      if (status.value === 'loading') status.value = 'idle'
    }

    ws.onmessage = (ev) => {
      handleMessage(typeof ev.data === 'string' ? ev.data : '')
    }

    ws.onerror = () => {
      isConnected.value = false
      if (status.value === 'loading') {
        status.value = 'idle'
        statusLabel.value = 'CONEXÃO INSTÁVEL'
      }
    }

    ws.onclose = () => {
      ws = null
      isConnected.value = false
      if (destroyed) return
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null
        if (!destroyed) connect()
      }, reconnectDelay)
      reconnectDelay = Math.min(reconnectDelay * 2, 30_000)
    }
  }

  function disconnect() {
    destroyed = true
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    ws?.close()
    ws = null
  }

  onUnmounted(disconnect)

  return { status, signalText, statusLabel, greens, confidence, isConnected, connect, disconnect }
}
