# Deploy (CI/CD)

Deploy automático via **GitHub Actions → SSH na VPS → PM2**.
A cada push na branch `main`, o workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):

1. **Valida** — builda backend e frontend no runner do GitHub. Se quebrar, não faz deploy.
2. **Deploy** — conecta na VPS via SSH, atualiza o código, rebuilda e recarrega os dois apps com PM2.

## Configuração (1x)

### 1. Gerar uma chave SSH dedicada ao deploy

No seu computador:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f deploy_key
```

Isso gera `deploy_key` (privada) e `deploy_key.pub` (pública).

### 2. Autorizar a chave pública na VPS

Copie o conteúdo de `deploy_key.pub` para a VPS:

```bash
# na VPS, com o usuário que fará o deploy (ex: root ou deploy)
echo "CONTEUDO_DO_deploy_key.pub" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 3. Cadastrar os secrets/variáveis no GitHub

Repositório → **Settings → Secrets and variables → Actions**.

**Secrets** (aba *Secrets* → Repository secrets):

| Nome | Valor |
|------|-------|
| `VPS_HOST` | IP/host da VPS (ex: `104.234.186.24`) |
| `VPS_USER` | usuário SSH (ex: `root`) |
| `VPS_SSH_KEY` | conteúdo **completo** do arquivo `deploy_key` (chave privada) |
| `VPS_PORT` | porta SSH — opcional, padrão `22` |
| `VPS_PATH` | caminho do repositório na VPS (ex: `/var/www/luisaaviator/luisa-aviator`) |

### 4. Pré-requisitos na VPS

- O repositório já clonado em `VPS_PATH`, com o remote `origin` apontando para o GitHub.
- **Node ≥ 20** (idealmente 22) disponível para o usuário do deploy.
  - Se instalado por **nvm**, o workflow já carrega o nvm automaticamente.
- **PM2** instalado globalmente (`npm i -g pm2`).
- Arquivos `.env` / `.env.production` presentes em `backend/` e `frontend/` (não são versionados).

## O que é preservado em cada deploy

- `.env` / `.env.production` — gitignored, não são tocados pelo `git reset --hard`.
- `uploads/` — gitignored, preservado (o deploy **não** roda `git clean`).

## Disparar manualmente

O gatilho é push na `main`. Para forçar um redeploy sem novo commit, faça um commit vazio:

```bash
git commit --allow-empty -m "chore: redeploy" && git push
```

## Plano B (VPS com pouca RAM)

O build do Nuxt roda na VPS. Se faltar memória, migra-se para "build no CI + envio de artefatos
via rsync". Avisar caso o build do frontend falhe por memória.
