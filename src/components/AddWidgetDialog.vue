<template>
  <Dialog
    :visible="visible"
    @update:visible="$emit('update:visible', $event)"
    modal
    header="Add New Widget"
    :style="{ width: '50vw' }"
    :breakpoints="{ '960px': '75vw', '641px': '100vw' }"
  >
    <div class="p-fluid">
      <div class="p-field">
        <label for="widgetType">Select Widget Type</label>
        <Dropdown
          id="widgetType"
          v-model="selectedWidgetType"
          :options="availableWidgetOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Select a Widget"
          class="w-full md:w-14rem"
        />
      </div>
    </div>

    <template #footer>
      <Button label="Cancel" icon="pi pi-times" class="p-button-text" @click="$emit('update:visible', false)" />
      <Button label="Add Widget" icon="pi pi-check" @click="confirmAddWidget" :disabled="!selectedWidgetType" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Dropdown from 'primevue/dropdown';
import { widgetDisplayNames, type WidgetComponentName } from '@/widgetRegistry';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits(['update:visible', 'add-widget']);

const selectedWidgetType = ref<WidgetComponentName | null>(null);

const availableWidgetOptions = computed(() => {
  return Object.entries(widgetDisplayNames).map(([key, value]) => ({
    label: value,
    value: key as WidgetComponentName,
  }));
});

watch(() => props.visible, (newVal) => {
  if (!newVal) {
    // Reset selected widget when dialog closes
    selectedWidgetType.value = null;
  }
});

const confirmAddWidget = () => {
  if (selectedWidgetType.value) {
    emit('add-widget', selectedWidgetType.value);
  }
};
</script>

<style scoped>
.p-fluid .p-field {
  margin-bottom: 1rem;
}
</style>