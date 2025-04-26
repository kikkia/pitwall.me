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
  import { computed } from 'vue';
  import Toolbar from 'primevue/toolbar';
  import Tag from 'primevue/tag';
  import { useF1Store } from '@/stores/f1Store';
  
  const f1Store = useF1Store();
  
  const isConnected = computed(() => f1Store.state.isConnected);
  
  const socketStatusSeverity = computed(() => {
    return isConnected.value ? 'success' : 'danger';
  });
  
  const socketStatusLabel = computed(() => {
    return isConnected.value ? 'Connected' : 'Disconnected';
  });
  
  const eventName = computed(() => {
      return f1Store.state.raceData?.SessionInfo?.Meeting?.Name || 'Loading Event...';
  })

  const raceStatusLabel = computed(() => {
    const statuses = f1Store.state.raceData?.SessionData?.StatusSeries.filter((st) => st.SessionStatus);
    if (statuses.length == 0) {
        return "Not yet Started"
    }
    let active = statuses[statuses.length - 1].SessionStatus
    switch (active) {
        case "Started":
            return "Ongoing"
        case "Finished":
        case "Ends":
        case "Finalized":
            return "Finished"
        default:
            return active
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