<script setup lang="ts">
import { computed, ref } from 'vue';
import { useF1Store } from '@/stores/f1Store';
import { useTrackStore } from '@/stores/trackStore';
import type { DriverViewModel, StintViewModel } from '@/types/dataTypes';

const f1Store = useF1Store();
const trackStore = useTrackStore();

const props = defineProps({
  messageFontSize: { type: Number, default: 90 }
});

const isRaceSession = computed(() => f1Store.currentSessionType === 'Race');

const selectedDriverNumber = ref<string | null>(null);

const drivers = computed(() => {
  return f1Store.sortedDriversViewModel.filter((driver) => driver.racingNumber !== "_kf" && !driver.retired && !driver.stopped);
});

const selectedDriver = computed(() => {
    if (!selectedDriverNumber.value) return null;
    return f1Store.driversViewModelMap.get(selectedDriverNumber.value) || null;
});

const trackStatus = computed(() => f1Store.raceData.TrackStatus?.Status || '1');

const adjustedPitDelta = computed(() => {
    const baseDelta = trackStore.trackInfo?.pitDelta || 21;
    switch (trackStatus.value) {
        case '2': // VSC
        case '6': // VSC Ending
            return baseDelta * 0.7;
        case '4': // Safety Car
        case '5': // Safety Car ending
            return baseDelta * 0.5;
        default:
            return baseDelta;
    }
});

function getGapInSeconds(driver: DriverViewModel): number | null {
    if (driver.position === '1') {
        return 0;
    }
    if (!driver.gapToLeader || driver.gapToLeader.includes('L')) {
        return null;
    }
    const parsed = parseFloat(driver.gapToLeader);
    return isNaN(parsed) ? null : parsed;
}

const pitExitScenario = computed(() => {
    if (!selectedDriver.value || selectedDriver.value.inPit || !isRaceSession.value) return null;

    const pittingDriver = selectedDriver.value;
    const pittingDriverGap = getGapInSeconds(pittingDriver);

    if (pittingDriverGap === null) return null;

    const projectedGapToLeader = pittingDriverGap + adjustedPitDelta.value;
    const pitWindow = 5;

    const nearbyCars = drivers.value
        .map(driver => {
            const driverGap = getGapInSeconds(driver);
            if (driverGap === null || driver.racingNumber === pittingDriver.racingNumber) {
                return null;
            }
            const diff = driverGap - projectedGapToLeader;
            return { driver, diff };
        })
        .filter(item => item !== null && Math.abs(item.diff) <= pitWindow)
        .sort((a, b) => a!.diff - b!.diff);

    let projectedPosition = 1;
    for (const driver of drivers.value) {
        if (driver.racingNumber === pittingDriver.racingNumber) continue;
        const driverGap = getGapInSeconds(driver);
        if (driverGap !== null && driverGap < projectedGapToLeader) {
            projectedPosition++;
        }
    }

    return {
        projectedPosition,
        nearbyCars: nearbyCars as { driver: DriverViewModel, diff: number }[]
    };
});

function getTireStyle(stint: StintViewModel | null) {
  if (!stint) return { color: '#808080' };
  const compound = stint.compound;
  let color = '';
  switch (compound) {
    case 'HARD': color = '#FFFFFF'; break;
    case 'MEDIUM': color = '#FFFF00'; break;
    case 'SOFT': color = '#FF0000'; break;
    case 'INTERMEDIATE': color = '#00FF00'; break;
    case 'WET': color = '#0000FF'; break;
    default: color = '#808080';
  }
  return { color };
}

const tableStyle = computed(() => ({
    fontSize: `${props.messageFontSize}%`
}));

const settingsDefinition = ref([
  {
    id: 'messageFontSize',
    label: 'Message Font Size (%)',
    type: 'number',
    component: 'Slider',
    props: { min: 50, max: 150, step: 10 }
  }
]);

defineExpose({
  settingsDefinition
});

</script>

