import { FastifyInstance } from 'fastify'
import { SignalBotModel } from '../models/SignalBot.js'
import { GameModel } from '../models/Game.js'
import { GameImage } from '../models/GameImage.js'
import { sendTelegram, getConnectionStatus } from '../jobs/signalBotJob.js'
import { validateScheduleHours } from '../utils/schedule.js'

// ── Validação de gameId (ObjectId 24 hex chars) ───────────────────────────────
const OBJECT_ID_RE = /^[a-f\d]{24}$/i

interface BotBody {
  name:         string
  description?: string
  botToken:     string
  chatId:       string
  wsUrl?:       string | null
  selectedGames:   Array<{
    gameId:           string
    gameName?:        string
    signalUrl?:       string | null
    signalName?:      string | null
    signalCollection?:string | null
    signalMessage?:   string | null
    signalDuration?:  number | null
  }>
  scheduleType?:  '24h' | 'specific'
  scheduleHours?: string[]
  status?:        'active' | 'paused'
}

// ── Valida e enriquece selectedGames com dados do banco ───────────────────────
async function resolveGames(rawGames: BotBody['selectedGames']): Promise<{
  error?: string
  games?: InstanceType<typeof SignalBotModel>['selectedGames']
}> {
  if (!Array.isArray(rawGames) || rawGames.length === 0) {
    return { error: 'Selecione ao menos 1 jogo' }
  }
  if (rawGames.length > 1) {
    return { error: 'Selecione apenas 1 jogo por bot' }
  }

  const ids = rawGames.map(g => g.gameId)
  const invalidIds = ids.filter(id => !OBJECT_ID_RE.test(id))
  if (invalidIds.length > 0) {
    return { error: `ID(s) de jogo inválido(s): ${invalidIds.join(', ')}` }
  }

  // Busca em Game (tem campos de sinal) e em GameImage (catálogo seed)
  const [foundGames, foundImages] = await Promise.all([
    GameModel.find({ _id: { $in: ids } }).lean(),
    GameImage.find({ _id: { $in: ids } }).lean(),
  ])

  const foundMap = new Map<string, { name: string; signalUrl?: string | null; signalName?: string | null; signalCollection?: string | null; signalMessage?: string | null; signalDuration?: number | null }>()
  for (const g of foundGames) {
    foundMap.set(String(g._id), { name: g.name, signalUrl: g.signalUrl, signalName: g.signalName, signalCollection: g.signalCollection, signalMessage: g.signalMessage, signalDuration: g.signalDuration })
  }
  for (const img of foundImages) {
    if (!foundMap.has(String(img._id))) {
      foundMap.set(String(img._id), { name: img.title })
    }
  }

  const missing = ids.filter(id => !foundMap.has(id))
  if (missing.length > 0) {
    return { error: `Jogo(s) não encontrado(s): ${missing.join(', ')}` }
  }

  // Monta array final: override ganha se fornecido, senão usa dado do Game
  const games = rawGames.map(raw => {
    const dbGame = foundMap.get(raw.gameId)!
    return {
      gameId:           raw.gameId,
      gameName:         dbGame.name,
      signalUrl:        raw.signalUrl        ?? dbGame.signalUrl        ?? null,
      signalName:       raw.signalName       ?? dbGame.signalName       ?? null,
      signalCollection: raw.signalCollection ?? dbGame.signalCollection ?? null,
      signalMessage:    raw.signalMessage    ?? dbGame.signalMessage    ?? null,
      signalDuration:   raw.signalDuration   ?? dbGame.signalDuration   ?? null,
    }
  })

  return { games }
}

