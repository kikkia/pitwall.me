<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useF1Store } from '@/stores/f1Store';
import { metrics, filters as filterDefinitions, tyreCompounds } from '@/utils/chartMetrics';
import { timeStringToMillis } from '@/utils/formatUtils';
import Chart from 'primevue/chart';
import Select from 'primevue/select';
import Button from 'primevue/button';

const f1Store = useF1Store();

const props = defineProps({
  selectedDrivers: { type: Array as () => string[], default: () => [] },
  favoritedDrivers: { type: Array as () => string[], default: () => [] },
  selectedMetricId: { type: String, default: '' },
  ignorePittedLaps: { type: Boolean, default: false },
  slowLapThreshold: { type: Number, default: 40 },
  selectedTyreCompounds: { type: Array as () => string[], default: () => [...tyreCompounds] },
  messageFontSize: { type: Number, default: 90 }
});

const emit = defineEmits(['update:widgetConfig']);

// Internal state refs
const internalSelectedDrivers = ref(props.selectedDrivers);
const internalFavoritedDrivers = ref(props.favoritedDrivers);
const internalMetricId = ref(props.selectedMetricId);
const internalIgnorePittedLaps = ref(props.ignorePittedLaps);
const internalSlowLapThreshold = ref(props.slowLapThreshold);
const internalSelectedTyreCompounds = ref(props.selectedTyreCompounds);

const hoveredDriver = ref<string | null>(null);

// Watchers to keep internal state in sync with props
watch(() => props.selectedDrivers, (newVal) => internalSelectedDrivers.value = newVal);
watch(() => props.favoritedDrivers, (newVal) => internalFavoritedDrivers.value = newVal);
watch(() => props.selectedMetricId, (newVal) => internalMetricId.value = newVal);
watch(() => props.ignorePittedLaps, (newVal) => internalIgnorePittedLaps.value = newVal);
watch(() => props.slowLapThreshold, (newVal) => internalSlowLapThreshold.value = newVal);
watch(() => props.selectedTyreCompounds, (newVal) => internalSelectedTyreCompounds.value = newVal);


