import { FastifyInstance } from 'fastify'
import { SolicitationModel } from '../models/Solicitation.js'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'
import { validateScheduleHours } from '../utils/schedule.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = join(__dirname, '..', '..', 'uploads', 'solicitations')
const PORT    = process.env.PORT    || '3099'
const API_URL = (process.env.API_URL || `http://localhost:${PORT}`).replace(/\/$/, '')

async function ensureDir() {
  if (!existsSync(UPLOAD_DIR)) await mkdir(UPLOAD_DIR, { recursive: true })
}

export default async function solicitationRoutes(fastify: FastifyInstance) {

  // POST /api/solicitations — pública (sem auth)
  fastify.post('/', async (req, reply) => {
    await ensureDir()
    const parts = req.parts()

    let solicitationType = 'aplicativo'
    let channelMode = 'existing'
    let name = '', primaryColor = '#2ab885', linkCadastro = '', whatsapp = ''
    let linkTelegram: string | null = null, linkSuporte: string | null = null
    let linkComunidade: string | null = null, linkInstagram: string | null = null
    let selectedGames: string[] = []
    let selectedRouletteTables: string[] = []
    let scheduleType = '24h'
    let scheduleHours: string[] = []
    let signalPattern: string | null = null
    let logoUrl: string | null = null

    for await (const part of parts) {
      if (part.type === 'file') {
        const ext   = (part.filename.split('.').pop() ?? 'png').toLowerCase()
        const fname = `sol-${uuidv4().slice(0, 8)}.${ext}`
        const dest  = join(UPLOAD_DIR, fname)
        await writeFile(dest, await part.toBuffer())
        logoUrl = `/uploads/solicitations/${fname}`
      } else {
        const v = part.value as string
        if (part.fieldname === 'solicitationType') solicitationType = v.trim()
        if (part.fieldname === 'channelMode')      channelMode      = v.trim() || 'existing'
        if (part.fieldname === 'name')             name             = v.trim()
        if (part.fieldname === 'whatsapp')         whatsapp         = v.trim()
        if (part.fieldname === 'primaryColor')     primaryColor     = v.trim() || '#2ab885'
        if (part.fieldname === 'linkCadastro')     linkCadastro     = v.trim()
        if (part.fieldname === 'linkTelegram')     linkTelegram     = v.trim() || null
        if (part.fieldname === 'linkSuporte')      linkSuporte      = v.trim() || null
        if (part.fieldname === 'linkComunidade')   linkComunidade   = v.trim() || null
        if (part.fieldname === 'linkInstagram')    linkInstagram    = v.trim() || null
        if (part.fieldname === 'scheduleType')     scheduleType     = v.trim() || '24h'
        if (part.fieldname === 'signalPattern')    signalPattern    = v.trim() || null
        if (part.fieldname === 'selectedGames')            selectedGames          = JSON.parse(v || '[]')
        if (part.fieldname === 'selectedRouletteTables')   selectedRouletteTables = JSON.parse(v || '[]')
        if (part.fieldname === 'scheduleHours')            scheduleHours          = JSON.parse(v || '[]')
      }
    }

    if (!['aplicativo', 'canal-telegram'].includes(solicitationType))
      return reply.status(400).send({ success: false, error: 'Tipo de solicitação inválido' })

    if (!name)         return reply.status(400).send({ success: false, error: 'Nome é obrigatório' })
    if (!whatsapp)     return reply.status(400).send({ success: false, error: 'WhatsApp é obrigatório' })
    if (!linkCadastro) return reply.status(400).send({ success: false, error: 'Link de cadastro é obrigatório' })

    if (solicitationType === 'aplicativo') {
      if (!logoUrl) return reply.status(400).send({ success: false, error: 'A logo é obrigatória' })
    }

    if (solicitationType === 'canal-telegram') {
      if (!['existing', 'create'].includes(channelMode))
        return reply.status(400).send({ success: false, error: 'channelMode inválido' })

      // Sala existente → link obrigatório para identificar o canal
      if (channelMode === 'existing' && !linkTelegram)
        return reply.status(400).send({ success: false, error: 'O link da sala Telegram é obrigatório para salas existentes' })

      // Criar nova → WhatsApp já é obrigatório (validado acima), link não é exigido
      const schedule = validateScheduleHours(scheduleType, scheduleHours)
      if (schedule.error) return reply.status(400).send({ success: false, error: schedule.error })
      scheduleHours = schedule.hours
      if (scheduleType === '24h') {
        signalPattern = null
      }
    }

    if (selectedGames.length < 1)  return reply.status(400).send({ success: false, error: 'Selecione pelo menos 1 jogo' })
    if (selectedGames.length > 10) return reply.status(400).send({ success: false, error: 'Máximo de 10 jogos permitidos' })

    const sol = new SolicitationModel({
      solicitationType, channelMode, name, whatsapp, logoUrl, primaryColor,
      linkCadastro, linkTelegram, linkSuporte, linkComunidade, linkInstagram,
      selectedGames, selectedRouletteTables, scheduleType, scheduleHours, signalPattern,
    })
    await sol.save()
    return reply.status(201).send({ success: true, data: sol })
  })

  // GET /api/solicitations — admin (lista todas)
  fastify.get('/', async (_req, reply) => {
    const data = await SolicitationModel.find().sort({ createdAt: -1 }).lean()
    return reply.send({ success: true, data })
  })

  // PATCH /api/solicitations/:id — atualiza status
  fastify.patch<{ Params: { id: string }; Body: { status: string } }>('/:id', async (req, reply) => {
    const { status } = req.body
    const sol = await SolicitationModel.findByIdAndUpdate(req.params.id, { status }, { new: true })
    if (!sol) return reply.status(404).send({ success: false, error: 'Não encontrado' })
    return reply.send({ success: true, data: sol })
  })

  // DELETE /api/solicitations/:id
  fastify.delete<{ Params: { id: string } }>('/:id', async (req, reply) => {
    await SolicitationModel.findByIdAndDelete(req.params.id)
    return reply.send({ success: true })
  })
}
