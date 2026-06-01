<script setup lang="ts">
import type { SignalStatus } from '~/composables/useAviatorSignal'

const props = defineProps<{
  status: SignalStatus
  signalText: string
  statusLabel: string
  greens: number | null
  confidence: number
}>()

const panelClass = computed(() => `panel-${props.status}`)
</script>

<template>
  <div class="sp-card" :class="panelClass">
    <div class="sp-status-row">
      <span class="sp-dot" />
      <span class="sp-status-label">{{ statusLabel }}</span>
      <span v-if="greens != null" class="sp-greens-badge">G{{ greens }}</span>
    </div>

    <div class="sp-body">
      <template v-if="status === 'loading'">
        <Icon name="svg-spinners:90-ring-with-bg" class="sp-spinner" />
        <span class="sp-wait">Conectando ao servidor...</span>
      </template>

      <template v-else-if="status === 'idle' || status === 'cancelled'">
        <Icon name="ph:hourglass-medium-bold" class="sp-icon-idle" />
        <span class="sp-wait">Aguardando próximo sinal...</span>
      </template>

      <template v-else-if="status === 'signal' || status === 'alert'">
        <div class="sp-signal-text">{{ signalText }}</div>
        <ConfidenceBar :value="confidence" />
      </template>

      <template v-else-if="status === 'win'">
        <div class="sp-result-text sp-win">{{ signalText || 'GREEN' }}</div>
      </template>

      <template v-else-if="status === 'loss'">
        <div class="sp-result-text sp-loss">{{ signalText || 'LOSS' }}</div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.sp-card {
  background: var(--av-surface);
  border: 1.5px solid var(--av-border);
  border-radius: var(--av-radius);
  padding: 1.25rem 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: border-color 0.4s, box-shadow 0.4s;
  animation: fade-in 0.3s ease;
  min-width: 0;
}
.panel-signal {
  border-color: var(--av-accent);
  animation: pulse-glow 2s ease-in-out infinite, fade-in 0.3s ease;
}
.panel-alert {
  border-color: var(--av-yellow);
  box-shadow: 0 0 18px rgba(234, 179, 8, 0.25);
}
.panel-win {
  border-color: var(--av-green);
  background: var(--av-green-dim);
  box-shadow: 0 0 24px rgba(34, 197, 94, 0.25);
}
.panel-loss,
.panel-cancelled {
  border-color: var(--av-red);
  background: var(--av-red-dim);
}
.panel-cancelled {
  border-color: #4b5563;
  background: rgba(75, 85, 99, 0.1);
}
.sp-status-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.sp-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--av-accent);
  flex-shrink: 0;
}
.panel-win .sp-dot { background: var(--av-green); }
.panel-loss .sp-dot { background: var(--av-red); }
.panel-alert .sp-dot { background: var(--av-yellow); }
.panel-idle .sp-dot,
.panel-loading .sp-dot { background: #4b5563; }
.sp-status-label {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--av-text-muted);
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}
.panel-signal .sp-status-label { color: var(--av-accent-2); animation: signal-blink 1.2s ease-in-out infinite; }
.panel-alert .sp-status-label { color: var(--av-yellow); }
.panel-win .sp-status-label { color: var(--av-green); }
.panel-loss .sp-status-label { color: var(--av-red); }
.sp-greens-badge {
  background: var(--av-accent);
  color: #fff;
  font-size: 0.7rem;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 99px;
  letter-spacing: 0.04em;
}
.sp-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
  min-height: 70px;
  justify-content: center;
}
.sp-spinner { font-size: 2rem; color: var(--av-accent); }
.sp-icon-idle { font-size: 2rem; color: #4b5563; }
.sp-wait {
  font-size: 0.85rem;
  color: var(--av-text-muted);
  text-align: center;
}
.sp-signal-text {
  font-size: 1.35rem;
  font-weight: 800;
  text-align: center;
  color: var(--av-text);
  line-height: 1.4;
  white-space: pre-line;
  max-width: 100%;
  overflow-wrap: anywhere;
}
.panel-signal .sp-signal-text { color: var(--av-accent-2); }
.panel-alert .sp-signal-text { color: var(--av-yellow); }
.sp-result-text {
  font-size: 1.5rem;
  font-weight: 900;
  text-align: center;
  overflow-wrap: anywhere;
}
.sp-win { color: var(--av-green); }
.sp-loss { color: var(--av-red); }

@media (max-width: 520px) {
  .sp-card {
    padding: 1rem 0.9rem 1.1rem;
    border-radius: 12px;
  }

  .sp-status-label {
    font-size: 0.72rem;
  }

  .sp-greens-badge {
    font-size: 0.66rem;
    padding: 2px 7px;
  }

  .sp-body {
    min-height: 62px;
    gap: 0.7rem;
  }

  .sp-signal-text {
    font-size: 1.08rem;
    line-height: 1.35;
  }

  .sp-result-text {
    font-size: 1.25rem;
  }
}
</style>
