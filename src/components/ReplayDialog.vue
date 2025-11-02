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
      <Accordion :activeIndex="0">
        <AccordionTab v-for="group in recordingGroups" :key="group.eventName">
            <template #header>
                <div class="accordion-header">
                    <span class="country-flag">{{ getCountryFlagEmoji(group.countryFlagCode) }}</span>
                    <span>{{ group.eventName }}</span>
                </div>
            </template>
            <div class="session-list">
                <div v-for="recording in group.recordings" :key="recording.path" class="session-card" @click="confirmStartReplay(recording)">
                    <div class="session-name">{{ recording.name }}</div>
                    <div v-if="recording.topThree && recording.topThree.length > 0" class="top-three">
                        <div v-for="driver in recording.topThree" :key="driver.tla" class="driver">
                            <span class="team-color-indicator" :style="{ backgroundColor: '#' + driver.teamColour }"></span>
                            {{ driver.tla }}
                        </div>
                    </div>
                </div>
            </div>
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
import Button from 'primevue/button';
import InputNumber from 'primevue/inputnumber';
import Slider from 'primevue/slider';
import ProgressSpinner from 'primevue/progressspinner';
import { useSessionRecordingStore } from '@/stores/sessionRecordingStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUiStore } from '@/stores/uiStore';
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
const uiStore = useUiStore();
const f1Store = useF1Store();
const { recordingGroups, isLoading, error } = storeToRefs(store);
const { replayTimeFactor } = storeToRefs(settingsStore);
const confirm = useConfirm();

watch(() => props.visible, (newValue) => {
  if (newValue && recordingGroups.value.length === 0) {
    fetchRecordings();
  }
});

const confirmStartReplay = (recording: SessionRecording) => {
  confirm.require({
    message: 'You are about to start a replay of a past event. This will disconnect you from any live events until stopped. Continue?',
    header: 'Start Replay?',
    icon: 'pi pi-exclamation-triangle',
    accept: () => {
      startReplay(recording);
    }
  });
};

const startReplay = async (recording: SessionRecording) => {
  if (!recording) return;

  f1Store.terminate(); 

  try {
    const content = await downloadAndDecompressRecording(recording);
    await startReplayService(content);
  } catch (err) {
    console.error('Error starting replay:', err);
    uiStore.showToast('Failed to load replay.', 'error');
  }
};

const countryCodeOverrides: Record<string, string> = {
    NED: 'NL',
    MEX: 'MX',
    UAE: 'AE'
};

const getCountryFlagEmoji = (countryCode: string) => {
    if (!countryCode) return '';
    let correctedCode = countryCodeOverrides[countryCode.toUpperCase()] || countryCode.toUpperCase();
    correctedCode = correctedCode.substring(0, 2);
    const codePoints = correctedCode
        .split('')
        .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
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

<style>
.p-accordion .p-accordion-header .p-accordion-header-link {
    padding: 0.75rem 1rem;
}
</style>

<style scoped>
.accordion-header {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 1.1rem;
}

.country-flag {
    font-size: 2rem;
}

.session-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.session-card {
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border: 1px solid #ccc;
    border-radius: 8px;
    padding: 0.5rem 1rem;
    cursor: pointer;
    overflow: hidden;
}

.session-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(ellipse at center, rgba(0,255,113,0) 0%, rgba(0,255,113,0.3) 100%);
    opacity: 0;
    transition: opacity 0.3s;
}

.session-card:hover::before {
    opacity: 1;
}

.session-name {
    font-size: 1.1rem;
    font-weight: bold;
    margin-bottom: 0;
}

.top-three {
    display: flex;
    flex-direction: row;
    gap: 1rem;
    min-width: 180px;
    justify-content: flex-start;
}

.driver {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 60px;
}

.team-color-indicator {
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 2px;
    border: 1px solid #ccc;
}

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