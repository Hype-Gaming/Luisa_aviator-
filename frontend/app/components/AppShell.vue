<script setup lang="ts">
const route = useRoute()

const navItems = [
  { title: 'Início', to: '/welcome', icon: 'ph:house', tooltip: 'Tela inicial de boas-vindas' },
  { title: 'Depositar', to: '/depositar', icon: 'ph:plus' },
  { title: 'Sacar', to: '/sacar', icon: 'ph:upload-simple' },
  { title: 'Dashboard', to: '/', icon: 'ph:chart-bar' },
  { title: 'Aulas', to: '/aulas', icon: 'ph:graduation-cap' },
  { title: 'Gestão de Banca', to: '/banca', icon: 'ph:wallet' },
]

const hiddenRouteTitles = [
  { title: 'Landing', to: '/landing' },
  { title: 'Entrar', to: '/auth' },
  { title: 'Jogar', to: '/play' },
  { title: 'Dashboard', to: '/dashboard' },
  { title: 'Notificações', to: '/notificacoes' },
  { title: 'Aviador', to: '/aviador' },
  { title: 'Admin', to: '/admin' },
  { title: 'Gamificação', to: '/gamification' },
  { title: 'Comunidade', to: '/comunidade' },
  { title: 'Apostas Esportivas', to: '/apostas-esportivas' },
  { title: 'Perfil', to: '/perfil' },
]

const isCollapsed = ref(true)
const isUserMenuOpen = ref(false)
const isBalanceHidden = ref(false)
const isLightMode = ref(false)
const userInitial = ref('U')
const userName = ref('Usuário')
const balance = ref('0,00')

const isStandaloneRoute = computed(() => ['/auth', '/landing'].includes(route.path))

const currentTitle = computed(() => {
  const all = [...navItems, ...hiddenRouteTitles]
  return all.find((item) => route.path === item.to || (item.to !== '/' && route.path.startsWith(item.to)))?.title || 'Luisa Aviator'
})

onMounted(() => {
  isLightMode.value = localStorage.getItem('theme_mode') === 'light'
  const rawUser = localStorage.getItem('userData')
  const name = localStorage.getItem('user_name') || localStorage.getItem('name')
  const email = localStorage.getItem('user_email') || localStorage.getItem('userEmail') || localStorage.getItem('email')
  try {
    const parsed = rawUser ? JSON.parse(rawUser) : null
    const displayName = parsed?.name || name || 'Usuário'
    userName.value = String(displayName).split(' ')[0]
    userInitial.value = String(displayName || email || 'U').charAt(0).toUpperCase()
    const credit = parsed?.wallet?.credit ?? parsed?.credit ?? parsed?.balance
    if (Number.isFinite(Number(credit))) {
      const value = Number(credit) > 1000 ? Number(credit) / 100 : Number(credit)
      balance.value = value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }
  } catch {
    userName.value = String(name || 'Usuário').split(' ')[0]
    userInitial.value = String(name || email || 'U').charAt(0).toUpperCase()
  }
})

watchEffect(() => {
  if (import.meta.client) {
    document.documentElement.classList.toggle('light-mode', isLightMode.value)
    localStorage.setItem('theme_mode', isLightMode.value ? 'light' : 'dark')
  }
})

function logout() {
  const keys = [
    'access_token',
    'userToken',
    'cookie_key',
    'cookieKey',
    'expiresIn',
    'sessionCreatedAt',
    'sessionExpiresAt',
    'userData',
    'user_id',
    'user_name',
    'user_email',
    'name',
    'email',
    'userEmail',
  ]
  keys.forEach((key) => localStorage.removeItem(key))
  isUserMenuOpen.value = false
  navigateTo('/auth')
}
</script>

<template>
  <slot v-if="isStandaloneRoute" />

  <div v-else class="commander-shell" :class="{ collapsed: isCollapsed, light: isLightMode }">
    <aside class="commander-sidebar">
      <div class="commander-brand">
        <img src="/luisa-logo.png" alt="Luisa Aviator" class="commander-logo">
        <div class="brand-text">
          <strong>LUISA</strong>
          <span>Aviator</span>
        </div>
      </div>

      <nav class="commander-nav" aria-label="Navegação principal">
        <span class="nav-label">Navegação</span>
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="commander-nav-item"
          :class="{ highlight: item.highlight }"
        >
          <Icon :name="item.icon" />
          <span class="nav-item-label">{{ item.title }}</span>
        </NuxtLink>
      </nav>

    </aside>

    <div class="commander-stage">
      <header class="commander-topbar">
        <div class="topbar-brand">
          <img src="/luisa-logo.png" alt="Luisa Aviator" class="topbar-logo-img">
          <div class="topbar-brand-text">
            <strong>LUISA</strong>
            <span>Aviator</span>
          </div>
        </div>
        <div class="topbar-spacer" />
        <div class="shell-wallet">
          <Icon name="ph:wallet" />
          <span>R$ {{ isBalanceHidden ? '••••' : balance }}</span>
          <button type="button" class="shell-eye-btn" :aria-label="isBalanceHidden ? 'Mostrar saldo' : 'Ocultar saldo'" @click="isBalanceHidden = !isBalanceHidden">
            <Icon :name="isBalanceHidden ? 'ph:eye-slash' : 'ph:eye'" />
          </button>
        </div>
        <div class="shell-user">
          <button
            type="button"
            class="shell-user-trigger"
            :aria-expanded="isUserMenuOpen"
            aria-haspopup="menu"
            @click="isUserMenuOpen = !isUserMenuOpen"
          >
            <span class="shell-avatar">{{ userInitial }}</span>
            <span class="shell-user-name">{{ userName }}</span>
          </button>

          <div v-if="isUserMenuOpen" class="shell-user-menu" role="menu">
            <div class="shell-user-card-head">
              <span class="shell-avatar big">{{ userInitial }}</span>
              <span class="user-level"><Icon name="ph:sprout-bold" /> Nv 1</span>
              <span class="user-level-progress" aria-hidden="true" />
            </div>

            <NuxtLink to="/perfil" class="user-menu-item" role="menuitem" @click="isUserMenuOpen = false">
              <Icon name="ph:user-bold" />
              <span>Ver Perfil</span>
            </NuxtLink>

            <button type="button" class="user-menu-item danger" role="menuitem" @click="logout">
              <Icon name="ph:sign-out-bold" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      <div class="commander-content">
        <slot />
      </div>

      <nav class="mobile-tabbar" aria-label="Navegação mobile">
        <NuxtLink to="/welcome" aria-label="Início"><Icon name="ph:house" /></NuxtLink>
        <NuxtLink to="/depositar" aria-label="Depositar"><Icon name="ph:plus" /></NuxtLink>
        <NuxtLink to="/sacar" aria-label="Sacar"><Icon name="ph:upload-simple" /></NuxtLink>
        <NuxtLink to="/" aria-label="Dashboard"><Icon name="ph:chart-bar" /></NuxtLink>
        <NuxtLink to="/banca" aria-label="Gestão de Banca"><Icon name="ph:wallet" /></NuxtLink>
      </nav>
    </div>
  </div>
</template>
