<template>
  <Menubar class="app-navbar">
    <template #start>
      <span class="navbar-brand">Pitwall.me</span>
    </template>

    <template #end>
      <Tag
        :severity="statusSeverity"
        :value="statusLabel"
        class="connection-status-tag"
        />
        <!-- <i :class="['pi', isConnected ? 'pi-check-circle' : 'pi-times-circle', 'ml-2']"></i> -->
    </template>
  </Menubar>
</template>

<script setup>
import { computed } from 'vue';
import Menubar from 'primevue/menubar'; 
import Tag from 'primevue/tag';      
import { useF1Store } from '@/stores/f1Store';

const f1Store = useF1Store();

const isConnected = computed(() => f1Store.state.isConnected);

const statusSeverity = computed(() => {
  return isConnected.value ? 'success' : 'danger';
});

const statusLabel = computed(() => {
  return isConnected.value ? 'Connected' : 'Disconnected';
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
}

.connection-status-tag {
  vertical-align: middle;
}

:deep(.p-menubar-start) {
     margin-right: auto; 
}
:deep(.p-menubar-end) {
    margin-left: auto;
}

</style>