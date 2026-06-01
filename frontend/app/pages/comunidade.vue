<script setup lang="ts">
definePageMeta({ layout: false })

useHead({
  title: 'QG da Tropa - Luisa Aviator',
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

    <main class="route-main">
      <section class="route-hero route-hero-row">
        <div>
          <h1>QG da Tropa</h1>
          <p>Comunidade, leituras e resultados compartilhados.</p>
        </div>
        <Icon name="ph:bell-bold" />
      </section>

      <section class="tag-row">
        <button class="active">Todos</button>
        <button>Leitura</button>
        <button>Resultado</button>
        <button>Mentalidade</button>
        <button>Ideia</button>
        <button>Debate</button>
      </section>

      <section class="empty-community">
        <Icon name="ph:users-three-bold" />
        <p>Nenhum post ainda. Seja o primeiro!</p>
      </section>

      <section class="community-side">
        <article>
          <Icon name="ph:heart-bold" />
          <strong>Post Mais Curtido Hoje</strong>
          <span>Nenhum post curtido hoje</span>
        </article>
        <article>
          <Icon name="ph:trophy-bold" />
          <strong>Top Analista da Semana</strong>
          <span>Nenhum dado disponível</span>
        </article>
      </section>
    </main>
  </div>
</template>
