<script setup lang="ts">
import type { SignalStatus } from '~/composables/useAviatorSignal'

const props = defineProps<{ status: SignalStatus }>()

const animClass = computed(() => ({
  'plane-idle': props.status === 'idle' || props.status === 'loading',
  'plane-signal': props.status === 'signal',
  'plane-alert': props.status === 'alert',
  'plane-win': props.status === 'win',
  'plane-crash': props.status === 'loss' || props.status === 'cancelled',
}))

const planeColor = computed(() => {
  if (props.status === 'win') return '#22c55e'
  if (props.status === 'loss') return '#ef4444'
  if (props.status === 'cancelled') return '#6b7280'
  if (props.status === 'signal') return '#ff6b35'
  return '#ff4500'
})
</script>

<template>
  <div class="plane-wrapper">
    <div class="plane-track">
      <svg class="plane-svg" :class="animClass" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 32 L56 16 L48 32 L56 48 L8 32Z" :fill="planeColor" stroke="rgba(255,255,255,0.2)" stroke-width="1" />
        <path d="M28 26 L48 12 L44 28 Z" :fill="planeColor" opacity="0.8" />
        <path d="M28 38 L48 52 L44 36 Z" :fill="planeColor" opacity="0.8" />
        <circle cx="38" cy="30" r="3" fill="rgba(255,255,255,0.4)" />
      </svg>

      <div v-if="status === 'signal' || status === 'alert'" class="plane-trail">
        <span class="trail-dot t1" />
        <span class="trail-dot t2" />
        <span class="trail-dot t3" />
      </div>
    </div>

    <div class="plane-status-label" :class="`status-${status}`">
      <span v-if="status === 'loading'">Conectando...</span>
      <span v-else-if="status === 'idle'">Aguardando sinal</span>
      <span v-else-if="status === 'signal'">Subindo!</span>
      <span v-else-if="status === 'alert'">Atenção</span>
      <span v-else-if="status === 'win'">WIN</span>
      <span v-else-if="status === 'loss'">CRASH</span>
      <span v-else-if="status === 'cancelled'">Cancelado</span>
    </div>
  </div>
</template>

<style scoped>
.plane-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 0;
}
.plane-track {
  position: relative;
  width: 120px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.plane-svg {
  width: 80px;
  height: 80px;
  filter: drop-shadow(0 0 12px var(--av-accent-glow));
  transition: filter 0.3s ease;
}
.plane-svg.plane-idle { animation: plane-idle 2.5s ease-in-out infinite; }
.plane-svg.plane-alert { animation: plane-idle 1.2s ease-in-out infinite; }
.plane-svg.plane-signal { animation: plane-signal 3s ease-in-out infinite alternate; }
.plane-svg.plane-win { animation: plane-win 0.6s ease-in-out 3; filter: drop-shadow(0 0 20px rgba(34,197,94,0.7)); }
.plane-svg.plane-crash { animation: plane-crash 0.4s ease-in-out 4; filter: drop-shadow(0 0 20px rgba(239,68,68,0.7)); }
.plane-trail {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  gap: 4px;
}
.trail-dot {
  display: block;
  border-radius: 50%;
  background: var(--av-accent);
  animation: signal-blink 0.6s ease-in-out infinite;
}
.trail-dot.t1 { width: 10px; height: 10px; animation-delay: 0s; }
.trail-dot.t2 { width: 7px; height: 7px; animation-delay: 0.15s; opacity: 0.7; }
.trail-dot.t3 { width: 4px; height: 4px; animation-delay: 0.3s; opacity: 0.4; }
.plane-status-label {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--av-text-muted);
  text-transform: uppercase;
}
.plane-status-label.status-signal { color: var(--av-accent-2); animation: signal-blink 1s ease-in-out infinite; }
.plane-status-label.status-alert { color: var(--av-yellow); }
.plane-status-label.status-win { color: var(--av-green); }
.plane-status-label.status-loss,
.plane-status-label.status-cancelled { color: var(--av-red); }
</style>
