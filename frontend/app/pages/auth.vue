<script setup lang="ts">
interface LoginResponse {
  success?: boolean
  access_token?: string
  token_type?: string
  expires_in?: number
  user?: {
    email?: string
    name?: string
    [key: string]: unknown
  }
  cookie_key?: string
  cookies_path?: string
  message?: string
}

useHead({
  title: 'Entrar - Luisa Aviator',
  link: [
    { rel: 'preload', as: 'image', href: '/luisa-logo.png' },
  ],
})

const config = useRuntimeConfig()
const identifier = ref('')
const password = ref('')
const showPassword = ref(false)
const isLoading = ref(false)
const error = ref('')

function saveSession(data: LoginResponse) {
  const tokenType = data.token_type || 'Bearer'
  const user = data.user || {}
  const email = String(user.email || identifier.value)
  const expiresIn = Number(data.expires_in || 0)
  const sessionCreatedAt = Date.now()
  const sessionExpiresAt = expiresIn > 0 ? sessionCreatedAt + expiresIn * 1000 : 0

  if (data.access_token) {
    localStorage.setItem('userToken', data.access_token)
    localStorage.setItem('access_token', data.access_token)
  }
  localStorage.setItem('tokenType', tokenType)
  if (expiresIn > 0) {
    localStorage.setItem('expiresIn', String(expiresIn))
    localStorage.setItem('sessionCreatedAt', String(sessionCreatedAt))
    localStorage.setItem('sessionExpiresAt', String(sessionExpiresAt))
  }
  localStorage.setItem('userData', JSON.stringify(user))
  localStorage.setItem('userEmail', email)
  localStorage.setItem('user_email', email)
  if (user.name) {
    localStorage.setItem('name', String(user.name))
    localStorage.setItem('user_name', String(user.name))
  }
  if (data.cookie_key) {
    localStorage.setItem('cookieKey', data.cookie_key)
    localStorage.setItem('cookie_key', data.cookie_key)
  }
  if (data.cookies_path) localStorage.setItem('cookiesPath', data.cookies_path)
  localStorage.setItem('brandSlug', localStorage.getItem('brandSlug') || 'esportiva')
  localStorage.setItem('baseDomain', localStorage.getItem('baseDomain') || 'bet.br')
}

