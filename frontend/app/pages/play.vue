<script setup lang="ts">
useHead({ title: 'Jogar Aviator Prime - Luisa Aviator' })

const config = useRuntimeConfig()

const gameUrl = ref('')
const isLoading = ref(true)
const error = ref('')

function extractGameUrl(data: any): string | null {
  // Format 1: { success: true, game_url: "..." }
  if (data?.game_url) return data.game_url

  // Format 2: { payload: { gameURL: "..." } }
  if (data?.payload?.gameURL) {
    const url = data.payload.gameURL
    // Format 4: gameURL contains HTML directly
    if (url.startsWith('<!') || url.startsWith('<html')) return null
    return url
  }

  // Format 3: { payload: { launchOptions: { game_url: "..." } } }
  if (data?.payload?.launchOptions?.game_url) return data.payload.launchOptions.game_url

  return null
}

async function loadGame() {
  const token = localStorage.getItem('access_token') || localStorage.getItem('userToken')
  const cookieKey = localStorage.getItem('cookie_key') || localStorage.getItem('cookieKey')
  const brandSlug = localStorage.getItem('brandSlug') || 'bateu'
  const baseDomain = localStorage.getItem('baseDomain') || 'bet.br'
  const sessionExpiresAt = Number(localStorage.getItem('sessionExpiresAt') || '0')

  gameUrl.value = ''

  if (!token || !cookieKey || (sessionExpiresAt > 0 && Date.now() > sessionExpiresAt - 60_000)) {
    error.value = 'Você precisa estar logado para jogar. Faça login primeiro.'
    isLoading.value = false
    return
  }

  try {
    isLoading.value = true
    error.value = ''

    const data = await $fetch<any>('https://routes-eb.grupoautoma.com/api/start-game/', {
      cache: 'no-store',
      params: {
        slug: 'spribe/aviator',
        platform: 'WEB',
        use_demo: '0',
        _t: Date.now(),
      },
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Cactus-Cookie-Key': cookieKey,
        'X-Brand-Slug': brandSlug,
        'X-Base-Domain': baseDomain,
      },
    })

    const url = extractGameUrl(data)

    if (!url) {
      error.value = 'Não foi possível obter a URL do jogo. Tente novamente.'
      return
    }

    gameUrl.value = url
  } catch (err: any) {
    const status = err?.response?.status || err?.statusCode
    if (status === 401 || status === 403) {
      error.value = 'Sua sessão expirou. Faça login novamente.'
    } else {
      error.value = err?.data?.message || err?.message || 'Erro ao carregar o jogo. Tente novamente.'
    }
  } finally {
    isLoading.value = false
  }
}

onMounted(loadGame)
</script>

<template>
  <main class="play-page">
    <!-- Loading -->
    <Transition name="fade-up" appear>
      <div v-if="isLoading" class="play-state">
        <div class="play-loader">
          <div class="play-loader-ring" />
          <Icon name="ph:airplane-tilt-bold" class="play-loader-icon" />
        </div>
        <p class="play-loading-text">Carregando Aviator Prime<span class="loading-dots"><span>.</span><span>.</span><span>.</span></span></p>
        <div class="play-loader-bar">
          <div class="play-loader-bar-fill" />
        </div>
      </div>
    </Transition>

    <!-- Error -->
    <Transition name="fade-up" appear>
      <div v-if="!isLoading && error" class="play-state">
        <div class="play-error-icon shake-in">
          <Icon name="ph:warning-circle-bold" />
        </div>
        <p class="play-error-msg">{{ error }}</p>
        <div class="play-error-actions">
          <button v-if="error.includes('sessão') || error.includes('logado')" type="button" class="play-btn" @click="navigateTo('/auth')">
            <Icon name="ph:sign-in-bold" /> Fazer login
          </button>
          <button v-else type="button" class="play-btn" @click="loadGame">
            <Icon name="ph:arrow-clockwise-bold" /> Tentar novamente
          </button>
        </div>
      </div>
    </Transition>

    <!-- Game + sinais -->
    <Transition name="iframe-reveal" appear>
      <div v-if="!isLoading && !error && gameUrl" class="play-game">
        <SignalPill />
        <iframe
          :src="gameUrl"
          class="play-iframe"
          allow="autoplay; fullscreen; clipboard-write"
          allowfullscreen
          frameborder="0"
        />
      </div>
    </Transition>
  </main>
</template>

<style scoped>
.play-page {
  width: 100%;
  height: calc(100vh - 56px);
  height: calc(100dvh - 60px);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  padding-bottom: env(safe-area-inset-bottom);
}

