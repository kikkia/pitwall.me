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
              v-model="widgetConfig[setting.id]"
              :binary="true"
            />
            <label :for="`${widgetId}-${setting.id}`">{{ setting.label }}</label>
          </div>
  
          <div v-if="setting.component === 'Slider'" class="p-field slider-field">
            <label :for="`${widgetId}-${setting.id}`">{{ setting.label }}: {{ widgetConfig[setting.id] }}</label>
            <Slider
              :id="`${widgetId}-${setting.id}`"
              v-model="widgetConfig[setting.id]"
              v-bind="setting.props || {}"
            />
          </div>
  
          <div v-if="setting.component === 'MultiSelect'" class="p-field multi-field">
             <label :for="`${widgetId}-${setting.id}`">{{ setting.label }}</label>
             <MultiSelect
                :id="`${widgetId}-${setting.id}`"
                v-model="widgetConfig[setting.id]"
                :options="setting.options"
                optionLabel="label" 
                optionValue="value"
                placeholder="Select Categories"
                display="chip"
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
  import Dialog from 'primevue/dialog';
  import Button from 'primevue/button';
  import Checkbox from 'primevue/checkbox';
  import Slider from 'primevue/slider';
  import MultiSelect from 'primevue/multiselect'; 
  
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
  
  const emit = defineEmits(['update:visible', 'hide']); // update:visible is crucial for v-model
  
  const closeDialog = () => {
    emit('update:visible', false);
  };
  
  const handleDialogHide = () => {
      emit('hide');
  }
  
  const saveSettings = () => {
    emit('save', props.widgetConfig);
    closeDialog();
  };
  
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
  </style>