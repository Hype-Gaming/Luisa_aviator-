<script setup lang="ts">
interface Props {
  color?: string
  density?: number
  minSize?: number
  maxSize?: number
}

const props = withDefaults(defineProps<Props>(), {
  color: '#E21A82',
  density: 100,
  minSize: 0.6,
  maxSize: 1.4,
})

const canvasRef = ref<HTMLCanvasElement | null>(null)

interface Particle {
  x: number
  y: number
  size: number
  opacity: number
  opacityDir: number
  vx: number
  vy: number
}

let animId = 0
let particles: Particle[] = []

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return { r, g, b }
}

function initParticles(w: number, h: number) {
  const area = (w * h) / (400 * 400)
  const count = Math.max(Math.round(area * props.density), 60)
  particles = Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    size: props.minSize + Math.random() * (props.maxSize - props.minSize),
    opacity: Math.random(),
    opacityDir: Math.random() > 0.5 ? 1 : -1,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
  }))
}

function draw(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  const { r, g, b } = hexToRgb(props.color)
  const w = canvas.width
  const h = canvas.height

  ctx.clearRect(0, 0, w, h)

  for (const p of particles) {
    p.opacity += p.opacityDir * 0.004
    if (p.opacity >= 1)   { p.opacity = 1;   p.opacityDir = -1 }
    if (p.opacity <= 0.1) { p.opacity = 0.1; p.opacityDir =  1 }

    p.x += p.vx
    p.y += p.vy
    if (p.x < 0)  p.x = w
    if (p.x > w)  p.x = 0
    if (p.y < 0)  p.y = h
    if (p.y > h)  p.y = 0

    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${r},${g},${b},${p.opacity})`
    ctx.fill()
  }

  animId = requestAnimationFrame(() => draw(canvas, ctx))
}

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const resize = () => {
    canvas.width  = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    initParticles(canvas.width, canvas.height)
  }

  resize()
  draw(canvas, ctx)
  window.addEventListener('resize', resize)

  onUnmounted(() => {
    cancelAnimationFrame(animId)
    window.removeEventListener('resize', resize)
  })
})
</script>

<template>
  <canvas ref="canvasRef" class="sparkles-canvas" />
</template>

<style scoped>
.sparkles-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}
</style>
