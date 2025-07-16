<template>
  <Dialog
    :visible="visible"
    @update:visible="$emit('update:visible', $event)"
    modal
    header="Add New Widget"
    :style="{ width: '50vw' }"
    :breakpoints="{ '960px': '75vw', '641px': '100vw' }"
  >
    <div class="widget-dialog-content">
      <div class="filter-container">
        <Button
          label="All"
          :class="{ 'p-button-secondary': selectedTag !== null }"
          class="p-button-sm"
          @click="selectedTag = null"
        />
        <Button
          v-for="tag in allTags"
          :key="tag"
          :label="tag"
          :class="{ 'p-button-secondary': selectedTag !== tag }"
          class="p-button-sm"
          @click="selectedTag = tag"
        />
      </div>

      <DataView :value="filteredWidgetOptions" layout="list">
        <template #list="slotProps">
          <div class="grid grid-nogutter">
            <div v-for="item in slotProps.items" :key="item.value" class="col-12">
              <div class="widget-list-item" @click="confirmAddWidget(item.value)">
                <i :class="item.icon" class="widget-icon"></i>
                <div class="widget-list-detail">
                  <div class="widget-name">{{ item.label }}</div>
                  <div class="widget-description">{{ item.description }}</div>
                </div>
                <div class="widget-tags">
                  <Tag v-for="tag in item.tags" :key="tag" :value="tag" class="p-mr-2" />
                </div>
              </div>
            </div>
          </div>
        </template>
      </DataView>
    </div>

    <template #footer>
      <Button label="Cancel" icon="pi pi-times" class="p-button-text" @click="$emit('update:visible', false)" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import DataView from 'primevue/dataview';
import Tag from 'primevue/tag';
import { widgetDisplayNames, widgetDescriptions, widgetIcons, widgetTags, type WidgetComponentName } from '@/widgetRegistry';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits(['update:visible', 'add-widget']);

const selectedTag = ref<string | null>(null);

const availableWidgetOptions = computed(() => {
  return Object.entries(widgetDisplayNames).map(([key, value]) => ({
    label: value,
    value: key as WidgetComponentName,
    description: widgetDescriptions[key as WidgetComponentName] || 'No description available.',
    icon: widgetIcons[key as WidgetComponentName] || 'pi pi-question-circle',
    tags: widgetTags[key as WidgetComponentName] || [],
  }));
});

const allTags = computed(() => {
  const tags = new Set<string>();
  availableWidgetOptions.value.forEach(widget => {
    widget.tags.forEach(tag => tags.add(tag));
  });
  return Array.from(tags);
});

const filteredWidgetOptions = computed(() => {
  if (!selectedTag.value) {
    return availableWidgetOptions.value;
  }
  return availableWidgetOptions.value.filter(widget => widget.tags.includes(selectedTag.value as string));
});

const confirmAddWidget = (widgetType: WidgetComponentName) => {
  emit('add-widget', widgetType);
};
</script>

<style scoped>
.widget-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.filter-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 1rem 0;
}

.widget-list-item {
  display: flex;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--surface-d);
  cursor: pointer;
  transition: background-color 0.2s, transform 0.2s;
  border-radius: 4px;
}

.widget-list-item:hover {
  background-color: var(--surface-hover);
  transform: translateY(-2px);
}

.widget-icon {
  font-size: 2rem;
  margin-right: 1rem;
}

.widget-list-detail {
  flex-grow: 1;
}

.widget-name {
  font-weight: bold;
}

.widget-description {
  font-size: 0.9rem;
  color: var(--text-color-secondary);
}

.widget-tags {
  display: flex;
  gap: 0.5rem;
}
</style>