/* ── Game wrapper (sinais + iframe) ── */
.play-game {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  width: 100%;
}

/* ── Iframe ── */
.play-iframe {
  flex: 1;
  width: 100%;
  min-height: 0;
  border: none;
  background: #000;
  border-radius: 0 0 8px 8px;
}

/* ── States ── */
.play-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.9rem;
}

/* ── Loading ── */
.play-loader {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(226, 26, 130, 0.12);
  display: grid;
  place-items: center;
  position: relative;
  animation: pulse-loader 2s ease-in-out infinite;
}

.play-loader-ring {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2.5px solid transparent;
  border-top-color: #e21a82;
  border-right-color: rgba(226, 26, 130, 0.3);
  animation: spin-ring 1.2s linear infinite;
}

.play-loader-icon {
  width: 30px !important;
  height: 30px !important;
  color: #e21a82;
  animation: fly-tilt 2.5s ease-in-out infinite;
}

.play-loading-text {
  margin: 0;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.6);
}

.loading-dots span {
  animation: dot-blink 1.4s ease-in-out infinite;
  opacity: 0;
}
.loading-dots span:nth-child(1) { animation-delay: 0s; }
.loading-dots span:nth-child(2) { animation-delay: 0.2s; }
.loading-dots span:nth-child(3) { animation-delay: 0.4s; }

.play-loader-bar {
  width: 160px;
  height: 3px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
  margin-top: 0.25rem;
}

.play-loader-bar-fill {
  width: 40%;
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, #e21a82, #ff7ab8);
  animation: bar-slide 1.6s ease-in-out infinite;
}

/* ── Error ── */
.play-error-icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: rgba(226, 26, 130, 0.12);
  display: grid;
  place-items: center;
  font-size: 1.85rem;
  color: #f87171;
}

.play-error-icon.shake-in {
  animation: shake-enter 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}

.play-error-msg {
  max-width: 400px;
  width: min(400px, calc(100% - 2rem));
  text-align: center;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.65);
  overflow-wrap: anywhere;
}

.play-error-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.play-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 1.2rem;
  border-radius: 10px;
  border: none;
  background: #e21a82;
  color: #fff;
  font-size: 0.85rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  min-width: 0;
  text-align: center;
}

.play-btn:hover {
  background: #d42427;
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(226, 26, 130, 0.35);
}

.play-btn:active {
  transform: translateY(0) scale(0.97);
}

.play-btn svg,
.play-btn .iconify {
  width: 16px !important;
  height: 16px !important;
}

/* ── Transitions ── */
.fade-up-enter-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-up-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 1, 1);
}
.fade-up-enter-from {
  opacity: 0;
  transform: translateY(20px);
}
.fade-up-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.iframe-reveal-enter-active {
  transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
.iframe-reveal-enter-from {
  opacity: 0;
  transform: scale(0.97);
}

/* ── Keyframes ── */
@keyframes pulse-loader {
  0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(226, 26, 130, 0.2); }
  50% { transform: scale(1.05); box-shadow: 0 0 20px 4px rgba(226, 26, 130, 0.15); }
}

@keyframes spin-ring {
  to { transform: rotate(360deg); }
}

@keyframes fly-tilt {
  0%, 100% { transform: rotate(-5deg) translateY(0); }
  50% { transform: rotate(5deg) translateY(-3px); }
}

@keyframes dot-blink {
  0%, 60%, 100% { opacity: 0; }
  30% { opacity: 1; }
}

@keyframes bar-slide {
  0% { transform: translateX(-100%); }
  50% { transform: translateX(250%); }
  100% { transform: translateX(-100%); }
}

@keyframes shake-enter {
  0% { transform: scale(0.8) rotate(0); opacity: 0; }
  30% { transform: scale(1.05) rotate(-3deg); }
  50% { transform: scale(0.98) rotate(2deg); }
  70% { transform: scale(1.02) rotate(-1deg); }
  100% { transform: scale(1) rotate(0); opacity: 1; }
}

@media (max-width: 620px) {
  .play-page {
    height: calc(100dvh - 60px - 56px - env(safe-area-inset-bottom));
  }

  .play-iframe {
    border-radius: 0;
  }

  .play-state {
    padding: 1rem;
    font-size: 0.84rem;
  }

  .play-loader {
    width: 68px;
    height: 68px;
  }

  .play-error-actions {
    width: 100%;
  }

  .play-btn {
    width: min(280px, 100%);
    justify-content: center;
  }
}
</style>