<template>
  <div class="widget pitstop-strategy-widget">
    <template v-if="isRaceSession">
      <div class="driver-selection">
          <select v-model="selectedDriverNumber">
              <option :value="null" disabled>-- Select a driver --</option>
              <option v-for="driver in drivers" :key="driver.racingNumber" :value="driver.racingNumber">
                  #{{ driver.racingNumber }} {{ driver.tla }}
              </option>
          </select>
      </div>

      <div class="content" :style="tableStyle">
          <div v-if="!selectedDriver" class="placeholder">Select a driver to simulate a pitstop.</div>
          <div v-else-if="selectedDriver.inPit" class="placeholder">{{ selectedDriver.tla }} is currently in the pits.</div>
          <div v-else-if="pitExitScenario" class="scenario-display">
              <div class="info-bar">
                Simulating for {{ selectedDriver.tla }} (P{{ selectedDriver.position }}).
                Pit Delta: {{ adjustedPitDelta.toFixed(1) }}s
                <span v-if="trackStatus === '2' || trackStatus === '6'" class="vsc">(VSC Active)</span>
                <span v-if="trackStatus === '4' || trackStatus === '5'" class="sc">(SC Active)</span>
              </div>
              <table>
                  <thead>
                      <tr>
                          <th>Pos</th>
                          <th>Driver</th>
                          <th>Tyre</th>
                          <th>Gap</th>
                      </tr>
                  </thead>
                  <tbody>
                      <template v-for="(car, index) in pitExitScenario.nearbyCars" :key="car.driver.racingNumber">
                        <tr v-if="car.diff < 0 && (pitExitScenario.nearbyCars[index-1]?.diff ?? -Infinity) < car.diff" :style="{ borderLeft: `3px solid #${car.driver.teamColour}` }">
                            <td>{{ car.driver.position }}</td>
                            <td>{{ car.driver.tla }}</td>
                            <td :style="getTireStyle(car.driver.currentStint)">
                                {{ car.driver.currentStint?.compound?.charAt(0) }}
                                <span class="tyre-age">({{ car.driver.currentStint?.totalLaps }})</span>
                            </td>
                            <td class="gap-negative">{{ car.diff.toFixed(1) }}s</td>
                        </tr>
                      </template>

                      <tr class="pitting-driver" :style="{ borderLeft: `3px solid #${selectedDriver.teamColour}` }">
                          <td>~{{ pitExitScenario.projectedPosition }}</td>
                          <td>{{ selectedDriver.tla }}</td>
                          <td :style="getTireStyle(selectedDriver.currentStint)">
                            {{ selectedDriver.currentStint?.compound?.charAt(0) }}
                            <span class="tyre-age">(0)</span> <!-- Always new after pit -->
                          </td>
                          <td><-- Pit Exit</td>
                      </tr>

                      <template v-for="(car, index) in pitExitScenario.nearbyCars" :key="car.driver.racingNumber">
                         <tr v-if="car.diff >= 0 && (pitExitScenario.nearbyCars[index-1]?.diff ?? -Infinity) < car.diff" :style="{ borderLeft: `3px solid #${car.driver.teamColour}` }">
                            <td>{{ car.driver.position }}</td>
                            <td>{{ car.driver.tla }}</td>
                             <td :style="getTireStyle(car.driver.currentStint)">
                                {{ car.driver.currentStint?.compound?.charAt(0) }}
                                <span class="tyre-age">({{ car.driver.currentStint?.totalLaps }})</span>
                            </td>
                            <td class="gap-positive">+{{ car.diff.toFixed(1) }}s</td>
                        </tr>
                      </template>
                  </tbody>
              </table>
          </div>
          <div v-else class="placeholder">Could not calculate pit exit scenario for {{ selectedDriver.tla }}. (Driver might be lapped).</div>
      </div>
    </template>
    <div v-else class="placeholder content">
      Pitstop Strategy is only available during a Race session.
    </div>
  </div>
</template>

<style scoped>
  .widget { display: flex; flex-direction: column; height: 100%; background-color: #222; color: #ddd; }
  .driver-selection { padding: 8px; background-color: #2a2a2a; border-bottom: 1px solid #444;}
  select { width: 100%; padding: 5px; background-color: #333; color: #eee; border: 1px solid #555; border-radius: 4px; }
  .content { flex-grow: 1; padding: 8px; overflow-y: auto; }
  .placeholder { text-align: center; margin-top: 20px; color: #888; }
  .info-bar { margin-bottom: 8px; text-align: center; font-size: 0.9em; color: #aaa; }
  .vsc { color: #f1c40f; font-weight: bold; margin-left: 5px; }
  .sc { color: #e67e22; font-weight: bold; margin-left: 5px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 4px 6px; text-align: left; white-space: nowrap; }
  th { background-color: #333; font-weight: bold; }
  tr { border-bottom: 1px solid #444; }
  tr:last-child { border-bottom: none; }
  .pitting-driver { background-color: #3a3a3a; font-weight: bold; }
  .gap-negative { color: #ff6b6b; }
  .gap-positive { color: #6bff6b; }
  .tyre-age { color: #aaa; font-size: 0.8em; margin-left: 2px; }
</style>