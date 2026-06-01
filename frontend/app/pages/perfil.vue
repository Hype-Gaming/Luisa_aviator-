<script setup lang="ts">
definePageMeta({ layout: false })

useHead({
  title: 'Perfil - Luisa Aviator',
})
</script>

<template>
  <div class="route-shell">
    <header class="route-topbar">
      <NuxtLink to="/" class="route-icon" aria-label="Voltar ao dashboard">
        <Icon name="ph:arrow-left-bold" />
      </NuxtLink>
      <div class="route-wallet">
        <Icon name="ph:wallet-bold" />
        <strong>R$ 0,00</strong>
      </div>
      <div class="route-avatar">U</div>
    </header>

    <main class="route-main profile-main">
      <section class="profile-head">
        <div class="profile-avatar">U</div>
        <h1>Usuário</h1>
        <span>Nível 1 - Iniciante</span>
      </section>

      <section class="gamification-card">
        <h2>
          <Icon name="ph:trophy-bold" />
          Gamificação
        </h2>
        <div class="level-row">
          <div>
            <strong>Nível 1 - Iniciante</strong>
            <span>0 XP total</span>
          </div>
          <span>0 / 501</span>
        </div>
        <div class="progress-line" />
        <div class="streak-grid">
          <article>
            <Icon name="ph:flame-bold" />
            <strong>0</strong>
            <span>Streak atual</span>
          </article>
          <article>
            <Icon name="ph:flame-bold" />
            <strong>0</strong>
            <span>Maior streak</span>
          </article>
        </div>
      </section>

      <section class="achievements-card">
        <div>
          <h2>Conquistas</h2>
          <span>0/10</span>
        </div>
        <div class="achievement-grid">
          <article>Primeiros Passos</article>
          <article>Dedicado</article>
          <article>Analista</article>
          <article>Consistente</article>
        </div>
      </section>
    </main>
  </div>
</template>
