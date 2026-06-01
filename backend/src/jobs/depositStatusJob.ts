import { Deposit } from '../models/Deposit.js'

const ROUTES_API = 'https://routes-eb.grupoautoma.com'
const CHECK_INTERVAL_MS = 30_000       // verifica a cada 30 segundos
const PIX_WINDOW_MS     = 10 * 60_000  // PIX expira em 5 min → janela de 10 min (com margem)

let running = false

async function checkPendingDeposits() {
  if (running) return
  running = true

  try {
    const now = new Date()
    const windowStart = new Date(now.getTime() - PIX_WINDOW_MS)  // 10 min atrás
    const cutoff = new Date(now.getTime() - 5 * 60_000)           // 5 min atrás

    // Marca como expirado tudo que passou de 10 min e ainda está pending
    const expired = await Deposit.updateMany(
      { status: 'pending', createdAt: { $lt: windowStart } },
      { $set: { status: 'expired' } }
    )
    if (expired.modifiedCount > 0) {
      console.log(`[deposit-job] ⏰ ${expired.modifiedCount} depósito(s) marcado(s) como expirado`)
    }

    // Verifica os que ainda estão dentro da janela de vida (últimos 10 min)
    const pending = await Deposit.find({
      status: 'pending',
      createdAt: { $gte: windowStart },
      token: { $exists: true, $ne: '' }
    })

    if (pending.length === 0) return
    console.log(`[deposit-job] Verificando ${pending.length} depósito(s) pendente(s)...`)

    for (const deposit of pending) {
      try {
        const headers: Record<string, string> = {
          Authorization: `Bearer ${deposit.token}`,
          'Content-Type': 'application/json',
        }
        if (deposit.cookieKey) headers['X-Cactus-Cookie-Key'] = deposit.cookieKey
        headers['X-Brand-Slug'] = deposit.brandSlug || 'esportiva'
        headers['X-Base-Domain'] = deposit.baseDomain || 'bet.br'

        const res = await fetch(
          `${ROUTES_API}/api/deposit/${deposit.transactionId}/status`,
          { headers }
        )
        const data = await res.json() as { status?: string }

        if (data.status === 'approved' || data.status === 'completed') {
          await Deposit.findByIdAndUpdate(deposit._id, { status: 'approved' })
          console.log(`[deposit-job] ✅ ${deposit.transactionId} aprovado — ${deposit.userName} | R$ ${deposit.amount} | slug: ${deposit.slug}`)
        } else if (data.status === 'failed' || data.status === 'cancelled' || data.status === 'expired') {
          await Deposit.findByIdAndUpdate(deposit._id, { status: data.status })
          console.log(`[deposit-job] ❌ ${deposit.transactionId} → ${data.status}`)
        }
      } catch (err: any) {
        console.warn(`[deposit-job] Erro ao verificar ${deposit.transactionId}:`, err.message)
      }
    }
  } catch (err: any) {
    console.error('[deposit-job] Erro geral:', err.message)
  } finally {
    running = false
  }
}

export function startDepositJob() {
  console.log(`[deposit-job] Iniciado — verificando a cada ${CHECK_INTERVAL_MS / 1000}s (janela: ${PIX_WINDOW_MS / 60000} min)`)
  setInterval(checkPendingDeposits, CHECK_INTERVAL_MS)
  // Primeira verificação imediata após 5s do startup
  setTimeout(checkPendingDeposits, 5_000)
}
