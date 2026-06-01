import type { FastifyInstance } from 'fastify'

const ROUTES_API = process.env.ROUTES_API_BASE || 'https://routes-eb.grupoautoma.com'

interface LoginBody {
  email?: string
  password?: string
  save_cookies?: boolean
}

export default async function routesAuthRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: LoginBody }>('/login', async (request, reply) => {
    const email = String(request.body?.email || '').trim()
    const password = String(request.body?.password || '')

    if (!email || !password) {
      return reply.status(400).send({
        success: false,
        message: 'Informe email/CPF e senha.',
      })
    }

    try {
      const res = await fetch(`${ROUTES_API}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          save_cookies: request.body?.save_cookies ?? true,
        }),
      })

      const text = await res.text()
      let payload: any = null
      try {
        payload = text ? JSON.parse(text) : null
      } catch {
        payload = { message: text }
      }

      if (!res.ok) {
        return reply.status(res.status).send({
          success: false,
          message: payload?.message || payload?.detail || 'Nao foi possivel fazer login.',
          data: payload,
        })
      }

      return reply.send({
        success: true,
        access_token: payload?.access_token,
        token_type: payload?.token_type || 'Bearer',
        expires_in: payload?.expires_in,
        user: payload?.user,
        cookie_key: payload?.cookie_key,
        cookies_path: payload?.cookies_path,
      })
    } catch (err: any) {
      request.log.error({ err }, 'Erro ao autenticar na API de rotas')
      return reply.status(502).send({
        success: false,
        message: 'Falha ao conectar com o servico de autenticacao.',
      })
    }
  })
}
