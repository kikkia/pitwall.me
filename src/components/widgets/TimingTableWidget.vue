<script setup lang="ts">
import { computed, ref } from 'vue';
import { useF1Store } from '@/stores/f1Store';

const f1Store = useF1Store();

const drivers = computed(() => f1Store.sortedDriversViewModel.filter((driver) => driver.racingNumber != "_kf"));

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

function getTireStyle(driver) {
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
          <th v-if="showBest">Best Lap</th>
          <th v-if="showLast">Last Lap</th>
          <th v-if="showGap">Gap</th>
          <th v-if="showInterval">Interval</th>
          <th v-if="showPitstopCount">Pits</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="driver in drivers" :key="driver.racingNumber" :style="{ borderLeft: `5px solid #${driver.teamColour}`, opacity: driver.stopped ? 0.5 : 1 }">
          <td>{{ driver.position }}</td>
          <td v-if="showNumber">{{ driver.racingNumber }}</td>
          <td>{{ driver.tla }}</td>
          <td v-if="showTire" :style="getTireStyle(driver)">{{ driver.currentStint?.compound?.charAt(0) || '' }}</td>
          <td v-if="showBest">{{ driver.bestLapTime?.Value || '-' }}</td>
          <td v-if="showLast">{{ driver.lastLapTime?.Value || '-' }}</td>
          <td v-if="showGap">{{ driver.gapToLeader || '-' }}</td>
          <td v-if="showInterval">{{ driver.inPit ? "In Pits" : (driver.pitOut ? "Pit exit" : (driver.gapToAhead || '-')) }}</td>
          <td v-if="showPitstopCount">{{ driver.inPit ? "In Pits" : (driver.pitOut ? "Pit exit" : driver.numberOfPitStops) }}</td>
        </tr>
        <!-- Empty state -->
         <tr v-if="drivers.length === 0">
            <td colspan="8" style="text-align: center;">Waiting for timing data...</td>
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
</style>