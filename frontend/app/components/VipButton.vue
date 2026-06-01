<script setup lang="ts">
defineProps<{ link: string }>()
</script>

<template>
  <a :href="link" target="_blank" rel="noopener noreferrer" class="vip-btn">
    <Icon name="ph:telegram-logo-fill" class="vip-icon" />
    <span class="vip-text">
      <strong>Entrar no Grupo VIP</strong>
      <small>Sinais exclusivos - Acesso gratuito</small>
    </span>
    <Icon name="ph:arrow-right-bold" class="vip-arrow" />
  </a>
</template>

<style scoped>
.vip-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  background: linear-gradient(135deg, #229ed9 0%, #1a7ab0 100%);
  border-radius: var(--av-radius);
  padding: 1rem 1.25rem;
  color: #fff;
  font-size: 0.9rem;
  transition: transform 0.2s, box-shadow 0.2s;
  animation: pulse-glow 3s ease-in-out infinite;
  --av-accent-glow: rgba(34, 158, 217, 0.4);
}
.vip-btn:active { transform: scale(0.98); }
.vip-icon { font-size: 1.6rem; flex-shrink: 0; }
.vip-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}
.vip-text strong { font-size: 0.95rem; font-weight: 800; }
.vip-text small { font-size: 0.72rem; opacity: 0.85; }
.vip-arrow { font-size: 1.1rem; flex-shrink: 0; opacity: 0.8; }
</style>