async function login() {
  if (!identifier.value.trim() || !password.value) {
    error.value = 'Informe email/CPF e senha.'
    return
  }

  try {
    isLoading.value = true
    error.value = ''
    const response = await $fetch<LoginResponse>(`${config.public.apiBase}/api/auth/login`, {
      method: 'POST',
      body: {
        email: identifier.value.trim(),
        password: password.value,
        save_cookies: true,
      },
    })

    if (!response.access_token || !response.cookie_key) {
      throw new Error(response.message || 'Login feito, mas a sessão veio incompleta.')
    }

    saveSession(response)
    await navigateTo('/welcome')
  } catch (err: any) {
    error.value = err?.data?.message || err?.message || 'Não foi possível entrar. Confira seus dados.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="auth-root">
    <!-- Partículas animadas (canvas) -->
    <SparklesCanvas color="#E21A82" :density="100" :min-size="0.6" :max-size="1.4" />

    <!-- Overlay radial escurecendo as bordas -->
    <div class="auth-overlay" aria-hidden="true" />

    <!-- Card -->
    <div class="auth-card" :aria-busy="isLoading">
      <!-- Header -->
      <div class="auth-card-header">
        <img
          src="/luisa-logo.png"
          alt="Luisa Aviator"
          class="auth-logo"
          width="110"
          height="110"
          loading="eager"
          decoding="async"
          fetchpriority="high"
          draggable="false"
        >
        <h1 class="auth-title">Luisa Aviator</h1>
        <p class="auth-desc">Entre com sua conta da Esportiva Bet</p>
      </div>

      <!-- Content -->
      <div class="auth-card-content">
        <form class="auth-form" @submit.prevent="login">
          <!-- Campo e-mail/CPF -->
          <div class="auth-field">
            <label for="auth-identifier" class="auth-label">Email ou CPF</label>
            <input
              id="auth-identifier"
              v-model="identifier"
              type="text"
              inputmode="email"
              autocomplete="username"
              placeholder="seu@email.com ou CPF"
              class="auth-input"
              autofocus
            >
          </div>

          <!-- Campo senha -->
          <div class="auth-field">
            <label for="auth-password" class="auth-label">Senha</label>
            <div class="auth-password-wrap">
              <input
                id="auth-password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="••••••"
                class="auth-input"
              >
              <button
                type="button"
                class="auth-eye-btn"
                :aria-label="showPassword ? 'Ocultar senha' : 'Mostrar senha'"
                @click="showPassword = !showPassword"
              >
                <Icon :name="showPassword ? 'ph:eye-slash' : 'ph:eye'" />
              </button>
            </div>
          </div>

          <!-- Erro -->
          <p v-if="error" class="auth-error" role="alert">{{ error }}</p>

          <!-- Botão entrar -->
          <button type="submit" class="auth-submit-btn" :disabled="isLoading">
            <Icon v-if="isLoading" name="svg-spinners:90-ring-with-bg" class="auth-spinner" />
            {{ isLoading ? 'Entrando...' : 'Entrar' }}
          </button>
        </form>

        <!-- Cadastro -->
        <div class="auth-register">
          <p class="auth-register-text">Não tem conta?</p>
          <a
            href="https://go.aff.bateu.bet.br/1bpk3rbp?utm_campaign=aplicativo"
            target="_blank"
            rel="noopener noreferrer"
            class="auth-register-btn"
          >
            <Icon name="ph:arrow-square-out" />
            <span>Cadastre-se na Bateu Bet</span>
          </a>
          <p class="auth-register-hint">Após criar sua conta, volte aqui para fazer login</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Wrapper ──────────────────────────────────────────────────── */
.auth-root {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  position: relative;
  overflow-x: hidden;
  overflow-y: auto;
  padding: max(1rem, env(safe-area-inset-top)) 1rem max(1rem, env(safe-area-inset-bottom));
  scrollbar-width: none;
}

.auth-root::-webkit-scrollbar {
  display: none;
}

/* ── Overlay ──────────────────────────────────────────────────── */
.auth-overlay {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at center,
    transparent 0%,
    rgba(0, 0, 0, 0.5) 50%,
    rgba(0, 0, 0, 0.9) 100%
  );
  pointer-events: none;
  z-index: 1;
}

/* ── Card ─────────────────────────────────────────────────────── */
.auth-card {
  position: relative;             /* relative */
  z-index: 10;                    /* z-10 */
  width: 100%;                    /* w-full */
  max-width: 28rem;               /* max-w-md */
  background: rgba(13, 13, 22, 0.95); /* bg-card/95 */
  border: 1px solid rgba(226, 26, 130, 0.2); /* border border-primary/20 */
  border-radius: 0.5rem;          /* rounded-lg */
  backdrop-filter: blur(4px);     /* backdrop-blur-sm */
  -webkit-backdrop-filter: blur(4px);
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); /* shadow-sm */
  color: #fff;                    /* text-card-foreground */
  overflow: visible;
}

