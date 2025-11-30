<template>
  <Navbar @open-info-modal="handleOpenInfoModal" @add-widget="handleAddWidget" :show-dashboard-buttons="false" />
  <div class="season-page">
    <div class="content-wrapper">
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
          <template v-for="(item, index) in sortedRaceWeekends" :key="index">
            <div v-if="item.isDivider" class="year-divider">
              <span>{{ item.year }} Season</span>
            </div>
            <Card v-else
                  :class="['race-weekend-card', getEventStatus(item.sessions), { 'pulse-blue': item.raceName === nextUpcomingRaceWeekendName && !hasOngoingEvent }]"
                  @click="openSessionDetails(item.raceName, item.sessions)">
                <template #title>
                  <div class="card-title-content">
                    <span class="country-flag">{{ getCountryFlagEmoji(item.sessions[0]?.location) }}</span>
                    <span>{{ item.raceName }}</span>
                  </div>
                </template>
                <template #content>
                  <p v-if="getEventStatus(item.sessions) === 'ongoing'">{{ getNextSessionForGroup(item.sessions) }}</p>
                  <p v-else>Begins: {{ getCountdownForGroup(item.sessions) }}</p>
                </template>
                <div v-if="getEventStatus(item.sessions) === 'finished'" class="event-label finished-label">FINISHED</div>
                <div v-else-if="getEventStatus(item.sessions) === 'ongoing'" class="event-label ongoing-label">ONGOING</div>
                <div v-else-if="item.raceName === nextUpcomingRaceWeekendName && !hasOngoingEvent" class="event-label up-next-label">UP NEXT</div>
              </Card>
          </template>
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
  </div>

  <Dialog v-model:visible="sessionDetailsDialogVisible" modal dismissableMask :header="selectedRaceName" class="session-details-dialog">
    <template #header>
      <div class="dialog-header-content">
        <div class="race-info">
          <span class="race-name">{{ selectedRaceName }}</span>
        </div>
        <span class="date-range">{{ getRaceWeekendDates(selectedSessions) }}</span>
      </div>
    </template>
    <div v-if="selectedSessions.length > 0" class="session-details-content">
      <Card v-for="session in selectedSessions" :key="session.uid" class="session-card">
        <template #content>
          <div class="session-card-content">
            <div class="session-card-header">
              <h3>{{ session.description }}</h3>
              <span class="session-day">{{ getSessionDay(session.startTimeLocal) }}</span>
            </div>
            <p>{{ formatTimeRange(session.startTimeLocal, session.endTimeLocal) }}</p>
          </div>
        </template>
      </Card>
    </div>
    <div v-else>
      <p>No session details available.</p>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted, watch } from 'vue';
import { useHead } from '@unhead/vue';
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

useHead({
  title: 'F1 Schedule | Pitwall.me',
  meta: [
    { name: 'description', content: 'View the upcoming F1 race schedule and check session times.' }
  ],
});

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


