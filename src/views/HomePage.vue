<template>
  <div class="home-page-container">
    <Navbar :show-dashboard-buttons="false" />
    <div class="content-wrapper">
      <main class="main-content">
        <img src="/pwlogo-full.png" alt="Logo" class="logo" />
        <h1>Real-time Formula 1 telemetry and timing</h1>
        <div class="action-buttons">
          <Button label="Go to the Pitwall" @click="goToDashboard" class="p-button-lg" />
          <Button label="Check Schedule" @click="goToSchedule" class="p-button-lg p-button-secondary" />
        </div>
        <div class="action-buttons" style="margin-top: 1rem;">
          <Button label="Tour the pitwall 🏎️" @click="takeTour" class="p-button-lg p-button-info" />
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
import Navbar from '@/components/Navbar.vue';
import { useUiStore } from '@/stores/uiStore';

const router = useRouter();
const uiStore = useUiStore();

const goToDashboard = () => {
  router.push('/dashboard');
};

const goToSchedule = () => {
  router.push('/schedule');
};

const takeTour = () => {
  uiStore.triggerWelcomeTour();
  router.push('/dashboard');
};
</script>

<style scoped>
.home-page-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #121212;
  color: #ffffff;
}

.content-wrapper {
  flex-grow: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.main-content {
  max-width: 600px;
}

.logo {
  max-width: 200px;
  margin-bottom: 2rem;
}

h1 {
  font-size: 2.5rem;
  margin-bottom: 2rem;
}

.action-buttons .p-button {
  margin: 0 0.5rem;
}
</style>