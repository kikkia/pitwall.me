<template>
  <div id="app-container">
    <Navbar />
    <DashboardGrid ref="dashboardGridRef" class="dashboard-container">
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
            :is="widget.component"
            :ref="el => setWidgetInstanceRef(widget.id, el)"
            v-bind="widget.config"
           />
        </WidgetContainer>
      </div>
    </DashboardGrid>

    <!-- PrimeVue Dialog for Settings -->
    <Dialog
      v-model:visible="isSettingsDialogOpen"
      modal
      :header="`Settings for Widget: ${settingsTargetWidget?.id}`"
      :style="{ width: '350px' }"
      @hide="onSettingsDialogHide"
    >
        <div v-if="currentSettingsDefinition && currentWidgetConfig" class="settings-panel">
            <div v-for="setting in currentSettingsDefinition" :key="setting.id" class="setting-item">

                <!-- Checkbox for Boolean -->
                <div v-if="setting.component === 'Checkbox'" class="p-field-checkbox">
                    <Checkbox
                        :inputId="`${settingsTargetWidget.id}-${setting.id}`"
                        v-model="currentWidgetConfig[setting.id]"
                        :binary="true"
                    />
                    <label :for="`${settingsTargetWidget.id}-${setting.id}`">{{ setting.label }}</label>
                </div>

                <!-- Slider for Number -->
                <div v-if="setting.component === 'Slider'" class="p-field slider-field">
                    <label :for="`${settingsTargetWidget.id}-${setting.id}`">{{ setting.label }}: {{ currentWidgetConfig[setting.id] }}</label>
                    <Slider
                        :id="`${settingsTargetWidget.id}-${setting.id}`"
                        v-model="currentWidgetConfig[setting.id]"
                        v-bind="setting.props || {}" 
                    />
                </div>


            </div>
        </div>
        <div v-else>
            Loading settings or settings not available...
        </div>

        <template #footer>
            <Button label="Close" icon="pi pi-times" @click="isSettingsDialogOpen = false" class="p-button-text"/>
        </template>
    </Dialog>

  </div>
</template>

<script setup>
import { ref, shallowRef, nextTick, onMounted, defineAsyncComponent, computed} from 'vue';
import Navbar from './components/Navbar.vue';
import DashboardGrid from './components/DashboardGrid.vue'; 
import WidgetContainer from './components/WidgetContainer.vue';

const TimingTableWidget = shallowRef(defineAsyncComponent(() => import('@/components/widgets/TimingTableWidget.vue')));
const RaceControlMessagesWidget = shallowRef(defineAsyncComponent(() => import('@/components/widgets/RaceControlMessagesWidget.vue')));
const TrackStatusLEDWidget = shallowRef(defineAsyncComponent(() => import('@/components/widgets/TrackStatusLEDWidget.vue')));

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

const defaultRcmConfig = { showTimestamp: true, showCategory: true, messageFontSize: 90 };

const activeWidgets = ref([
  {
    id: 'timing-1', 
    component: TimingTableWidget, 
    x: 0, y: 0, w: 12, h: 15,
    config: {},
  },
  {
    id: 'rcm-1',
    component: RaceControlMessagesWidget,
    x: 12, y: 0, w: 16, h: 10,
    config: { ...defaultRcmConfig},
  },
  {
    id: 'track-status-1',
    component: TrackStatusLEDWidget,
    x: 28, y: 0, w: 4, h: 2 ,
    config: {},
  }
]);

const settingsTargetWidgetId = ref("");
const isSettingsDialogOpen = ref(false);              

const settingsTargetWidget = computed(() => {
    if (!settingsTargetWidgetId.value) return null;
    return activeWidgets.value.find(w => w.id === settingsTargetWidgetId.value);
});

const currentWidgetInstance = computed(() => {
    if (!settingsTargetWidgetId.value) return null;
    return widgetInstanceRefs.value[settingsTargetWidgetId.value];
});

const currentSettingsDefinition = computed(() => {
    return currentWidgetInstance.value?.settingsDefinition || null;
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

const removeWidget = async (widgetIdToRemove) => {
  const widgetIndex = activeWidgets.value.findIndex(w => w.id === widgetIdToRemove);

  if (widgetIndex !== -1) {
    const grid = dashboardGridRef.value?.getGridInstance(); 
    const widgetElement = widgetRefs.value[widgetIdToRemove];
    if (grid && widgetElement) {
       grid.removeWidget(widgetElement, false); // false = don't remove DOM node, Vue will do that
    } else {
         console.warn(`App.vue: Could not find Gridstack instance or DOM element for widget ID: ${widgetIdToRemove} during removal.`);
         // const element = grid?.el?.querySelector(`[gs-id="${widgetIdToRemove}"]`);
         // if (grid && element) grid.removeWidget(element, false);
    }

    activeWidgets.value.splice(widgetIndex, 1);

    await nextTick();

     delete widgetRefs.value[widgetIdToRemove];

  } else {
    console.warn(`App.vue: Widget with ID ${widgetIdToRemove} not found.`);
  }
};

const settingsWidgetId = ref(null); 

const openWidgetSettings = (widgetId) => {
  const widgetInstance = widgetInstanceRefs.value[widgetId];

  if (widgetInstance) {
     // Check if the instance actually exposed settingsDefinition (it might not)
     if(widgetInstance.settingsDefinition && widgetInstance.settingsDefinition.length > 0){
        settingsTargetWidgetId.value = widgetId;
        isSettingsDialogOpen.value = true; 
        console.log("Settings Definition:", widgetInstance.settingsDefinition);
     } else {
         console.warn(`Widget ${widgetId} does not expose any settings.`);
         alert(`Widget ${widgetId} has no configurable settings.`);
     }

  } else {
      console.error(`Cannot open settings: Widget instance or config not found for ID ${widgetId}`);
  }
};

const onSettingsDialogHide = () => {
    settingsTargetWidgetId.value = null;
    console.log('Settings dialog hidden');
}

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
</style>