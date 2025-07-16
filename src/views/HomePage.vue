<template>
  <div class="home-page-container">
    <video autoplay loop muted playsinline class="background-video">
      <source src="/pitwall-bg.mp4" type="video/mp4">
    </video>
    <Navbar :show-dashboard-buttons="false" @open-info-modal="isInfoModalVisible = true" />
    <div class="content-wrapper">
      <main class="main-content">
        <img src="/pwlogo-full.png" alt="Logo" class="logo" />
        <h2>Take a seat on the pitwall and make your own race engineer dashboads to view real-time, or past session telemtry data.</h2>
        <div class="action-buttons">
          <Button label="Go to the Pitwall 🏎️" @click="goToDashboard" class="p-button-lg" />
          <Button label="Check Schedule" @click="goToSchedule" class="p-button-lg p-button-secondary" />
        </div>
        <div class="action-buttons" style="margin-top: 1rem;">
          <Button label="Take a tour 👀" @click="takeTour" class="p-button-lg p-button-info" />
        </div>
      </main>
    </div>
    <InfoModal v-model:visible="isInfoModalVisible" />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
import Navbar from '@/components/Navbar.vue';
import InfoModal from '@/components/InfoModal.vue';
import { useUiStore } from '@/stores/uiStore';

const router = useRouter();
const uiStore = useUiStore();
const isInfoModalVisible = ref(false);

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
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #121212;
  color: #ffffff;
  overflow: hidden;
}

.background-video {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: translate(-50%, -50%);
  z-index: 0;
}

.content-wrapper {
  flex-grow: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  position: relative;
  z-index: 1;
}

.main-content {
  max-width: 600px;
  background-color: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px); /* For Safari */
  padding: 1.5rem 2rem 2rem;
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.logo {
  max-width: 300px;
}

h2 {
  font-size: 1.5rem;
  margin-bottom: 2rem;
}

.action-buttons .p-button {
  margin: 0 0.5rem;
}
</style>