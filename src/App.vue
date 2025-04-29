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
        :ref="el => setWidgetRef(widget.id, el)"
      >

        <WidgetContainer
          :widget-id="widget.id"
          @remove="removeWidget"
          @open-settings="openWidgetSettings"
        >
          
          <component :is="widget.component" v-bind="widget.props || {}" />
        </WidgetContainer>
      </div>
    </DashboardGrid>

    <div v-if="settingsWidgetId" class="settings-modal">
      <h2>Settings for Widget {{ settingsWidgetId }}</h2>
      <p>Settings content soon...</p>
      <button @click="settingsWidgetId = null">Close</button>
    </div>
  </div>
</template>

<script setup>
import { ref, shallowRef, nextTick, onMounted, defineAsyncComponent } from 'vue';
import Navbar from './components/Navbar.vue';
import DashboardGrid from './components/DashboardGrid.vue'; 
import WidgetContainer from './components/WidgetContainer.vue';

const TimingTableWidget = shallowRef(defineAsyncComponent(() => import('@/components/widgets/TimingTableWidget.vue')));
const RaceControlMessagesWidget = shallowRef(defineAsyncComponent(() => import('@/components/widgets/RaceControlMessagesWidget.vue')));
const TrackStatusLEDWidget = shallowRef(defineAsyncComponent(() => import('@/components/widgets/TrackStatusLEDWidget.vue')));

const dashboardGridRef = ref(null);

const widgetRefs = ref({});
const setWidgetRef = (id, el) => {
  if (el) {
    widgetRefs.value[id] = el;
  } else {
    delete widgetRefs.value[id];
  }
};

const activeWidgets = ref([
  {
    id: 'timing-1', 
    component: TimingTableWidget, 
    x: 0, y: 0, w: 4, h: 8
  },
  {
    id: 'rcm-1',
    component: RaceControlMessagesWidget,
    x: 4, y: 0, w: 6, h: 5
  },
  {
    id: 'track-status-1',
    component: TrackStatusLEDWidget,
    x: 10, y: 0, w: 2, h: 1 
  }
]);

const removeWidget = async (widgetIdToRemove) => {
  console.log(`App.vue: Received remove request for widget ID: ${widgetIdToRemove}`);

  const widgetIndex = activeWidgets.value.findIndex(w => w.id === widgetIdToRemove);

  if (widgetIndex !== -1) {
    const grid = dashboardGridRef.value?.getGridInstance(); 
    const widgetElement = widgetRefs.value[widgetIdToRemove];
    if (grid && widgetElement) {
       console.log(`App.vue: Telling GridStack to remove element for ID: ${widgetIdToRemove}`, widgetElement);

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
  console.log(`App.vue: Received open-settings request for widget ID: ${widgetId}`);
  settingsWidgetId.value = widgetId;
  // open a modal here and pass widgetId to it
  // PrimeVue Dialog maybe.
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

.settings-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: white;
  padding: 20px;
  border: 1px solid #ccc;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  z-index: 100;
  min-width: 300px;
}
</style>