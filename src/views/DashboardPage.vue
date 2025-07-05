<template>
  <div id="app-container">
    <Navbar
      @add-widget="openAddWidgetDialog"
      @open-info-modal="isInfoModalVisible = true"
      @toggle-edit-mode="handleToggleEditMode"
      :edit-mode="isEditMode"
    />
    <DashboardGrid
      :key="`${activePageId}-${layoutVersion}`"
      ref="dashboardGridRef"
      class="dashboard-container"
      @grid-updated="handleGridUpdated"
      :initial-widgets="activeWidgets"
      :edit-mode="isEditMode"
    >
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
      @save="handleWidgetSettingsSave"
    />

    <AddWidgetDialog
      v-model:visible="isAddWidgetDialogOpen"
      @add-widget="handleAddWidget"
    />
    <InfoModal v-model:visible="isInfoModalVisible" />
  </div>
  <Toast position="top-right" />
</template>

<script setup>
import { ref, nextTick, onMounted, computed, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useSettingsStore } from '@/stores/settingsStore';
import { storeToRefs } from 'pinia';
import Navbar from '../components/Navbar.vue';
import DashboardGrid from '../components/DashboardGrid.vue';
import WidgetContainer from '../components/WidgetContainer.vue';
import WidgetSettingsDialog from '../components/WidgetSettingsDialog.vue';
import AddWidgetDialog from '../components/AddWidgetDialog.vue';
import InfoModal from '../components/InfoModal.vue';
import { widgetComponentMap, defaultWidgetConfigs, defaultWidgetSizes } from '../widgetRegistry';

const toast = useToast();

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

const settingsStore = useSettingsStore();
const { activePageId, layouts, layoutVersion } = storeToRefs(settingsStore);

const activeWidgets = computed(() => layouts.value[activePageId.value] || []);

const isInfoModalVisible = ref(false);
const isEditMode = ref(false);

const isSettingsDialogOpen = ref(false);
const settingsTargetWidgetId = ref(null);

const isAddWidgetDialogOpen = ref(false);

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
    return settingsTargetWidget.value?.config || {};
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
    // Use gridItemRefs which refs the actual grid-stack-item element
    const widgetElement = gridItemRefs.value[widgetIdToRemove];
    if (grid && widgetElement) {
       grid.removeWidget(widgetElement, false); // false = don't remove DOM node, Vue will do that
    } else {
         console.warn(`App.vue: Could not find Gridstack instance or DOM element ref for widget ID: ${widgetIdToRemove} during removal.`);
    }

    activeWidgets.value.splice(widgetIndex, 1);
    updateLayout();

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
}

const handleWidgetSettingsSave = (newConfig, showToast = true) => {
  if (!settingsTargetWidgetId.value) return;
  const widget = activeWidgets.value.find(w => w.id === settingsTargetWidgetId.value);
  if (widget) {
    widget.config = newConfig;
    updateLayout(showToast);
  }
};

const updateLayout = (showToast = true) => {
  settingsStore.updateLayout(activeWidgets.value);
   if (showToast) {
    toast.add({severity:'success', summary: 'Layout saved', life: 2000});
  }
}

onMounted(() => {
  const savedEditMode = localStorage.getItem('dashboardEditMode');
  if (savedEditMode) {
    isEditMode.value = JSON.parse(savedEditMode);
  }
});


// Watch for changes in edit mode and save to local storage
watch(isEditMode, (newValue) => {
  localStorage.setItem('dashboardEditMode', JSON.stringify(newValue));
});

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
  updateLayout();
};

const openAddWidgetDialog = () => {
  isAddWidgetDialogOpen.value = true;
};

const handleAddWidget = (widgetComponentName) => {
  const newWidgetId = `${widgetComponentName.toLowerCase()}-${generateWidgetId(4)}`;
  const newWidget = {
    id: newWidgetId,
    componentName: widgetComponentName,
    ...defaultWidgetSizes[widgetComponentName],
    x: 0, y: 0,
    config: { ...defaultWidgetConfigs[widgetComponentName] },
  };
  layouts.value[activePageId.value].push(newWidget);
  isAddWidgetDialogOpen.value = false;
  nextTick(() => {
    const grid = dashboardGridRef.value?.getGridInstance();
    const newWidgetElement = gridItemRefs.value[newWidgetId];
    if (grid && newWidgetElement) {
      grid.makeWidget(newWidgetElement);
    }
  });
};

const handleToggleEditMode = () => {
  isEditMode.value = !isEditMode.value;
  if (isEditMode.value) {
    toast.add({ severity: 'info', summary: 'Layout unlocked', life: 2000 });
  } else {
    toast.add({ severity: 'info', summary: 'Layout locked', life: 2000 });
  }
};

function generateWidgetId(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'; // Define allowed characters
  let result = '';
  const charactersLength = characters.length;

  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
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
  background-color: var(--vt-c-black);
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
.grid-stack {
  background-color: var(--vt-c-black) !important;
}
.p-toast .p-toast-message {
  width: auto;
}
</style>