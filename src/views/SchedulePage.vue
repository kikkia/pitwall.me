<template>
  <Navbar @open-info-modal="handleOpenInfoModal" @add-widget="handleAddWidget" :showAddWidgetButton="false" />
  <div class="season-page">
    <h1>Upcoming Sessions</h1>
    <div class="view-toggle">
      <ToggleButton v-model="showCalendar" onLabel="Calendar View" offLabel="Card View" onIcon="pi pi-calendar" offIcon="pi pi-list" />
    </div>
    <div v-if="eventStore.isLoading">Loading sessions...</div>
    <div v-else-if="eventStore.error" class="error-message">{{ eventStore.error }}</div>
    <div v-else>
      <div v-if="isRaceWeek" class="race-week-banner">
        It's Race Week!
      </div>
      <div v-if="nextEvent" class="next-event-countdown">
        <h2>Next Event: {{ nextEvent.summary }}</h2>
        <p>Starts in: {{ countdown }}</p>
      </div>

      <div v-if="!showCalendar" class="race-weekend-cards-container">
        <Card v-for="(group, raceName) in groupedEvents" :key="raceName"
              :class="['race-weekend-card', getEventStatus(group), { 'pulse-blue': raceName === nextUpcomingRaceWeekendName && !hasOngoingEvent }]"
              @click="openSessionDetails(raceName, group)">
            <template #title>{{ raceName }}</template>
            <template #content>
              <p>Begins: {{ getCountdownForGroup(group) }}</p>
            </template>
            <div v-if="getEventStatus(group) === 'finished'" class="event-label finished-label">FINISHED</div>
            <div v-else-if="getEventStatus(group) === 'ongoing'" class="event-label ongoing-label">ONGOING</div>
            <div v-else-if="raceName === nextUpcomingRaceWeekendName && !hasOngoingEvent" class="event-label up-next-label">UP NEXT</div>
          </Card>
      </div>
      <div v-else class="calendar-container">
        <Calendar inline @date-select="onDateSelect" class="large-calendar">
          <template #date="slotProps">
            <div :class="{'event-day': isSession(slotProps.date)}">
                {{ slotProps.date.day }}
            </div>
          </template>
        </Calendar>
      </div>
    </div>
  </div>

  <Dialog v-model:visible="sessionDetailsDialogVisible" modal dismissableMask :header="selectedRaceName" :style="{ width: '50vw' }" class="session-details-dialog">
    <template #header>
      <div class="dialog-header-content">
        <div class="race-info">
          <span class="race-name">{{ selectedRaceName }}</span>
        </div>
        <span class="date-range">{{ getRaceWeekendDates(selectedSessions) }}</span>
      </div>
    </template>
    <div v-if="groupedSessionsByDay && Object.keys(groupedSessionsByDay).length > 0" class="session-details-content">
        <div v-for="(sessions, day) in groupedSessionsByDay" :key="day" class="day-column">
          <h2>{{ day }}</h2>
          <div v-for="session in sessions" :key="session.uid" class="session-item">
            <h3>{{ session.description }}</h3>
            <p>{{ formatTimeRange(session.startTimeLocal, session.endTimeLocal) }}</p>
          </div>
        </div>
      </div>
      <div v-else>
        <p>No session details available.</p>
      </div>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useEventStore, type LocalF1Event } from '@/stores/eventStore';
import { fetchEvents } from '@/services/eventService';
import Navbar from '@/components/Navbar.vue';
import Card from 'primevue/card';
import Dialog from 'primevue/dialog';
import confetti from 'canvas-confetti';
import Calendar from 'primevue/calendar';
import ToggleButton from 'primevue/togglebutton';

const eventStore = useEventStore();
const countdown = ref('');
let countdownInterval: number | undefined;

const sessionDetailsDialogVisible = ref(false);
const selectedRaceName = ref('');
const selectedSessions = ref<LocalF1Event[]>([]);

const showCalendar = ref(false);

const sessionDates = computed(() => {
  const dates = new Set<number>(); 
  eventStore.events.forEach(event => {
    const d = event.startTimeLocal;
    const dateKey = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    dates.add(dateKey);
  });
  return dates;
});

const isSession = (date: { day: number, month: number, year: number }) => {
  const calendarDateKey = Date.UTC(date.year, date.month, date.day);
  return sessionDates.value.has(calendarDateKey);
};

