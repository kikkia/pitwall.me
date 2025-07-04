import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { defaultWidgetConfigs } from '@/widgetRegistry';

const defaultLayout = [
    {
        id: 'timing-1',
        componentName: 'TimingTable',
        x: 0, y: 0, w: 24, h: 30,
        config: {...defaultWidgetConfigs.TimingTable},
    },
    {
        id: 'rcm-1',
        componentName: 'RaceControlMessages',
        x: 24, y: 0, w: 32, h: 20,
        config: {...defaultWidgetConfigs.RaceControlMessages},
    },
    {
        id: 'track-status-1',
        componentName: 'TrackStatusLED',
        x: 56, y: 0, w: 8, h: 4,
        config: {...defaultWidgetConfigs.TrackStatusLED},
    },
    {
        id: 'sector-timing',
        componentName: 'SectorTiming',
        x: 0, y: 30, w:38, h:30,
        config: {...defaultWidgetConfigs.SectorTiming},
    },
    {
        id: 'lap-history-1',
        componentName: 'LapHistory',
        x: 65, y: 0, w: 21, h: 25,
        config: {...defaultWidgetConfigs.LapHistory},
    }
];

export const useSettingsStore = defineStore('settings', () => {
  const websocketDelay = ref<number>(0);
  const gridFloat = ref<boolean>(true);
  const pages = ref<{ id: string; name: string }[]>([{ id: 'default', name: 'Default' }]);
  const activePageId = ref<string>('default');
  const layouts = ref<Record<string, any[]>>({ 'default': defaultLayout });

  const DASHBOARD_SETTINGS_KEY = 'dashboardSettings';

  const savedSettings = localStorage.getItem(DASHBOARD_SETTINGS_KEY);
  if (savedSettings) {
    try {
      const parsed = JSON.parse(savedSettings);
      websocketDelay.value = parsed.websocketDelay ?? 0;
      gridFloat.value = parsed.gridFloat ?? true;
      if (parsed.pages) pages.value = parsed.pages;
      if (parsed.activePageId) activePageId.value = parsed.activePageId;
      if (parsed.layouts) {
          layouts.value = parsed.layouts
      }
      // Ensure default page has a layout
      if (!layouts.value.default) {
        layouts.value.default = defaultLayout;
      }
    } catch (e) {
      console.error("Failed to parse settings from local storage", e);
    }
  }

  watch([websocketDelay, gridFloat, pages, activePageId, layouts], () => {
    const settings = {
      websocketDelay: websocketDelay.value,
      gridFloat: gridFloat.value,
      pages: pages.value,
      activePageId: activePageId.value,
      layouts: layouts.value
    };
    localStorage.setItem(DASHBOARD_SETTINGS_KEY, JSON.stringify(settings));
  }, { deep: true });

  function addPage(name: string) {
    const newId = `page-${Date.now()}`;
    pages.value.push({ id: newId, name });
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
      page.name = newName;
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

  return {
    websocketDelay,
    gridFloat,
    pages,
    activePageId,
    layouts,
    setWebsocketDelay,
    setGridFloat,
    addPage,
    removePage,
    renamePage,
    setActivePageId,
    updateLayout
  };
});