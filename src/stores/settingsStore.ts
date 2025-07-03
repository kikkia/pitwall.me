import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export const useSettingsStore = defineStore('settings', () => {
  const websocketDelay = ref<number>(0);
  const gridFloat = ref<boolean>(true); 

  const SETTINGS_KEY = 'globalSettings';

  const savedSettings = localStorage.getItem(SETTINGS_KEY);
  if (savedSettings) {
    try {
      const parsed = JSON.parse(savedSettings);
      websocketDelay.value = parsed.websocketDelay ?? 0;
      gridFloat.value = parsed.gridFloat ?? true;
    } catch (e) {
      console.error("Failed to parse settings from local storage", e);
    }
  }

  watch([websocketDelay, gridFloat], () => {
    const settings = {
      websocketDelay: websocketDelay.value,
      gridFloat: gridFloat.value,
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, { deep: true });

  function setWebsocketDelay(delay: number) {
    if (delay >= 0) {
      websocketDelay.value = delay;
      console.log(`Settings: WebSocket delay set to ${delay}s`);
    } else {
      console.warn("Settings: WebSocket delay cannot be negative. Setting to 0.");
      websocketDelay.value = 0;
    }
  }

  function setGridFloat(float: boolean) {
    gridFloat.value = float;
  }

  return {
    websocketDelay,
    gridFloat,
    setWebsocketDelay,
    setGridFloat,
  };
});