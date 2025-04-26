<template>
  <div>
    <h2>F1 Data Status</h2>
    <Button v-if="isConnected" label="Connected" severity="success" />
    <Button v-if= "!isConnected" label="Disconnected" severity="danger" />
    <p>Status: {{ connectionStatus }}</p>
    
    <button @click="connect" :disabled="isConnected">Connect</button>
    <button @click="disconnect" :disabled="!isConnected">Disconnect</button>

    <div v-if="lastMessageForDebug">
      <h3>Last Raw Message (Debug):</h3>
      <pre>{{ lastMessageForDebug }}</pre>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue';
import { useF1Store } from '@/stores/f1Store';
import Button from "primevue/button"

const f1Store = useF1Store();

const isConnected = computed(() => f1Store.state.isConnected);
const lastMessageForDebug = computed(() => f1Store.state.lastRawMessage);

const connectionStatus = computed(() => isConnected.value ? 'Connected' : 'Disconnected');

const connect = () => {
  f1Store.initialize();
};

const disconnect = () => {
  f1Store.terminate();
};

onMounted(() => {
  connect();
});

onUnmounted(() => {
});
</script>

<style scoped>
pre {
  background-color: #f0f0f0; 
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  white-space: pre-wrap;
  max-height: 200px;
  min-height: 200px;
  overflow-y: auto;
  max-width: 800px;
  min-width: 800px;
}
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>