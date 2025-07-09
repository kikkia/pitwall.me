<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useF1Store } from '@/stores/f1Store';
import Chart from 'primevue/chart';
import MultiSelect from 'primevue/multiselect';

const f1Store = useF1Store();

const props = defineProps({
  selectedDrivers: {
    type: Array as () => string[],
    default: () => []
  },
  ignorePittedLaps: {
    type: Boolean,
    default: false
  },
  messageFontSize: { type: Number, default: 90 }
});

const emit = defineEmits(['update:widgetConfig']);

const internalSelectedDrivers = ref<string[]>(props.selectedDrivers);
const internalIgnorePittedLaps = ref(props.ignorePittedLaps);

watch(() => props.selectedDrivers, (newVal) => {
  internalSelectedDrivers.value = newVal;
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

const chartData = computed(() => {
  if (internalSelectedDrivers.value.length === 0) {
    return { labels: [], datasets: [] };
  }

  const allLaps = internalSelectedDrivers.value.flatMap(driverNumber =>
    f1Store.raceData.LapHistoryMap[driverNumber]?.CompletedLaps ?? []
  );

  if (allLaps.length === 0) {
    return { labels: [], datasets: [] };
  }

  const minLap = Math.min(...allLaps.map(lap => lap.Lap));
  const maxLap = Math.max(...allLaps.map(lap => lap.Lap));
  const labels = Array.from({ length: maxLap - minLap + 1 }, (_, i) => minLap + i);

  const teamColorUsage = new Map<string, number>();
  const datasets = internalSelectedDrivers.value.map(driverNumber => {
    const driverInfo = f1Store.driversViewModelMap.get(driverNumber);
    const lapHistory = f1Store.raceData.LapHistoryMap[driverNumber]?.CompletedLaps ?? [];
    
    const pointData = labels.map(lapNumber => {
        const lap = lapHistory.find(l => l.Lap === lapNumber);
        if (lap && lap.LapTime) {
            if (internalIgnorePittedLaps.value && lap.Pitted) {
                return null;
            }
            return {
                time: parseLapTime(lap.LapTime),
                tyre: lap.TyreCompound
            };
        }
        return null;
    });

    const teamColour = driverInfo ? `#${driverInfo.teamColour}` : "#FFFFFF";
    const usageCount = teamColorUsage.get(teamColour) || 0;
    teamColorUsage.set(teamColour, usageCount + 1);

    return {
        label: driverInfo?.tla ?? driverNumber,
        racingNumber: driverNumber,
        data: pointData.map(p => p ? p.time : null),
        borderColor: teamColour,
        borderDash: usageCount > 0 ? [5, 5] : [],
        fill: false,
        tension: 0.1,
        spanGaps: true,
        pointRadius: pointData.map(p => p ? 4 : 0),
        pointHoverRadius: pointData.map(p => p ? 6 : 0),
        pointBackgroundColor: pointData.map(p => p ? getTyreCompoundColor(p.tyre) : '#838383'),
        pointBorderColor: teamColour,
        pointBorderWidth: 2,
    };
  });

  return { labels, datasets };
});

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  plugins: {
    legend: {
      position: 'top',
      labels: {
        color: '#eee',
        font: {
            size: props.messageFontSize * 0.14
        }
      }
    },
    tooltip: {
        callbacks: {
            label: function(context: any) {
                let label = context.dataset.label || '';
                if (label) {
                    label += ': ';
                }
                if (context.parsed.y !== null) {
                    label += formatSecondsToLapTime(context.parsed.y);
                }

                const driverNumber = context.dataset.racingNumber;
                const lapNumber = parseInt(context.label, 10);
                if (driverNumber && !isNaN(lapNumber)) {
                    const lapHistory = f1Store.raceData.LapHistoryMap[driverNumber]?.CompletedLaps ?? [];
                    const lap = lapHistory.find(l => l.Lap === lapNumber);
                    if (lap && lap.TyreCompound) {
                        label += ` (${lap.TyreCompound})`;
                    }
                }
                
                return label;
            }
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
      ticks: { color: '#ddd' },
      grid: { color: '#444' }
    },
    y: {
      title: {
        display: true,
        text: 'Lap Time',
        color: '#eee'
      },
      ticks: {
        color: '#ddd',
        callback: function(value: any) {
          return formatSecondsToLapTime(value);
        }
      },
      grid: { color: '#444' }
    }
  }
}));

const settingsDefinition = computed(() => {
  return [
    {
      id: 'selectedDrivers',
      label: 'Select Drivers',
      type: 'array',
      component: 'MultiSelect',
      options: availableDrivers.value,
      props: {
        placeholder: "Select Drivers",
        filter: true,
        optionLabel: 'label',
        optionValue: 'value'
      }
    },
    {
      id: 'ignorePittedLaps',
      label: 'Ignore Pitted Laps',
      type: 'boolean',
      component: 'Checkbox'
    },
    { 
      id: 'messageFontSize', 
      label: 'Font Size (%)', 
      type: 'number', 
      component: 'Slider',
      props: { min: 50, max: 150, step: 10 }
    },
  ];
});

defineExpose({ settingsDefinition });

function getTyreCompoundColor(compound: string): string {
    if (!compound) return '#838383';
    const upperCompound = compound.toUpperCase();
    switch (upperCompound) {
        case 'SOFT': return '#FF0000'; // Red
        case 'MEDIUM': return '#FFFF00'; // Yellow
        case 'HARD': return '#FFFFFF'; // White
        case 'INTERMEDIATE': return '#00FF00'; // Green
        case 'WET': return '#0000FF'; // Blue
        default: return '#838383';
    }
}

function parseLapTime(lapTime: string): number | null {
  if (!lapTime || lapTime === "N/A") return null;
  const parts = lapTime.split(':');
  if (parts.length === 2) {
    const minutes = parseInt(parts[0], 10);
    const seconds = parseFloat(parts[1]);
    return minutes * 60 + seconds;
  }
  return parseFloat(lapTime);
}

function formatSecondsToLapTime(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds === null) return '-.--';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toFixed(3).padStart(6, '0')}`;
}

function handleDriverSelection(event: any) {
  // This is for the initial selection, settings are handled via props
  internalSelectedDrivers.value = event.value;
  emit('update:widgetConfig', { selectedDrivers: event.value });
}

const widgetStyle = computed(() => ({
    fontSize: `${props.messageFontSize}%`
}));

</script>

<template>
  <div class="lap-time-chart-widget" :style="widgetStyle">
    <div v-if="!internalSelectedDrivers || internalSelectedDrivers.length === 0" class="selection-prompt">
      <h3>Select drivers to compare lap times</h3>
      <MultiSelect
        :model-value="internalSelectedDrivers"
        :options="availableDrivers"
        optionLabel="label"
        optionValue="value"
        placeholder="Select Drivers to start"
        :filter="true"
        class="w-full"
        @change="handleDriverSelection"
      />
    </div>
    <div v-else class="chart-container">
      <Chart type="line" :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>

<style scoped>
.lap-time-chart-widget {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  font-family: 'Formula1', sans-serif;
}

.selection-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  padding: 10px;
}

.selection-prompt h3 {
  margin-bottom: 1rem;
  font-size: 1.2em;
}

.chart-container {
  flex-grow: 1;
  min-height: 0;
  height: 100%;
  width: 100%;
}

.chart-container :deep(.p-chart) {
  position: relative;
  height: 100%;
  width: 100%;
}

.w-full {
  width: 100%;
  max-width: 300px;
}
</style>