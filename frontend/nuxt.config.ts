declare const process: {
  env: Record<string, string | undefined>
}

export default defineNuxtConfig({
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  modules: ['@nuxt/icon'],
  icon: {
    serverBundle: {
      collections: ['ph', 'svg-spinners']
    }
  },
  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/png', href: '/luisa-logo.png' },
        { rel: 'apple-touch-icon', href: '/luisa-logo.png' },
      ],
      script: [
        {
          innerHTML: `(function(){try{if(localStorage.getItem('theme_mode')==='light'){document.documentElement.classList.add('light-mode');}}catch(e){}})();`,
          tagPosition: 'head',
        },
      ],
    },
  },
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'https://routes-eb.grupoautoma.com',
      telegramLink: process.env.NUXT_PUBLIC_TELEGRAM_LINK || 'https://t.me/+GOeLGqEfly04OGQ5',
    }
  },
  devServer: {
    port: Number(process.env.PORT) || 3002
  },
  vite: {
    server: {
      allowedHosts: ['.ngrok-free.dev', '.ngrok.io']
    }
  },
  compatibilityDate: '2024-12-09'
})