const availableDrivers = computed(() => {
  return Array.from(f1Store.driversViewModelMap.values())
    .filter(driver => driver.racingNumber !== "_kf")
    .map(driver => ({
      label: `${driver.tla} (${driver.racingNumber})`,
      value: driver.racingNumber
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
});

const availableFavoriteDrivers = computed(() => {
  return internalSelectedDrivers.value.map(driverNumber => {
    const driverInfo = f1Store.driversViewModelMap.get(driverNumber);
    return {
      label: driverInfo ? `${driverInfo.tla} (${driverInfo.racingNumber})` : driverNumber,
      value: driverNumber
    };
  });
});

const selectedMetric = computed(() => metrics.find(m => m.id === internalMetricId.value)!);

const chartData = computed(() => {
  if (internalSelectedDrivers.value.length === 0) {
    return { labels: [], datasets: [] };
  }

  const allDriverLaps = internalSelectedDrivers.value.map(driverNumber => ({
      driverNumber,
      laps: f1Store.raceData.LapHistoryMap[driverNumber]?.CompletedLaps ? [...f1Store.raceData.LapHistoryMap[driverNumber].CompletedLaps] : [],
      stints: f1Store.raceData.TyreStintSeries?.Stints?.[driverNumber] ?? []
  }));

  // When in position mode, insert a fake lap 0 for all drivers with their starting position.
  if (selectedMetric.value.id === 'position') {
    allDriverLaps.forEach(({ driverNumber, laps, stints }) => {
      const driverInfo = f1Store.driversViewModelMap.get(driverNumber);
      if (driverInfo && driverInfo.startingPosition && parseInt(driverInfo.startingPosition, 10) > 0) {
        const startingLap = {
          Lap: 0,
          Pitted: false,
          Position: driverInfo.startingPosition,
          LapTime: '00:00.000',
          Sectors: [],
          TyreCompound: stints[0]?.Compound ?? 'UNKNOWN',
        };
        laps.unshift(startingLap as any);
      }
    });
  }

  const allCompletedLaps = allDriverLaps.flatMap(d => d.laps);
  if (allCompletedLaps.length === 0) {
    return { labels: [], datasets: [] };
  }

  // --- Filtering ---
  let fastestLapTime = Infinity;
  if (internalSlowLapThreshold.value > 0) {
    const validLapsForFastest = allCompletedLaps.filter(lap => lap.LapTime && !lap.Pitted);
    if (validLapsForFastest.length > 0) {
      fastestLapTime = Math.min(...validLapsForFastest.map(lap => timeStringToMillis(lap.LapTime)));
    }
  }
  
  const filteredLapData = allDriverLaps.map(({ driverNumber, laps, stints }) => {
      const filteredLaps = laps.filter(lap => {

          if (selectedMetric.value.id === 'position' && lap.Lap === 0) return true;
          
          const compound = lap.TyreCompound;

          if (internalIgnorePittedLaps.value && lap.Pitted) return false;
          if (!internalSelectedTyreCompounds.value.includes(compound)) return false;

          if (selectedMetric.value.id === 'lapTime' && fastestLapTime !== Infinity && internalSlowLapThreshold.value > 0) {
              if (!lap.LapTime) return false;
              const threshold = fastestLapTime * (1 + (internalSlowLapThreshold.value / 100));
              if (timeStringToMillis(lap.LapTime) > threshold) {
                  return false;
              }
          }
          return true;
      });
      return { driverNumber, laps: filteredLaps, stints };
  });
  // --- End Filtering ---

  const minLap = Math.min(...allCompletedLaps.map(lap => lap.Lap));
  let maxLap = Math.max(...allCompletedLaps.map(lap => lap.Lap));

  const lapCount = maxLap - minLap + 1;
  if (lapCount < 6) {
    maxLap = 6;
  }
  const labels = Array.from({ length: maxLap - minLap + 1 }, (_, i) => minLap + i);

  const teamColorUsage = new Map<string, number>();
  const datasets = filteredLapData.map(({ driverNumber, laps, stints }) => {
    const driverInfo = f1Store.driversViewModelMap.get(driverNumber);
    
    const pointData = labels.map(lapNumber => {
        const lap = laps.find(l => l.Lap === lapNumber);
        if (lap) {
            return {
                value: selectedMetric.value.valueGetter(lap, stints),
                tyre: lap.TyreCompound
            };
        }
        return null;
    });

    const teamColour = driverInfo ? `#${driverInfo.teamColour}` : "#FFFFFF";
    const usageCount = teamColorUsage.get(teamColour) || 0;
    teamColorUsage.set(teamColour, usageCount + 1);

    const isHovered = hoveredDriver.value === driverNumber || internalFavoritedDrivers.value.includes(driverNumber);
    const isDimmed = (hoveredDriver.value !== null || internalFavoritedDrivers.value.length > 0) && !isHovered;

    const finalBorderColor = isDimmed ? `${teamColour}40` : teamColour;

    return {
      label: driverInfo?.tla ?? driverNumber,
      racingNumber: driverNumber,
      data: pointData.map(p => p ? p.value : null),
      borderColor: finalBorderColor,
      borderWidth: isHovered ? 4 : 2,
      borderDash: usageCount > 0 ? [5, 5] : [],
      fill: false,
      tension: 0.1,
      spanGaps: true,
      pointRadius: pointData.map(p => p?.value !== null ? 4 : 0),
      pointHoverRadius: pointData.map(p => p?.value !== null ? 6 : 0),
      pointBackgroundColor: pointData.map(p => p ? `${getTyreCompoundColor(p.tyre)}${isDimmed ? '40' : ''}` : '#838383'),
      pointBorderColor: finalBorderColor,
      pointBorderWidth: isHovered ? 3 : 2,
    };
  });

  return { labels, datasets };
});

const chartOptions = computed(() => {
  const yAxisTicks: any = {
    color: '#ddd',
    callback: function(value: any) {
      return selectedMetric.value.formatter(value);
    }
  };

  if (['tyreAge', 'position'].includes(internalMetricId.value)) {
    yAxisTicks.stepSize = 1;
    yAxisTicks.precision = 0;
  }

  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    onHover: (event: any, elements: any, chart: any) => {
        if (elements.length > 0) {
            const datasetIndex = elements[0].datasetIndex;
            if(chart.data.datasets[datasetIndex]) {
                const racingNumber = chart.data.datasets[datasetIndex].racingNumber;
                hoveredDriver.value = racingNumber;
            }
        } else {
            hoveredDriver.value = null;
        }
    },
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#eee', font: { size: props.messageFontSize * 0.14 } }
      },
      tooltip: {
          callbacks: {
              label: function(context: any) {
                  let label = context.dataset.label || '';
                  if (label) { label += ': '; }
                  if (context.parsed.y !== null) {
                      label += selectedMetric.value.formatter(context.parsed.y);
                  }
                  return label;
              }
          }
      }
    },
    scales: {
      x: {
        title: { display: true, text: 'Lap Number', color: '#eee' },
        ticks: { color: '#ddd' },
        grid: { color: '#444' }
      },
      y: {
        title: { display: true, text: selectedMetric.value.label, color: '#eee' },
        ticks: yAxisTicks,
        grid: { color: '#444' }
      }
    }
  };
});

