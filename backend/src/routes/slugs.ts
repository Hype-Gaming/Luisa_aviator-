import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { SlugModel, DEFAULT_THEME, DEFAULT_FEATURES, ITheme, IFeatures, ICustomLinks, ILesson } from '../models/Slug.js'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const UPLOADS_DIR = join(__dirname, '..', '..', 'uploads', 'logos')

// Ensure uploads directory exists
async function ensureUploadsDir() {
  if (!existsSync(UPLOADS_DIR)) {
    await mkdir(UPLOADS_DIR, { recursive: true })
  }
}

// ============================================
// Interfaces para requests
// ============================================
interface SlugParams {
  slug: string
}

interface CreateSlugBody {
  slug: string
  brandSlug?: string
  baseDomain?: string
  name: string
  description?: string
  keywords?: string
  theme?: Partial<ITheme>
  features?: Partial<IFeatures>
  customLinks?: Partial<ICustomLinks>
}

interface UpdateSlugBody {
  slug?: string
  brandSlug?: string
  baseDomain?: string
  name?: string
  description?: string
  keywords?: string
  theme?: Partial<ITheme>
  features?: Partial<IFeatures>
  customLinks?: Partial<ICustomLinks>
  active?: boolean
  isDefault?: boolean
}

// ============================================
// Plugin de Rotas
// ============================================
export default async function slugRoutes(fastify: FastifyInstance) {

  // ──────────────────────────────────────────
  // GET /api/slugs - Listar todos os slugs
  // ──────────────────────────────────────────
  fastify.get('/', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const slugs = await SlugModel.find().sort({ createdAt: -1 }).lean()
      return reply.send({ success: true, data: slugs })
    } catch (error) {
      return reply.status(500).send({ success: false, error: 'Erro ao buscar slugs' })
    }
  })

  // ──────────────────────────────────────────
  // GET /api/slugs/config/default - Slug padrão para redirecionamento
  // ──────────────────────────────────────────
  fastify.get('/config/default', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const defaultSlug = await SlugModel.findOne({ isDefault: true, active: true }).lean()
      if (defaultSlug) {
        return reply.send({ success: true, data: { slug: defaultSlug.slug } })
      }
      // Fallback: primeiro slug ativo
      const first = await SlugModel.findOne({ active: true }).sort({ createdAt: 1 }).lean()
      return reply.send({ success: true, data: { slug: first?.slug || null } })
    } catch (error) {
      return reply.status(500).send({ success: false, error: 'Erro ao buscar slug padrão' })
    }
  })

  // ──────────────────────────────────────────
  // GET /api/slugs/:slug - Buscar slug específico
  // ──────────────────────────────────────────
  fastify.get<{ Params: SlugParams }>('/:slug', async (request, reply) => {
    try {
      const { slug } = request.params
      const slugDoc = await SlugModel.findOne({ slug: slug.toLowerCase() }).lean()
      
      if (!slugDoc) {
        return reply.status(404).send({ success: false, error: 'Slug não encontrado' })
      }

      return reply.send({ success: true, data: slugDoc })
    } catch (error) {
      return reply.status(500).send({ success: false, error: 'Erro ao buscar slug' })
    }
  })

  // ──────────────────────────────────────────
  // GET /api/slugs/:slug/theme - Apenas o tema (para o app consumir)
  // ──────────────────────────────────────────
  fastify.get<{ Params: SlugParams }>('/:slug/theme', async (request, reply) => {
    try {
      const { slug } = request.params
      const slugDoc = await SlugModel.findOne({ slug: slug.toLowerCase(), active: true }).lean()
      
      if (!slugDoc) {
        // Retorna tema padrão se não encontrar
        return reply.send({ 
          success: true, 
          data: {
            slug: slug.toLowerCase(),
            brandSlug: 'bateu',
            baseDomain: 'bet.br',
            name: slug,
            description: '',
            keywords: '',
            logo: null,
            favicon: null,
            bannerUrl: null,
            theme: DEFAULT_THEME,
            features: DEFAULT_FEATURES,
            customLinks: {},
            enabledCategories: ['ROLETAS', 'CRASH', 'SLOT', 'DIVERSOS']
          }
        })
      }

      return reply.send({ 
        success: true, 
        data: {
          slug: slugDoc.slug,
          brandSlug: (slugDoc as any).brandSlug || 'bateu',
          baseDomain: (slugDoc as any).baseDomain || 'bet.br',
          name: slugDoc.name,
          description: slugDoc.description || '',
          keywords: slugDoc.keywords || '',
          logo: slugDoc.logo,
          favicon: slugDoc.favicon,
          bannerUrl: slugDoc.bannerUrl || null,
          theme: slugDoc.theme,
          features: slugDoc.features || DEFAULT_FEATURES,
          customLinks: slugDoc.customLinks || {},
          enabledCategories: (slugDoc as any).enabledCategories ?? ['ROLETAS', 'CRASH', 'SLOT', 'DIVERSOS'],
          lessons: (slugDoc as any).lessons ?? []
        }
      })
    } catch (error) {
      return reply.status(500).send({ success: false, error: 'Erro ao buscar tema' })
    }
  })

  // ──────────────────────────────────────────
  // POST /api/slugs - Criar novo slug
  // ──────────────────────────────────────────
  fastify.post<{ Body: CreateSlugBody }>('/', async (request, reply) => {
    try {
      const { slug, name, theme } = request.body

      if (!slug || !name) {
        return reply.status(400).send({ success: false, error: 'slug e name são obrigatórios' })
      }

      // Validar formato do slug (apenas letras, números e hífens)
      const slugRegex = /^[a-z0-9-]+$/
      const normalizedSlug = slug.toLowerCase().trim()
      
      if (!slugRegex.test(normalizedSlug)) {
        return reply.status(400).send({ 
          success: false, 
          error: 'Slug deve conter apenas letras minúsculas, números e hífens' 
        })
      }

      // Verificar se slug já existe
      const existing = await SlugModel.findOne({ slug: normalizedSlug })
      if (existing) {
        return reply.status(409).send({ success: false, error: 'Slug já existe' })
      }

      const newSlug = await SlugModel.create({
        slug: normalizedSlug,
        brandSlug: request.body.brandSlug?.toLowerCase().trim() || 'bateu',
        baseDomain: request.body.baseDomain?.toLowerCase().trim() || 'bet.br',
        name,
        description: request.body.description || '',
        keywords: request.body.keywords || '',
        theme: { ...DEFAULT_THEME, ...(theme || {}) },
        features: { ...DEFAULT_FEATURES, ...(request.body.features || {}) },
        customLinks: { ...(request.body.customLinks || {}) },
        enabledCategories: (request.body as any).enabledCategories ?? ['ROLETAS', 'CRASH', 'SLOT', 'DIVERSOS'],
      })

      return reply.status(201).send({ success: true, data: newSlug })
    } catch (error) {
      console.error('Erro ao criar slug:', error)
      return reply.status(500).send({ success: false, error: 'Erro ao criar slug' })
    }
  })

  // ──────────────────────────────────────────
  // PUT /api/slugs/:slug - Atualizar slug
  // ──────────────────────────────────────────
  fastify.put<{ Params: SlugParams; Body: UpdateSlugBody }>('/:slug', async (request, reply) => {
    try {
      const { slug } = request.params
      const { name, theme, active } = request.body

      const updateData: Record<string, unknown> = {}
      
      // Renomear slug se fornecido e diferente
      const newSlug = request.body.slug?.toLowerCase().replace(/[^a-z0-9-]/g, '')
      if (newSlug && newSlug !== slug.toLowerCase()) {
        // Verificar se novo slug já existe
        const existing = await SlugModel.findOne({ slug: newSlug }).lean()
        if (existing) {
          return reply.status(409).send({ success: false, error: 'Este slug já está em uso' })
        }
        updateData.slug = newSlug
      }

      if (name !== undefined) updateData.name = name
      if (active !== undefined) updateData.active = active
      if (request.body.brandSlug !== undefined) updateData.brandSlug = request.body.brandSlug.toLowerCase().trim() || 'bateu'
      if (request.body.baseDomain !== undefined) updateData.baseDomain = request.body.baseDomain.toLowerCase().trim() || 'bet.br'

      // Garantir apenas um slug default
      if (request.body.isDefault !== undefined) {
        if (request.body.isDefault) {
          await SlugModel.updateMany({ isDefault: true }, { $set: { isDefault: false } })
        }
        updateData.isDefault = request.body.isDefault
      }
      if (request.body.description !== undefined) updateData.description = request.body.description
      if (request.body.keywords !== undefined) updateData.keywords = request.body.keywords
      
      // Merge features parcial
      if (request.body.features) {
        for (const [key, value] of Object.entries(request.body.features)) {
          updateData[`features.${key}`] = value
        }
      }
      
      // Merge theme parcial
      if (theme) {
        for (const [key, value] of Object.entries(theme)) {
          updateData[`theme.${key}`] = value
        }
      }

      // Merge customLinks parcial
      if (request.body.customLinks) {
        for (const [key, value] of Object.entries(request.body.customLinks)) {
          updateData[`customLinks.${key}`] = value
        }
      }

      // Salvar enabledCategories se fornecido
      if ((request.body as any).enabledCategories !== undefined) {
        updateData.enabledCategories = (request.body as any).enabledCategories
      }

      // Salvar lessons se fornecido
      if ((request.body as any).lessons !== undefined) {
        updateData.lessons = (request.body as any).lessons
      }

      const updated = await SlugModel.findOneAndUpdate(
        { slug: slug.toLowerCase() },
        { $set: updateData },
        { new: true, runValidators: true }
      ).lean()

      if (!updated) {
        return reply.status(404).send({ success: false, error: 'Slug não encontrado' })
      }

      return reply.send({ success: true, data: updated })
    } catch (error) {
      console.error('Erro ao atualizar slug:', error)
      return reply.status(500).send({ success: false, error: 'Erro ao atualizar slug' })
    }
  })

  // ──────────────────────────────────────────
  // POST /api/slugs/:slug/logo - Upload de logo
  // ──────────────────────────────────────────
  fastify.post<{ Params: SlugParams }>('/:slug/logo', async (request, reply) => {
    try {
      const { slug } = request.params
      await ensureUploadsDir()

      const data = await request.file()
      if (!data) {
        return reply.status(400).send({ success: false, error: 'Nenhum arquivo enviado' })
      }

      // Validar tipo de arquivo
      const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
      if (!allowedTypes.includes(data.mimetype)) {
        return reply.status(400).send({ 
          success: false, 
          error: 'Tipo de arquivo não permitido. Use PNG, JPG, WEBP ou SVG' 
        })
      }

      // Gerar nome único
      const ext = data.filename.split('.').pop() || 'png'
      const fileName = `${slug}-${uuidv4().slice(0, 8)}.${ext}`
      const filePath = join(UPLOADS_DIR, fileName)

      // Salvar arquivo
      const buffer = await data.toBuffer()
      await writeFile(filePath, buffer)

      // Atualizar no banco
      const logoUrl = `/uploads/logos/${fileName}`
      const updated = await SlugModel.findOneAndUpdate(
        { slug: slug.toLowerCase() },
        { $set: { logo: logoUrl } },
        { new: true }
      ).lean()

      if (!updated) {
        return reply.status(404).send({ success: false, error: 'Slug não encontrado' })
      }

      return reply.send({ success: true, data: { logo: logoUrl } })
    } catch (error) {
      console.error('Erro ao fazer upload do logo:', error)
      return reply.status(500).send({ success: false, error: 'Erro ao fazer upload' })
    }
  })

  // ──────────────────────────────────────────
  // POST /api/slugs/:slug/favicon - Upload de favicon
  // ──────────────────────────────────────────
  fastify.post<{ Params: SlugParams }>('/:slug/favicon', async (request, reply) => {
    try {
      const { slug } = request.params
      await ensureUploadsDir()

      const data = await request.file()
      if (!data) {
        return reply.status(400).send({ success: false, error: 'Nenhum arquivo enviado' })
      }

      const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/x-icon']
      if (!allowedTypes.includes(data.mimetype)) {
        return reply.status(400).send({ 
          success: false, 
          error: 'Tipo de arquivo não permitido' 
        })
      }

      const ext = data.filename.split('.').pop() || 'png'
      const fileName = `${slug}-favicon-${uuidv4().slice(0, 8)}.${ext}`
      const filePath = join(UPLOADS_DIR, fileName)

      const buffer = await data.toBuffer()
      await writeFile(filePath, buffer)

      const faviconUrl = `/uploads/logos/${fileName}`
      const updated = await SlugModel.findOneAndUpdate(
        { slug: slug.toLowerCase() },
        { $set: { favicon: faviconUrl } },
        { new: true }
      ).lean()

      if (!updated) {
        return reply.status(404).send({ success: false, error: 'Slug não encontrado' })
      }

      return reply.send({ success: true, data: { favicon: faviconUrl } })
    } catch (error) {
      console.error('Erro ao fazer upload do favicon:', error)
      return reply.status(500).send({ success: false, error: 'Erro ao fazer upload' })
    }
  })

  // ──────────────────────────────────────────
  // POST /api/slugs/:slug/banner - Upload de banner
  // ──────────────────────────────────────────
  fastify.post<{ Params: SlugParams }>('/:slug/banner', async (request, reply) => {
    try {
      const { slug } = request.params
      await ensureUploadsDir()

      const data = await request.file()
      if (!data) {
        return reply.status(400).send({ success: false, error: 'Nenhum arquivo enviado' })
      }

      const allowedTypes = ['image/png', 'image/jpeg', 'image/webp']
      if (!allowedTypes.includes(data.mimetype)) {
        return reply.status(400).send({ 
          success: false, 
          error: 'Tipo de arquivo não permitido. Use PNG, JPG ou WEBP' 
        })
      }

      const ext = data.filename.split('.').pop() || 'png'
      const fileName = `${slug}-banner-${uuidv4().slice(0, 8)}.${ext}`
      const filePath = join(UPLOADS_DIR, fileName)

      const buffer = await data.toBuffer()
      await writeFile(filePath, buffer)

      const bannerUrl = `/uploads/logos/${fileName}`
      const updated = await SlugModel.findOneAndUpdate(
        { slug: slug.toLowerCase() },
        { $set: { bannerUrl } },
        { new: true }
      ).lean()

      if (!updated) {
        return reply.status(404).send({ success: false, error: 'Slug não encontrado' })
      }

      return reply.send({ success: true, data: { bannerUrl } })
    } catch (error) {
      console.error('Erro ao fazer upload do banner:', error)
      return reply.status(500).send({ success: false, error: 'Erro ao fazer upload' })
    }
  })

  // ──────────────────────────────────────────
  // POST /api/slugs/:slug/lessons - Adicionar aula
  // ──────────────────────────────────────────
  fastify.post<{ Params: SlugParams }>('/:slug/lessons', async (request, reply) => {
    try {
      const { slug } = request.params
      const body = request.body as Partial<ILesson> & { title?: string; youtubeUrl?: string }
      if (!body.title || !body.youtubeUrl) {
        return reply.status(400).send({ success: false, error: 'title e youtubeUrl são obrigatórios' })
      }
      const lesson: Partial<ILesson> = {
        title:       body.title,
        description: body.description || '',
        youtubeUrl:  body.youtubeUrl,
        category:    body.category || 'Geral',
        order:       body.order ?? 0,
        active:      body.active ?? true,
      }
      const updated = await SlugModel.findOneAndUpdate(
        { slug: slug.toLowerCase() },
        { $push: { lessons: lesson } },
        { new: true }
      ).lean()
      if (!updated) return reply.status(404).send({ success: false, error: 'Slug não encontrado' })
      return reply.send({ success: true, data: (updated as any).lessons })
    } catch (error) {
      console.error('Erro ao adicionar aula:', error)
      return reply.status(500).send({ success: false, error: 'Erro ao adicionar aula' })
    }
  })

  // ──────────────────────────────────────────
  // PUT /api/slugs/:slug/lessons/:lessonId - Editar aula
  // ──────────────────────────────────────────
  fastify.put<{ Params: SlugParams & { lessonId: string } }>('/:slug/lessons/:lessonId', async (request, reply) => {
    try {
      const { slug, lessonId } = request.params
      const body = request.body as Partial<ILesson>
      const updateFields: Record<string, unknown> = {}
      if (body.title       !== undefined) updateFields['lessons.$.title']       = body.title
      if (body.description !== undefined) updateFields['lessons.$.description'] = body.description
      if (body.youtubeUrl  !== undefined) updateFields['lessons.$.youtubeUrl']  = body.youtubeUrl
      if (body.category    !== undefined) updateFields['lessons.$.category']    = body.category
      if (body.order       !== undefined) updateFields['lessons.$.order']       = body.order
      if (body.active      !== undefined) updateFields['lessons.$.active']      = body.active
      const updated = await SlugModel.findOneAndUpdate(
        { slug: slug.toLowerCase(), 'lessons._id': lessonId },
        { $set: updateFields },
        { new: true }
      ).lean()
      if (!updated) return reply.status(404).send({ success: false, error: 'Aula não encontrada' })
      return reply.send({ success: true, data: (updated as any).lessons })
    } catch (error) {
      console.error('Erro ao editar aula:', error)
      return reply.status(500).send({ success: false, error: 'Erro ao editar aula' })
    }
  })

  // ──────────────────────────────────────────
  // DELETE /api/slugs/:slug/lessons/:lessonId - Deletar aula
  // ──────────────────────────────────────────
  fastify.delete<{ Params: SlugParams & { lessonId: string } }>('/:slug/lessons/:lessonId', async (request, reply) => {
    try {
      const { slug, lessonId } = request.params
      const updated = await SlugModel.findOneAndUpdate(
        { slug: slug.toLowerCase() },
        { $pull: { lessons: { _id: lessonId } } },
        { new: true }
      ).lean()
      if (!updated) return reply.status(404).send({ success: false, error: 'Slug não encontrado' })
      return reply.send({ success: true, data: (updated as any).lessons })
    } catch (error) {
      console.error('Erro ao deletar aula:', error)
      return reply.status(500).send({ success: false, error: 'Erro ao deletar aula' })
    }
  })

  // ──────────────────────────────────────────
  // DELETE /api/slugs/:slug - Deletar slug
  // ──────────────────────────────────────────
  fastify.delete<{ Params: SlugParams }>('/:slug', async (request, reply) => {
    try {
      const { slug } = request.params
      const deleted = await SlugModel.findOneAndDelete({ slug: slug.toLowerCase() })

      if (!deleted) {
        return reply.status(404).send({ success: false, error: 'Slug não encontrado' })
      }

      return reply.send({ success: true, message: 'Slug deletado com sucesso' })
    } catch (error) {
      return reply.status(500).send({ success: false, error: 'Erro ao deletar slug' })
    }
  })
}
