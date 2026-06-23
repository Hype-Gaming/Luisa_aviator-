# Design — Painel Admin (CRM de retenção) da Luísa Aviator

**Data:** 2026-06-23
**Repositório:** Hype-Gaming/Luisa_aviator-
**Status:** Aprovado (aguardando revisão final do spec)
**Referência visual/estrutural:** `PAINEL-ADMIN-RAINHA.md` (painel do Irmandade/Rainha), **adaptado** — sem assinatura.

## Objetivo

Criar um painel admin de retenção (CRM) para a Luísa Aviator: ver quem usa o app, quem deposita,
acompanhar contato, segmentar por risco e bloquear/desbloquear acesso. Inspirado no painel Rainha,
porém **sem a camada de assinatura paga** (Lastlink/subscriptions fica fora do v1).

## Contexto atual (o que existe hoje)

- **Frontend**: Nuxt 4 (`ssr: false`) + camada **Nitro** (`frontend/server/routes/*`, `frontend/server/utils/*`).
  É o app que **roda em produção** (pm2 `luisaaviator-front`, porta 3012).
- `frontend/app/pages/admin.vue` é apenas um **placeholder** (`RoutePlaceholder`, 12 linhas).
- **Backend Fastify** (`backend/`) tem admin próprio (AdminUser, deposits, etc.), mas **não roda em prod**
  e usa outro paradigma (Mongoose). **Não será usado** neste painel.
- **Não existe** modelo de `subscriptions`/`app_users`/heartbeat no código da Luísa.
- **Login** (`auth.vue`) guarda no `localStorage`: `userEmail`/`user_email`, `name`/`user_name`,
  `brandSlug` (`bateu`), `access_token`, `cookie_key`. Identificador do usuário = **e-mail**.
- **Depósito** (`depositar.vue`): chama a API externa `POST {apiBase}/api/deposit` (apiBase =
  `routes-eb.grupoautoma.com`) e faz polling em `/api/deposit/{transaction_id}/status`. Retorna
  `{ transaction_id, qr_code, br_code, amount }`.
- Driver `mongodb` **não** está instalado no frontend (será adicionado).

## Decisões (definidas no brainstorming)

| Decisão | Escolha |
|---|---|
| Escopo | CRM de retenção completo (cards, tabela, risco, contato, gráfico, CSV, FTD) |
| Fonte de dados | **Banco mongo dedicado novo** da Luísa (`luisa-aviator`) |
| Onde roda o código | **Camada Nitro do frontend** (`frontend/server/`) |
| Assinatura paga | **Fora do v1** (sem Lastlink, sem subscriptions, sem página webhook) |
| Depósitos | **Nitro grava** quando o app gera o PIX (espelha no mongo, sem mexer no fluxo externo) |
| Tags de risco | **Baseadas em depósito** (acessou e não depositou em 24h/48h; inativo 7d) + override manual |
| Admin | allowlist de e-mail (`devhypegaming@gmail.com`) + senha + secret, via env |
| Inatividade | **7 dias** sem acesso |

## Arquitetura

```
App (Nuxt SPA) ──heartbeat/track──▶ Nitro (frontend/server) ──▶ MongoDB "luisa-aviator"
   │                                      ▲
   │                                      │ /api/admin/* (guarda de sessão HMAC)
   └── /admin (UI) ───────────────────────┘
```

Tudo na camada Nitro. Conexão única ao mongo via `server/utils/mongodb.ts` (cliente cacheado).

### Novas variáveis de ambiente (`frontend/.env.production`)

| Env | O que é | Default (inseguro, só dev) |
|---|---|---|
| `MONGODB_URI` | string de conexão do mongo `luisa-aviator` | `mongodb://localhost:27017/luisa-aviator` |
| `ADMIN_ALLOWED_EMAILS` | lista de e-mails admin separada por vírgula | `devhypegaming@gmail.com` |
| `ADMIN_PASSWORD` | senha do admin | `admin123` |
| `ADMIN_SESSION_SECRET` | secret HMAC da sessão | `TROQUE-ESTE-SECRET` |

Em produção, se `ADMIN_SESSION_SECRET`/`ADMIN_PASSWORD` ficarem no default, logar um warning.

## Modelo de dados (coleções no mongo `luisa-aviator`)

### `app_users` — quem abriu o app (heartbeat)
```
{ email, name, phone, brand_slug, blocked, blocked_at,
  first_seen_at, last_seen_at, updated_at }
```
- `email` é a chave (índice único). `first_seen_at` setado uma vez; `last_seen_at` a cada heartbeat.
- `phone` pode ser null (login atual não captura telefone; coluna fica vazia até existir o dado).

### `deposits` — PIX gerados
```
{ email, brand_slug, amount, transaction_id, status,
  is_ftd, source, created_at, updated_at }
```
- Gravado quando o app gera o PIX (`source: 'app'`) ou manualmente (`source: 'admin-ftd'`, `is_ftd: true`).
- `status`: `generated` → `approved`/`expired` (atualizado pelo track de status).
- `transaction_id` único (índice) para upsert idempotente.

