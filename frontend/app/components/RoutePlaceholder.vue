<script setup lang="ts">
defineProps<{
  title: string
  description: string
  icon: string
  badge?: string
}>()
</script>

<template>
  <main class="commander-page">
    <section class="feature-hero">
      <div class="feature-icon">
        <Icon :name="icon" />
      </div>
      <div>
        <span v-if="badge" class="mini-badge">{{ badge }}</span>
        <h1>{{ title }}</h1>
        <p>{{ description }}</p>
      </div>
    </section>

    <section class="placeholder-grid">
      <article class="glass-panel">
        <Icon name="ph:chart-line-up-bold" />
        <strong>Status</strong>
        <span>Ambiente preparado para dados autenticados.</span>
      </article>
      <article class="glass-panel">
        <Icon name="ph:shield-check-bold" />
        <strong>Acesso</strong>
        <span>Layout pronto para conectar permissão e perfil.</span>
      </article>
      <article class="glass-panel">
        <Icon name="ph:sparkle-bold" />
        <strong>Experiência</strong>
        <span>Visual alinhado ao Luisa Aviator.</span>
      </article>
    </section>
  </main>
</template>
