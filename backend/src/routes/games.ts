import { FastifyInstance } from 'fastify'
import { GameModel, ALL_CATEGORIES } from '../models/Game.js'
import { SlugModel } from '../models/Slug.js'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)
const UPLOADS_DIR = join(__dirname, '..', '..', 'uploads', 'games')

async function ensureDir() {
  if (!existsSync(UPLOADS_DIR)) await mkdir(UPLOADS_DIR, { recursive: true })
}

export default async function gamesRoutes(fastify: FastifyInstance) {

  // ─── GET /api/games — lista jogos de um slug específico ──────────────────
  // ?slug=xxx  — filtra por slug (por slug individual)
  // ?category= — opcional
  // ?active=   — opcional
  fastify.get<{ Querystring: { slug?: string; category?: string; active?: string } }>(
    '/', async (req, reply) => {
      const filter: Record<string, unknown> = {}
      if (req.query.slug)     filter.slug     = req.query.slug
      if (req.query.category) filter.category = req.query.category
      if (req.query.active !== undefined) filter.active = req.query.active === 'true'
      const games = await GameModel.find(filter).sort({ category: 1, order: 1 })
      return reply.send({ success: true, data: games })
    }
  )

  // ─── GET /api/games/categories ────────────────────────────────────────────
  fastify.get('/categories', async (_req, reply) => {
    return reply.send({ success: true, categories: ALL_CATEGORIES })
  })

  // ─── GET /api/games/:id — busca jogo por ID ───────────────────────────────
  fastify.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const { id } = req.params
    // Evita conflito com rotas dinâmicas — se não parecer ObjectId, retorna 400
    if (!/^[a-f\d]{24}$/i.test(id)) {
      return reply.status(400).send({ success: false, error: 'ID inválido' })
    }
    const game = await GameModel.findById(id)
    if (!game) return reply.status(404).send({ success: false, error: 'Jogo não encontrado' })
    return reply.send({ success: true, data: game })
  })

  // ─── POST /api/games — cria jogo com upload de logo ──────────────────────
  fastify.post('/', async (req, reply) => {
    await ensureDir()
    const parts = req.parts()
    let slug = '', name = '', category = '', order = 0, logoUrl: string | null = null, gameSlug: string | null = null, apiUrl: string | null = null, signalUrl: string | null = null, signalName: string | null = null, signalCollection: string | null = null, signalMessage: string | null = null, signalDuration: number | null = null
    let active = true

    for await (const part of parts) {
      if (part.type === 'file') {
        const ext   = (part.filename.split('.').pop() ?? 'png').toLowerCase()
        const fname = `game-${uuidv4().slice(0, 8)}.${ext}`
        const dest  = join(UPLOADS_DIR, fname)
        await writeFile(dest, await part.toBuffer())
        logoUrl = `/uploads/games/${fname}`
      } else {
        if (part.fieldname === 'slug')      slug      = (part.value as string).toLowerCase().trim()
        if (part.fieldname === 'name')      name      = part.value as string
        if (part.fieldname === 'category')  category  = (part.value as string).toUpperCase()
        if (part.fieldname === 'order')     order     = Number(part.value) || 0
        if (part.fieldname === 'active')    active    = (part.value as string) !== 'false'
        if (part.fieldname === 'gameSlug')  gameSlug  = (part.value as string).trim() || null
        if (part.fieldname === 'apiUrl')    apiUrl    = (part.value as string).trim() || null
        if (part.fieldname === 'signalUrl')        signalUrl        = (part.value as string).trim() || null
        if (part.fieldname === 'signalName')       signalName       = (part.value as string).trim() || null
        if (part.fieldname === 'signalCollection') signalCollection = (part.value as string).trim() || null
        if (part.fieldname === 'signalMessage')    signalMessage    = (part.value as string).trim() || null
        if (part.fieldname === 'signalDuration')   signalDuration   = Number(part.value) || null
        // Suporte para importar jogos com logo existente (sem upload)
        if (part.fieldname === 'existingLogoUrl' && !logoUrl) {
          logoUrl = (part.value as string).trim() || null
        }
      }
    }

    if (!slug)            return reply.status(400).send({ success: false, error: 'slug é obrigatório' })
    if (!name || !category) return reply.status(400).send({ success: false, error: 'name e category são obrigatórios' })
    if (!ALL_CATEGORIES.includes(category as any)) return reply.status(400).send({ success: false, error: 'Categoria inválida' })

    const game = new GameModel({ slug, name, logoUrl, category, order, active, gameSlug, apiUrl, signalUrl, signalName, signalCollection, signalMessage, signalDuration })
    await game.save()
    return reply.status(201).send({ success: true, data: game })
  })

  // ─── PUT /api/games/:id — edita jogo ─────────────────────────────────────
  fastify.put<{ Params: { id: string } }>('/:id', async (req, reply) => {
    await ensureDir()
    const { id } = req.params
    const parts = req.parts()
    const update: Record<string, unknown> = {}

    for await (const part of parts) {
      if (part.type === 'file') {
        const ext   = (part.filename.split('.').pop() ?? 'png').toLowerCase()
        const fname = `game-${uuidv4().slice(0, 8)}.${ext}`
        const dest  = join(UPLOADS_DIR, fname)
        await writeFile(dest, await part.toBuffer())
        update.logoUrl = `/uploads/games/${fname}`
      } else {
        if (part.fieldname === 'name')      update.name      = part.value
        if (part.fieldname === 'category')  update.category  = (part.value as string).toUpperCase()
        if (part.fieldname === 'order')     update.order     = Number(part.value)
        if (part.fieldname === 'active')    update.active    = part.value === 'true'
        if (part.fieldname === 'gameSlug')  update.gameSlug  = (part.value as string).trim() || null
        if (part.fieldname === 'apiUrl')    update.apiUrl    = (part.value as string).trim() || null
        if (part.fieldname === 'signalUrl')        update.signalUrl        = (part.value as string).trim() || null
        if (part.fieldname === 'signalName')       update.signalName       = (part.value as string).trim() || null
        if (part.fieldname === 'signalCollection') update.signalCollection = (part.value as string).trim() || null
        if (part.fieldname === 'signalMessage')    update.signalMessage    = (part.value as string).trim() || null
        if (part.fieldname === 'signalDuration')   update.signalDuration   = Number(part.value) || null
      }
    }

    const game = await GameModel.findByIdAndUpdate(id, update, { new: true })
    if (!game) return reply.status(404).send({ success: false, error: 'Jogo não encontrado' })
    return reply.send({ success: true, data: game })
  })

  // ─── DELETE /api/games/:id ────────────────────────────────────────────────
  fastify.delete<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const game = await GameModel.findByIdAndDelete(req.params.id)
    if (!game) return reply.status(404).send({ success: false, error: 'Jogo não encontrado' })
    return reply.send({ success: true })
  })

  // ─── GET /api/games/slug/:slug — categorias habilitadas ──────────────────
  fastify.get<{ Params: { slug: string } }>('/slug/:slug', async (req, reply) => {
    const slugDoc = await SlugModel.findOne({ slug: req.params.slug })
    if (!slugDoc) return reply.status(404).send({ success: false, error: 'Slug não encontrado' })
    return reply.send({ success: true, enabledCategories: slugDoc.enabledCategories ?? ALL_CATEGORIES })
  })

  // ─── PUT /api/games/slug/:slug — atualiza categorias do slug ─────────────
  fastify.put<{ Params: { slug: string }; Body: { enabledCategories: string[] } }>(
    '/slug/:slug', async (req, reply) => {
      const { enabledCategories } = req.body
      const valid = (enabledCategories ?? []).filter(c => ALL_CATEGORIES.includes(c as any))
      const slugDoc = await SlugModel.findOneAndUpdate(
        { slug: req.params.slug },
        { enabledCategories: valid },
        { new: true }
      )
      if (!slugDoc) return reply.status(404).send({ success: false, error: 'Slug não encontrado' })
      return reply.send({ success: true, enabledCategories: slugDoc.enabledCategories })
    }
  )
}