### `user_contact_status` — gerenciada pelo painel
```
{ email, status, tag, updated_at, updated_by }
```
- `status` ∈ `pendente|contatado|respondeu|convertido|ignorado`.
- `tag` (override) ∈ `auto|none|risk_24h|risk_48h|inactive`.

**Índices:** `app_users.email` (único), `deposits.transaction_id` (único), `deposits.email`,
`user_contact_status.email` (único), `app_users.last_seen_at`, `app_users.first_seen_at`.

## Coleta de dados (encanação)

### Heartbeat — `POST /api/track/heartbeat`
- Body: `{ email, name?, phone?, brand_slug? }` (do localStorage).
- Upsert em `app_users`: `$setOnInsert: { first_seen_at: now }`, `$set: { last_seen_at: now, name, brand_slug, updated_at }`.
- Chamado pelo app: um composable `useHeartbeat()` dispara no mount (quando logado) e a cada ~5 min.
- Sem autenticação admin (é o app do usuário); validar e-mail presente; rate-limit leve por IP.

### Track de depósito — `POST /api/track/deposit` e `POST /api/track/deposit-status`
- `deposit`: body `{ email, amount, transaction_id, brand_slug }` → upsert em `deposits` por `transaction_id` com `status: 'generated', source: 'app'`. Marca `is_ftd: true` se for o 1º depósito do e-mail.
- `deposit-status`: body `{ transaction_id, status }` → atualiza `status` (chamado no polling de status do app quando vira `approved`/`expired`).
- Enganchado em `depositar.vue` após a resposta da API externa (não altera o fluxo de pagamento).

## API admin (`frontend/server/api/admin/`)

Todas começam com `requireAdminSession(event)` **exceto** `login`/`logout`.

| Arquivo | Rota | O que faz |
|---|---|---|
| `login.post.ts` | POST `/api/admin/login` | valida e-mail (allowlist) + senha (timing-safe) + rate-limit por IP (8/15min → 429); seta cookie HMAC. |
| `logout.post.ts` | POST `/api/admin/logout` | apaga o cookie. |
| `me.get.ts` | GET `/api/admin/me` | `{ adminEmail }` se sessão válida (usado pelo middleware). |
| `stats.get.ts` | GET `/api/admin/stats` | métricas dos 8 cards. |
| `users.get.ts` | GET `/api/admin/users` | lista paginada + enriquecimento + filtros + `brands`. |
| `users/block.post.ts` | POST | bloqueia/desbloqueia (upsert em `app_users`). |
| `users/status.post.ts` | POST | salva status de contato. |
| `users/tag.post.ts` | POST | salva override de tag. |
| `users/export.get.ts` | GET | CSV com os filtros aplicados. |
| `deposits.get.ts` | GET | lista de PIX paginada. |
| `activity.get.ts` | GET | série de 14 dias (novos usuários + PIX/dia). |
| `ftd.post.ts` | POST | registra FTD manual em `deposits`. |

**Removidos do template Rainha:** `subscriptions/approve` e a página `webhook` (assinatura fora do v1).

### Utils
- `server/utils/mongodb.ts` — `getDb()` com cliente cacheado (singleton entre requests).
- `server/utils/adminAuth.ts` — sessão HMAC com expiração no servidor (8h), comparação timing-safe,
  allowlist, `requireAdminSession`. `COOKIE_NAME = 'luisa_admin_session'`.
- `server/utils/adminUserEnrichment.ts` — pipeline de enriquecimento (ver abaixo).

### Enriquecimento (`adminUserEnrichment.ts`) — adaptado (sem subscriptions)
Sobre `app_users`, faz `$lookup` de `deposits` + `user_contact_status` e calcula:
- `deposits_count`, `deposits_sum`.
- `contact_status` (default `pendente`), `tag_override` (default `auto`).
- `auto_risk_tag`:
  - `risk_48h`: `deposits_count == 0` **e** `first_seen_at ≤ now-48h`.
  - `risk_24h`: `deposits_count == 0` **e** `first_seen_at ≤ now-24h`.
  - `inactive`: `last_seen_at ≤ now-7d`.
  - (ordem do `$switch`: 48h antes de 24h; inativo por último.)
- `risk_tag` efetivo: override manda — `none`→null, `auto`→`auto_risk_tag`, senão a própria tag.
- Sem `buildSubsOnlyUnion` (não há assinantes-only).

> Pegadinhas de Mongo (do doc Rainha): usar `$literal`/`$ifNull` no `$project` (valores nus viram
> exclusão/path); `$gt` contra `null` = "campo existe e não é null".

### `stats.get.ts` — os 8 cards
- `totalUsers` = contagem de `app_users`.
- `active48h` = `last_seen_at ≥ now-48h`.
- `depositsCount` / `depositsSum` (todos os deposits).
- `newToday` / `new7d` (por `first_seen_at`).
- `avgTicket` = `depositsSum / depositsCount`.
- `atRisk` = usuários com `risk_tag` em (`risk_24h`,`risk_48h`) — bate com a tabela.
- `inactiveCount` = `risk_tag == 'inactive'`.
- `depositConversion` = % de `app_users` com ≥1 depósito (substitui a "conversão de assinante").

