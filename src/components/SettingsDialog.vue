<template>
  <Dialog
    :visible="visible"
    modal
    header="Global Settings"
    :style="{ width: '30vw' }"
    :breakpoints="{ '960px': '75vw', '641px': '100vw' }"
    @update:visible="emit('update:visible', $event)"
  >
    <div class="p-fluid">
      <div class="p-field">
        <label for="websocketDelay">Add a delay to timing data (seconds)</label>
        <InputNumber
          id="websocketDelay"
          v-model="localWebsocketDelay"
          mode="decimal"
          showButtons
          :min="0"
          :step="1"
        />
      </div>
       <div class="p-field" style="margin-top: 20px;">
        <label for="gridGravity">Floating Widgets</label>
        <br>
        <Dropdown
          id="gridGravity"
          v-model="localGridFloat"
          :options="gravityOptions"
          optionLabel="name"
          optionValue="value"
        />
      </div>
    </div>
  <template #footer>
    <Button label="Save" @click="saveSettings" class="save-button" />
  </template>
</Dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputNumber from 'primevue/inputnumber';
import Dropdown from 'primevue/dropdown';
import { useSettingsStore } from '@/stores/settingsStore';
import { storeToRefs } from 'pinia';

defineOptions({
  components: {
    Button,
    Dialog,
    InputNumber,
    Dropdown
  }
});

interface Props {
  visible: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits(['update:visible']);

const settingsStore = useSettingsStore();
const { websocketDelay, gridFloat } = storeToRefs(settingsStore);
const localWebsocketDelay = ref(websocketDelay.value);
const localGridFloat = ref(gridFloat.value);

const gravityOptions = ref([
  { name: 'On (no gravity)', value: true },
  { name: 'Off (widgets gravitate to top)', value: false }
]);

const saveSettings = () => {
  settingsStore.setWebsocketDelay(localWebsocketDelay.value !== null ? localWebsocketDelay.value : 0);
  settingsStore.setGridFloat(localGridFloat.value);
  emit('update:visible', false);
};
</script>

<style scoped>
.save-button {
  margin-top: 1rem;
}
</style>