const onDateSelect = (date: Date) => {
  if (!date) return;
  const clickedDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));

  for (const raceName in groupedEvents.value) {
    const group = groupedEvents.value[raceName];
    const sessionsForDate = group.filter(session => {
        const sessionDate = new Date(Date.UTC(session.startTimeLocal.getFullYear(), session.startTimeLocal.getMonth(), session.startTimeLocal.getDate()));
        return sessionDate.getTime() === clickedDate.getTime();
    });

    if (sessionsForDate.length > 0) {
      const sortedSessions = sessionsForDate.sort((a, b) => a.startTimeLocal.getTime() - b.startTimeLocal.getTime());
      openSessionDetails(raceName, sortedSessions);
      return;
    }
  }
};

const openSessionDetails = (raceName: string, sessions: LocalF1Event[]) => {
  selectedRaceName.value = raceName;
  selectedSessions.value = sessions;
  sessionDetailsDialogVisible.value = true;
};

const groupedEvents = computed(() => {
  return eventStore.allEventsGroupedByLocation;
});

const groupedSessionsByDay = computed(() => {
  const groups: Record<string, LocalF1Event[]> = {};
  const options: Intl.DateTimeFormatOptions = { weekday: 'long' };

  selectedSessions.value.forEach(session => {
    const day = session.startTimeLocal.toLocaleDateString(undefined, options);
    if (!groups[day]) {
      groups[day] = [];
    }
    groups[day].push(session);
  });

  const dayOrder = ['Thursday', 'Friday', 'Saturday', 'Sunday', 'Monday'];
  const orderedGroups: Record<string, LocalF1Event[]> = {};

  dayOrder.forEach(dayName => {
    if (groups[dayName]) {
      orderedGroups[dayName] = groups[dayName];
    }
  });

  return orderedGroups;
});

const hasOngoingEvent = computed(() => {
  return Object.values(eventStore.allEventsGroupedByLocation).some(group => getEventStatus(group) === 'ongoing');
});

const nextUpcomingRaceWeekendName = computed(() => {
  if (hasOngoingEvent.value) {
    return null;
  }

  const now = new Date();
  let closestUpcomingRace: { raceName: string; firstSessionStartTime: Date } | null = null;

  for (const raceName in eventStore.allEventsGroupedByLocation) {
    const group = eventStore.allEventsGroupedByLocation[raceName];
    const status = getEventStatus(group);

    if (status === 'upcoming') {
      const firstSessionStartTime = group[0].startTimeLocal;
      if (!closestUpcomingRace || firstSessionStartTime < closestUpcomingRace.firstSessionStartTime) {
        closestUpcomingRace = { raceName, firstSessionStartTime };
      }
    }
  }
  return closestUpcomingRace ? closestUpcomingRace.raceName : null;
});

const isRaceWeek = computed(() => {
  if (!nextUpcomingRaceWeekendName.value) {
    return false;
  }

  const nextRaceWeekendSessions = eventStore.allEventsGroupedByLocation[nextUpcomingRaceWeekendName.value];
  if (!nextRaceWeekendSessions || nextRaceWeekendSessions.length === 0) {
    return false;
  }

  const firstSessionStartTime = nextRaceWeekendSessions[0].startTimeLocal;
  const now = new Date();
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Check if the first session starts within the next 7 days
  return firstSessionStartTime > now && firstSessionStartTime <= oneWeekFromNow;
});

const getRaceWeekendDates = (sessions: LocalF1Event[]): string => {
  console.log(sessions)
  if (!sessions || sessions.length === 0) {
    return '';
  }
  const sortedSessions = [...sessions].sort((a, b) => a.startTimeLocal.getTime() - b.startTimeLocal.getTime());
  const firstDate = sortedSessions[0].startTimeLocal;
  const lastDate = sortedSessions[sortedSessions.length - 1].endTimeLocal;

  const monthFormatter = new Intl.DateTimeFormat(undefined, { month: 'short' });
  const dayFormatter = new Intl.DateTimeFormat(undefined, { day: 'numeric' });

  const startMonth = monthFormatter.format(firstDate);
  const startDay = dayFormatter.format(firstDate);
  const endDay = dayFormatter.format(lastDate);

  if (firstDate.getMonth() === lastDate.getMonth()) {
    return `${startMonth} ${startDay}-${endDay}`;
  } else {
    const endMonth = monthFormatter.format(lastDate);
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
  }
};

const formatTimeRange = (start: Date, end: Date): string => {
  const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' };
  const startTime = start.toLocaleTimeString([], timeOptions);
  const endTime = end.toLocaleTimeString([], timeOptions);
  return `${startTime} - ${endTime}`;
};

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

