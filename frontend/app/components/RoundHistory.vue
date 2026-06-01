<script setup lang="ts">
import type { AviatorRound } from '~/composables/useAviatorHistory'

defineProps<{ rounds: AviatorRound[]; isLoading: boolean }>()

function dotColor(v: number): string {
  if (v >= 10) return '#ff4fb3'
  if (v >= 2) return '#8b5cf6'
  return '#3b82f6'
}

function fmt(v: number): string {
  return v >= 10 ? v.toFixed(1) + 'x' : v.toFixed(2) + 'x'
}

function timeLabel(value: string): string {
  try {
    return new Date(value).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return ''
  }
}
</script>

<template>
  <div class="rh-card">
    <div class="rh-header">
      <div>
        <span class="rh-title">Histórico</span>
        <span class="rh-count">{{ rounds.length }} velas</span>
      </div>
      <span v-if="isLoading" class="rh-loading">
        <Icon name="svg-spinners:90-ring-with-bg" style="font-size:0.85rem;" />
      </span>
    </div>

    <div v-if="rounds.length === 0 && !isLoading" class="rh-empty">
      Nenhum dado disponível. Aguarde o histórico carregar.
    </div>

    <div class="rh-dots">
      <div
        v-for="(r, i) in [...rounds].reverse()"
        :key="r._id || i"
        class="rh-dot"
        :class="{ 'rh-pink': r.crash_point >= 10 }"
        :style="{ '--candle': dotColor(r.crash_point) }"
        :title="fmt(r.crash_point)"
      >
        <span class="rh-mult">{{ fmt(r.crash_point) }}</span>
        <span class="rh-time">{{ timeLabel(r.created_at) }}</span>
      </div>
    </div>

    <div class="rh-legend">
      <span class="rh-leg-item" style="--lc:#3b82f6">1.00 - 1.99x</span>
      <span class="rh-leg-item" style="--lc:#8b5cf6">2.00 - 9.99x</span>
      <span class="rh-leg-item" style="--lc:#ff4fb3">10.00x+</span>
    </div>
  </div>
</template>

<style scoped>
.rh-card {
  background: var(--av-surface);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: var(--av-radius);
  padding: 1rem 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  min-width: 0;
}
.rh-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.rh-title {
  display: block;
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--av-text);
}
.rh-count {
  display: block;
  margin-top: 2px;
  font-size: 0.72rem;
  color: var(--av-text-muted);
}
.rh-loading { color: var(--av-text-muted); }
.rh-empty {
  padding: 2rem 1rem;
  text-align: center;
  color: var(--av-text-muted);
  font-size: 0.85rem;
}
.rh-dots {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  max-height: 360px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 2px;
  animation: dots-slide-in 0.4s ease;
}
.rh-dot {
  width: calc((100% - 15px) / 4);
  min-height: 46px;
  padding: 5px 4px;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--candle), transparent 35%);
  background: color-mix(in srgb, var(--candle), transparent 86%);
  color: var(--candle);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 0;
}
.rh-pink {
  box-shadow: 0 0 12px rgba(255, 79, 179, 0.24);
}
.rh-mult {
  font-size: 0.78rem;
  font-weight: 900;
  line-height: 1;
}
.rh-time {
  font-size: 0.58rem;
  color: rgba(255,255,255,0.56);
  line-height: 1;
}
.rh-legend {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  padding-top: 0.1rem;
}
.rh-leg-item {
  font-size: 0.68rem;
  color: var(--lc);
  font-weight: 600;
}
.rh-leg-item::before {
  content: '■ ';
}
@media (max-width: 520px) {
  .rh-card {
    padding: 0.9rem 0.75rem;
    border-radius: 12px;
  }

  .rh-title {
    font-size: 0.96rem;
  }

  .rh-dots {
    gap: 4px;
    max-height: 300px;
  }

  .rh-dot {
    width: calc((100% - 8px) / 3);
    min-height: 44px;
    padding: 5px 2px;
  }

  .rh-mult {
    font-size: 0.74rem;
  }

  .rh-time {
    font-size: 0.54rem;
  }

  .rh-legend {
    gap: 8px;
  }

  .rh-leg-item {
    font-size: 0.64rem;
  }
}
</style>
