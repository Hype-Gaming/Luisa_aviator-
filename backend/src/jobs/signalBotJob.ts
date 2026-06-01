/**
 * Signal Bot Job
 * ──────────────────────────────────────────────────────────────────────────
 * Para cada bot ativo com wsUrl configurado:
 *   1. Abre uma conexão WebSocket
 *   2. Escuta eventos de sinal
 *   3. Quando o evento bate com um jogo do bot, envia a mensagem no Telegram
 *   4. Reconecta automaticamente em caso de queda
 *   5. Re-sincroniza com o banco a cada 60s para pegar mudanças de config
 */

import { SignalBotModel } from '../models/SignalBot.js'

// ── Telegram ──────────────────────────────────────────────────────────────

export async function sendTelegram(
  botToken: string,
  chatId: string,
  text: string,
): Promise<{ ok: boolean; description?: string }> {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`

  for (const parseMode of ['HTML', null] as const) {
    try {
      const body: Record<string, unknown> = { chat_id: chatId, text }
      if (parseMode) body.parse_mode = parseMode

      const res  = await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const data = await res.json() as { ok: boolean; description?: string }

      if (data.ok) return { ok: true }

      if (parseMode === 'HTML' && data.description?.toLowerCase().includes("can't parse")) {
        console.warn(`[signal-bot] HTML inválido, reenviando como plain text`)
        continue
      }

      console.warn(`[signal-bot] ⚠️  Telegram rejeitou: ${data.description}`)
      return { ok: false, description: data.description }
    } catch (e: any) {
      console.error(`[signal-bot] Erro Telegram API:`, e.message)
      return { ok: false, description: e.message }
    }
  }

  return { ok: false, description: 'Falha ao enviar mensagem' }
}

// ── Schedule ──────────────────────────────────────────────────────────────

function withinSchedule(scheduleType: string, scheduleHours: string[]): boolean {
  if (scheduleType === '24h') return true
  const currentHour = `${String(new Date().getHours()).padStart(2, '0')}:00`
  return scheduleHours.includes(currentHour)
}

// ── Status (exposto para o endpoint GET /ws-status) ───────────────────────

interface ConnStatus {
  botId:     string
  botName:   string
  wsUrl:     string
  state:     'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED' | 'UNKNOWN'
  messagesReceived: number
  lastMessageAt:    string | null
  lastError:        string | null
}

const connStatusMap = new Map<string, ConnStatus>()

export function getConnectionStatus(): ConnStatus[] {
  return [...connStatusMap.values()]
}

// ── WebSocket manager ─────────────────────────────────────────────────────

const connections = new Map<string, WebSocket>()

const WS_STATES = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'] as const

function wsState(ws: WebSocket) {
  return WS_STATES[ws.readyState] ?? 'UNKNOWN'
}

function killConnection(botId: string) {
  const ws = connections.get(botId)
  if (ws) {
    try { ws.close() } catch {}
    connections.delete(botId)
  }
}

async function connectBot(botId: string) {
  const bot = await SignalBotModel.findById(botId).lean()

  if (!bot || bot.status !== 'active' || !bot.wsUrl) {
    killConnection(botId)
    connStatusMap.delete(botId)
    return
  }

  killConnection(botId)

  const status: ConnStatus = {
    botId,
    botName:          bot.name,
    wsUrl:            bot.wsUrl,
    state:            'CONNECTING',
    messagesReceived: 0,
    lastMessageAt:    null,
    lastError:        null,
  }
  connStatusMap.set(botId, status)

  let ws: WebSocket
  try {
    ws = new WebSocket(bot.wsUrl)
  } catch (e: any) {
    status.state      = 'CLOSED'
    status.lastError  = e.message
    console.error(`[signal-bot] ❌ Falha ao criar WebSocket para "${bot.name}": ${e.message}`)
    setTimeout(() => connectBot(botId), 30_000)
    return
  }

  connections.set(botId, ws)

  // ── open ──────────────────────────────────────────────────────────────
  ws.addEventListener('open', () => {
    status.state = 'OPEN'
    console.log(`[signal-bot] 🔌 "${bot.name}" conectado — ${bot.wsUrl}`)

    const collections = bot.selectedGames
      .map(g => g.signalCollection)
      .filter(Boolean)

    if (collections.length === 0) {
      console.warn(`[signal-bot] ⚠️  "${bot.name}" — nenhum jogo tem signalCollection configurado. Eventos não serão filtrados por collection.`)
    } else {
      console.log(`[signal-bot] 📋 "${bot.name}" — subscrevendo: ${collections.join(', ')}`)
    }

    for (const game of bot.selectedGames) {
      if (game.signalCollection) {
        ws.send(JSON.stringify({ type: 'subscribe', collection: game.signalCollection }))
      }
    }
  })

  // ── message ───────────────────────────────────────────────────────────
  ws.addEventListener('message', async (ev) => {
    status.messagesReceived++
    status.lastMessageAt = new Date().toISOString()

    const raw = typeof ev.data === 'string' ? ev.data : ev.data.toString()
    console.log(`[signal-bot] 📨 "${bot.name}" mensagem recebida:`, raw.slice(0, 300))

    const fresh = await SignalBotModel.findById(botId)
      .select('status botToken chatId scheduleType scheduleHours selectedGames')
      .lean()

    if (!fresh || fresh.status !== 'active') {
      console.log(`[signal-bot] ⏸  "${bot.name}" pausado/removido, ignorando mensagem`)
      return
    }

    if (!withinSchedule(fresh.scheduleType, fresh.scheduleHours)) {
      const h = `${String(new Date().getHours()).padStart(2, '0')}:00`
      console.log(`[signal-bot] 🕐 "${bot.name}" fora do horário (agora: ${h}, agendado: ${fresh.scheduleHours.join(', ')})`)
      return
    }

    let payload: Record<string, any>
    try {
      payload = JSON.parse(raw)
    } catch {
      console.warn(`[signal-bot] ⚠️  "${bot.name}" mensagem não é JSON, ignorando`)
      return
    }

    // Ignora mensagens de controle (não são sinais em tempo real)
    if (payload.type === 'history') {
      console.log(`[signal-bot] ⏩ "${bot.name}" histórico ignorado (${(payload.signals?.length ?? 0)} entradas)`)
      return
    }
    if (payload.type === 'subscribed') {
      console.log(`[signal-bot] 📋 "${bot.name}" subscrito em: ${payload.collection}`)
      return
    }

    console.log(`[signal-bot] 🔍 "${bot.name}" payload keys: ${Object.keys(payload).join(', ')}`)
    console.log(`[signal-bot]    collection="${payload.collection}" name="${payload.name}" game_id="${payload.game_id}" status="${payload.status}"`)

    const matched = fresh.selectedGames.find(g =>
      (g.signalCollection && payload.collection === g.signalCollection) ||
      (g.signalName       && payload.name       === g.signalName)       ||
      (g.gameId           && (payload.game_id   === g.gameId || payload.gameId === g.gameId))
    )

    if (!matched) {
      console.log(`[signal-bot] ❌ "${bot.name}" sem match — collection="${payload.collection}" name="${payload.name}"`)
      console.log(`[signal-bot]    jogos configurados: ${fresh.selectedGames.map(g => `${g.gameName}(collection=${g.signalCollection ?? 'NULL'})`).join(', ')}`)
      return
    }

    console.log(`[signal-bot] ✅ "${bot.name}" jogo bateu: ${matched.gameName}`)

    const text =
      matched.signalMessage ||
      payload.message        ||
      `🎰 <b>${matched.gameName}</b>\nSinal recebido!`

    const result = await sendTelegram(fresh.botToken, fresh.chatId, text)
    if (result.ok) {
      console.log(`[signal-bot] 📤 Sinal enviado — ${matched.gameName} → ${fresh.chatId}`)
    }
  })

  // ── close ─────────────────────────────────────────────────────────────
  ws.addEventListener('close', (ev) => {
    status.state = 'CLOSED'
    console.log(`[signal-bot] 🔴 "${bot.name}" desconectado (code ${ev.code}). Reconectando em 15s...`)
    connections.delete(botId)
    setTimeout(() => connectBot(botId), 15_000)
  })

  // ── error ─────────────────────────────────────────────────────────────
  ws.addEventListener('error', (ev) => {
    const msg = (ev as any).message ?? 'unknown error'
    status.lastError = msg
    console.error(`[signal-bot] ❌ Erro WS "${bot.name}": ${msg}`)
  })
}

// ── Sync ──────────────────────────────────────────────────────────────────

async function syncBots() {
  try {
    const activeBots = await SignalBotModel.find({
      status: 'active',
      wsUrl:  { $exists: true, $ne: null },
    }).lean()

    const activeIds = new Set(activeBots.map(b => String(b._id)))

    for (const id of connections.keys()) {
      if (!activeIds.has(id)) {
        console.log(`[signal-bot] Desconectando bot pausado/removido: ${id}`)
        killConnection(id)
        connStatusMap.delete(id)
      }
    }

    for (const bot of activeBots) {
      const id    = String(bot._id)
      const ws    = connections.get(id)
      const alive = ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)
      if (!alive) {
        console.log(`[signal-bot] Conectando bot "${bot.name}" (${id})...`)
        await connectBot(id)
      }
    }
  } catch (e: any) {
    console.error('[signal-bot] Erro no sync:', e.message)
  }
}

// ── Entry point ───────────────────────────────────────────────────────────

export function startSignalBotJob() {
  console.log('[signal-bot] Serviço iniciado — sincronizando bots...')
  syncBots()
  setInterval(syncBots, 60_000)
}
