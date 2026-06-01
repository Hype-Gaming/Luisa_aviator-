<script setup lang="ts">
useHead({ title: 'Sacar - Luisa Aviator' })
</script>

<template>
  <main class="deposit-page">
    <section class="withdraw-card">
      <div class="withdraw-hero">
        <div class="withdraw-icon-circle">
          <Icon name="ph:arrow-up-bold" />
        </div>
        <h1>Sacar</h1>
        <p class="withdraw-subtitle">Realize o saque dos seus fundos</p>
      </div>

      <div class="notice-box withdraw-notice">
        <Icon name="ph:shield-check-bold" class="withdraw-shield" />
        <div>
          <p>Para realizar saques da sua conta, é necessário acessar diretamente o site da <strong>Bateu Bet</strong>.</p>
          <p class="withdraw-notice-detail">Isso é obrigatório porque o processo de saque requer verificação por <strong>reconhecimento facial</strong> para garantir a segurança da sua conta e dos seus fundos.</p>
        </div>
      </div>

      <a
        href="https://go.aff.bateu.bet.br/1bpk3rbp?utm_campaign=aplicativo"
        target="_blank"
        rel="noopener noreferrer"
        class="primary-btn wide withdraw-btn"
      >
        Acessar Bateu Bet
        <Icon name="ph:arrow-square-out-bold" />
      </a>

      <p class="withdraw-hint">Você será redirecionado para o site oficial da Bateu Bet em uma nova aba.</p>
    </section>
  </main>
</template>

<style scoped>
.withdraw-card {
  width: min(520px, 100%);
  margin: 0 auto;
  background: #141418;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 2rem 2rem 1.75rem;
  display: grid;
  gap: 1.1rem;
}

.withdraw-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  text-align: center;
}

.withdraw-icon-circle {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: rgba(180, 20, 25, 0.35);
  display: grid;
  place-items: center;
  font-size: 1.75rem;
  color: var(--av-accent-2);
}

.withdraw-hero h1 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
  margin: 0;
}

.withdraw-subtitle {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.45);
  margin: 0;
}

.withdraw-notice {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1rem 1.1rem;
  gap: 0.75rem;
  align-items: flex-start;
}

.withdraw-shield {
  width: 20px !important;
  height: 20px !important;
  min-width: 20px;
  color: var(--av-accent-2) !important;
  margin-top: 2px;
  flex-shrink: 0;
}

.withdraw-notice p {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.5;
  margin: 0;
}

.withdraw-notice-detail {
  margin-top: 0.6rem !important;
  color: rgba(255, 255, 255, 0.45) !important;
  font-size: 0.85rem !important;
}

.withdraw-btn {
  min-height: 52px;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  background: #d61a7c;
  box-shadow: none;
  gap: 0.5rem;
  text-decoration: none;
}

.withdraw-btn:hover {
  background: #c82d2d;
}

.withdraw-hint {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.35);
  text-align: center;
  margin: 0;
}
</style>
