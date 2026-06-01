import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { getGlobalSettings, GlobalSettingsModel } from '../models/GlobalSettings.js'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_ADMIN_SECRET || 'admin-secret-change-me-in-production'

// ============================================
// Helper: verificar token admin
// ============================================
async function verifyAdmin(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
  const auth = request.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) {
    reply.status(401).send({ success: false, error: 'Token não fornecido' })
    return false
  }
  try {
    jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET)
    return true
  } catch {
    reply.status(401).send({ success: false, error: 'Token inválido' })
    return false
  }
}

// ============================================
// Plugin de Rotas
// ============================================
export default async function settingsRoutes(fastify: FastifyInstance) {

  // ──────────────────────────────────────────
  // GET /api/settings/maintenance - Status de manutenção (público)
  // ──────────────────────────────────────────
  fastify.get('/maintenance', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const settings = await getGlobalSettings()
      return reply.send({
        success: true,
        data: {
          active: settings.maintenance.active,
          title: settings.maintenance.title,
          message: settings.maintenance.message,
          activatedAt: settings.maintenance.activatedAt,
        }
      })
    } catch (error) {
      console.error('Erro ao buscar status de manutenção:', error)
      return reply.status(500).send({ success: false, error: 'Erro ao buscar configurações' })
    }
  })

  // ──────────────────────────────────────────
  // PUT /api/settings/maintenance - Atualizar manutenção (admin)
  // ──────────────────────────────────────────
  fastify.put('/maintenance', async (request: FastifyRequest, reply: FastifyReply) => {
    const isAdmin = await verifyAdmin(request, reply)
    if (!isAdmin) return

    try {
      const body = request.body as {
        active?: boolean
        title?: string
        message?: string
      }

      const updateData: Record<string, unknown> = {}

      if (body.active !== undefined) {
        updateData['maintenance.active'] = body.active
        // Se ativando, registra a data. Se desativando, limpa.
        updateData['maintenance.activatedAt'] = body.active ? new Date() : null
      }
      if (body.title !== undefined)   updateData['maintenance.title']   = body.title
      if (body.message !== undefined) updateData['maintenance.message'] = body.message

      // Upsert: cria se não existir
      const updated = await GlobalSettingsModel.findOneAndUpdate(
        {},
        { $set: updateData },
        { new: true, upsert: true, runValidators: true }
      ).lean()

      return reply.send({
        success: true,
        data: {
          active: updated!.maintenance.active,
          title: updated!.maintenance.title,
          message: updated!.maintenance.message,
          activatedAt: updated!.maintenance.activatedAt,
        }
      })
    } catch (error) {
      console.error('Erro ao atualizar manutenção:', error)
      return reply.status(500).send({ success: false, error: 'Erro ao atualizar configurações' })
    }
  })
}