const getCountdownForGroup = (group: LocalF1Event[]): string => {
  if (!group || group.length === 0) {
    return 'No sessions';
  }

  const firstSession = group[0];
  return formatDateTime(firstSession.startTimeLocal);
};

const getEventStatus = (group: LocalF1Event[]): 'finished' | 'ongoing' | 'upcoming' => {
  if (!group || group.length === 0) {
    return 'upcoming';
  }

  const now = new Date();
  const firstSessionStartTime = group[0].startTimeLocal;
  const lastSessionEndTime = group[group.length - 1].endTimeLocal;

  if (now > lastSessionEndTime) {
    return 'finished';
  } else if (now >= firstSessionStartTime && now <= lastSessionEndTime) {
    return 'ongoing';
  } else {
    return 'upcoming';
  }
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

watch(isRaceWeek, (newValue) => {
  if (newValue) {
    confetti({
      particleCount: 300,
      spread: 170,
      origin: { y: 0.1 }
    });
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

.view-toggle {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20px;
}

.calendar-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.large-calendar {
  width: 100%;
  font-size: 1.2rem;
}

:deep(.p-datepicker table td > span),
:deep(.p-datepicker table td > div) {
    width: 3.5rem;
    height: 3.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
}

.event-day {
  background-color: rgba(76, 175, 80, 0.5);
  border-radius: 50%;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.session-details-dialog .p-dialog-header {
  border-bottom: 1px solid var(--surface-border);
  padding-bottom: 1rem;
  margin-bottom: 1rem;
}

.dialog-header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.race-info {
  display: flex;
  align-items: center;
}

.race-info .flag-icon {
  width: 30px;
  height: auto;
  margin-right: 10px;
}

.race-info .race-name {
  font-size: 1.5em;
  font-weight: bold;
  color: var(--text-color);
}

.date-range {
  font-size: 1.2em;
  color: var(--text-color-secondary);
}

.session-details-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 20px;
}

.day-column {
  padding: 10px;
  background-color: var(--surface-ground);
  border-radius: var(--border-radius);
  box-sizing: border-box;
}

.day-column h2 {
  font-size: 1.2em;
  color: var(--primary-color);
  margin-top: 0;
  margin-bottom: 15px;
  text-align: center;
}

.session-item {
  margin-bottom: 10px;
}

.session-item h3 {
  font-size: 1em;
  margin: 0;
  color: var(--text-color);
}

.session-item p {
  font-size: 0.9em;
  color: var(--text-color-secondary);
  margin: 0;
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

.race-weekend-cards-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); 
  gap: 20px; 
}

.race-weekend-card {
  width: 100%;
  cursor: pointer;
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out; 
}

.race-weekend-card:hover {
  transform: translateY(-5px); 
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2); 
}

.race-weekend-card .p-card-title {
  color: var(--primary-color);
  margin-top: 0;
  margin-bottom: 10px;
}

.race-weekend-card .p-card-content p {
  font-size: 1.1em;
  color: var(--text-color-secondary);
  font-weight: bold;
}

.race-weekend-card.finished {
  background-color: var(--surface-ground); 
  opacity: 0.5; 
  filter: grayscale(100%); 
}

.event-label {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 5px 10px;
  border-radius: var(--border-radius);
  font-weight: bold;
  font-size: 0.8em;
  z-index: 1;
  color: var(--text-color);
}

.finished-label {
  background-color: var(--red-500);
}

.ongoing-label {
  background-color: var(--green-500);
}

.up-next-label {
  background-color: var(--blue-500);
}

.race-weekend-card.ongoing {
  border: 3px solid var(--green-400);
  position: relative;
  background-color: var(--surface-overlay);
  animation: pulse-green 2s infinite; 
}

.race-weekend-card.pulse-blue {
  border: 3px solid var(--blue-400); 
  animation: pulse-blue 2s infinite;
}


@keyframes pulse-green {
  0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7); } 
  70% { box-shadow: 0 0 0 20px rgba(76, 175, 80, 0); }
  100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
}

@keyframes pulse-blue {
  0% { box-shadow: 0 0 0 0 rgba(33, 150, 243, 0.7); } 
  70% { box-shadow: 0 0 0 20px rgba(33, 150, 243, 0); }
  100% { box-shadow: 0 0 0 0 rgba(33, 150, 243, 0); }
}

.race-week-banner {
  background: linear-gradient(120deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: rainbow-text 6s ease infinite;
  padding: 15px;
  margin-bottom: 20px;
  text-align: center;
  font-size: 1.8em; 
  font-weight: bold;
  border-radius: var(--border-radius);
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.5); 
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

@keyframes rainbow-text {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
</style>