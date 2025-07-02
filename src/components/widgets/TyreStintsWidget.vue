<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useF1Store } from '@/stores/f1Store';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Dropdown from 'primevue/dropdown';
import Chart from 'primevue/chart'; 
import Tag from 'primevue/tag';
import type { StintData, CompletedLap } from '@/types/dataTypes';

const f1Store = useF1Store();

const props = defineProps({
  selectedDriverNumber: {
    type: String,
    default: null
  },
  messageFontSize: { type: Number, default: 90 },
  displayMode: { type: String, default: 'list' },
  ignorePittedLaps: { type: Boolean, default: false }
});

const emit = defineEmits(['update:widgetConfig']);

const internalSelectedDriverNumber = ref(props.selectedDriverNumber);
const internalDisplayMode = ref(props.displayMode);
const internalIgnorePittedLaps = ref(props.ignorePittedLaps);

watch(() => props.selectedDriverNumber, (newVal) => {
  internalSelectedDriverNumber.value = newVal;
});

watch(() => props.displayMode, (newVal) => {
  internalDisplayMode.value = newVal;
});

watch(() => props.ignorePittedLaps, (newVal) => {
  internalIgnorePittedLaps.value = newVal;
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

const selectedDriverTyreStints = computed<StintData[]>(() => {
  if (!internalSelectedDriverNumber.value) {
    return [];
  }
  const stints = f1Store.raceData.TyreStintSeries.Stints[internalSelectedDriverNumber.value];
  return stints ? stints.slice().reverse() : [];
});

const isCurrentStint = (stint: StintData): boolean => {
 return selectedDriverTyreStints.value.length > 0 && stint === selectedDriverTyreStints.value[0];
};

const lapHistoryForSelectedDriver = computed<CompletedLap[]>(() => {
  if (!internalSelectedDriverNumber.value) {
    return [];
  }
  const lapHistory = f1Store.raceData.LapHistoryMap[internalSelectedDriverNumber.value];
  return lapHistory ? lapHistory.CompletedLaps : [];
});

const chartData = computed(() => {
  const labels: number[] = [];
  const datasets: any[] = [];
  const stintColors: Record<string, string> = {
    'SOFT': '#E74C3C', // Red
    'MEDIUM': '#F1C40F', // Yellow
    'HARD': '#FFFFFF', // White
    'INTERMEDIATE': '#27AE60', // Green
    'WET': '#2d04e4', // Blue
  };

  if (!internalSelectedDriverNumber.value || selectedDriverTyreStints.value.length === 0 || lapHistoryForSelectedDriver.value.length === 0) {
    return { labels: [], datasets: [] };
  }

  // Determine the range of laps
  const minLap = Math.min(...lapHistoryForSelectedDriver.value.map(lap => lap.Lap));
  const maxLap = Math.max(...lapHistoryForSelectedDriver.value.map(lap => lap.Lap));

  for (let i = minLap; i <= maxLap; i++) {
    labels.push(i);
  }

  // Since stint data uses tyre age not session lap, we need to sequentiually keep track of laps over stints
  let stintStartLap = 0

  selectedDriverTyreStints.value.slice().reverse().forEach(stint => {
    const data: (number | null)[] = [];
    const pointBackgroundColors: string[] = [];
    const pointRadii: number[] = [];

    const stintLaps = lapHistoryForSelectedDriver.value.filter(lap =>
      lap.Lap >= stintStartLap && lap.Lap <= stintStartLap + (stint.TotalLaps - stint.StartLaps)
    ).filter(lap => 
      lap.LapTime !== "N/A"
    );

    labels.forEach(lapNumber => {
      const lap = stintLaps.find(l => l.Lap === lapNumber);
      if (lap && lap.LapTime) {
        if (internalIgnorePittedLaps.value && lap.Pitted) {
          data.push(null);
          pointBackgroundColors.push('transparent');
          pointRadii.push(0);
        } else {
          data.push(parseLapTime(lap.LapTime));
          if (lap.Pitted) {
            pointBackgroundColors.push('#2196F3');
            pointRadii.push(5); 
          } else {
            pointBackgroundColors.push(stintColors[stint.Compound] || '#FFFFFF');
            pointRadii.push(3);
          }
        }
      } else {
        data.push(null);
        pointBackgroundColors.push('transparent');
        pointRadii.push(0);
      }
    });

    datasets.push({
      label: `${formatTyreCompound(stint.Compound)} (${stintStartLap}-${stintStartLap + stint.TotalLaps - stint.StartLaps})`,
      data: data,
      borderColor: stintColors[stint.Compound] || "#FFFFFF",
      fill: false,
      tension: 0.1,
      spanGaps: true,
      pointBackgroundColor: pointBackgroundColors,
      pointRadius: pointRadii
    });

    // Increment stint start
    stintStartLap += stint.TotalLaps - stint.StartLaps
  });

  return {
    labels: labels,
    datasets: datasets.reverse() // Reverse to show earlier stints first in legend
  };
});

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  plugins: {
    legend: {
      labels: {
        color: '#eee'
      }
    }
  },
  scales: {
    x: {
      title: {
        display: true,
        text: 'Lap Number',
        color: '#eee'
      },
      ticks: {
        color: '#ddd'
      },
      grid: {
        color: '#444'
      }
    },
    y: {
      title: {
        display: true,
        text: 'Lap Time (seconds)',
        color: '#eee'
      },
      ticks: {
        color: '#ddd',
        callback: function(value: any) {
          return formatSecondsToLapTime(value);
        }
      },
      grid: {
        color: '#444'
      }
    }
  }
}));

