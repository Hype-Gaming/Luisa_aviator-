<script setup lang="ts">
useHead({
  title: 'Início - Luisa Aviator',
  link: [
    { rel: 'preload', as: 'image', href: '/luisa-logo.png' },
  ],
})

const startCards = [
  {
    title: 'Veja as aulas',
    description: 'Entenda como funciona o jogo, as análises e o dashboard',
    path: '/aulas',
    icon: 'ph:graduation-cap-bold',
    className: 'lesson',
  },
  {
    title: 'Jogue agora',
    description: 'Acesse o Aviator Prime e coloque em prática',
    path: '/play',
    icon: 'ph:airplane-tilt-bold',
    className: 'play',
  },
]

const exploreCards = [
  { title: 'Dashboard completo', description: 'Análises e estatísticas em tempo real', path: '/', icon: 'ph:squares-four-bold' },
  { title: 'Histórico e análises', description: 'Veja os resultados passados', path: '/banca', icon: 'ph:chart-bar-bold' },
  { title: 'Gestão de banca', description: 'Controle seu capital', path: '/banca', icon: 'ph:calendar-bold' },
]

const config = useRuntimeConfig()
const balance = ref('0,00')
const isZeroBalance = computed(() => balance.value === '0,00' || balance.value === '0')

onMounted(() => {
  try {
    const rawUser = localStorage.getItem('userData')
    const parsed = rawUser ? JSON.parse(rawUser) : null
    const credit = parsed?.wallet?.credit ?? parsed?.credit ?? parsed?.balance
    if (Number.isFinite(Number(credit))) {
      const value = Number(credit) > 1000 ? Number(credit) / 100 : Number(credit)
      balance.value = value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }
  } catch {}
})
</script>

<template>
  <main class="welcome-page">
    <!-- Hero -->
    <section class="welcome-hero">
      <div class="welcome-bg" />
      <div class="welcome-radial" />
      <div class="welcome-particles" aria-hidden="true">
        <span
          v-for="n in 20"
          :key="n"
          :style="{ '--x': `${(n * 37) % 100}%`, '--y': `${(n * 53) % 100}%`, '--delay': `${(n % 7) * 0.22}s` }"
        />
      </div>

      <div class="welcome-hero-content">
        <img
          src="/luisa-logo.png"
          alt="Luisa Aviator"
          class="welcome-logo"
          width="96"
          height="96"
          loading="eager"
          decoding="async"
          fetchpriority="high"
          draggable="false"
        >
        <NuxtLink to="/aulas" class="welcome-new-badge">
          <Icon name="ph:sparkle-bold" />
          Novo por aqui?
        </NuxtLink>
        <h1>Bem-vindo ao Luisa Aviator</h1>
        <p>Tudo o que você precisa para operar com mais clareza e segurança</p>
        <NuxtLink to="/aulas" class="primary-btn hero-cta">
          <Icon name="ph:graduation-cap-bold" />
          Ver aulas iniciais
        </NuxtLink>
      </div>
      <div class="welcome-fade" />
    </section>

    <!-- Comece por aqui -->
    <section class="welcome-section">
      <div class="welcome-section-head">
        <h2>Comece por aqui</h2>
        <p>Os primeiros passos para você começar</p>
      </div>
      <div class="start-card-row">
        <button type="button" class="welcome-card-arrow prev" aria-label="Voltar">
          <Icon name="ph:arrow-left-bold" />
        </button>
        <NuxtLink v-for="card in startCards" :key="card.title" :to="card.path" class="start-card" :class="card.className">
          <div>
            <Icon :name="card.icon" />
          </div>
          <h3>{{ card.title }}</h3>
          <p>{{ card.description }}</p>
        </NuxtLink>
        <button type="button" class="welcome-card-arrow next" aria-label="Avançar">
          <Icon name="ph:arrow-right-bold" />
        </button>
      </div>
    </section>

    <!-- Sua conta -->
    <section class="welcome-section">
      <div class="welcome-section-head">
        <h2>Sua conta</h2>
        <p>Acompanhe seu saldo e faça depósitos</p>
      </div>
      <div class="account-card">
        <div class="account-icon">
          <Icon name="ph:credit-card-bold" />
        </div>
        <div class="account-info">
          <span class="account-label">Seu saldo</span>
          <strong class="account-balance">R$ {{ balance }}</strong>
          <p v-if="isZeroBalance" class="account-warning">
            <Icon name="ph:info-bold" />
            Saldo zerado. É necessário fazer um depósito para jogar
          </p>
          <NuxtLink to="/depositar" class="account-deposit-btn">
            <Icon name="ph:plus-bold" />
            Fazer depósito
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Operações ao vivo -->
    <section class="welcome-section">
      <div class="welcome-section-head">
        <h2>Operações ao vivo</h2>
        <p>Participe das lives e opere junto com a comunidade</p>
      </div>
      <div class="live-welcome-card">
        <div class="live-gradient" />
        <div class="live-watermark" />
        <div class="live-label">
          <span />
          LIVE
        </div>

        <div class="live-welcome-body">
          <div class="live-round-icon">
            <Icon name="ph:broadcast-bold" />
          </div>
          <div>
            <h3>Operações ao Vivo</h3>
            <p>22h todos os dias</p>
          </div>
        </div>

        <p>
          Entre no grupo onde acontecem as lives e operações em tempo real.
          Aprenda com a comunidade e tire suas dúvidas diretamente.
        </p>

        <a
          :href="config.public.telegramLink"
          target="_blank"
          rel="noopener noreferrer"
          class="telegram-live-btn"
        >
          Entrar no grupo do Telegram
          <Icon name="ph:paper-plane-tilt-bold" />
        </a>
      </div>
    </section>

    <!-- Continue explorando -->
    <section class="welcome-section">
      <div class="welcome-section-head">
        <h2>Continue explorando</h2>
        <p>Mais recursos para você aproveitar</p>
      </div>
      <div class="explore-card-row">
        <NuxtLink v-for="card in exploreCards" :key="card.title" :to="card.path" class="explore-card">
          <div class="explore-icon">
            <Icon :name="card.icon" />
          </div>
          <h3>{{ card.title }}</h3>
          <p>{{ card.description }}</p>
        </NuxtLink>
      </div>
    </section>
  </main>
