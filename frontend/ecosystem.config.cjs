module.exports = {
  apps: [
    {
      name: 'frontend-3012',
      cwd: __dirname,
      script: '.output/server/index.mjs',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'development',
        PORT: 3012,
        NITRO_PORT: 3012,
        HOST: '0.0.0.0',
        NITRO_HOST: '0.0.0.0'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3012,
        NITRO_PORT: 3012,
        HOST: '0.0.0.0',
        NITRO_HOST: '0.0.0.0'
      }
    },
    {
      name: 'frontend-3013',
      cwd: __dirname,
      script: '.output/server/index.mjs',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'development',
        PORT: 3013,
        NITRO_PORT: 3013,
        HOST: '0.0.0.0',
        NITRO_HOST: '0.0.0.0'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3013,
        NITRO_PORT: 3013,
        HOST: '0.0.0.0',
        NITRO_HOST: '0.0.0.0'
      }
    }
  ]
}
