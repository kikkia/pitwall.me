<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useF1Store } from '@/stores/f1Store';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Dropdown from 'primevue/dropdown';

const f1Store = useF1Store();

const props = defineProps({
  selectedDriverNumber: {
    type: String,
    default: null
  },
  messageFontSize: { type: Number, default: 90 }
});

const emit = defineEmits(['update:widgetConfig']);

const internalSelectedDriverNumber = ref(props.selectedDriverNumber);

watch(() => props.selectedDriverNumber, (newVal) => {
  internalSelectedDriverNumber.value = newVal;
});

const availableDrivers = computed(() => {
  return Array.from(f1Store.driversViewModelMap.values())
    .filter(driver => driver.racingNumber !== "_kf")
    .map(driver => ({
      label: `${driver.tla} (${driver.racingNumber})`,
      value: driver.racingNumber
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
});

const selectedDriverLapHistory = computed(() => {
  if (!internalSelectedDriverNumber.value) {
    return [];
  }
  const lapHistory = f1Store.raceData.LapHistoryMap[internalSelectedDriverNumber.value];
  console.log("LapHistoryMap:", lapHistory);
  return lapHistory ? lapHistory.CompletedLaps.slice().reverse() : []; // Reverse to show latest lap at top
});

const settingsDefinition = computed(() => {
  return [
    {
      id: 'selectedDriverNumber',
      label: 'Select Driver',
      type: 'string',
      component: 'Dropdown',
      options: availableDrivers.value,
      props: {
        placeholder: "Select a Driver",
        filter: true
      }
    },
    {
      id: 'messageFontSize', label: 'Font Size (%)', type: 'number', component: 'Slider',
      props: { min: 50, max: 150, step: 10 }
    }
  ];
});

defineExpose({ settingsDefinition });

const tableStyle = computed(() => ({
    fontSize: `${props.messageFontSize}%`
}));

function formatTime(timeValue: string | null | undefined): string {
  if (timeValue && timeValue.includes(':') && timeValue.match(/\.\d$/)) {
      timeValue += '0';
  } else if (timeValue && !timeValue.includes(':') && timeValue.match(/\.\d$/)) {
      timeValue += '0';
  }
  return timeValue || '-.--';
}

function getMinisectorClass(segmentStatus: number | undefined): string {
  switch (segmentStatus) {
    case 2048: return 'minisector-set';
    case 0: return 'minisector-stopped';
    case 2049: return 'minisector-pb';
    case 2051: return 'minisector-ob';
    case 2064: return 'minisector-pit';
    default: return 'minisector-unknown';
  }
}

function getLapTimeClass(lap: any): string {
  if (lap.OverallFastest) return 'sector-overall-best';
  if (lap.PersonalFastest) return 'sector-personal-best';
  return '';
}

function getSectorTimeClass(sector: any): string {
  if (!sector) return '';
  if (sector.OverallFastest) return 'sector-overall-best';
  if (sector.PersonalFastest) return 'sector-personal-best';
  return '';
}

function handleDriverSelection(event: any) {
  internalSelectedDriverNumber.value = event.value;
  emit('update:widgetConfig', { selectedDriverNumber: event.value });
}

</script>

<template>
  <div class="widget lap-history-widget" :style="tableStyle">
    <div v-if="!internalSelectedDriverNumber" class="driver-selection-prompt">
      <h3>Select a driver to view lap history</h3>
      <Dropdown
        v-model="internalSelectedDriverNumber"
        :options="availableDrivers"
        optionLabel="label"
        optionValue="value"
        placeholder="Select a Driver"
        :filter="true"
        class="w-full"
        @change="handleDriverSelection"
      />
    </div>
    <div v-else class="lap-history-content">
      <DataTable
        :value="selectedDriverLapHistory"
        responsiveLayout="scroll"
        class="p-datatable-sm"
        sortMode="single"
        sortField="Lap"
        :sortOrder="-1"
        rowHover
      >
        <Column field="Lap" header="Lap" :style="{ width: '50px' }" frozen />
        <Column field="LapTime" header="Lap Time">
          <template #body="slotProps">
            <span :class="['time-value', getLapTimeClass(slotProps.data)]">
              {{ formatTime(slotProps.data.LapTime) }}
            </span>
          </template>
        </Column>
        <Column header="S1">
          <template #body="slotProps">
            <div class="time-cell-content">
              <div class="time-row">
                <span :class="['time-value', getSectorTimeClass(slotProps.data.Sectors?.[0])]">
                  {{ formatTime(slotProps.data.Sectors?.[0]?.Value) }}
                </span>
              </div>
              <div class="minisector-row">
                <div class="minisector-container">
                  <span
                    v-for="(segment, index) in slotProps.data.Sectors?.[0]?.Segments"
                    :key="`s1-${slotProps.data.Lap}-${index}`"
                    :class="['minisector', getMinisectorClass(segment.Status)]"
                  ></span>
                </div>
              </div>
            </div>
          </template>
        </Column>
        <Column header="S2">
          <template #body="slotProps">
            <div class="time-cell-content">
              <div class="time-row">
                <span :class="['time-value', getSectorTimeClass(slotProps.data.Sectors?.[1])]">
                  {{ formatTime(slotProps.data.Sectors?.[1]?.Value) }}
                </span>
              </div>
              <div class="minisector-row">
                <div class="minisector-container">
                  <span
                    v-for="(segment, index) in slotProps.data.Sectors?.[1]?.Segments"
                    :key="`s2-${slotProps.data.Lap}-${index}`"
                    :class="['minisector', getMinisectorClass(segment.Status)]"
                  ></span>
                </div>
              </div>
            </div>
          </template>
        </Column>
        <Column header="S3">
          <template #body="slotProps">
            <div class="time-cell-content">
              <div class="time-row">
                <span :class="['time-value', getSectorTimeClass(slotProps.data.Sectors?.[2])]">
                  {{ formatTime(slotProps.data.Sectors?.[2]?.Value) }}
                </span>
              </div>
              <div class="minisector-row">
                <div class="minisector-container">
                  <span
                    v-for="(segment, index) in slotProps.data.Sectors?.[2]?.Segments"
                    :key="`s3-${slotProps.data.Lap}-${index}`"
                    :class="['minisector', getMinisectorClass(segment.Status)]"
                  ></span>
                </div>
              </div>
            </div>
          </template>
        </Column>
        <Column field="Pitted" header="Pit">
          <template #body="slotProps">
            {{ slotProps.data.Pitted ? 'P' : '' }}
          </template>
        </Column>
        <Column field="TyreCompound" header="Tyre" />
        <template #empty>
          <div style="text-align: center; padding: 20px;">No lap history available for this driver yet.</div>
        </template>
      </DataTable>
    </div>
  </div>
</template>

<style scoped>
.lap-history-widget {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.driver-selection-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: #ddd;
}

.driver-selection-prompt h3 {
  margin-bottom: 1rem;
  color: #eee;
}

.lap-history-content {
  flex-grow: 1;
  overflow: hidden;
}

.lap-history-widget :deep(.p-datatable .p-datatable-thead > tr > th) {
  background-color: #333;
  color: #eee;
  font-weight: bold;
  padding: 4px 6px;
  border: none;
  border-bottom: 1px solid #555;
  text-align: left;
  white-space: nowrap;
}

.lap-history-widget :deep(.p-datatable .p-datatable-tbody > tr > td) {
  background-color: #222;
  color: #ddd;
  padding: 1px 4px;
  border: none;
  border-bottom: 1px solid #444;
  white-space: nowrap;
  vertical-align: middle;
  height: 2.9em;
  line-height: 1.1;
}

.lap-history-widget :deep(.p-datatable .p-datatable-tbody > tr:nth-child(even) > td) {
  background-color: #282828;
}

.lap-history-widget :deep(.p-datatable .p-datatable-tbody > tr.p-datatable-row-hover > td) {
  background-color: #3a3a3a;
}

.time-cell-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
}

.time-row {
  display: flex;
  justify-content: center;
  align-items: baseline;
  gap: 5px;
  width: 100%;
  min-height: 1.2em;
}

.time-value {
  display: inline-block;
  font-family: monospace;
  font-size: 0.95em;
  line-height: 1.1;
  text-align: right;
  flex-shrink: 0;
}

.minisector-row {
  width: 100%;
  margin-top: 1px;
  min-height: 0.8em;
  line-height: 1;
}

.minisector-container {
  display: flex;
  gap: 1px;
  height: 0.7em;
  align-items: center;
  justify-content: center;
}

.minisector {
  display: inline-block;
  width: 5px;
  height: 0.7em;
  border-radius: 1px;
}

.sector-overall-best { color: #b13bff !important; }
.sector-personal-best { color: #4caf50 !important; }
.minisector-set { background-color: #fdd835; }
.minisector-stopped { background-color: #555; }
.minisector-unknown { background-color: #777; }
.minisector-pb { background-color: #4caf50; }
.minisector-ob { background-color: #b13bff; }
.minisector-pit { background-color: #2196F3; }

.w-full {
  width: 100%;
}
</style>