const settingsDefinition = computed(() => {
    const activeFilters = filterDefinitions.filter(f => f.appliesTo.includes(internalMetricId.value));
    return [
        {
            id: 'selectedMetricId',
            label: 'Y-Axis Metric',
            type: 'string',
            component: 'Select',
            options: metrics.map(m => ({ label: m.label, value: m.id })),
            props: { placeholder: "Select Metric" }
        },
        {
            id: 'selectedDrivers',
            label: 'Select Drivers',
            type: 'array',
            component: 'MultiSelect',
            options: availableDrivers.value,
            props: { placeholder: "Select Drivers", filter: true, optionLabel: 'label', optionValue: 'value' }
        },
        {
            id: 'favoritedDrivers',
            label: 'Favorite Drivers',
            type: 'array',
            component: 'MultiSelect',
            options: availableFavoriteDrivers.value,
            props: { placeholder: "Select Favorites", filter: true, optionLabel: 'label', optionValue: 'value' }
        },
        ...activeFilters.map(filter => ({
            id: filter.id,
            label: filter.label,
            type: typeof filter.defaultValue,
            component: filter.component,
            options: filter.options,
            props: filter.props
        })),
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
        case 'SOFT': return '#FF0000';
        case 'MEDIUM': return '#FFFF00';
        case 'HARD': return '#FFFFFF';
        case 'INTERMEDIATE': return '#00FF00';
        case 'WET': return '#0000FF';
        default: return '#838383';
    }
}

function handleMetricSelection(event: any) {
  internalMetricId.value = event.value;
  emit('update:widgetConfig', { selectedMetric: event.value });
}

const widgetStyle = computed(() => ({
    fontSize: `${props.messageFontSize}%`
}));

function selectAllDrivers() {
  const allDriverIds = availableDrivers.value.map(d => d.value);
  internalSelectedDrivers.value = allDriverIds;
  emit('update:widgetConfig', { selectedDrivers: allDriverIds });
}

</script>

<template>
  <div class="custom-chart-widget" :style="widgetStyle">
    <div v-if="internalMetricId == ''" class="selection-prompt">
      <h3>Select A metric type to chart</h3>
      <Select
        :model-value="internalMetricId"
        :options="metrics.map(m => ({ label: m.label, value: m.id }))"
        optionLabel="label"
        optionValue="value"
        placeholder="Select metric to start"
        :filter="true"
        class="w-full"
        @change="handleMetricSelection"
      />
    </div>
    <div v-else class="chart-container">
      <div v-if="internalSelectedDrivers.length === 0" class="selection-prompt">
        <h3>Select drivers to display data</h3>
        <p>Use the settings panel to select drivers.</p>
        <Button label="Select All Drivers" @click="selectAllDrivers" class="p-button-sm p-button-success" />
      </div>
      <Chart v-else type="line" :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>

<style scoped>
.custom-chart-widget {
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

.selection-prompt p {
  margin-top: 1rem;
  font-size: 0.9em;
  color: #ccc;
}

.selection-prompt .p-button {
  margin-top: 1.5rem;
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