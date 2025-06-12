<template>
  <div id="app-container">
    <Navbar />
    <DashboardGrid ref="dashboardGridRef" class="dashboard-container" @grid-updated="handleGridUpdated" :initial-widgets="activeWidgets">
      <div
        v-for="widget in activeWidgets"
        :key="widget.id"
        class="grid-stack-item"
        :gs-x="widget.x"
        :gs-y="widget.y"
        :gs-w="widget.w"
        :gs-h="widget.h"
        :gs-id="widget.id"
        :ref="el => setGridItemRef(widget.id, el)"
      >
        <WidgetContainer
          :widget-id="widget.id"
          @remove="removeWidget"
          @open-settings="openWidgetSettings"
        >
          <component
            :is="widgetComponentMap[widget.componentName].value"
            :ref="el => setWidgetInstanceRef(widget.id, el)"
            v-bind="widget.config"
           />
        </WidgetContainer>
      </div>
    </DashboardGrid>

    <WidgetSettingsDialog
      v-model:visible="isSettingsDialogOpen"
      :widget-id="settingsTargetWidgetId"
      :settings-definition="currentSettingsDefinition"
      :widget-config="currentWidgetConfig"
      @hide="onSettingsDialogHide"
    />

  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, computed, watch} from 'vue';
import Navbar from './components/Navbar.vue';
import DashboardGrid from './components/DashboardGrid.vue';
import WidgetContainer from './components/WidgetContainer.vue';
import WidgetSettingsDialog from './components/WidgetSettingsDialog.vue';
import { widgetComponentMap, defaultWidgetConfigs } from './widgetRegistry';

const dashboardGridRef = ref(null);
const gridItemRefs = ref({});
const widgetInstanceRefs = ref({});

const widgetRefs = ref({}); 
const setWidgetRef = (id, el) => {
  if (el) {
    widgetRefs.value[id] = el;
  } else {
    delete widgetRefs.value[id];
  }
};

const activeWidgets = ref([]);

