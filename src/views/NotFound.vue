<template>
  <div class="not-found-container">
    <div class="content">
      <h1>404</h1>
      <h2>Page Not Found</h2>
      <p>Looks like you've gone off track. Let's get you back to the pitwall.</p>
      <div class="action-buttons">
        <Button label="Go Home" @click="goHome" class="p-button-lg" />
        <Button label="Go to Dashboard" @click="goToDashboard" class="p-button-lg p-button-secondary" />
        <Button label="Check Schedule" @click="goToSchedule" class="p-button-lg p-button-info" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
import { useHead } from '@unhead/vue';

const router = useRouter();

useHead({
  title: 'Page Not Found - Pitwall.me',
  meta: [
    { name: 'description', content: 'The page you are looking for does not exist. Return to Pitwall.me home.' }
  ],
});

const goHome = () => {
  router.push('/');
};

const goToDashboard = () => {
  router.push('/dashboard');
};

const goToSchedule = () => {
  router.push('/schedule');
};
</script>

<style scoped>
.not-found-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #121212;
  color: #ffffff;
  text-align: center;
}

.content {
  padding: 2rem;
}

h1 {
  font-size: 6rem;
  margin: 0;
  color: var(--p-primary-color);
}

h2 {
  font-size: 2rem;
  margin-bottom: 1rem;
}

p {
  margin-bottom: 2rem;
  font-size: 1.2rem;
  color: #aaa;
}

.action-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
}
</style>