const sortedRaceWeekends = computed(() => {
  const now = new Date();
  const currentYear = now.getFullYear();

  const weekends = Object.entries(groupedEvents.value).map(([raceName, sessions]) => {
    // Assuming sessions are sorted, use the first session's start time
    const firstSessionTime = sessions[0]?.startTimeLocal;
    return {
      raceName,
      sessions,
      year: firstSessionTime ? firstSessionTime.getFullYear() : 0,
      startTime: firstSessionTime ? firstSessionTime.getTime() : 0,
    };
  }).filter(weekend => weekend.startTime > 0); // Filter out empty groups if any

  weekends.sort((a, b) => a.startTime - b.startTime);

  const result: (any)[] = [];
  let nextYearDividerAdded = false;

  for (const weekend of weekends) {
    if (weekend.year > currentYear && !nextYearDividerAdded) {
      // Check if the event is not finished
      const status = getEventStatus(weekend.sessions);
      if (status !== 'finished') {
        result.push({ isDivider: true, year: weekend.year });
        nextYearDividerAdded = true;
      }
    }
    result.push(weekend);
  }

  return result;
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

const countryCodeOverrides: Record<string, string> = {
    NED: 'NL',
    MEX: 'MX',
    UAE: 'AE'
};

const locationToCountryCode: Record<string, string> = {
  'Bahrain': 'BH',
  'Saudi Arabia': 'SA',
  'Australia': 'AU',
  'Japan': 'JP',
  'China': 'CN',
  'Miami': 'US',
  'Emilia Romagna': 'IT',
  'Monaco': 'MC',
  'Canada': 'CA',
  'Spain': 'ES',
  'Austria': 'AT',
  'Great Britain': 'GB',
  'United Kingdom': 'GB',
  'Hungary': 'HU',
  'Belgium': 'BE',
  'Netherlands': 'NL',
  'Italy': 'IT',
  'Azerbaijan': 'AZ',
  'Singapore': 'SG',
  'United States': 'US',
  'Mexico': 'MX',
  'Brazil': 'BR',
  'Las Vegas': 'US',
  'Qatar': 'QA',
  'Abu Dhabi': 'AE',
  'United Arab Emirates': 'AE'
};

const getCountryFlagEmoji = (location: string | undefined) => {
    if (!location) return '';

    const countryKey = Object.keys(locationToCountryCode).find(loc => location.includes(loc));
    if (!countryKey) return '';
    
    const countryCode = locationToCountryCode[countryKey];

    if (!countryCode) return '';
    const correctedCode = (countryCodeOverrides[countryCode.toUpperCase()] || countryCode.toUpperCase()).substring(0, 2);
    const codePoints = correctedCode
        .split('')
        .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
};

const getSessionDay = (date: Date): string => {
  return date.toLocaleDateString(undefined, { weekday: 'long' });
};

const getRaceWeekendDates = (sessions: LocalF1Event[]): string => {
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

const getNextSessionForGroup = (group: LocalF1Event[]): string => {
  const now = new Date();
  const nextSession = group.find(session => session.endTimeLocal > now);

  if (nextSession) {
    const timeFormat: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' };
    const time = nextSession.startTimeLocal.toLocaleTimeString([], timeFormat);
    const day = nextSession.startTimeLocal.toLocaleDateString([], { weekday: 'short' });
    
    return `Next: ${nextSession.description} on ${day} at ${time}`;
  }

  return 'Event concluded';
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
  height: calc(100vh - 60px);
  overflow-y: auto;
}

.content-wrapper {
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

.session-details-dialog {
  width: 50vw;
  max-width: 900px;
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
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.session-card {
  background-color: var(--surface-card);
  border-radius: var(--border-radius);
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out, background-color 0.2s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.session-card:hover {
  background-color: var(--surface-hover);
  transform: translateY(-3px);
  box-shadow: 0 6px 12px rgba(0,0,0,0.1);
}

.session-card .p-card-content {
  padding: 0;
}

.session-card-content {
  padding: 1rem;
}

.session-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.session-card-header h3 {
  margin: 0;
  font-size: 1.1em;
  color: var(--text-color);
  font-weight: bold;
}

.session-day {
  font-size: 0.9em;
  color: var(--text-color-secondary);
  font-style: italic;
}

.session-card-content p {
  margin: 0;
  font-size: 1em;
  color: var(--text-color-secondary);
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
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out, border-color 0.2s ease-in-out;
  background-color: var(--surface-card);
  border: 1px solid var(--surface-border);
  box-shadow: 0 4px 6px rgba(0,0,0, 0.1);
}

.race-weekend-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 20px rgba(0, 0, 0, 0.15);
  border-color: var(--primary-color);
}

.card-title-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.country-flag {
  font-size: 1.5rem;
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

.year-divider {
  grid-column: 1 / -1;
  text-align: center;
  margin: 20px 0;
  position: relative;
  color: var(--text-color-secondary);
}

.year-divider span {
  background-color: var(--surface-ground);
  padding: 0 20px;
  position: relative;
  z-index: 1;
  font-size: 1.5em;
  font-weight: bold;
}

.year-divider::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 1px;
  background-color: var(--surface-border);
  z-index: 0;
}

@media (max-width: 768px) {
  .session-details-dialog {
    width: 95vw;
  }

  .dialog-header-content {
    flex-direction: column;
    align-items: flex-start;
  }

  .date-range {
    margin-top: 8px;
    font-size: 1em;
  }

  .race-info .race-name {
    font-size: 1.2em;
  }

  .large-calendar {
    font-size: 1rem;
  }

  :deep(.p-datepicker table td > span),
  :deep(.p-datepicker table td > div) {
    width: 2.5rem;
    height: 2.5rem;
  }

  .season-page {
    padding: 10px;
  }
}
</style>