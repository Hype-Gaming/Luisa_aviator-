export default defineNuxtPlugin(() => {
  if (typeof window === 'undefined') return
  const isLight = localStorage.getItem('theme_mode') === 'light'
  document.documentElement.classList.toggle('light-mode', isLight)
})
