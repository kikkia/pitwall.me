<template>
  <Dialog :visible="visible" @update:visible="emit('update:visible')" header="Replay Past Session" modal style="width: 50vw">
    <div v-if="isLoading">
      <p>Loading recordings...</p>
    </div>
    <div v-else-if="error">
      <p>Error fetching recordings: {{ error }}</p>
    </div>
    <div v-else-if="!replayInProgress">
      <Accordion :multiple="true">
        <AccordionTab v-for="group in recordingGroups" :key="group.eventName" :header="group.eventName">
          <Listbox :options="group.recordings" optionLabel="name" @change="onRecordingSelect" class="p-listbox-sm" />
        </AccordionTab>
      </Accordion>
    </div>
    <div v-else>
      <h3>Replay Controls</h3>
      <div class="p-grid p-fluid">
        <div class="p-col-12 p-md-6">
          <div class="p-field">
            <label for="time-factor">Time Factor (0.5x - 5x)</label>
            <InputNumber id="time-factor" v-model="replayTimeFactor" :min="0.5" :max="5" :step="0.1" @update:modelValue="settingsStore.setReplayTimeFactor($event)" />
          </div>
        </div>
        <div class="p-col-12 p-md-6" style="margin-top: 1.75rem">
            <Button v-if="!isPaused" label="Pause" icon="pi pi-pause" @click="pauseReplay" class="p-button-secondary" />
            <Button v-else label="Resume" icon="pi pi-play" @click="resumeReplay" class="p-button-success" />
            <Button label="Stop Replay" icon="pi pi-stop" @click="stopReplay" class="p-button-danger" style="margin-left: 0.5rem" />
        </div>
      </div>
    </div>
  </Dialog>

  <ConfirmDialog></ConfirmDialog>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useConfirm } from "primevue/useconfirm";
import ConfirmDialog from 'primevue/confirmdialog';
import Dialog from 'primevue/dialog';
import Accordion from 'primevue/accordion';
import AccordionTab from 'primevue/accordiontab';
import Listbox from 'primevue/listbox';
import Button from 'primevue/button';
import InputNumber from 'primevue/inputnumber';
import { useSessionRecordingStore } from '@/stores/sessionRecordingStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { fetchRecordings, downloadAndDecompressRecording } from '@/services/sessionRecordingService';
import {
  startReplay as startReplayService,
  stopReplay as stopReplayService,
  pauseReplay,
  resumeReplay,
  isPaused
} from '@/services/replayService';
import type { SessionRecording } from '@/stores/sessionRecordingStore';
import { useF1Store } from '@/stores/f1Store';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:visible']);

const store = useSessionRecordingStore();
const settingsStore = useSettingsStore();
const f1Store = useF1Store();
const { recordingGroups, isLoading, error } = storeToRefs(store);
const { replayTimeFactor } = storeToRefs(settingsStore);
const confirm = useConfirm();

const replayInProgress = ref(false);
const selectedRecording = ref<SessionRecording | null>(null);

watch(() => props.visible, (newValue) => {
  if (newValue && recordingGroups.value.length === 0) {
    fetchRecordings();
  }
});

const onRecordingSelect = (event: { value: SessionRecording }) => {
  selectedRecording.value = event.value;
  confirm.require({
    message: 'You are about to start a replay of a past event. This will disconnect you from any live events until stopped. Continue?',
    header: 'Start Replay?',
    icon: 'pi pi-exclamation-triangle',
    accept: () => {
      startReplay();
    },
    reject: () => {
      selectedRecording.value = null;
    }
  });
};

const startReplay = async () => {
  if (!selectedRecording.value) return;

  f1Store.terminate(); 

  try {
    const content = await downloadAndDecompressRecording(selectedRecording.value);
    startReplayService(content);
    replayInProgress.value = true;
  } catch (err) {
    console.error('Error starting replay:', err);
  }
};

const stopReplay = () => {
  stopReplayService();
  replayInProgress.value = false;
  selectedRecording.value = null;
  f1Store.initialize();
};

</script>