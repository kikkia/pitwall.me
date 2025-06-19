<template>
  <Toolbar class="app-navbar">
    <template #start>
      <span class="navbar-brand" @click="emit('open-info-modal')">Pitwall.me</span>
      <Button 
        icon="pi pi-calendar" 
        label="Upcoming Sessions" 
        @click="toggleUpcomingMenu" 
        aria-haspopup="true" 
        aria-controls="upcoming_sessions_menu"
        class="p-button-sm p-button-text p-button-secondary"
        style="margin-left: 10px;"
      />
      <Menu ref="upcomingEventsMenu" id="upcoming_sessions_menu" :model="upcomingMenuItems" :popup="true" class="upcoming-sessions-menu" />
    </template>

    <template #center>
      <div class="center-content">
        <span class="navbar-brand">{{ eventName }}</span>
        <Tag
          :severity="raceStatusSeverity"
          :value="raceStatusLabel"
          class="connection-status-tag"
        />
      </div>
    </template>

    <template #end>
      <Button
        icon="pi pi-plus"
        label="Add Widget"
        @click="emit('add-widget')"
        class="p-button-sm p-button-text p-button-primary"
        style="margin-right: 10px;"
      />
      <Button
        icon="pi pi-cog"
        label="Settings"
        @click="openSettingsDialog"
        class="p-button-sm p-button-text p-button-primary"
        style="margin-right: 10px;"
      />
      <i
        :class="['pi', isConnected ? 'pi-sort-alt' : 'pi-sort-alt-slash', { 'pulse-disconnected': !isConnected }]"
        :style="{ color: isConnected ? 'green' : 'red' }"
        :title="socketStatusLabel"
      ></i>
    </template>
  </Toolbar>

  <SettingsDialog :visible="settingsDialogVisible" @update:visible="settingsDialogVisible = $event" />
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch, onUnmounted } from 'vue';
import Button from 'primevue/button';
import Menu from 'primevue/menu';
import type { MenuItem } from 'primevue/menuitem';
import Toolbar from 'primevue/toolbar';
import Tag from 'primevue/tag';
import { useF1Store } from '@/stores/f1Store';
import { useEventStore, type LocalF1Event } from '@/stores/eventStore';
import { fetchEvents } from '@/services/eventService';
import { storeToRefs } from 'pinia';
import type { SessionInfo, SessionData, ExtrapolatedClock, LapCount, SessionStatusSeriesEntry } from '@/types/dataTypes';
import SettingsDialog from './SettingsDialog.vue';

const emit = defineEmits(['add-widget', 'open-info-modal']);

const f1Store = useF1Store();

const countdownDisplay = ref<string>('--:--:--');
const intervalId = ref<number | null>(null); // setTimeout/setInterval return number in browser

// Use storeToRefs for reactive access
const { isConnected, raceData } = storeToRefs(f1Store);

const eventStore = useEventStore();
const { upcomingEvents } = storeToRefs(eventStore);

const settingsDialogVisible = ref(false);

const upcomingEventsMenu = ref<InstanceType<typeof Menu> | null>(null);
const upcomingMenuItems = ref<MenuItem[]>([]);

console.log(isConnected)
console.log(raceData)

const sessionType = computed<SessionInfo['Type'] | undefined>(() => raceData.value.SessionInfo?.Type);
const extrapolatedClock = computed<ExtrapolatedClock | null | undefined>(() => raceData.value.ExtrapolatedClock);

const socketStatusLabel = computed<string>(() => {
  return isConnected.value ? 'Connected' : 'Disconnected';
});

const eventName = computed<string>(() => {
  return raceData.value.SessionInfo?.Meeting?.Name || 'Loading Event...';
});

const latestSessionStatusInfo = computed<Partial<SessionStatusSeriesEntry>>(() => { 
  const statuses = raceData.value.SessionData?.StatusSeries?.filter((st) => st.SessionStatus) || [];
  return statuses.length > 0 ? statuses[statuses.length - 1] : { SessionStatus: "Unknown" };
});

const connect = () => {
  f1Store.initialize(); 
};

onMounted(() => {
  connect();
  fetchEvents();
});

const raceStatusLabel = computed<string>(() => {
  const statusInfo = latestSessionStatusInfo.value;
  const active = statusInfo?.SessionStatus; 
  const currentSessionType = sessionType.value;

  switch (active) {
      case "Started":
          if (currentSessionType === "Qualifying" || currentSessionType === "Practice") {
              return countdownDisplay.value;
          }
          const lapCountData = raceData.value.LapCount as LapCount;
          if (lapCountData?.CurrentLap && lapCountData?.TotalLaps) {
              return `Lap ${lapCountData.CurrentLap} / ${lapCountData.TotalLaps}`;
          }
          return "Race Ongoing";
      case "Finished":
      case "Ends":
      case "Finalized": 
          return "Finished";
      case "Inactive":
          return "Waiting";
      case "Aborted":
          return "Aborted";
      case "Unknown":
            return "Not yet Started";
      default:
          return active || "Status N/A"; 
  }
});