/* ── Card Header ──────────────────────────────────────────────── */
.auth-card-header {
  padding: 1.5rem 1.5rem 0;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.auth-logo {
  width: 110px;
  height: 110px;
  margin: 0 auto 0.5rem;
  display: block;
  object-fit: contain;
  opacity: 1;
  visibility: visible;
  pointer-events: none;
  user-select: none;
  contain: layout paint;
}

.auth-title {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1;
  color: #fff;
  letter-spacing: 0;
  overflow-wrap: anywhere;
}

.auth-desc {
  font-size: 0.875rem;
  color: hsl(240, 5%, 55%);
  margin-top: 0.25rem;
}

/* ── Card Content ─────────────────────────────────────────────── */
.auth-card-content {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* ── Form ─────────────────────────────────────────────────────── */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.auth-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.auth-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.25;
}

.auth-input {
  display: flex;
  height: 2.5rem;        /* h-10 */
  width: 100%;           /* w-full */
  border-radius: 9999px;
  border: 1px solid hsl(240, 10%, 16%); /* border border-input */
  background: hsl(240, 15%, 4%);        /* bg-background */
  color: #fff;
  padding: 0.5rem 1.25rem;
  text-align: left;
  font-size: 1rem;          /* text-base */
  font-family: inherit;
  box-sizing: border-box;
  /* ring-offset-background */
  --ring-offset-color: hsl(240, 15%, 4%);
  transition: border-color 0.15s, box-shadow 0.15s;
}

/* md:text-sm */
@media (min-width: 768px) {
  .auth-input {
    font-size: 0.875rem;
  }
}

.auth-input::placeholder {
  color: hsl(240, 5%, 45%); /* placeholder:text-muted-foreground */
}

/* focus-visible:outline-none + focus-visible:ring-2 + focus-visible:ring-ring + focus-visible:ring-offset-2 */
.auth-input:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px var(--ring-offset-color),
    0 0 0 4px #e21a82;
  border-color: #e21a82;
}

/* disabled:cursor-not-allowed + disabled:opacity-50 */
.auth-input:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* ── Password wrap ────────────────────────────────────────────── */
.auth-password-wrap {
  position: relative;
}

.auth-password-wrap .auth-input {
  padding-right: 3rem;
}

.auth-eye-btn {
  position: absolute;
  top: 50%;
  right: 0;
  transform: translateY(-50%);
  height: 100%;
  width: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: hsl(240, 5%, 55%);
  font-size: 1rem;
  transition: color 0.15s;
}

.auth-eye-btn:hover {
  color: #fff;
}

/* ── Error ────────────────────────────────────────────────────── */
.auth-error {
  font-size: 0.875rem;
  color: hsl(0, 72%, 60%);
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  background: hsla(0, 72%, 51%, 0.1);
  border: 1px solid hsla(0, 72%, 51%, 0.25);
}

/* ── Submit ───────────────────────────────────────────────────── */
.auth-submit-btn {
  width: 100%;
  height: 48px;
  border-radius: 9999px;
  background: #e21a82;
  color: #fff;
  font-size: 0.875rem;
  font-weight: 600;
  font-family: inherit;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: background 0.15s, opacity 0.15s;
  margin-top: 0.25rem;
}

.auth-submit-btn:hover:not(:disabled) {
  background: #c01570;
}

.auth-submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.auth-spinner {
  font-size: 1rem;
}

/* ── Register section ─────────────────────────────────────────── */
.auth-register {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  text-align: center;
}

.auth-register-text {
  font-size: 0.875rem;
  color: hsl(240, 5%, 55%);
}

.auth-register-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  height: 48px;
  border-radius: 9999px;
  border: 1px solid hsl(240, 10%, 22%);
  background: transparent;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;
  transition: background 0.15s, border-color 0.15s;
  min-width: 0;
  text-align: center;
}

.auth-register-btn:hover {
  background: hsla(0, 0%, 100%, 0.04);
  border-color: hsl(240, 10%, 30%);
}

.auth-register-hint {
  font-size: 0.75rem;
  color: hsl(240, 5%, 45%);
}

@media (max-width: 480px) {
  .auth-root {
    align-items: flex-start;
    overflow-y: auto;
  }

  .auth-card {
    max-width: 100%;
    max-height: none;
  }

  .auth-card-header {
    padding: 1rem 1rem 0;
  }

  .auth-logo {
    width: 84px;
    height: 84px;
    margin-bottom: 0.35rem;
  }

  .auth-title {
    font-size: 1.25rem;
  }

  .auth-desc {
    font-size: 0.82rem;
  }

  .auth-card-content {
    padding: 1rem;
    gap: 1rem;
  }

  .auth-register-btn {
    min-height: 46px;
    height: auto;
    padding: 0.75rem 1rem;
    line-height: 1.25;
  }
}
</style>
