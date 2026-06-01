import { FastifyInstance } from 'fastify'
import { GameImage } from '../models/GameImage.js'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'

const __dirname = dirname(fileURLToPath(import.meta.url))
const GAME_IMAGES_DIR = join(__dirname, '..', '..', 'uploads', 'game-images')

async function ensureDir() {
  if (!existsSync(GAME_IMAGES_DIR)) {
    await mkdir(GAME_IMAGES_DIR, { recursive: true })
  }
}

export default async function gameImagesRoutes(fastify: FastifyInstance) {

  // GET /api/game-images — lista pública (aplicativo consome)
  fastify.get('/', async (_req, reply) => {
    const images = await GameImage.find({ active: true }).sort({ order: 1, createdAt: -1 }).lean()
    return reply.send({ success: true, data: images })
  })

  // POST /api/game-images — upload (admin)
  fastify.post('/', async (request, reply) => {
    await ensureDir()
    const data = await request.file()
    if (!data) return reply.status(400).send({ success: false, error: 'Arquivo não enviado' })

    const allowed = ['image/png', 'image/jpeg', 'image/webp']
    if (!allowed.includes(data.mimetype))
      return reply.status(400).send({ success: false, error: 'Use PNG, JPG ou WEBP' })

    const ext      = data.filename.split('.').pop() || 'jpg'
    const fileName = `game-${uuidv4().slice(0, 8)}.${ext}`
    const filePath = join(GAME_IMAGES_DIR, fileName)
    const buffer   = await data.toBuffer()
    await writeFile(filePath, buffer)

    const title = (request.query as any).title || 'Jogo'
    const order = parseInt((request.query as any).order || '0')

    const img = await GameImage.create({
      title,
      imageUrl: `/uploads/game-images/${fileName}`,
      order,
    })

    return reply.status(201).send({ success: true, data: img })
  })

  // PATCH /api/game-images/:id — editar título / ordem / active (admin)
  fastify.patch<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params
    const body   = request.body as any
    const updated = await GameImage.findByIdAndUpdate(id, { $set: body }, { new: true }).lean()
    if (!updated) return reply.status(404).send({ success: false, error: 'Não encontrado' })
    return reply.send({ success: true, data: updated })
  })

  // DELETE /api/game-images/:id — remove arquivo + registro (admin)
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params
    const img = await GameImage.findByIdAndDelete(id).lean()
    if (!img) return reply.status(404).send({ success: false, error: 'Não encontrado' })

    // Remover arquivo do disco
    const filePath = join(__dirname, '..', '..', img.imageUrl)
    try { await unlink(filePath) } catch {}

    return reply.send({ success: true, message: 'Imagem removida' })
  })

  // DELETE /api/game-images — remove TODAS as imagens (admin)
  fastify.delete('/', async (_req, reply) => {
    const all = await GameImage.find({}).lean()
    await GameImage.deleteMany({})
    // Remove arquivos do disco em paralelo
    await Promise.allSettled(
      all.map(img => unlink(join(__dirname, '..', '..', img.imageUrl)))
    )
    return reply.send({ success: true, message: `${all.length} imagens removidas` })
  })
}
