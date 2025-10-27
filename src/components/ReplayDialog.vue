<template>
  <Dialog :visible="visible" @update:visible="emit('update:visible')" header="Replay Past Session" modal style="width: 50vw">
    <div v-if="isLoading">
      <p>Loading recordings...</p>
    </div>
    <div v-else-if="error">
      <p>Error fetching recordings: {{ error }}</p>
    </div>
    <div v-else-if="isLoadingReplay" style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 150px;">
        <ProgressSpinner />
        <p style="margin-top: 1rem;">Loading replay...</p>
    </div>
    <div v-else-if="!isReplaying">
      <Accordion :multiple="true">
        <AccordionTab v-for="group in recordingGroups" :key="group.eventName" :header="group.eventName">
          <Listbox :options="group.recordings" optionLabel="name" @change="onRecordingSelect" class="p-listbox-sm" />
        </AccordionTab>
      </Accordion>
    </div>
    <div v-else>
      <div v-if="isSeeking" class="seeking-overlay">
        <ProgressSpinner />
        <span>Seeking...</span>
      </div>
      <div class="replay-controls-wrapper">
        <div class="controls-row">
          <Button
            :icon="isPaused ? 'pi pi-play' : 'pi pi-pause'"
            @click="togglePlayPause"
            class="p-button-rounded p-button-text"
          />
          <Button
            icon="pi pi-stop"
            @click="stop"
            class="p-button-rounded p-button-text p-button-danger"
          />
          <Slider
            v-model="sliderValue"
            :min="0"
            :max="100"
            @slideend="onSliderChange"
            class="replay-slider"
          />
          <div class="time-display">{{ progressDisplay }}</div>
        </div>
        <div class="controls-row">
          <div class="time-factor-control">
            <label for="time-factor">Replay speed</label>
            <InputNumber
              id="time-factor"
              v-model="replayTimeFactor"
              :min="0.5"
              :max="5"
              :step="0.1"
              @update:modelValue="settingsStore.setReplayTimeFactor($event)"
              class="time-factor-input"
            />
          </div>
        </div>
      </div>
    </div>
  </Dialog>

  <ConfirmDialog></ConfirmDialog>
</template>

<script lang="ts" setup>
import { ref, watch, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useConfirm } from "primevue/useconfirm";
import ConfirmDialog from 'primevue/confirmdialog';
import Dialog from 'primevue/dialog';
import Accordion from 'primevue/accordion';
import AccordionTab from 'primevue/accordiontab';
import Listbox from 'primevue/listbox';
import Button from 'primevue/button';
import InputNumber from 'primevue/inputnumber';
import Slider from 'primevue/slider';
import ProgressSpinner from 'primevue/progressspinner';
import { useSessionRecordingStore } from '@/stores/sessionRecordingStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { fetchRecordings, downloadAndDecompressRecording } from '@/services/sessionRecordingService';
import {
  startReplay as startReplayService,
  stopReplay as stopReplayService,
  isReplaying,
  isLoadingReplay,
  isPaused,
  pauseReplay,
  resumeReplay,
  seek,
  isSeeking,
  replayProgress
} from '@/services/replayService';
import { formatSecondsToTime } from '@/utils/formatUtils';
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
    await startReplayService(content);
  } catch (err) {
    console.error('Error starting replay:', err);
  }
};


const sliderValue = ref(0);

const progressDisplay = computed(() => {
  if (!replayProgress.value.startTime || !replayProgress.value.endTime || !replayProgress.value.currentTime) {
    return '00:00:00 / 00:00:00';
  }

  const totalDuration = (replayProgress.value.endTime.getTime() - replayProgress.value.startTime.getTime()) / 1000;
  const currentProgress = (replayProgress.value.currentTime.getTime() - replayProgress.value.startTime.getTime()) / 1000;

  return `${formatSecondsToTime(currentProgress)} / ${formatSecondsToTime(totalDuration)}`;
});

watch(replayProgress, (newProgress) => {
  if (newProgress.startTime && newProgress.endTime && newProgress.currentTime) {
    const totalDuration = newProgress.endTime.getTime() - newProgress.startTime.getTime();
    const currentProgress = newProgress.currentTime.getTime() - newProgress.startTime.getTime();
    sliderValue.value = totalDuration > 0 ? (currentProgress / totalDuration) * 100 : 0;
  }
}, { deep: true });

const togglePlayPause = () => {
  if (isPaused.value) {
    resumeReplay();
  } else {
    pauseReplay();
  }
};

const stop = () => {
  stopReplayService();
  f1Store.initialize();
};

const onSliderChange = (event: { value: number }) => {
  if (replayProgress.value.startTime && replayProgress.value.endTime) {
    const totalDuration = replayProgress.value.endTime.getTime() - replayProgress.value.startTime.getTime();
    const seekTime = new Date(replayProgress.value.startTime.getTime() + (totalDuration * event.value) / 100);
    seek(seekTime);
  }
};
</script>

<style scoped>
.seeking-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: white;
  z-index: 1001;
}

.replay-controls-wrapper {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.controls-row {
  display: flex;
  align-items: center;
  gap: 15px;
  width: 100%;
}

.replay-slider {
  flex-grow: 1;
}

.time-display {
  min-width: 180px;
  text-align: center;
  font-family: monospace;
}

.time-factor-control {
  display: flex;
  align-items: center;
  gap: 10px;
}

.time-factor-input {
  width: 60px;
}
</style>