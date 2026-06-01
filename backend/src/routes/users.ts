import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import mongoose from 'mongoose'

// O banco dos usuários é separado do banco principal da API
const USERS_DB = 'millionCassino_users'

/** Retorna a instância do banco millionCassino_users via MongoClient compartilhado */
function getUsersDb() {
  return mongoose.connection.getClient().db(USERS_DB)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Lista todas as collections cujo nome começa com "users_" */
async function getUserCollections(): Promise<string[]> {
  const db = getUsersDb()
  const collections = await db.listCollections().toArray()
  return collections
    .map(c => c.name)
    .filter(n => n.startsWith('users_'))
}

/** Retorna documents de uma collection, com paginação */
async function getCollectionDocs(
  collectionName: string,
  page: number,
  limit: number,
  search?: string
) {
  const db  = getUsersDb()
  const col = db.collection(collectionName)
  const filter: Record<string, unknown> = {}

  if (search) {
    filter.$or = [
      { email: { $regex: search, $options: 'i' } },
      { name:  { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ]
  }

  const total = await col.countDocuments(filter)
  const docs  = await col
    .find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray()

  return { docs, total }
}

// ─── Route Plugin ─────────────────────────────────────────────────────────────

export default async function usersRoutes(fastify: FastifyInstance) {

  /** GET /api/users — lista os slugs com contagem de usuários */
  fastify.get('/', async (_req: FastifyRequest, reply: FastifyReply) => {
    try {
      const db   = getUsersDb()
      const cols = await getUserCollections()

      // Conta usuários de cada collection em paralelo
      const counts = await Promise.all(
        cols.map(async (colName) => {
          const count = await db.collection(colName).countDocuments()
          return { slug: colName.replace(/^users_/, ''), count }
        })
      )

      // Ordena por mais usuários
      counts.sort((a, b) => b.count - a.count)

      return reply.send({ success: true, slugs: counts })
    } catch (err) {
      fastify.log.error(err)
      return reply.status(500).send({ success: false, error: 'Erro ao listar coleções' })
    }
  })

  /** GET /api/users/:slug — lista usuários de um slug específico */
  fastify.get<{
    Params: { slug: string }
    Querystring: { page?: string; limit?: string; search?: string }
  }>('/:slug', async (req, reply) => {
    try {
      const { slug } = req.params
      const page   = Math.max(1, parseInt(req.query.page  ?? '1',  10))
      const limit  = Math.min(100, parseInt(req.query.limit ?? '50', 10))
      const search = req.query.search?.trim()

      const collectionName = `users_${slug}`
      const { docs, total } = await getCollectionDocs(collectionName, page, limit, search)

      return reply.send({
        success: true,
        slug,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        data: docs,
      })
    } catch (err) {
      fastify.log.error(err)
      return reply.status(500).send({ success: false, error: 'Erro ao buscar usuários' })
    }
  })
}
