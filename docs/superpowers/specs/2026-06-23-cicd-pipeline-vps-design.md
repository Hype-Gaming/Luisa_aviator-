# Design — Pipeline CI/CD (GitHub Actions → VPS via SSH)

**Data:** 2026-06-23
**Repositório:** Hype-Gaming/Luisa_aviator-
**Status:** Aprovado (aguardando revisão final do spec)

## Objetivo

Automatizar o processo de deploy hoje manual (`git pull → npm install → npm run build → pm2 restart`)
para que rode sozinho a cada push na branch `main`, com uma validação de build antes de tocar na VPS.

## Contexto atual

- **Monorepo**: `backend/` (Fastify + TypeScript) e `frontend/` (Nuxt 4 / Nitro).
- **Backend**: `npm run build` = `tsc` → `dist/`; PM2 app `backend` na porta `3013`.
- **Frontend**: `npm run build` = `nuxt build` → `.output`; PM2 app `frontend-3012` na porta `3012`.
- **Process manager**: PM2, com `ecosystem.config.cjs` em cada pasta (`cwd: __dirname`).
- **Env**: `.env` / `.env.production` vivem na VPS, são gitignored, e são carregados pelo ecosystem.
- **Lockfiles**: `backend/package-lock.json` e `frontend/package-lock.json` existem e estão commitados → usar `npm ci`.
- **Node**: sem `engines.node` declarado; assume-se Node 22 (igual ao ambiente local). Build na VPS exige Node ≥ 20.
- Sem testes e sem CI hoje.

## Decisões (definidas no brainstorming)

| Decisão | Escolha |
|---------|---------|
| Provedor de CI | GitHub Actions |
| Estratégia de deploy | SSH na VPS + build na VPS + `pm2 reload` (espelha o processo manual) |
| Gatilho | Push na branch `main` |
| Validação | Job de build/typecheck no runner ANTES do deploy (gate) |
| Escopo | Deploy sempre dos dois apps (backend + frontend) |
| Acesso | Usuário tem acesso SSH à VPS |

## Arquitetura

Um único workflow `.github/workflows/deploy.yml`, com 2 jobs em sequência:

```
push main ─▶ [ validate ] ──(passou?)──▶ [ deploy via SSH ]
              build no CI                  build na VPS + pm2 reload
```

`concurrency` group impede dois deploys simultâneos (enfileira; não cancela um deploy em andamento).

### Job 1 — `validate` (runner ubuntu-latest)

Rede de segurança. Se qualquer build quebrar, o deploy não começa.

1. checkout do código
2. setup-node (Node 22) com cache de npm para `backend` e `frontend`
3. `backend/`: `npm ci` → `npm run build`
4. `frontend/`: `npm ci` → `npm run build`

### Job 2 — `deploy` (`needs: validate`, runner ubuntu-latest)

Usa `appleboy/ssh-action` para rodar um script remoto na VPS com `set -e` (para na primeira falha,
deixando o app antigo no ar se algo quebrar):

```bash
set -e
cd "$DEPLOY_PATH"
git fetch --all
git reset --hard origin/main          # git é a fonte da verdade

# backend
cd backend
npm ci
npm run build
pm2 startOrReload ecosystem.config.cjs --env production

# frontend
cd ../frontend
npm ci
npm run build
pm2 startOrReload ecosystem.config.cjs --env production

pm2 save
```

## Secrets / variáveis (GitHub → Settings → Secrets and variables → Actions)

| Nome | Tipo | O que é | Exemplo |
|------|------|---------|---------|
| `SSH_HOST` | secret | IP/host da VPS | `104.x.x.x` |
| `SSH_USER` | secret | usuário SSH | `root` / `deploy` |
| `SSH_KEY` | secret | chave **privada** (PEM) com acesso à VPS | conteúdo do `id_ed25519` |
| `SSH_PORT` | secret/var (opcional) | porta SSH | `22` |
| `DEPLOY_PATH` | variable | caminho do repo na VPS | `/root/luisa-aviator` |

Setup da chave: gerar um par dedicado ao deploy; **pública** vai no `~/.ssh/authorized_keys` da VPS,
**privada** vai no secret `SSH_KEY`.

## Segurança / o que NÃO é tocado

- **`.env` / `.env.production`**: gitignored e untracked → `git reset --hard` não os apaga. Preservados.
- **`uploads/`** (logos enviados): gitignored e untracked → preservados.
- **Não usar `git clean`** (apagaria untracked) — proposital, para proteger env e uploads.
- **Downtime**: `pm2 reload` faz swap quase sem downtime; `startOrReload` cobre o primeiro deploy.
- **Concorrência**: `concurrency group` evita corrida entre deploys.

## Pontos de atenção / riscos

1. **Node na VPS** precisa ser ≥ 20 (idealmente 22) para casar com o `validate`. Confirmar versão na VPS.
2. **`git reset --hard origin/main`** descarta alterações feitas à mão na VPS em arquivos rastreados
   (comportamento esperado de CD; git vira a fonte da verdade).
3. **Memória no build do Nuxt**: se a VPS for pequena, o build pode falhar por RAM. Plano B:
   migrar para "build no CI + enviar artefatos via rsync". (Confirmar tamanho/RAM da VPS.)
4. **Primeiro deploy** roda por cima do repo já existente e em execução na VPS.

## Fora de escopo (YAGNI)

- Deploy seletivo por app (path filters) — decidido por "sempre os dois".
- Deploy manual (`workflow_dispatch`) — gatilho é só push na `main`. Pode ser adicionado depois em 1 linha.
- Docker / registry de imagens.
- Testes automatizados (não existem hoje).
- Rollback automatizado (mitigado pelo gate de build + `set -e`).

## Critérios de sucesso

- Push na `main` dispara o workflow.
- Build do backend e frontend valida no CI; se falhar, não há deploy.
- Com build OK, a VPS atualiza o código, rebuilda e recarrega ambos os apps via PM2.
- `.env` e `uploads/` permanecem intactos após o deploy.
- App continua no ar (reload quase sem downtime).