const defaultWidgets = [
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
    x: 56, y: 0, w: 8, h: 4 ,
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

const isSettingsDialogOpen = ref(false);
const settingsTargetWidgetId = ref(null);

const settingsTargetWidget = computed(() => {
    if (!settingsTargetWidgetId.value) return null;
    return activeWidgets.value.find(w => w.id === settingsTargetWidgetId.value);
});

const currentWidgetInstance = computed(() => {
    if (!settingsTargetWidgetId.value) return null;
    return widgetInstanceRefs.value[settingsTargetWidgetId.value];
});

const currentSettingsDefinition = computed(() => {
    if (currentWidgetInstance.value?.settingsDefinition) {
        return currentWidgetInstance.value.settingsDefinition;
    }
    return null;
});

const currentWidgetConfig = computed(() => {
    return settingsTargetWidget.value?.config || null;
});


const setGridItemRef = (id, el) => {
  if (el) {
    gridItemRefs.value[id] = el;
  } else {
    if (gridItemRefs.value[id]) {
       delete gridItemRefs.value[id];
    }
  }
};

const setWidgetInstanceRef = (id, el) => {
  if (el) {
    widgetInstanceRefs.value[id] = el;
  } else {
     if (widgetInstanceRefs.value[id]) {
        delete widgetInstanceRefs.value[id];
     }
  }
};

// --- Widget Actions ---
const removeWidget = async (widgetIdToRemove) => {
  const widgetIndex = activeWidgets.value.findIndex(w => w.id === widgetIdToRemove);

  if (widgetIndex !== -1) {
    const grid = dashboardGridRef.value?.getGridInstance();
    // Use gridItemRefs which refs the actual grid-stack-item element
    const widgetElement = gridItemRefs.value[widgetIdToRemove];
    if (grid && widgetElement) {
       grid.removeWidget(widgetElement, false); // false = don't remove DOM node, Vue will do that
    } else {
         console.warn(`App.vue: Could not find Gridstack instance or DOM element ref for widget ID: ${widgetIdToRemove} during removal.`);
    }

    activeWidgets.value.splice(widgetIndex, 1);

    delete gridItemRefs.value[widgetIdToRemove];
    delete widgetInstanceRefs.value[widgetIdToRemove];
    delete widgetRefs.value[widgetIdToRemove];

  } else {
    console.warn(`App.vue: Widget with ID ${widgetIdToRemove} not found.`);
  }
};


const openWidgetSettings = (widgetId) => {
  const targetWidget = activeWidgets.value.find(w => w.id === widgetId);
  const widgetInstance = widgetInstanceRefs.value[widgetId];

  if (!targetWidget || !widgetInstance) {
      console.error(`Cannot open settings: Widget data or instance not found for ID ${widgetId}`);
      return;
  }

  let settingsDef = widgetInstance.settingsDefinition;

  if (settingsDef && settingsDef.length > 0) {
     settingsTargetWidgetId.value = widgetId;
     isSettingsDialogOpen.value = true;
     console.log(`Opening settings for ${widgetId} with definition:`, settingsDef);
  } else {
      console.warn(`Widget ${widgetId} does not expose any settings.`);
      alert(`Widget '${widgetId}' has no configurable settings.`);
  }
};

// called when the dialog component emits 'hide'
const onSettingsDialogHide = () => {
    settingsTargetWidgetId.value = null;
    saveLayoutToLocalStorage();
}

const saveLayoutToLocalStorage = () => {
  if (activeWidgets.value.length < 1) {
    return
  }
  const serializedWidgets = activeWidgets.value.map(widget => ({
    id: widget.id,
    componentName: widget.componentName, 
    x: widget.x,
    y: widget.y,
    w: widget.w,
    h: widget.h,
    config: widget.config
  }));
  localStorage.setItem('dashboardLayout', JSON.stringify(serializedWidgets));
  console.log('Dashboard layout saved to local storage.');
};

const loadLayoutFromLocalStorage = () => {
  const savedLayout = localStorage.getItem('dashboardLayout');
  if (savedLayout) {
    try {
      const parsedLayout = JSON.parse(savedLayout);
      activeWidgets.value = parsedLayout.map(savedWidget => {
        if (!widgetComponentMap[savedWidget.componentName]) {
          console.warn(`Unknown component: ${savedWidget.componentName}. Skipping.`);
          return null;
        }
        console.log(widgetComponentMap[savedWidget.componentName])
        return {
          ...savedWidget,
        };
      }).filter(Boolean);
      console.log('Dashboard layout loaded from local storage.');
    } catch (e) {
      console.error('Failed to parse dashboard layout from local storage:', e);
      activeWidgets.value = defaultWidgets;
    }
  } else {
    activeWidgets.value = defaultWidgets;
    console.log('No saved layout found, using default widgets.');
  }
};

// Load layout on mount
onMounted(() => {
  loadLayoutFromLocalStorage();
});

// Watch for changes in activeWidgets (including config changes) and save
watch(activeWidgets, () => {
  saveLayoutToLocalStorage();
}, { deep: true });

// Handle grid-updated event from DashboardGrid
const handleGridUpdated = (updatedItems) => {
  updatedItems.forEach(updatedItem => {
    const widget = activeWidgets.value.find(w => w.id === updatedItem.id);
    if (widget) {
      widget.x = updatedItem.x;
      widget.y = updatedItem.y;
      widget.w = updatedItem.w;
      widget.h = updatedItem.h;
    }
  });
  saveLayoutToLocalStorage();
};

</script>

<style>

*, *::before, *::after {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
  font-family: sans-serif; 
}

#app-container {
  display:flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden; 
}

#app-container > h1 {
  flex-shrink: 0; 
  margin: 10px 20px;
}

.dashboard-container {
  flex-grow: 1; 
  margin: 0 20px 0 0;
  overflow: auto;
  min-width: 0; 
}

.grid-stack-item {
   overflow: visible !important;
}

.grid-stack-item-content {
  background-color: #f8f9fa; 
  border: 1px solid #dee2e6;
  border-radius: 4px;
  overflow: auto !important; 
  color: #212529;
  display: flex; 
  flex-direction: column; 
}

.widget-wrapper {
  padding: 10px;
  flex-grow: 1; 
  display: flex;
  flex-direction: column;
  overflow: auto; 
}

.widget-wrapper h2 {
    margin-top: 0;
    margin-bottom: 10px;
    font-size: 1.1rem;
    border-bottom: 1px solid #ccc;
    padding-bottom: 5px;
}

.p-button {
    margin-right: 5px;
}

.settings-panel {
    display: flex;
    flex-direction: column;
    gap: 1.5rem; 
}

.setting-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.p-field-checkbox {
    display: flex;
    align-items: center;
    gap: 0.5rem; 
}
.p-field-checkbox label {
    margin-bottom: 0; 
}

.slider-field label {
    display: block; 
    margin-bottom: 0.75rem;
    font-weight: bold;
    font-size: 0.9em;
}

.multi-field label {
    display: block; 
    margin-bottom: 0.75rem;
    font-weight: bold;
    font-size: 0.9em;
}
</style>