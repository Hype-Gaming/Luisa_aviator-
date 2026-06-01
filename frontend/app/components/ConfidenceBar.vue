<script setup lang="ts">
defineProps<{ value: number }>()
</script>

<template>
  <div class="conf-wrap">
    <div class="conf-labels">
      <span class="conf-title">Assertividade</span>
      <span class="conf-pct">{{ value }}%</span>
    </div>
    <div class="conf-track">
      <div class="conf-fill" :style="{ width: value + '%' }" />
    </div>
  </div>
</template>

<style scoped>
.conf-wrap { display: flex; flex-direction: column; gap: 6px; width: 100%; }
.conf-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.78rem;
  color: var(--av-text-muted);
}
.conf-pct { font-weight: 700; color: var(--av-accent-2); }
.conf-track {
  height: 6px;
  background: rgba(255,255,255,0.08);
  border-radius: 99px;
  overflow: hidden;
}
.conf-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--av-accent), var(--av-accent-2));
  border-radius: 99px;
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
