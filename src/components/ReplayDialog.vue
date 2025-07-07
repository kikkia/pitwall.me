<template>
  <Dialog :visible="visible" @update:visible="emit('update:visible')" header="Replay Past Session" modal style="width: 50vw">
    <div v-if="isLoading">
      <p>Loading recordings...</p>
    </div>
    <div v-else-if="error">
      <p>Error fetching recordings: {{ error }}</p>
    </div>
    <div v-else>
      <Accordion :multiple="true" :activeIndex="[0]">
        <AccordionTab v-for="group in recordingGroups" :key="group.eventName" :header="group.eventName">
          <Listbox :options="group.recordings" optionLabel="name" @change="onRecordingSelect" class="p-listbox-sm" />
        </AccordionTab>
      </Accordion>
      <div v-if="selectedRecordingContent" style="margin-top: 20px;">
        <h3>Recording Content (First 100 Chars):</h3>
        <pre>{{ selectedRecordingContent }}</pre>
      </div>
    </div>
  </Dialog>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import Dialog from 'primevue/dialog';
import Accordion from 'primevue/accordion';
import AccordionTab from 'primevue/accordiontab';
import Listbox from 'primevue/listbox';
import { useSessionRecordingStore } from '@/stores/sessionRecordingStore';
import { fetchRecordings, downloadAndDecompressRecording } from '@/services/sessionRecordingService';
import type { SessionRecording } from '@/stores/sessionRecordingStore';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:visible']);

const store = useSessionRecordingStore();
const { recordingGroups, isLoading, error } = storeToRefs(store);

const selectedRecordingContent = ref('');

watch(() => props.visible, (newValue) => {
  if (newValue && recordingGroups.value.length === 0) {
    fetchRecordings();
  }
});

const onRecordingSelect = async (event: { value: SessionRecording }) => {
  try {
    const content = await downloadAndDecompressRecording(event.value);
    selectedRecordingContent.value = content.substring(0, 100);
  } catch (err) {
    selectedRecordingContent.value = 'Error loading recording.';
    console.error(err);
  }
};
</script>