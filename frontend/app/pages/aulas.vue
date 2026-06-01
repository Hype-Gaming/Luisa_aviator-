<script setup lang="ts">
useHead({ title: 'Aulas - Luisa Aviator' })
</script>

<template>
  <main class="deposit-page">
    <section class="lessons-card">
      <div class="lessons-hero">
        <div class="lessons-icon-circle">
          <Icon name="ph:graduation-cap-bold" />
        </div>
        <h1>Aulas</h1>
        <p class="lessons-subtitle">Conteúdos educacionais para operar com mais disciplina</p>
      </div>

      <div class="notice-box lessons-notice">
        <Icon name="ph:video-bold" class="lessons-notice-icon" />
        <div>
          <p>As aulas estão disponíveis no canal oficial do <strong>Luisa Aviator</strong> no YouTube.</p>
          <p class="lessons-notice-detail">Aprenda as estratégias, entenda as análises e coloque em prática tudo o que o Luisa Aviator oferece para você operar com segurança.</p>
        </div>
      </div>

      <a
        href="https://www.youtube.com/@ederaviator"
        target="_blank"
        rel="noopener noreferrer"
        class="primary-btn wide lessons-btn"
      >
        Acessar as Aulas
        <Icon name="ph:arrow-square-out-bold" />
      </a>

      <p class="lessons-hint">Você será redirecionado para o canal oficial no YouTube em uma nova aba.</p>
    </section>
  </main>
</template>

<style scoped>
.lessons-card {
  width: min(520px, 100%);
  margin: 0 auto;
  background: #141418;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 2rem 2rem 1.75rem;
  display: grid;
  gap: 1.1rem;
}

.lessons-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  text-align: center;
}

.lessons-icon-circle {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: rgba(180, 20, 25, 0.35);
  display: grid;
  place-items: center;
  font-size: 1.75rem;
  color: var(--av-accent-2);
}

.lessons-hero h1 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
  margin: 0;
}

.lessons-subtitle {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.45);
  margin: 0;
}

.lessons-notice {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1rem 1.1rem;
  gap: 0.75rem;
  align-items: flex-start;
}

.lessons-notice-icon {
  width: 20px !important;
  height: 20px !important;
  min-width: 20px;
  color: var(--av-accent-2) !important;
  margin-top: 2px;
  flex-shrink: 0;
}

.lessons-notice p {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.5;
  margin: 0;
}

.lessons-notice-detail {
  margin-top: 0.6rem !important;
  color: rgba(255, 255, 255, 0.45) !important;
  font-size: 0.85rem !important;
}

.lessons-btn {
  min-height: 52px;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  background: #d61a7c;
  box-shadow: none;
  gap: 0.5rem;
  text-decoration: none;
}

.lessons-btn:hover {
  background: #c82d2d;
}

.lessons-hint {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.35);
  text-align: center;
  margin: 0;
}
</style>