> Card exibidos (8): Usuários · Ativos 48h · PIX gerados · Valor total · Novos 7d · Ticket médio ·
> Em risco (clicável) · Inativos. (`depositConversion` pode aparecer como subtítulo de um card.)

## Frontend (UI) — `frontend/app/`

Porta o visual do painel Rainha (dark premium), adaptado.

- `middleware/admin.ts` — protege `/admin/*` (exceto `/admin/login`) via `GET /api/admin/me`.
  Liberar `/admin` na guarda global de auth do app (área tem guarda própria).
- `composables/useCountUp.ts` — anima números (respeita `prefers-reduced-motion`).
- `composables/useHeartbeat.ts` — dispara o heartbeat quando logado.
- `assets/css/admin-theme.css` — tokens dark premium + keyframes + scrollbar.
- `components/admin/ActivityChart.vue` — gráfico de área SVG (novos usuários / PIX), 14 dias.
- `pages/admin.vue` → dashboard (substitui o placeholder). **OU** migrar para `pages/admin/index.vue`
  + `pages/admin/login.vue` (rota aninhada). **Decisão:** usar `pages/admin/index.vue` e
  `pages/admin/login.vue` (precisa de login próprio), removendo o `admin.vue` placeholder.

**Tabela — colunas (ordem):** Usuário (avatar+nome+email) · Telefone (link `wa.me/<dígitos>`) ·
Tag (`<select>` colorido: Automática/24h/48h/Inativo/Sem tag) · Contato (`<select>` 5 etapas) ·
PIX (qtd+soma) · Marca · 1º acesso · Último acesso · Status (Ativo/Bloqueado) · ação (bloquear).
*(Sem coluna Assinatura.)*

**Filtros:** busca (debounce 300ms) · chips de risco (24h / 48h / inativo / todos) ·
Depositou/Não depositou · Ativos/Bloqueados · Marca. Botão **Export CSV** + form **Registrar FTD**.

**Seções (ordem):** topbar → título → 2 linhas de cards → ActivityChart → tabela Usuários
(com filtros + export) → tabela Depósitos → form Registrar FTD.

### CSV (`users/export.get.ts`)
Mesmos filtros do `users.get.ts`, sem paginação. Delimitador `;`, **BOM UTF-8**, datas em
`America/Sao_Paulo`, valores `19,90`. **Anti-injection**: campo iniciando com `= + - @` recebe `'`;
campos com `";\n` são aspeados. Colunas: Nome, E-mail, Telefone, PIX (qtd), Valor PIX, Marca,
1º acesso, Último acesso, Status, Risco, Status contato.

## Ícones em produção
App usa só Phosphor (`ph:`). Garantir bundle local: `npm install -D @iconify-json/ph` e
`icon: { serverBundle: 'local' }` no `nuxt.config.ts` (verificar o estado atual antes de mexer).

## Segurança

- Senha/secret/allowlist só por env em produção (defaults inseguros logam warning).
- Sessão HMAC com expiração no servidor; revoga se o e-mail sai da allowlist.
- Rate-limit no login.
- Heartbeat/track são públicos (app do usuário), mas validam payload e têm rate-limit leve;
  **não** confiam em dados para escrita admin (bloqueio/tag só via `/api/admin/*`).
- `MONGODB_URI` nunca commitada (vive em `.env.production`, gitignored).

## Plano de construção (3 fases)

1. **Camada de dados** — `mongodb.ts` (+ índices), `/api/track/heartbeat`, `/api/track/deposit`,
   `/api/track/deposit-status`, `useHeartbeat()`, hooks em `depositar.vue`. Dependência `mongodb`.
2. **API admin** — `adminAuth.ts`, `adminUserEnrichment.ts`, e os 12 endpoints `/api/admin/*`.
3. **UI** — middleware, composables, css, ActivityChart, `admin/index.vue`, `admin/login.vue`.

## Critérios de sucesso

- Heartbeat popula `app_users` ao usar o app; depósito gerado aparece em `deposits`.
- Login admin (allowlist + senha) entra; e-mail fora da allowlist é barrado.
- Dashboard mostra cards, tabela com risco/contato editáveis, gráfico 14d, export CSV, FTD, bloqueio.
- Tags de risco automáticas batem com a regra (24h/48h sem depósito; inativo 7d); override manda.
- `nuxt build` passa; ícones renderizam sem chamada externa.

## Fora de escopo (YAGNI)

- Assinatura paga / Lastlink / subscriptions / página webhook.
- Conversão por assinatura (substituída por % que depositou).
- Reaproveitar o backend Fastify (paradigma diferente, não roda em prod).
- Captura de telefone (login atual não fornece) — coluna fica pronta para quando existir o dado.
- Webhook de pagamento para status confiável (v1 usa o polling do próprio app).
