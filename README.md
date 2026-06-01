# Projeto Base Aviator

Base completa para criar um novo projeto a partir do Aviator, separada em:

- `frontend`: app Nuxt 4 / Vue 3 / Nitro
- `backend`: API Fastify / TypeScript

Arquivos de build, cache, logs, uploads e `node_modules` foram deixados de fora de proposito.

## Onde Trocar Marca

Logo e favicon:

- `frontend/public/commander-logo.svg`
- `frontend/public/favicon.ico`
- `frontend/public/favicon.png`
- `frontend/public/comandante-logo.png`
- `frontend/public/eder-logo.png`

Nome/textos principais:

- `frontend/app/components/AppShell.vue`
- `frontend/app/pages/index.vue`
- demais paginas em `frontend/app/pages`

## Onde Trocar Cores

Cores globais do app:

- `frontend/app/assets/css/main.css`

Principais variaveis:

```css
--av-accent: #e21a82;
--av-accent-2: #ff52a8;
--av-accent-glow: rgba(226, 26, 130, 0.34);
```

Troque essas cores para mudar a identidade principal sem precisar refazer os componentes.

## Onde Trocar Links e APIs

Frontend:

- `frontend/nuxt.config.ts`
  - `NUXT_PUBLIC_API_BASE`
  - `NUXT_PUBLIC_TELEGRAM_LINK`
- `frontend/.env`
- `frontend/.env.production`
- `frontend/server/routes/aviator-history.get.ts`
- `frontend/app/composables/useAviatorSignal.ts`
- `frontend/app/pages/index.vue`
- `frontend/app/pages/play.vue`

Backend:

- `backend/src/server.ts`
- `backend/src/routes/routesAuth.ts`
- `backend/src/routes/routesDeposit.ts`
- `backend/src/routes/wallet.ts`
- `backend/src/jobs/depositStatusJob.ts`
- `backend/src/routes/aviator.ts`

## Instalar e Rodar Local

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Backend:

```bash
cd backend
npm install
npm run dev
```

## Build de Producao

Frontend:

```bash
cd frontend
npm install
npm run build
pm2 start ecosystem.config.cjs --env production
```

Backend:

```bash
cd backend
npm install
npm run build
pm2 start ecosystem.config.cjs --env production
```

## Checklist Para Novo Projeto

1. Trocar logos e favicons em `frontend/public`.
2. Trocar cores em `frontend/app/assets/css/main.css`.
3. Ajustar `NUXT_PUBLIC_API_BASE` no frontend.
4. Ajustar dominio/CORS/API_URL no backend.
5. Ajustar links externos como Telegram, WebSocket e historico.
6. Revisar nomes do app em componentes e paginas.
7. Rodar build do frontend e backend antes de subir.