const raceStatusSeverity = computed<'success' | 'danger' | 'warn' | 'info' | 'primary'>(() => {
  const statusInfo = latestSessionStatusInfo.value;
  const active = statusInfo?.SessionStatus; 

  switch (active) {
      case "Started":
          return "success";
      case "Finished":
      case "Ends":
      case "Finalised": 
          return "danger";
      case "Aborted":
          return "warn";
      case "Inactive":
      case "Unknown": // Grouping Unknown with Inactive for severity
          return "info";
      default:
          return "primary";
  }
});

watch(upcomingEvents, (newEvents) => {
  if (newEvents && newEvents.length > 0) {
    upcomingMenuItems.value = newEvents
  } else {
    upcomingMenuItems.value = [{ label: 'No upcoming sessions', disabled: true }];
  }
}, { immediate: true, deep: true });


function timeStringToSeconds(timeStr: string | undefined): number {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const parts = timeStr.split(':');
  if (parts.length !== 3) return 0; // Expects HH:MM:SS
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseInt(parts[2], 10);
  if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return 0;
  return hours * 3600 + minutes * 60 + seconds;
}

function formatSecondsToTime(totalSeconds: number): string {
  if (totalSeconds < 0) totalSeconds = 0;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function stopCountdown() {
  if (intervalId.value !== null) {
    clearInterval(intervalId.value);
    intervalId.value = null;
  }
}

function runCountdownInterval(currentRemainingSeconds: number) {
  stopCountdown();

  if (currentRemainingSeconds <= 0) {
    countdownDisplay.value = '00:00:00';
    return;
  }
  countdownDisplay.value = formatSecondsToTime(currentRemainingSeconds);

  let internalSeconds = currentRemainingSeconds;
  intervalId.value = window.setInterval(() => { 
    internalSeconds--;
    if (internalSeconds >= 0) {
        countdownDisplay.value = formatSecondsToTime(internalSeconds);
    } else {
        countdownDisplay.value = '00:00:00';
        stopCountdown();
    }
  }, 1000);
}

const toggleUpcomingMenu = (event: Event) => {
  upcomingEventsMenu.value?.toggle(event);
};

const openSettingsDialog = () => {
  settingsDialogVisible.value = true;
};


watch(
[extrapolatedClock, latestSessionStatusInfo, sessionType],
([clockData, statusInfoNew, typeNew], [oldClockData, oldStatusInfo, oldType]) => {
  const status = statusInfoNew?.SessionStatus;
  if (
    status === 'Started' &&
    (typeNew === 'Qualifying' || typeNew === 'Practice') &&
    clockData?.Remaining &&
    clockData?.Utc
  ) {
    const initialRemainingSeconds = timeStringToSeconds(clockData.Remaining);
    const clockTimestamp = new Date(clockData.Utc);
    const nowTimestamp = new Date();

    if (isNaN(clockTimestamp.getTime())) {
        console.error("Invalid UTC timestamp from ExtrapolatedClock:", clockData.Utc);
        stopCountdown();
        countdownDisplay.value = "--:--:--";
        return;
    }

    const elapsedSecondsSinceClockUpdate = (nowTimestamp.getTime() - clockTimestamp.getTime()) / 1000;
    const currentRemainingSeconds = initialRemainingSeconds - elapsedSecondsSinceClockUpdate;

    runCountdownInterval(currentRemainingSeconds);

  } else {
    stopCountdown();
    if (status !== 'Started' || (typeNew !== 'Qualifying' && typeNew !== 'Practice')) {
        countdownDisplay.value = '--:--:--';
    } else if (status === 'Started' && (typeNew === 'Qualifying' || typeNew === 'Practice')) {
        countdownDisplay.value = 'Clock Syncing...'; 
    }
  }
},
{ immediate: true, deep: true } 
);

onUnmounted(() => {
  stopCountdown();
});
</script>

<style scoped>
.app-navbar {
  padding: 0.5rem 1rem;
  border-radius: 0;
}

.app-navbar .p-toolbar-center {
  flex-grow: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.center-content {
  display: flex;
  align-items: center;
  gap: 10px; /* Space between event name and status tag */
}

.navbar-brand {
  font-weight: bold;
  font-size: 1.2rem;
  display: inline-flex;
  align-items: center;
}

.pulse-disconnected {
  animation: pulse-red 1.5s infinite;
}

@keyframes pulse-red {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(255, 0, 0, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(255, 0, 0, 0);
  }
}

.app-navbar .p-button.p-button-sm {
  vertical-align: middle;
}
</style>

<style>
  .upcoming-sessions-menu {
    max-height: 350px;
    overflow-y: auto;
    width: 300px;
  }
</style>