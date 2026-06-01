import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import jwt from 'jsonwebtoken'
import { AdminUserModel } from '../models/AdminUser.js'

const JWT_SECRET = process.env.JWT_ADMIN_SECRET || 'admin-secret-change-me-in-production'
const JWT_EXPIRES = '7d'

interface LoginBody {
  email: string
  password: string
}

// ── Helper: gerar token ───────────────────────────────────────────────────────
function signToken(id: string, email: string, role: string) {
  return jwt.sign({ id, email, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES })
}

// ── Helper: verificar token ───────────────────────────────────────────────────
export function verifyAdminToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string }
}

// ── Plugin de rotas ───────────────────────────────────────────────────────────
export default async function adminAuthRoutes(fastify: FastifyInstance) {

  // ──────────────────────────────────────────
  // POST /api/admin/auth/login
  // ──────────────────────────────────────────
  fastify.post<{ Body: LoginBody }>('/login', async (request, reply) => {
    try {
      const { email, password } = request.body

      if (!email || !password) {
        return reply.status(400).send({ success: false, error: 'Email e senha são obrigatórios' })
      }

      const admin = await AdminUserModel.findOne({ email: email.toLowerCase().trim() })
      if (!admin || !admin.active) {
        return reply.status(401).send({ success: false, error: 'Credenciais inválidas' })
      }

      const valid = await admin.comparePassword(password)
      if (!valid) {
        return reply.status(401).send({ success: false, error: 'Credenciais inválidas' })
      }

      // Atualiza lastLogin
      admin.lastLogin = new Date()
      await admin.save()

      const token = signToken(admin.id, admin.email, admin.role)

      return reply.send({
        success: true,
        token,
        admin: {
          id:    admin.id,
          name:  admin.name,
          email: admin.email,
          role:  admin.role,
        }
      })
    } catch (err) {
      console.error('Erro no login admin:', err)
      return reply.status(500).send({ success: false, error: 'Erro interno' })
    }
  })

  // ──────────────────────────────────────────
  // GET /api/admin/auth/me  (verificar token)
  // ──────────────────────────────────────────
  fastify.get('/me', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ success: false, error: 'Token não fornecido' })
      }

      const token = authHeader.slice(7)
      const payload = verifyAdminToken(token)

      const admin = await AdminUserModel.findById(payload.id).select('-password').lean()
      if (!admin || !admin.active) {
        return reply.status(401).send({ success: false, error: 'Usuário inativo ou não encontrado' })
      }

      return reply.send({ success: true, admin })
    } catch {
      return reply.status(401).send({ success: false, error: 'Token inválido ou expirado' })
    }
  })

  // ──────────────────────────────────────────
  // POST /api/admin/auth/seed  (criar 1º admin)
  // Só funciona se não houver nenhum admin cadastrado
  // ──────────────────────────────────────────
  fastify.post<{ Body: { name: string; email: string; password: string } }>('/seed', async (request, reply) => {
    try {
      const count = await AdminUserModel.countDocuments()
      if (count > 0) {
        return reply.status(403).send({ success: false, error: 'Já existe um admin cadastrado' })
      }

      const { name, email, password } = request.body
      if (!name || !email || !password) {
        return reply.status(400).send({ success: false, error: 'name, email e password são obrigatórios' })
      }
      if (password.length < 6) {
        return reply.status(400).send({ success: false, error: 'Senha deve ter no mínimo 6 caracteres' })
      }

      const admin = await AdminUserModel.create({ name, email, password, role: 'superadmin' })
      const token = signToken(admin.id, admin.email, admin.role)

      return reply.status(201).send({
        success: true,
        message: 'Admin criado com sucesso!',
        token,
        admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role }
      })
    } catch (err: any) {
      if (err.code === 11000) {
        return reply.status(409).send({ success: false, error: 'Este email já está em uso' })
      }
      console.error('Erro no seed admin:', err)
      return reply.status(500).send({ success: false, error: 'Erro interno' })
    }
  })
}
