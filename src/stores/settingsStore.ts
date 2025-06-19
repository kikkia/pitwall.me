import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useSettingsStore = defineStore('settings', () => {
  const websocketDelay = ref<number>(0); // Default delay in seconds

  function setWebsocketDelay(delay: number) {
    if (delay >= 0) {
      websocketDelay.value = delay;
      console.log(`Settings: WebSocket delay set to ${delay}s`);
    } else {
      console.warn("Settings: WebSocket delay cannot be negative. Setting to 0.");
      websocketDelay.value = 0;
    }
  }

  return {
    websocketDelay,
    setWebsocketDelay,
  };
});