<script setup lang="ts">
import { computed, ref } from 'vue';
import { useF1Store } from '@/stores/f1Store';
import type { DriverViewModel } from '@/types/dataTypes';

const f1Store = useF1Store();

const isQualifying = computed(() => f1Store.currentSessionType === 'Qualifying');
const currentQualifyingPart = computed(() => f1Store.currentQualifyingPart);

const drivers = computed(() => {
  let filteredDrivers = f1Store.sortedDriversViewModel.filter((driver) => driver.racingNumber !== "_kf");

  if (isQualifying.value) {
    // In qualifying, we might want to sort by best lap time for active drivers,
    // and then by position for knocked out drivers.
    // For now, we'll stick to the store's sorted order, which is by position.
    // Additional sorting logic can be added here if needed for specific quali views.
  }
  return filteredDrivers;
});

const driversWithEliminationStatus = computed(() => {
  return drivers.value.map(driver => {
    let isAtRisk = false;
    if (isQualifying.value) {
      const driverPositionNum = parseInt(driver.position);
      if (currentQualifyingPart.value === 1) {
        isAtRisk = driverPositionNum >= 16 && driverPositionNum <= 20;
      } else if (currentQualifyingPart.value === 2) {
        isAtRisk = driverPositionNum >= 11 && driverPositionNum <= 15;
      }
    }
    return {
      ...driver,
      isAtRiskOfElimination: isAtRisk
    };
  });
});

const props = defineProps({
  showNumber: { type: Boolean, default: true },
  showBest: { type: Boolean, default: true },
  showLast: { type: Boolean, default: true },
  showGap: { type: Boolean, default: true },
  showInterval: { type: Boolean, default: true },
  showTire: { type: Boolean, default: true },
  showPitstopCount: { type: Boolean, default: true },
  messageFontSize: { type: Number, default: 90 }
});

const settingsDefinition = ref([
  {
    id: 'showNumber',       
    label: 'Show driver number',    
    type: 'boolean',            
    component: 'Checkbox'
  },
  {
    id: 'showTire',
    label: 'Show tire compound',
    type: 'boolean',
    component: 'Checkbox'
  },
  {
    id: 'showBest',
    label: 'Show best lap time',
    type: 'boolean',
    component: 'Checkbox'
  },
  {
    id: 'showLast',
    label: 'Show last lap time',
    type: 'boolean',
    component: 'Checkbox'
  },
  {
    id: 'showGap',
    label: 'Show gap to leader',
    type: 'boolean',
    component: 'Checkbox'
  },
  {
    id: 'showInterval',
    label: 'Show gap to ahead (Also used for In pit/Pit exit)',
    type: 'boolean',
    component: 'Checkbox'
  },
  {
    id: 'showPitstopCount',
    label: 'Show total pitstops',
    type: 'boolean',
    component: 'Checkbox'
  },
  {
    id: 'messageFontSize',
    label: 'Message Font Size (%)',
    type: 'number',
    component: 'Slider',        
    props: {                    
      min: 50,                  
      max: 150,                
      step: 10 
    }
  }
]);

defineExpose({
  settingsDefinition
});

const tableStyle = computed(() => ({
    fontSize: `${props.messageFontSize}%`
}));

const tableColspan = computed(() => {
  let count = 2; // Pos, TLA
  if (props.showNumber) count++;
  if (props.showTire) count++;

  if (isQualifying.value) {
    count += 4; // Time, Gap to Pole, Gap to Next Elim, In Pits
  } else {
    if (props.showBest) count++;
    if (props.showLast) count++;
    if (props.showGap) count++;
    if (props.showInterval) count++;
    if (props.showPitstopCount) count++;
  }
  return count;
});

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

<template>
  <div class="widget timing-table">
    <table :style="tableStyle">
      <thead>
        <tr>
          <th>Pos</th>
          <th v-if="showNumber">#</th>
          <th></th>
          <th v-if="showTire"></th>
          <th v-if="isQualifying">Time</th>
          <th v-else-if="showBest">Best Lap</th>
          <th v-if="showLast && !isQualifying">Last Lap</th>
          <th v-if="isQualifying">Gap</th>
          <th v-else-if="showGap">Gap</th>
          <th v-if="isQualifying">Interval</th>
          <th v-else-if="showInterval">Interval</th>
          <th v-if="showPitstopCount && !isQualifying">Pits</th>
          <th v-if="isQualifying">In Pits</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(driver, index) in driversWithEliminationStatus"
          :key="driver.racingNumber"
          :class="{ 'at-risk-elimination': driver.isAtRiskOfElimination }"
          :style="{ borderLeft: `5px solid #${driver.teamColour}`, opacity: driver.stopped || driver.retired || driver.isKnockedOut ? 0.5 : 1 }"
        >
          <td>
            <template v-if="isQualifying">
              <span v-if="driver.isKnockedOut" class="knocked-out-pos">OUT</span>
              <span v-else>{{ driver.position }}</span>
            </template>
            <template v-else>
              {{ driver.position }}
            </template>
          </td>
          <td v-if="showNumber">{{ driver.racingNumber }}</td>
          <td>{{ driver.tla }}</td>
          <td v-if="showTire" :style="getTireStyle(driver)">{{ driver.currentStint?.compound?.charAt(0) || '' }}</td>
          <td v-if="isQualifying">{{ driver.qualifyingTime?.Value || '-' }}</td>
          <td v-else-if="showBest">{{ driver.bestLapTime?.Value || '-' }}</td>
          <td v-if="showLast && !isQualifying">{{ driver.lastLapTime?.Value || '-' }}</td>
          <td v-if="isQualifying">{{ driver.qualiGap || '-' }}</td>
          <td v-if="isQualifying">{{ driver.qualiInterval || '-' }}</td>
          <td v-else-if="showInterval">{{ driver.gapToAhead || '-' }}</td>
          <td v-if="showPitstopCount && !isQualifying">{{ driver.inPit ? "In Pits" : (driver.pitOut ? "Pit exit" : driver.numberOfPitStops) }}</td>
          <td v-if="isQualifying">{{ driver.inPit ? "In Pits" : '' }}</td>
        </tr>
        <!-- Empty state -->
         <tr v-if="drivers.length === 0">
            <td :colspan="tableColspan" style="text-align: center;">Waiting for timing data...</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 2px 4px; text-align: left; border-bottom: 1px solid #444; white-space: nowrap; }
  th { background-color: #333; color: #eee; font-weight: bold; }
  td { background-color: #222; color: #ddd; }
  tr:nth-child(even) td { background-color: #282828; }
  tr[style*="opacity: 0.5"] td { color: #888; }

  .knocked-out-pos {
    color: #FF6347; 
    font-weight: bold;
  }

  .at-risk-elimination td {
    background-color: #4a2a2a !important;
  }
</style>