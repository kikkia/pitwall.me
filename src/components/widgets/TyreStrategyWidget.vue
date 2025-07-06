<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useF1Store } from '@/stores/f1Store';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
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
  ignorePittedLaps: { type: Boolean, default: false }
});

const emit = defineEmits(['update:widgetConfig']);

const totalRaceLaps = computed(() => {
  const lapHistories = Object.values(f1Store.raceData.LapHistoryMap);
  if (lapHistories.length > 0) {
    const maxLaps = Math.max(...lapHistories.map(h => h.CompletedLaps.length));
    if (maxLaps > 0) {
      return maxLaps;
    }
  }
  return 10; // Just some random default
});

const allDriversData = computed(() => {
  if (!f1Store.raceData.TyreStintSeries?.Stints) {
    return [];
  }

  return f1Store.sortedDriversViewModel
    .filter(driver => driver.racingNumber !== "_kf" && f1Store.raceData.TyreStintSeries.Stints[driver.racingNumber])
    .map(driver => {
      const stints = f1Store.raceData.TyreStintSeries.Stints[driver.racingNumber] || [];
      return {
        ...driver,
        stints: stints.map(stint => ({
          ...stint,
          width: ((stint.TotalLaps - stint.StartLaps) / totalRaceLaps.value) * 100,
          stintLaps: stint.TotalLaps - stint.StartLaps,
        })),
      };
    });
});

const handleRowClick = (event: any) => {
  const driverNumber = event.data.racingNumber;
  internalSelectedDriverNumber.value = driverNumber;
  emit('update:widgetConfig', { selectedDriverNumber: driverNumber });
};

const goBack = () => {
  internalSelectedDriverNumber.value = null;
  emit('update:widgetConfig', { selectedDriverNumber: null });
};


const internalSelectedDriverNumber = ref<string | null>(props.selectedDriverNumber);
const internalIgnorePittedLaps = ref(props.ignorePittedLaps);

watch(() => props.selectedDriverNumber, (newVal) => {
  internalSelectedDriverNumber.value = newVal;
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
    'UNKNOWN': '#808080', // Grey
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


function formatTyreCompound(compound: string): string {
  switch (compound) {
    case 'SOFT': return 'S';
    case 'MEDIUM': return 'M';
    case 'HARD': return 'H';
    case 'INTERMEDIATE': return 'I';
    case 'WET': return 'W';
    case 'UNKNOWN': return '?';
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
    case 'UNKNOWN': return 'tyre-unknown';
    default: return '';
  }
}

</script>

<template>
  <div class="widget tyre-stints-widget" :style="tableStyle">
    <TransitionGroup tag="div" name="list" v-if="!internalSelectedDriverNumber" class="driver-list-timeline">
      <div
        v-for="driver in allDriversData"
        :key="driver.racingNumber"
        class="driver-row"
        @click="handleRowClick({ data: driver })"
        :style="{ opacity: driver.stopped || driver.retired ? 0.5 : 1 }"
      >
        <div class="driver-info">
          <span class="position">{{ driver.position }}</span>
          <span class="tla" :style="{ color: '#' + driver.teamColour }">{{ driver.tla }}</span>
        </div>
        <div class="stint-timeline">
          <div
            v-for="(stint, index) in driver.stints"
            :key="index"
            class="stint-segment"
            :style="{ width: stint.width + '%' }"
          >
            <div class="stint-line" :class="getTyreCompoundClass(stint.Compound)"></div>
            <div class="stint-pill" :class="getTyreCompoundClass(stint.Compound)">
              <span class="stint-label">{{ formatTyreCompound(stint.Compound) }}</span>
              <span class="stint-laps">{{ stint.stintLaps }}</span>
            </div>
          </div>
        </div>
      </div>
    </TransitionGroup>
    <div v-else class="graph-view">
      <button @click="goBack" class="back-button">Back to Driver List</button>
      <div class="tyre-stints-graph">
        <Chart type="line" :data="chartData" :options="chartOptions" />
      </div>
      <div class="tyre-stints-list">
        <DataTable
          :value="selectedDriverTyreStints"
          responsiveLayout="scroll"
          class="p-datatable-sm"
          sortMode="single"
          sortField="StartLaps"
          :sortOrder="-1"
          rowHover
        >
          <Column field="TotalLaps" header="Tyre Age" :style="{ width: '60px' }" />
          <Column field="Compound" header="Tyre">
            <template #body="stintSlotProps">
              <span :class="['tyre-compound-indicator', getTyreCompoundClass(stintSlotProps.data.Compound)]">
                {{ formatTyreCompound(stintSlotProps.data.Compound) }}
              </span>
            </template>
          </Column>
          <Column header="Status">
            <template #body="stintSlotProps">
              <Tag v-if="stintSlotProps.data.New === 'true'" severity="success" value="New" class="mr-1"></Tag>
              <Tag v-if="stintSlotProps.data.StartLaps > 0" severity="warn" :value="`Used: ${stintSlotProps.data.StartLaps} laps`" class="mr-1"></Tag>
              <Tag v-if="isCurrentStint(stintSlotProps.data)" severity="success" value="Current"></Tag>
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
  font-family: 'Formula1', sans-serif;
}

.driver-list-timeline {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
  height: 100%;
}

.driver-row {
  display: flex;
  align-items: center;
  background-color: #1a1a1a;
  padding: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.driver-row:hover {
  background-color: #2c2c2c;
}

.driver-info {
  display: flex;
  align-items: center;
  width: 100px;
}

.position {
  width: 30px;
  text-align: center;
  font-weight: bold;
}

.tla {
  font-weight: bold;
}

.stint-timeline {
  display: flex;
  flex-grow: 1;
  height: 20px;
  align-items: center;
}

.stint-segment {
  position: relative;
  height: 100%;
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

.stint-line {
  position: absolute;
  width: 100%;
  height: 2px;
  top: 50%;
  transform: translateY(-50%);
}

.tyre-soft.stint-line { background-color: #E74C3C; }
.tyre-medium.stint-line { background-color: #F1C40F; }
.tyre-hard.stint-line { background-color: #FFFFFF; }
.tyre-intermediate.stint-line { background-color: #27AE60; }
.tyre-wet.stint-line { background-color: #2d04e4; }
.tyre-unknown.stint-line { background-color: #808080; }

.stint-pill {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 1px;
  align-items: center;
  padding: 2px 5px;
  border-radius: 10px;
  color: black;
  font-weight: bold;
  font-size: 0.8em;
}

.graph-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.back-button {
  margin-bottom: 10px;
  padding: 5px 10px;
  background-color: #444;
  color: #eee;
  border: 1px solid #666;
  cursor: pointer;
}

.tyre-stints-graph {
  flex-grow: 1;
  min-height: 150px;
}

.tyre-stints-list {
  flex-grow: 1;
  margin-top: 10px;
  overflow-y: auto;
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
.tyre-unknown { background-color: #808080; }

.w-full {
  width: 100%;
}

.mr-1 {
  margin-right: 0.25rem;
}

.current-indicator {
 background-color: #27AE60;
 color: #fff;
 padding: 2px 6px;
 border-radius: 4px;
 font-size: 0.7em;
 margin-left: 5px;
 white-space: nowrap;
}
  .list-move,
  .list-enter-active,
  .list-leave-active {
    transition: all 0.5s ease;
  }

  .list-enter-from,
  .list-leave-to {
    opacity: 0;
    transform: translateX(30px);
  }

  .list-leave-active {
    position: absolute;
    width: 100%;
  }
</style>