</template>

<style scoped>
/* ── Ascend Animations ──────────────────────────────────────── */
@keyframes logo-ascend {
  0%   { opacity: 0; transform: translateY(48px) rotate(8deg) scale(0.82); filter: drop-shadow(0 0 0px rgba(226, 26, 130,0)); }
  60%  { opacity: 1; transform: translateY(-8px) rotate(-4deg) scale(1.06); filter: drop-shadow(0 0 18px rgba(226, 26, 130,0.55)); }
  80%  { transform: translateY(4px) rotate(1deg) scale(0.98); }
  100% { transform: translateY(0)   rotate(-2deg) scale(1);    filter: drop-shadow(0 0 10px rgba(226, 26, 130,0.3)); }
}

@keyframes logo-float {
  0%, 100% { transform: translateY(0)   rotate(-2deg); }
  50%       { transform: translateY(-8px) rotate(2deg);  }
}

@keyframes hero-rise {
  from { opacity: 0; transform: translateY(22px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes section-rise {
  from { opacity: 0; transform: translateY(28px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Logo ───────────────────────────────────────────────────── */
.welcome-logo {
  width: 96px;
  height: 96px;
  display: block;
  margin: 0 auto 1.25rem;
  object-fit: contain;
  position: relative;
  z-index: 4;
  flex: 0 0 auto;
  pointer-events: none;
  user-select: none;
  visibility: visible;
  contain: layout paint;
  animation:
    logo-ascend 0.75s cubic-bezier(0.22, 1, 0.36, 1) both,
    logo-float  3.5s ease-in-out 0.75s infinite;
}

/* ── Hero content stagger ───────────────────────────────────── */
.welcome-hero-content .welcome-new-badge { animation: hero-rise 0.5s ease both 0.6s; }
.welcome-hero-content h1                 { animation: hero-rise 0.5s ease both 0.72s; }
.welcome-hero-content p                  { animation: hero-rise 0.5s ease both 0.84s; }
.welcome-hero-content .hero-cta          { animation: hero-rise 0.5s ease both 0.96s; }

/* ── Sections stagger ───────────────────────────────────────── */
.welcome-section:nth-child(1) { animation: section-rise 0.55s ease both 1.0s; }
.welcome-section:nth-child(2) { animation: section-rise 0.55s ease both 1.12s; }
.welcome-section:nth-child(3) { animation: section-rise 0.55s ease both 1.24s; }
.welcome-section:nth-child(4) { animation: section-rise 0.55s ease both 1.36s; }

.welcome-new-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 1.1rem;
  border-radius: 9999px;
  background: rgba(226, 26, 130, 0.18);
  border: 1px solid rgba(226, 26, 130, 0.4);
  color: #f87171;
  font-size: 0.82rem;
  font-weight: 600;
  text-decoration: none;
  margin-bottom: 1.5rem;
  transition: background 0.2s, border-color 0.2s;
}

.welcome-new-badge:hover {
  background: rgba(226, 26, 130, 0.28);
  border-color: rgba(226, 26, 130, 0.6);
}

/* ── Sua conta ── */
.account-card {
  display: flex;
  align-items: flex-start;
  gap: 1.25rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 1.5rem;
}

.account-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(226, 26, 130, 0.18);
  display: grid;
  place-items: center;
  flex-shrink: 0;
  color: #f87171;
  font-size: 1.2rem;
}

.account-info {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.account-label {
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.55);
}

.account-balance {
  font-size: 1.4rem;
  font-weight: 800;
  color: #fff;
  line-height: 1;
}

.account-warning {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.74rem;
  color: #f97316;
  margin-top: 0.25rem;
}

.account-deposit-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.75rem;
  padding: 0.5rem 1.1rem;
  border-radius: 9999px;
  background: #e21a82;
  color: #fff;
  font-size: 0.8rem;
  font-weight: 600;
  text-decoration: none;
  width: fit-content;
  transition: background 0.15s;
}

.account-deposit-btn:hover { background: #b01368; }

/* ── Continue explorando ── */
.explore-card-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.explore-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1.25rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  text-decoration: none;
  color: #fff;
  transition: background 0.15s, border-color 0.15s;
}

.explore-card:hover {
  background: rgba(255, 255, 255, 0.07);
  border-color: rgba(255, 255, 255, 0.14);
}

.explore-icon {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  background: rgba(226, 26, 130, 0.18);
  display: grid;
  place-items: center;
  color: #f87171;
  font-size: 1rem;
  margin-bottom: 0.25rem;
}

.explore-card h3 {
  font-size: 0.82rem;
  font-weight: 700;
  color: #fff;
  margin: 0;
}

.explore-card p {
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
}

@media (max-width: 600px) {
  .explore-card-row {
    grid-template-columns: 1fr;
  }

  .account-card {
    flex-direction: column;
  }
}
</style>