function parseLapTime(lapTime: string): number {
  if (!lapTime) return 0;
  const parts = lapTime.split(':');
  if (parts.length === 2) {
    const minutes = parseInt(parts[0], 10);
    const seconds = parseFloat(parts[1]);
    return minutes * 60 + seconds;
  }
  return parseFloat(lapTime);
}

function formatSecondsToLapTime(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds === 0) return '-.--';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toFixed(3).padStart(6, '0')}`;
}

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
    },
    {
      id: 'displayMode',
      label: 'Display Mode',
      type: 'string',
      component: 'Dropdown',
      options: [
        { label: 'List', value: 'list' },
        { label: 'Graph', value: 'graph' },
        { label: 'Both', value: 'both' }
      ],
      props: {
        placeholder: "Select Display Mode"
      }
    },
    { 
      id: 'ignorePittedLaps', 
      label: 'Ignore Pitted Laps', 
      type: 'boolean', 
      component: 'Checkbox' 
    }
  ];
});

defineExpose({ settingsDefinition });

const tableStyle = computed(() => ({
    fontSize: `${props.messageFontSize}%`
}));

function handleDriverSelection(event: any) {
  internalSelectedDriverNumber.value = event.value;
  emit('update:widgetConfig', { selectedDriverNumber: event.value });
}

function formatTyreCompound(compound: string): string {
  switch (compound) {
    case 'SOFT': return 'S';
    case 'MEDIUM': return 'M';
    case 'HARD': return 'H';
    case 'INTERMEDIATE': return 'I';
    case 'WET': return 'W';
    default: return compound;
  }
}

function getTyreCompoundClass(compound: string): string {
  switch (compound) {
    case 'SOFT': return 'tyre-soft';
    case 'MEDIUM': return 'tyre-medium';
    case 'HARD': return 'tyre-hard';
    case 'INTERMEDIATE': return 'tyre-intermediate';
    case 'WET': return 'tyre-wet';
    default: return '';
  }
}

</script>

<template>
  <div class="widget tyre-stints-widget" :style="tableStyle">
    <div v-if="!internalSelectedDriverNumber" class="driver-selection-prompt">
      <h3>Select a driver to view tyre stints</h3>
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
    <div v-else class="tyre-stints-content">
      <div v-if="internalDisplayMode === 'graph' || internalDisplayMode === 'both'" class="tyre-stints-graph">
        <Chart type="line" :data="chartData" :options="chartOptions" />
      </div>
      <div v-if="internalDisplayMode === 'list' || internalDisplayMode === 'both'" class="tyre-stints-list">
        <DataTable
          :value="selectedDriverTyreStints"
          responsiveLayout="scroll"
          class="p-datatable-sm"
          sortMode="single"
          sortField="StartLaps"
          :sortOrder="-1"
          rowHover
        >
          <Column field="TotalLaps" header="Tyre Age" :style="{ width: '60px' }">
            <template #body="slotProps">
              {{ slotProps.data.TotalLaps }}
            </template>
          </Column>
          <Column field="Compound" header="Tyre">
            <template #body="slotProps">
              <span :class="['tyre-compound-indicator', getTyreCompoundClass(slotProps.data.Compound)]">
                {{ formatTyreCompound(slotProps.data.Compound) }}
              </span>
            </template>
          </Column>
          <Column header="Status">
            <template #body="slotProps">
              <Tag v-if="slotProps.data.New === 'true'" severity="success" value="New" class="mr-1"></Tag>
              <Tag v-if="slotProps.data.StartLaps > 0" severity="warn" :value="`Used: ${slotProps.data.StartLaps} laps`" class="mr-1"></Tag>
              <Tag v-if="isCurrentStint(slotProps.data)" severity="success" value="Current"></Tag>
            </template>
          </Column>
          <template #empty>
            <div style="text-align: center; padding: 20px;">No tyre stint history available for this driver yet.</div>
          </template>
        </DataTable>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tyre-stints-widget {
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

.tyre-stints-content {
  flex-grow: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

.tyre-stints-graph {
  flex-grow: 0;
  padding: 0;
}

.tyre-stints-list {
  flex-grow: 1;
  margin-top: 0;
}

.tyre-stints-widget :deep(.p-datatable .p-datatable-thead > tr > th) {
  background-color: #333;
  color: #eee;
  font-weight: bold;
  padding: 4px 6px;
  border: none;
  border-bottom: 1px solid #555;
  text-align: left;
  white-space: nowrap;
}

.tyre-stints-widget :deep(.p-datatable .p-datatable-tbody > tr > td) {
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

.tyre-stints-widget :deep(.p-datatable .p-datatable-tbody > tr:nth-child(even) > td) {
  background-color: #282828;
}

.tyre-stints-widget :deep(.p-datatable .p-datatable-tbody > tr.p-datatable-row-hover > td) {
  background-color: #3a3a3a;
}

.tyre-compound-indicator {
  display: inline-block;
  width: 20px; 
  height: 20px; 
  border-radius: 50%;
  text-align: center;
  line-height: 20px;
  font-size: 0.8em;
  font-weight: bold;
  color: black;
}

.tyre-soft { background-color: #E74C3C; }
.tyre-medium { background-color: #F1C40F; }
.tyre-hard { background-color: #FFFFFF; }
.tyre-intermediate { background-color: #27AE60; }
.tyre-wet { background-color: #2d04e4; }

.w-full {
  width: 100%;
}

.mr-1 {
  margin-right: 0.25rem; /* 4px */
}

.current-indicator {
 background-color: #27AE60; /* Green color from the image */
 color: #fff;
 padding: 2px 6px;
 border-radius: 4px;
 font-size: 0.7em;
 margin-left: 5px;
 white-space: nowrap;
}
</style>