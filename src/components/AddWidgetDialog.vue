<template>
  <Dialog
    :visible="visible"
    @update:visible="$emit('update:visible', $event)"
    modal
    header="Add New Widget"
    :style="{ width: '50vw' }"
    :breakpoints="{ '960px': '75vw', '641px': '100vw' }"
  >
    <div class="widget-card-grid">
      <Card
        v-for="widget in availableWidgetOptions"
        :key="widget.value"
        class="widget-card"
        @click="confirmAddWidget(widget.value)"
      >
        <template #title>
          {{ widget.label }}
        </template>
        <template #subtitle>
          <i class="pi pi-image widget-icon-placeholder"></i>
        </template>
        <template #content>
          <p>{{ widget.description }}</p>
        </template>
      </Card>
    </div>

    <template #footer>
      <Button label="Cancel" icon="pi pi-times" class="p-button-text" @click="$emit('update:visible', false)" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Card from 'primevue/card';
import { widgetDisplayNames, widgetDescriptions, type WidgetComponentName } from '@/widgetRegistry';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits(['update:visible', 'add-widget']);


const availableWidgetOptions = computed(() => {
  return Object.entries(widgetDisplayNames).map(([key, value]) => ({
    label: value,
    value: key as WidgetComponentName,
    description: widgetDescriptions[key as WidgetComponentName] || 'No description available.',
  }));
});


const confirmAddWidget = (widgetType: WidgetComponentName) => {
  emit('add-widget', widgetType);
};
</script>

<style scoped>
.widget-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
  padding: 1rem;
}

.widget-card {
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  position: relative; 
  overflow: hidden;
}

.widget-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}


.widget-icon-placeholder {
  font-size: 3rem;
  color: var(--text-color-secondary);
  margin-bottom: 1rem;
  display: block;
  text-align: center;
}
</style>

<style>

.widget-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.05);
  pointer-events: none;
}
</style>