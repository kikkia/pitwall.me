<template>
    <Dialog
      :visible="visible"
      @update:visible="closeDialog"
      @hide="handleDialogHide"
      modal
      :header="`Settings for Widget: ${widgetId}`"
      :style="{ width: '350px' }"
    >
      <div v-if="settingsDefinition && widgetConfig" class="settings-panel">
        <div v-for="setting in settingsDefinition" :key="setting.id" class="setting-item">
  
          <div v-if="setting.component === 'Checkbox'" class="p-field-checkbox">
            <Checkbox
              :inputId="`${widgetId}-${setting.id}`"
              v-model="localWidgetConfig[setting.id]"
              :binary="true"
            />
            <label :for="`${widgetId}-${setting.id}`">{{ setting.label }}</label><i v-if="setting.tooltip" class="pi pi-info-circle setting-tooltip" v-tooltip.top="setting.tooltip" />
          </div>
  
          <div v-if="setting.component === 'Slider'" class="p-field slider-field">
            <label :for="`${widgetId}-${setting.id}`">{{ setting.label }}: {{ localWidgetConfig[setting.id] }} <i v-if="setting.tooltip" class="pi pi-info-circle setting-tooltip" v-tooltip.top="setting.tooltip" /></label>
            <Slider
              :id="`${widgetId}-${setting.id}`"
              v-model="localWidgetConfig[setting.id]"
              v-bind="setting.props || {}"
            />
          </div>
  
          <div v-if="setting.component === 'MultiSelect'" class="p-field multi-field">
             <label :for="`${widgetId}-${setting.id}`">{{ setting.label }} <i v-if="setting.tooltip" class="pi pi-info-circle setting-tooltip" v-tooltip.top="setting.tooltip" /></label>
             <MultiSelect
                :id="`${widgetId}-${setting.id}`"
                v-model="localWidgetConfig[setting.id]"
                :options="setting.options"
                :optionLabel="setting.props?.optionLabel || 'label'"
                :optionValue="setting.props?.optionValue || 'value'"
                dataKey="value"
                placeholder="Select Categories"
                display="chip"
                v-bind="setting.props || {}"
                class="w-full"
             />
          </div>

          <div v-if="setting.component === 'Select'" class="p-field select-field">
             <label :for="`${widgetId}-${setting.id}`">{{ setting.label }} <i v-if="setting.tooltip" class="pi pi-info-circle setting-tooltip" v-tooltip.top="setting.tooltip" /></label>
             <Select
                :id="`${widgetId}-${setting.id}`"
                v-model="localWidgetConfig[setting.id]"
                :options="setting.options"
                :optionLabel="setting.props?.optionLabel || 'label'"
                :optionValue="setting.props?.optionValue || 'value'"
                placeholder="Select"
                display="chip"
                v-bind="setting.props || {}"
                class="w-full"
             />
          </div>
  
          <div v-if="setting.component === 'Dropdown'" class="p-field dropdown-field">
            <label :for="`${widgetId}-${setting.id}`">{{ setting.label }} <i v-if="setting.tooltip" class="pi pi-info-circle setting-tooltip" v-tooltip.top="setting.tooltip" /></label>
            <Dropdown
              :id="`${widgetId}-${setting.id}`"
              v-model="localWidgetConfig[setting.id]"
              :options="setting.options"
              :optionLabel="setting.props?.optionLabel || 'label'"
              :optionValue="setting.props?.optionValue || 'value'"
              :placeholder="setting.props?.placeholder"
              :filter="setting.props?.filter"
              v-bind="setting.props || {}"
              class="w-full"
            />
          </div>
    
        </div>
      </div>
      <div v-else>
        Loading settings or settings not available...
      </div>
  
      <template #footer>
        <Button label="Close" icon="pi pi-times" @click="closeDialog" class="p-button-text"/>
        <!-- <Button label="Save" icon="pi pi-check" @click="saveSettings" /> -->
      </template>
    </Dialog>
  </template>
  
  <script setup>
  import { ref, watch } from 'vue';
  import Dialog from 'primevue/dialog';
  import Button from 'primevue/button';
  import Checkbox from 'primevue/checkbox';
  import Slider from 'primevue/slider';
  import MultiSelect from 'primevue/multiselect';
  import Select from 'primevue/select';
  import Dropdown from 'primevue/dropdown';
  
  const props = defineProps({
    visible: {
      type: Boolean,
      required: true,
    },
    widgetId: {
      type: String,
      default: '',
    },
    settingsDefinition: {
      default: () => [],
    },
    widgetConfig: {
      type: Object,
      default: () => ({}),
    },
  });
  
  const emit = defineEmits(['update:visible', 'hide', 'save']); // update:visible is crucial for v-model
  
  const localWidgetConfig = ref({});
  
  // When the dialog becomes visible, create a local copy of the widget configuration.
  // This prevents immediate saving on the parent component and avoids toast spam.
  watch(() => props.visible, (newValue) => {
    if (newValue) {
      localWidgetConfig.value = JSON.parse(JSON.stringify(props.widgetConfig));
    }
  }, { immediate: true });

  // Watch for changes in the local config and emit save events without showing a toast.
  watch(localWidgetConfig, (newConfig) => {
    if (props.visible) {
      emit('save', newConfig, false);
    }
  }, { deep: true });
  
  const closeDialog = () => {
    emit('update:visible', false);
  };
  
  const handleDialogHide = () => {
      // On dialog hide, we do one final save and this time we want to show the toast.
      emit('save', localWidgetConfig.value, true);
      emit('hide');
  }
  
  </script>
  
  <style scoped>
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

  .setting-tooltip {
    margin-left: 0.5rem;
    cursor: help;
    font-size: 0.8rem;
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
  
  .w-full {
    width: 100%;
  }
  
  .dropdown-field label {
      display: block;
      margin-bottom: 0.75rem;
      font-weight: bold;
      font-size: 0.9em;
  }
  </style>