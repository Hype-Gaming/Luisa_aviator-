<script setup lang="ts">
const route = useRoute()
useHead({ title: `${route.params.gameId || 'Jogo'} - Luisa Aviator` })
</script>

<template>
  <RoutePlaceholder
    :title="`Jogar ${route.params.gameId}`"
    description="Tela preparada para iniciar jogo autenticado por slug."
    icon="ph:game-controller-bold"
    badge="Game"
  />
</template>
