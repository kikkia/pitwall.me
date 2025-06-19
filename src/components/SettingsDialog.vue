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
import { useSettingsStore } from '@/stores/settingsStore';
import { storeToRefs } from 'pinia';

defineOptions({
  components: {
    Button,
    Dialog,
    InputNumber
  }
});

interface Props {
  visible: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits(['update:visible']);

const settingsStore = useSettingsStore();
const { websocketDelay } = storeToRefs(settingsStore);
const localWebsocketDelay = ref(websocketDelay.value);

const saveSettings = () => {
  settingsStore.setWebsocketDelay(localWebsocketDelay.value !== null ? localWebsocketDelay.value : 0);
  emit('update:visible', false);
};
</script>

<style scoped>
.save-button {
  margin-top: 1rem; /* Add top margin for spacing */
}
</style>