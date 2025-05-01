<template>
    <Toolbar class="app-navbar">
      <template #start>
        <span class="navbar-brand">Pitwall.me</span>
      </template>
  
      <template #center>
        <span class="navbar-brand">{{ eventName }}</span>
        <Tag
          :severity="raceStatusSeverity"
          :value="raceStatusLabel"
          class="connection-status-tag"
        />
      </template>
  
      <template #end>
        <p>Datasource: </p>
        <Tag
          :severity="socketStatusSeverity"
          :value="socketStatusLabel"
          class="connection-status-tag"
        />
        <!-- <i :class="['pi', isConnected ? 'pi-check-circle' : 'pi-times-circle', 'ml-2']"></i> -->
      </template>
    </Toolbar>
  </template>
  
<script setup>
  import { computed, onMounted, ref, watch, onUnmounted } from 'vue';
  import Toolbar from 'primevue/toolbar';
  import Tag from 'primevue/tag';
  import { useF1Store } from '@/stores/f1Store';
  
  const f1Store = useF1Store();

  const countdownDisplay = ref('--:--:--'); 
  const intervalId = ref(null);
  const targetEndTimeMs = ref(null);

  const isConnected = computed(() => f1Store.state.isConnected);
  const sessionType = computed(() => f1Store.state.raceData?.SessionInfo?.Type); 
  const sessionData = computed(() => f1Store.state.raceData?.SessionData); 
  const extrapolatedClock = computed(() => f1Store.state.raceData?.ExtrapolatedClock);

  const socketStatusSeverity = computed(() => {
    return isConnected.value ? 'success' : 'danger';
  });
  
  const socketStatusLabel = computed(() => {
    return isConnected.value ? 'Connected' : 'Disconnected';
  });
  
  const eventName = computed(() => {
      return f1Store.state.raceData?.SessionInfo?.Meeting?.Name || 'Loading Event...';
  })

  const latestSessionStatusInfo = computed(() => {
    const statuses = f1Store.state.raceData?.SessionData?.StatusSeries?.filter((st) => st.SessionStatus) || [];
    return statuses.length > 0 ? statuses[statuses.length - 1] : { SessionStatus: "Unknown" };
  })

  const connect = () => {
    f1Store.initialize();
  };

  onMounted(() => {
    connect();
  });

  const raceStatusLabel = computed(() => {
    const statusInfo = latestSessionStatusInfo.value;
    const active = statusInfo.SessionStatus;
    const currentSessionType = sessionType.value;

    switch (active) {
        case "Started":
            if (currentSessionType === "Qualifying" || currentSessionType === "Practice") {
                return countdownDisplay.value;
            }
            const lapCountData = f1Store.state.raceData?.LapCount;
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
            return active;
    }
})

  const raceStatusSeverity = computed(() => {
    const statuses = f1Store.state.raceData?.SessionData?.StatusSeries.filter((st) => st.SessionStatus);
    if (statuses.length == 0) {
        return "info"
    }
    let active = statuses[statuses.length - 1].SessionStatus
    switch (active) {
        case "Started":
            return "success"
        case "Finished":
        case "Ends":
        case "Finalized":
            return "danger"
        case "Aborted":
            return "warn"
        case "Inactive":
            return "info"
        default: 
            return "primary"
    }
  })
  
  function timeStringToSeconds(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const parts = timeStr.split(':');
    if (parts.length !== 3) return 0;
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseInt(parts[2], 10);
    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return 0;
    return hours * 3600 + minutes * 60 + seconds;
  }

  function formatSecondsToTime(totalSeconds) {
    if (totalSeconds < 0) totalSeconds = 0;
    // floor to make sure we don't go negative
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60); 
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  function stopCountdown() {
    if (intervalId.value) {
      clearInterval(intervalId.value);
      intervalId.value = null;
    }
  }

  function runCountdownInterval(currentRemainingSeconds) {
    stopCountdown(); 

    if (currentRemainingSeconds <= 0) {
        countdownDisplay.value = '00:00:00';
        return;
    }
    countdownDisplay.value = formatSecondsToTime(currentRemainingSeconds);

    let internalSeconds = currentRemainingSeconds; 
    intervalId.value = setInterval(() => {
        internalSeconds--;
        if (internalSeconds >= 0) {
            countdownDisplay.value = formatSecondsToTime(internalSeconds);
        } else {
            countdownDisplay.value = '00:00:00';
            stopCountdown(); 
        }
    }, 1000);
  }

  watch([extrapolatedClock, latestSessionStatusInfo, sessionType], ([clockData, statusInfo, type], [oldClockData, oldStatusInfo, oldType]) => {
    const status = statusInfo?.SessionStatus;
    if (
      status === 'Started' &&
      (type === 'Qualifying' || type === 'Practice') &&
      clockData?.Remaining &&
      clockData?.Utc
    ) {
      // Calculate accurate remaining time
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
      if (status !== 'Started' || (type !== 'Qualifying' && type !== 'Practice')) {
          countdownDisplay.value = '--:--:--';
      } else if (status === 'Started' && (type === 'Qualifying' || type === 'Practice')) {
          countdownDisplay.value = 'Waiting...';
      }
    }
  }, { immediate: true });

  onUnmounted(() => {
    stopCountdown();
  });
  </script>
  
  <style scoped>
  .app-navbar {
    padding: 0.5rem 1rem;
    border-radius: 0;
  }
  
  .navbar-brand {
    font-weight: bold;
    font-size: 1.2rem;
    display: inline-flex;
    align-items: center;
  }
  
  .connection-status-tag {
    vertical-align: middle;
    margin-left: 5px;
  }

  </style>