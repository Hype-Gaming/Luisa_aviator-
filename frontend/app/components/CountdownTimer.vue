<script setup lang="ts">
const props = defineProps<{ seconds: number; remaining: number }>()
const CIRCUMFERENCE = 2 * Math.PI * 36
const dashOffset = computed(() =>
  props.seconds > 0
    ? CIRCUMFERENCE * (1 - props.remaining / props.seconds)
    : CIRCUMFERENCE
)
const mm = computed(() => String(Math.floor(props.remaining / 60)).padStart(2, '0'))
const ss = computed(() => String(props.remaining % 60).padStart(2, '0'))
</script>

<template>
  <div v-if="remaining > 0" class="cdt-wrap">
    <svg class="cdt-ring" viewBox="0 0 80 80">
      <circle class="cdt-bg" cx="40" cy="40" r="36" />
      <circle
        class="cdt-fill"
        cx="40"
        cy="40"
        r="36"
        :stroke-dasharray="CIRCUMFERENCE"
        :stroke-dashoffset="dashOffset"
      />
    </svg>
    <div class="cdt-text">{{ mm }}:{{ ss }}</div>
  </div>
</template>

<style scoped>
.cdt-wrap {
  position: relative;
  width: 80px;
  height: 80px;
  flex-shrink: 0;
}
.cdt-ring {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}
.cdt-bg {
  fill: none;
  stroke: rgba(255,255,255,0.08);
  stroke-width: 5;
}
.cdt-fill {
  fill: none;
  stroke: var(--av-accent);
  stroke-width: 5;
  stroke-linecap: round;
  transition: stroke-dashoffset 1s linear;
  filter: drop-shadow(0 0 4px var(--av-accent));
}
.cdt-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--av-text);
}
</style>
