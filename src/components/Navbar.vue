<template>
  <Toolbar class="app-navbar">
    <template #start>
      <span class="navbar-brand" @click="handleLogoClick">Pitwall.me</span>
      <Button
        id="upcoming-sessions-button"
        icon="pi pi-calendar"
        label="Upcoming Sessions"
        @click="goToSchedulePage"
        class="p-button-sm p-button-text p-button-secondary"
        style="margin-left: 10px;"
      />
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
        id="replay-button"
        icon="pi pi-replay"
        label="Replay"
        @click="openReplayDialog"
        class="p-button-sm p-button-text p-button-primary"
        :class="{ 'replay-active': isReplaying }"
        style="margin-left: 10px;"
        v-if="showDashboardButtons"
        :disabled="isSessionActive && !isReplaying"
      />
      <Menu ref="pageMenu" id="page-menu" :model="pageMenuItems" :popup="true" />
      <Button
        id="kofi-button"
        icon="pi pi-dollar"
        iconPos="right"
        @click="openLink('https://ko-fi.com/kikkia')"
        class="p-button-sm p-button-text p-button-primary"
        style="margin-right: 10px;"
        v-if="!showDashboardButtons"
      />
      <Button
        id="github-button"
        icon="pi pi-github"
        iconPos="right"
        @click="openLink('https://github.com/kikkia/pitwall.me')"
        class="p-button-sm p-button-text p-button-primary"
        style="margin-right: 10px;"
        v-if="!showDashboardButtons"
      />
      <Button
        id="page-selector-button"
        :label="activePageName"
        icon="pi pi-chevron-down"
        iconPos="right"
        @click="togglePageMenu"
        class="p-button-sm p-button-text p-button-primary"
        style="margin-right: 10px;"
        aria-haspopup="true"
        aria-controls="page-menu"
        v-if="showDashboardButtons"
      />
      <Button
        id="edit-mode-button"
        :icon="editMode ? 'pi pi-lock-open' : 'pi pi-lock'"
        :severity="editMode ? 'success' : 'danger'"
        @click="emit('toggle-edit-mode')"
        class="p-button-sm p-button-text p-button-primary"
        style="margin-right: 10px;"
        v-if="showDashboardButtons"
      />
      <Button
        id="add-widget-button"
        icon="pi pi-plus"
        label="Add Widget"
        @click="emit('add-widget')"
        class="p-button-sm p-button-text p-button-primary"
        style="margin-right: 10px;"
        v-if="showDashboardButtons"
      />
      <Button
        id="settings-button"
        icon="pi pi-cog"
        label="Settings"
        @click="openSettingsDialog"
        class="p-button-sm p-button-text p-button-primary"
        style="margin-right: 10px;"
      />
      <i
        id="connection-status-icon"
        :class="['pi', isConnected ? 'pi-sort-alt' : 'pi-sort-alt-slash', { 'pulse-disconnected': !isConnected }]"
        :style="{ color: isConnected ? 'green' : 'red' }"
        :title="socketStatusLabel"
      ></i>
    </template>
  </Toolbar>

  <SettingsDialog :visible="settingsDialogVisible" @update:visible="settingsDialogVisible = $event" />
  <ReplayDialog :visible="replayDialogVisible" @update:visible="replayDialogVisible = $event" />
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import Button from 'primevue/button';
import Toolbar from 'primevue/toolbar';
import Tag from 'primevue/tag';
import Menu from 'primevue/menu';
import { useF1Store } from '@/stores/f1Store';
import { useEventStore } from '@/stores/eventStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUiStore } from '@/stores/uiStore';
import { fetchEvents } from '@/services/eventService';
import { isReplaying } from '@/services/replayService';
import { storeToRefs } from 'pinia';
import type { SessionInfo, SessionData, ExtrapolatedClock, LapCount, SessionStatusSeriesEntry } from '@/types/dataTypes';
import SettingsDialog from './SettingsDialog.vue';
import ReplayDialog from './ReplayDialog.vue';

