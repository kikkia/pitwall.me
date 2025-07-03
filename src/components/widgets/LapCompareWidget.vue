<template>
  <div class="lap-compare-widget">
    <div v-if="selectedDrivers.length < 2" class="placeholder">
      Select at least two drivers in settings to compare their laps.
    </div>
    <table v-else class="compare-table">
      <thead>
        <tr>
          <th>Driver</th>
          <th>Lap Time</th>
          <th>S1</th>
          <th>S2</th>
          <th>S3</th>
          <th>Tyre</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="driver in driversToCompare" :key="driver.racingNumber">
          <td class="driver-info">
            <span class="driver-color" :style="{ backgroundColor: `#${driver.teamColour}` }"></span>
            {{ driver.tla }} ({{ driver.racingNumber }})
          </td>
          <td>{{ formatLapTime(driver.lastLapTimeMillis) }}</td>
          <td>{{ formatSectorTime(driver.lastSector1TimeMillis) }}</td>
          <td>{{ formatSectorTime(driver.lastSector2TimeMillis) }}</td>
          <td>{{ formatSectorTime(driver.lastSector3TimeMillis) }}</td>
          <td :style="getTireStyle(driver)">
            {{ driver.currentStint?.compound?.charAt(0) || '' }}
            <span v-if="driver.currentTyreAge !== null"> ({{ driver.currentTyreAge }})</span>
          </td>
        </tr>
        <tr v-if="driversToCompare.length >= 2" class="diff-row">
          <td class="driver-info">Diff (vs {{ driversToCompare[0]?.tla }})</td>
          <td>{{ formatDiff(getLapTimeDiff(driversToCompare[0], driversToCompare[1])) }}</td>
          <td>{{ formatDiff(getSectorDiff(driversToCompare[0], driversToCompare[1], 1)) }}</td>
          <td>{{ formatDiff(getSectorDiff(driversToCompare[0], driversToCompare[1], 2)) }}</td>
          <td>{{ formatDiff(getSectorDiff(driversToCompare[0], driversToCompare[1], 3)) }}</td>
          <td></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useF1Store } from '../../stores/f1Store';
import { formatLapTime, formatSectorTime, formatDiff, timeStringToMillis } from '../../utils/formatUtils';
import type { DriverViewModel } from '../../types/dataTypes';

const props = withDefaults(defineProps<{
  selectedDrivers?: string[];
}>(), {
  selectedDrivers: () => []
});

const f1Store = useF1Store();

const settingsDefinition = ref([
  {
    id: 'selectedDrivers',
    label: 'Select Drivers',
    type: 'array',
    options: computed(() =>
      Array.from(f1Store.driversViewModelMap.values())
        .filter((d) => d.racingNumber !== "_kf")
        .map((d) => ({
          value: d.racingNumber.toString(),
          label: `${d.tla} (${d.racingNumber})`,
        }))
        .sort((a, b) => parseInt(a.value) - parseInt(b.value))
    ),
    component: 'MultiSelect',
    props: {
      optionLabel: 'label',
      optionValue: 'value',
    },
  },
]);

defineExpose({ settingsDefinition });

const driversToCompare = computed(() => {
  return props.selectedDrivers
    .map(driverNumber => {
      const driverVm = f1Store.driversViewModelMap.get(driverNumber);
      if (!driverVm) return null;

      const lapHistory = f1Store.raceData.LapHistoryMap[driverNumber];
      const lastLap = lapHistory?.CompletedLaps?.[lapHistory.CompletedLaps.length - 1];

      const lastLapTimeMillis = lastLap ? timeStringToMillis(lastLap.LapTime) : null;
      const lastSector1TimeMillis = lastLap?.Sectors?.[0] ? timeStringToMillis(lastLap.Sectors[0].Value) : null;
      const lastSector2TimeMillis = lastLap?.Sectors?.[1] ? timeStringToMillis(lastLap.Sectors[1].Value) : null;
      const lastSector3TimeMillis = lastLap?.Sectors?.[2] ? timeStringToMillis(lastLap.Sectors[2].Value) : null;
      
      const currentStint = driverVm.currentStint;
      const currentTyreAge = currentStint ? currentStint.totalLaps - currentStint.startLaps + 1 : null;

      return {
        ...driverVm,
        lastLapTimeMillis,
        lastSector1TimeMillis,
        lastSector2TimeMillis,
        lastSector3TimeMillis,
        currentTyreAge,
      };
    })
    .filter((driver): driver is (DriverViewModel & {
      lastLapTimeMillis: number | null;
      lastSector1TimeMillis: number | null;
      lastSector2TimeMillis: number | null;
      lastSector3TimeMillis: number | null;
      currentTyreAge: number | null;
    }) => driver !== null)
    .sort((a, b) => parseInt(a.racingNumber) - parseInt(b.racingNumber));
});

const getLapTimeDiff = (driver1: typeof driversToCompare.value[0], driver2: typeof driversToCompare.value[0]) => {
  if (!driver1 || !driver2 || driver1.lastLapTimeMillis === null || driver2.lastLapTimeMillis === null) return null;
  return driver2.lastLapTimeMillis - driver1.lastLapTimeMillis;
};

const getSectorDiff = (driver1: typeof driversToCompare.value[0], driver2: typeof driversToCompare.value[0], sector: 1 | 2 | 3) => {
  if (!driver1 || !driver2) return null;
  const sectorTimeKey = `lastSector${sector}TimeMillis` as const;
  const sector1Time = driver1[sectorTimeKey];
  const sector2Time = driver2[sectorTimeKey];
  if (sector1Time === null || sector2Time === null || typeof sector1Time !== 'number' || typeof sector2Time !== 'number') return null;
  return sector2Time - sector1Time;
};

function getTireStyle(driver: DriverViewModel) {
  const compound = driver.currentStint?.compound;
  let color = '';

  switch (compound) {
    case 'HARD':
      color = '#FFFFFF'; 
      break;
    case 'MEDIUM':
      color = '#FFFF00';
      break;
    case 'SOFT':
      color = '#FF0000';
      break;
    case 'INTERMEDIATE':
      color = '#00FF00';
      break;
    case 'WET':
      color = '#0000FF';
      break;
    default:
      color = '#808080';
  }

  return {
    color: color
  };
}
</script>

<style scoped>
.lap-compare-widget {
  padding: 10px;
  background-color: #1e1e1e;
  color: #eee;
  border-radius: 8px;
  font-family: 'Formula1 Display', sans-serif;
  font-size: 0.9em;
  height: 100%;
  overflow: auto;
}

.placeholder {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  text-align: center;
  color: #aaa;
}

.compare-table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 2px 4px;
  text-align: left;
  border-bottom: 1px solid #444;
  white-space: nowrap;
}

th {
  background-color: #333;
  color: #eee;
  font-weight: bold;
}

td {
  background-color: #222;
  color: #ddd;
}

tr:nth-child(even) td {
   background-color: #282828;
}

.driver-info {
  text-align: left;
  white-space: nowrap;
  display: flex;
  align-items: center;
}

.driver-color {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 8px;
  flex-shrink: 0;
}

.diff-row td {
  background-color: #3a3a3a;
  font-weight: bold;
  color: #fff;
}
</style>
