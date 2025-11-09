import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { SettingsSchema } from '@/types/settingsSchema';
import { sanitize } from '@/utils/sanitize';

async function loadDefaultSettings() {
  try {
    const response = await fetch('/default.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (e) {
    console.error("Failed to load default settings:", e);
    return {
      websocketDelay: 0,
      gridFloat: true,
      pages: [{ id: 'default', name: 'Default' }],
      activePageId: 'default',
      layouts: { 'default': [] }
    };
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const websocketDelay = ref<number>(0);
  const gridFloat = ref<boolean>(true);
  const pages = ref<{ id: string; name: string }[]>([]);
  const activePageId = ref<string>('');
  const layouts = ref<Record<string, any[]>>({});
  const layoutVersion = ref(0);
  const replayTimeFactor = ref(1);

  const DASHBOARD_SETTINGS_KEY = 'dashboardSettings';

  async function initializeStore() {
    const savedSettings = localStorage.getItem(DASHBOARD_SETTINGS_KEY);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        websocketDelay.value = parsed.websocketDelay ?? 0;
        gridFloat.value = parsed.gridFloat ?? true;
        pages.value = parsed.pages ?? [];
        activePageId.value = parsed.activePageId ?? '';
        layouts.value = parsed.layouts ?? {};
        replayTimeFactor.value = parsed.replayTimeFactor ?? 1;
        
        if (!pages.value.length || !activePageId.value || !layouts.value[activePageId.value]) {
            const defaultSettings = await loadDefaultSettings();
            pages.value = defaultSettings.pages;
            activePageId.value = defaultSettings.activePageId;
            layouts.value = defaultSettings.layouts;
        }

      } catch (e) {
        console.error("Failed to parse settings from local storage, loading default settings.", e);
        const defaultSettings = await loadDefaultSettings();
        websocketDelay.value = defaultSettings.websocketDelay;
        gridFloat.value = defaultSettings.gridFloat;
        pages.value = defaultSettings.pages;
        activePageId.value = defaultSettings.activePageId;
        layouts.value = defaultSettings.layouts;
        replayTimeFactor.value = defaultSettings.replayTimeFactor ?? 1;
      }
    } else {
      const defaultSettings = await loadDefaultSettings();
      websocketDelay.value = defaultSettings.websocketDelay;
      gridFloat.value = defaultSettings.gridFloat;
      pages.value = defaultSettings.pages;
      activePageId.value = defaultSettings.activePageId;
      layouts.value = defaultSettings.layouts;
      replayTimeFactor.value = defaultSettings.replayTimeFactor ?? 1;
    }
  }

  watch([websocketDelay, gridFloat, pages, activePageId, layouts, replayTimeFactor], () => {
    const settings = {
      websocketDelay: websocketDelay.value,
      gridFloat: gridFloat.value,
      pages: pages.value,
      activePageId: activePageId.value,
      layouts: layouts.value,
      layoutVersion: layoutVersion.value,
      replayTimeFactor: replayTimeFactor.value
    };
    localStorage.setItem(DASHBOARD_SETTINGS_KEY, JSON.stringify(settings));
  }, { deep: true });

  function addPage(name: string) {
    const newId = `page-${Date.now()}`;
    pages.value.push({ id: newId, name: sanitize(name) });
    layouts.value[newId] = [];
    activePageId.value = newId;
  }

  function removePage(pageId: string) {
    const index = pages.value.findIndex(p => p.id === pageId);
    if (index > -1) {
      pages.value.splice(index, 1);
      delete layouts.value[pageId];
      if (activePageId.value === pageId) {
        activePageId.value = pages.value[0]?.id || 'default';
      }
    }
  }

  function renamePage(pageId: string, newName: string) {
    const page = pages.value.find(p => p.id === pageId);
    if (page) {
      page.name = sanitize(newName);
    }
  }

  function setActivePageId(pageId: string) {
    activePageId.value = pageId;
  }

  function updateLayout(layout: any[]) {
    layouts.value[activePageId.value] = layout;
  }

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

  function setReplayTimeFactor(factor: number) {
    if (factor >= 0.5 && factor <= 5) {
        replayTimeFactor.value = factor;
    }
  }

  function exportSettings() {
    return {
      websocketDelay: websocketDelay.value,
      gridFloat: gridFloat.value,
      pages: pages.value,
      activePageId: activePageId.value,
      layouts: layouts.value,
    };
  }

  async function importSettings(settings: any, merge: boolean) {
    const validatedSettings = SettingsSchema.parse(settings);

    if (merge) {
      // Merge pages
      const existingPageNames = new Set(pages.value.map(p => p.name));
      if (validatedSettings.pages) {
        for (const newPage of validatedSettings.pages) {
          const sanitizedName = sanitize(newPage.name);
          if (!existingPageNames.has(sanitizedName)) {
            pages.value.push({ ...newPage, name: sanitizedName });
            if (validatedSettings.layouts) {
              layouts.value[newPage.id] = validatedSettings.layouts[newPage.id];
            }
          }
        }
      }
    } else {
      // Replace settings
      const defaultSettings = await loadDefaultSettings();
      websocketDelay.value = validatedSettings.websocketDelay ?? defaultSettings.websocketDelay;
      gridFloat.value = validatedSettings.gridFloat ?? defaultSettings.gridFloat;
      pages.value = validatedSettings.pages?.map(p => ({...p, name: sanitize(p.name)})) ?? defaultSettings.pages;
      layouts.value = validatedSettings.layouts ?? defaultSettings.layouts;
      activePageId.value = validatedSettings.pages?.[0]?.id || defaultSettings.activePageId;
      layoutVersion.value++;
    }
  }

  async function resetSettings() {
    const defaultSettings = await loadDefaultSettings();
    websocketDelay.value = defaultSettings.websocketDelay;
    gridFloat.value = defaultSettings.gridFloat;
    pages.value = defaultSettings.pages;
    activePageId.value = defaultSettings.activePageId;
    layouts.value = defaultSettings.layouts;
    replayTimeFactor.value = defaultSettings.replayTimeFactor ?? 1;
    layoutVersion.value++;
  }

  return {
    websocketDelay,
    gridFloat,
    pages,
    activePageId,
    layouts,
    replayTimeFactor,
    setWebsocketDelay,
    setGridFloat,
    setReplayTimeFactor,
    addPage,
    removePage,
    renamePage,
    setActivePageId,
    updateLayout,
    exportSettings,
    importSettings,
    resetSettings,
    layoutVersion,
    initializeStore
  };
});