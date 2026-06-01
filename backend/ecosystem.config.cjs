// ecosystem.config.cjs
// Uso: pm2 start ecosystem.config.cjs
// Para produção: pm2 start ecosystem.config.cjs --env production

const fs = require("fs")
const path = require("path")

function loadEnv(file) {
  const envPath = path.resolve(__dirname, file)
  if (!fs.existsSync(envPath)) return {}

  return fs.readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .reduce((env, line) => {
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
      if (!match) return env
      env[match[1]] = match[2].replace(/^([\"'])(.*)\1$/, "$2")
      return env
    }, {})
}


module.exports = {
  apps: [
    {
      name: 'backend',
      cwd: __dirname,
      script: 'dist/server.js',

      // ── Opções de processo ──────────────────────────────────────
      instances: 1,          // aumentar p/ cluster: 'max' ou número
      exec_mode: 'fork',     // trocar para 'cluster' se instances > 1
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',

      // ── Logs ────────────────────────────────────────────────────
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',

      // ── Variáveis de ambiente — DESENVOLVIMENTO ─────────────────
      env: {
        ...loadEnv('.env'),
        NODE_ENV: 'development',
        PORT: 3013,
      },

      // Ambiente — PRODUÇÃO
      env_production: {
        ...loadEnv('.env.production'),
        NODE_ENV: 'production',
        PORT: 3013,
      },
    },
  ],
}