export default async function signalBotsRoutes(fastify: FastifyInstance) {

  // ── GET /api/signal-bots ─────────────────────────────────────────────────
  fastify.get('/', async (_req, reply) => {
    const bots = await SignalBotModel.find().sort({ createdAt: -1 }).lean()
    return reply.send({ success: true, data: bots })
  })

  // ── GET /api/signal-bots/ws-status ───────────────────────────────────────
  fastify.get('/ws-status', async (_req, reply) => {
    return reply.send({ success: true, data: getConnectionStatus() })
  })

  // ── GET /api/signal-bots/:id ─────────────────────────────────────────────
  fastify.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const { id } = req.params
    if (!OBJECT_ID_RE.test(id)) {
      return reply.status(400).send({ success: false, error: 'ID inválido' })
    }
    const bot = await SignalBotModel.findById(id).lean()
    if (!bot) return reply.status(404).send({ success: false, error: 'Bot não encontrado' })
    return reply.send({ success: true, data: bot })
  })

  // ── POST /api/signal-bots ────────────────────────────────────────────────
  fastify.post<{ Body: BotBody }>('/', async (req, reply) => {
    const {
      name, description, botToken, chatId, wsUrl,
      selectedGames, scheduleType = '24h', scheduleHours = [], status = 'active',
    } = req.body

    if (!name?.trim())     return reply.status(400).send({ success: false, error: 'O nome do bot é obrigatório' })
    if (!botToken?.trim()) return reply.status(400).send({ success: false, error: 'O Bot Token é obrigatório' })
    if (!chatId?.trim())   return reply.status(400).send({ success: false, error: 'O Chat ID é obrigatório' })
    const schedule = validateScheduleHours(scheduleType, scheduleHours)
    if (schedule.error) return reply.status(400).send({ success: false, error: schedule.error })
    if (status && !['active', 'paused'].includes(status)) {
      return reply.status(400).send({ success: false, error: 'status deve ser "active" ou "paused"' })
    }

    const { error: gErr, games } = await resolveGames(selectedGames ?? [])
    if (gErr) return reply.status(400).send({ success: false, error: gErr })
    if (scheduleType === 'specific' && !games?.some(g => g.signalMessage?.trim())) {
      return reply.status(400).send({ success: false, error: 'Informe o padrão da mensagem dos sinais' })
    }

    const bot = await SignalBotModel.create({
      name:        name.trim(),
      description: description?.trim() || null,
      botToken:    botToken.trim(),
      chatId:      chatId.trim(),
      wsUrl:       wsUrl?.trim() || null,
      selectedGames:   games,
      scheduleType,
      scheduleHours:   schedule.hours,
      status,
    })

    return reply.status(201).send({ success: true, data: bot })
  })

  // ── PUT /api/signal-bots/:id ─────────────────────────────────────────────
  fastify.put<{ Params: { id: string }; Body: Partial<BotBody> }>('/:id', async (req, reply) => {
    const { id } = req.params
    if (!OBJECT_ID_RE.test(id)) {
      return reply.status(400).send({ success: false, error: 'ID inválido' })
    }

    const {
      name, description, botToken, chatId, wsUrl,
      selectedGames, scheduleType, scheduleHours, status,
    } = req.body

    const update: Record<string, unknown> = {}

    if (name !== undefined) {
      if (!name.trim()) return reply.status(400).send({ success: false, error: 'O nome do bot é obrigatório' })
      update.name = name.trim()
    }
    if (description !== undefined) update.description = description?.trim() || null
    if (botToken !== undefined) {
      if (!botToken.trim()) return reply.status(400).send({ success: false, error: 'O Bot Token é obrigatório' })
      update.botToken = botToken.trim()
    }
    if (chatId !== undefined) {
      if (!chatId.trim()) return reply.status(400).send({ success: false, error: 'O Chat ID é obrigatório' })
      update.chatId = chatId.trim()
    }
    if (wsUrl !== undefined) update.wsUrl = wsUrl?.trim() || null

    if (scheduleType !== undefined) {
      if (!['24h', 'specific'].includes(scheduleType)) {
        return reply.status(400).send({ success: false, error: 'scheduleType inválido' })
      }
      update.scheduleType = scheduleType
    }

    const finalScheduleType = (update.scheduleType as '24h' | 'specific' | undefined) ?? (scheduleHours !== undefined ? 'specific' : undefined)
    if (scheduleHours !== undefined || finalScheduleType !== undefined) {
      const schedule = validateScheduleHours(finalScheduleType ?? '24h', scheduleHours ?? [])
      if (schedule.error) return reply.status(400).send({ success: false, error: schedule.error })
      update.scheduleHours = schedule.hours
    }

    if (status !== undefined) {
      if (!['active', 'paused'].includes(status)) {
        return reply.status(400).send({ success: false, error: 'status inválido' })
      }
      update.status = status
    }

    if (selectedGames !== undefined) {
      const { error: gErr, games } = await resolveGames(selectedGames)
      if (gErr) return reply.status(400).send({ success: false, error: gErr })
      const type = (update.scheduleType as '24h' | 'specific' | undefined) ?? scheduleType
      if (type === 'specific' && !games?.some(g => g.signalMessage?.trim())) {
        return reply.status(400).send({ success: false, error: 'Informe o padrão da mensagem dos sinais' })
      }
      update.selectedGames = games
    }

    const bot = await SignalBotModel.findByIdAndUpdate(id, update, { new: true }).lean()
    if (!bot) return reply.status(404).send({ success: false, error: 'Bot não encontrado' })
    return reply.send({ success: true, data: bot })
  })

  // ── PATCH /api/signal-bots/:id/toggle ────────────────────────────────────
  fastify.patch<{ Params: { id: string } }>('/:id/toggle', async (req, reply) => {
    const { id } = req.params
    if (!OBJECT_ID_RE.test(id)) {
      return reply.status(400).send({ success: false, error: 'ID inválido' })
    }
    const bot = await SignalBotModel.findById(id)
    if (!bot) return reply.status(404).send({ success: false, error: 'Bot não encontrado' })

    bot.status = bot.status === 'active' ? 'paused' : 'active'
    await bot.save()
    return reply.send({ success: true, data: bot })
  })

  // ── POST /api/signal-bots/:id/test ──────────────────────────────────────
  fastify.post<{ Params: { id: string } }>('/:id/test', async (req, reply) => {
    const { id } = req.params
    if (!OBJECT_ID_RE.test(id)) {
      return reply.status(400).send({ success: false, error: 'ID inválido' })
    }
    const bot = await SignalBotModel.findById(id).lean()
    if (!bot) return reply.status(404).send({ success: false, error: 'Bot não encontrado' })

    const text = `🤖 <b>Teste de conexão</b>\n\nBot <code>${bot.name}</code> configurado com sucesso!\nEste canal está pronto para receber sinais.`
    const result = await sendTelegram(bot.botToken, bot.chatId, text)

    if (!result.ok) {
      return reply.status(400).send({
        success: false,
        error: result.description || 'Falha ao enviar mensagem de teste',
      })
    }
    return reply.send({ success: true, message: 'Mensagem de teste enviada com sucesso' })
  })

  // ── DELETE /api/signal-bots/:id ──────────────────────────────────────────
  fastify.delete<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const { id } = req.params
    if (!OBJECT_ID_RE.test(id)) {
      return reply.status(400).send({ success: false, error: 'ID inválido' })
    }
    const bot = await SignalBotModel.findByIdAndDelete(id)
    if (!bot) return reply.status(404).send({ success: false, error: 'Bot não encontrado' })
    return reply.send({ success: true })
  })
}
