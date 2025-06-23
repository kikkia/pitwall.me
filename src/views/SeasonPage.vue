<template>
  <Navbar @open-info-modal="handleOpenInfoModal" @add-widget="handleAddWidget" :showAddWidgetButton="false" />
  <div class="season-page">
    <h1>Upcoming Sessions</h1>
    <div v-if="eventStore.isLoading">Loading sessions...</div>
    <div v-else-if="eventStore.error" class="error-message">{{ eventStore.error }}</div>
    <div v-else>
      <div v-if="nextEvent" class="next-event-countdown">
        <h2>Next Event: {{ nextEvent.summary }}</h2>
        <p>Starts in: {{ countdown }}</p>
      </div>

      <div v-for="(group, location) in groupedEvents" :key="location" class="event-group">
        <h2>{{ location }}</h2>
        <div v-for="event in group" :key="event.uid" class="event-card">
          <h3>{{ event.summary }}</h3>
          <p>{{ event.description }}</p>
          <p>Start: {{ formatDateTime(event.startTimeLocal) }}</p>
          <p>End: {{ formatDateTime(event.endTimeLocal) }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useEventStore } from '@/stores/eventStore';
import { fetchEvents } from '@/services/eventService';
import Navbar from '@/components/Navbar.vue';

const eventStore = useEventStore();
const countdown = ref('');
let countdownInterval: number | undefined;

const groupedEvents = computed(() => {
  return eventStore.allEventsGroupedByLocation;
});

const nextEvent = computed(() => {
  const now = new Date();
  const futureEvents = eventStore.events
    .filter(event => event.endTimeLocal >= now)
    .sort((a, b) => a.startTimeLocal.getTime() - b.startTimeLocal.getTime());
  return futureEvents.length > 0 ? futureEvents[0] : null;
});

const updateCountdown = () => {
  if (nextEvent.value) {
    const now = new Date();
    const diff = nextEvent.value.startTimeLocal.getTime() - now.getTime();

    if (diff <= 0) {
      countdown.value = 'Session has started!';
      clearInterval(countdownInterval);
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    countdown.value = `${days}d ${hours}h ${minutes}m ${seconds}s`;
  } else {
    countdown.value = 'No upcoming sessions.';
  }
};

const formatDateTime = (date: Date) => {
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

onMounted(async () => {
  await fetchEvents();
  updateCountdown();
  countdownInterval = setInterval(updateCountdown, 1000);
});

onUnmounted(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
});

const router = useRouter();

const handleOpenInfoModal = () => {
  router.push('/dashboard');
};

const handleAddWidget = () => {
  // Do nothing here
};
</script>

<style scoped>
.season-page {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

h1 {
  color: var(--text-color);
  margin-bottom: 20px;
}

.error-message {
  color: var(--red-500);
  font-weight: bold;
}

.next-event-countdown {
  background-color: var(--surface-card);
  padding: 15px;
  border-radius: var(--border-radius);
  margin-bottom: 30px;
  text-align: center;
}

.next-event-countdown h2 {
  color: var(--primary-color);
  margin-top: 0;
}

.next-event-countdown p {
  font-size: 1.2em;
  font-weight: bold;
}

.event-group {
  margin-bottom: 40px;
}

.event-group h2 {
  color: var(--primary-color);
  border-bottom: 2px solid var(--surface-border);
  padding-bottom: 10px;
  margin-bottom: 20px;
}

.event-card {
  background-color: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: var(--border-radius);
  padding: 15px;
  margin-bottom: 15px;
  box-shadow: var(--card-shadow);
}

.event-card h3 {
  color: var(--text-color);
  margin-top: 0;
  margin-bottom: 10px;
}

.event-card p {
  color: var(--text-color-secondary);
  margin-bottom: 5px;
}
</style>