const props = defineProps({
  showDashboardButtons: {
    type: Boolean,
    default: true
  },
  editMode: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['add-widget', 'open-info-modal', 'toggle-edit-mode']);

const router = useRouter();
const route = useRoute();
const f1Store = useF1Store();
const settingsStore = useSettingsStore();
const uiStore = useUiStore();

const { pages, activePageId, replayTimeFactor } = storeToRefs(settingsStore);

const pageMenu = ref<any>(null);
const togglePageMenu = (event: Event) => {
  pageMenu.value.toggle(event);
};

const activePageName = computed(() => {
  const activePage = pages.value.find(p => p.id === activePageId.value);
  return activePage ? activePage.name : 'Pages';
});

const pageMenuItems = computed(() =>
  pages.value.map((page) => ({
    label: page.name,
    command: () => {
      if (page.id !== activePageId.value) {
        settingsStore.setActivePageId(page.id);
      }
    },
  }))
);

watch(activePageId, (newId) => {
  if (newId) {
    settingsStore.setActivePageId(newId);
  }
});

const countdownDisplay = ref<string>('--:--:--');
const intervalId = ref<number | null>(null); // setTimeout/setInterval return number in browser
const countdownInternalSeconds = ref(0);

// Use storeToRefs for reactive access
const { isConnected, raceData } = storeToRefs(f1Store);

const eventStore = useEventStore();

const settingsDialogVisible = ref(false);
const replayDialogVisible = ref(false);

console.log(isConnected)
console.log(raceData)

const sessionType = computed<SessionInfo['Type'] | undefined>(() => raceData.value.SessionInfo?.Type);
const extrapolatedClock = computed<ExtrapolatedClock | null | undefined>(() => raceData.value.ExtrapolatedClock);

const socketStatusLabel = computed<string>(() => {
  return isConnected.value ? 'Connected' : 'Disconnected';
});

const eventName = computed<string>(() => {
  let name = raceData.value.SessionInfo?.Meeting?.Name || 'Loading Event...'
  if (isReplaying.value) {
    name = "(Replay) " + name
  }
  return name;
});

const latestSessionStatusInfo = computed<Partial<SessionStatusSeriesEntry>>(() => { 
  const statuses = raceData.value.SessionData?.StatusSeries?.filter((st) => st.SessionStatus) || [];
  return statuses.length > 0 ? statuses[statuses.length - 1] : { SessionStatus: "Unknown" };
});

const isSessionActive = computed(() => {
  const status = latestSessionStatusInfo.value?.SessionStatus;
  return status === 'Started' || status === 'Aborted';
});

const connect = () => {
  f1Store.initialize(); 
};

const openLink = (url: string) => {
  window.open(url, '_blank');
};

const handleLogoClick = () => {
  if (route.path === '/') {
    emit('open-info-modal');
  } else {
    router.push('/');
  }
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
    countdownInternalSeconds.value = 0;
    return;
  }
  countdownInternalSeconds.value = currentRemainingSeconds;
  countdownDisplay.value = formatSecondsToTime(countdownInternalSeconds.value);

  intervalId.value = window.setInterval(() => {
    countdownInternalSeconds.value--;
    if (countdownInternalSeconds.value >= 0) {
        countdownDisplay.value = formatSecondsToTime(countdownInternalSeconds.value);
    } else {
        countdownDisplay.value = '00:00:00';
        stopCountdown();
    }
  }, 1000 / (isReplaying.value ? settingsStore.replayTimeFactor : 1));
}

const goToSchedulePage = () => {
  router.push('/schedule');
};

const openSettingsDialog = () => {
  settingsDialogVisible.value = true;
};

const openReplayDialog = () => {
  replayDialogVisible.value = true;
};


watch(
[extrapolatedClock, latestSessionStatusInfo, sessionType],
([clockData, statusInfoNew, typeNew]) => {
  const status = statusInfoNew?.SessionStatus;
  if (
    status === 'Started' &&
    (typeNew === 'Qualifying' || typeNew === 'Practice') &&
    clockData?.Remaining &&
    clockData?.Utc
  ) {
    if (isReplaying.value && intervalId.value !== null) {
      return;
    }
    const initialRemainingSeconds = timeStringToSeconds(clockData.Remaining);
    const clockTimestamp = new Date(clockData.Utc);
    const nowTimestamp = new Date();

    console.log("recived clock: " + clockTimestamp.toISOString())

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

watch(replayTimeFactor, () => {
    if (isReplaying.value && intervalId.value !== null) {
        runCountdownInterval(countdownInternalSeconds.value);
    }
});

onUnmounted(() => {
  stopCountdown();
});
</script>

<style scoped>
.app-navbar {
  position: relative;
  z-index: 2;
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
  gap: 10px;
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

.replay-active {
  animation: pulse-green 1.5s infinite;
}

@keyframes pulse-green {
  0% {
    box-shadow: 0 0 0 0 rgba(0, 255, 123, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(0, 255, 123, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(0, 255, 123, 0);
  }
}
</style>

