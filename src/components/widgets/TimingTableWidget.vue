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

const selectedDriverNumber = ref<string | null>(null);

const handleDriverClick = (driver: DriverViewModel) => {
  if (driver.stopped || driver.retired || driver.isKnockedOut) {
    return;
  }
  if (selectedDriverNumber.value === driver.racingNumber) {
    selectedDriverNumber.value = null;
  } else {
    selectedDriverNumber.value = driver.racingNumber;
  }
};

const parseLapTime = (time: string | undefined): number | null => {
    if (!time || typeof time !== 'string') return null;

    const parts = time.split(':');
    let seconds = 0;
    if (parts.length === 2) {
        seconds += parseInt(parts[0], 10) * 60;
        seconds += parseFloat(parts[1]);
    } else {
        seconds = parseFloat(time);
    }
    return isNaN(seconds) ? null : seconds;
}

const parseTimeToSeconds = (time: string | undefined, isQuali: boolean): number | null => {
  if (!time) return 0; // Leader is 0
  if (typeof time !== 'string') return null;
  
  if (isQuali) {
    return parseLapTime(time);
  }

  if (time.toLowerCase().includes('lap')) return null;
  const parsed = parseFloat(time);
  return isNaN(parsed) ? null : parsed;
};

const driversForTable = computed(() => {
    const baseDrivers = driversWithEliminationStatus.value;

    if (!selectedDriverNumber.value) {
        // No driver selected, return normal data
        return baseDrivers.map(d => ({
             ...d,
             displayInterval: isQualifying.value ? d.qualiInterval : d.gapToAhead
        }));
    }

    const selectedDriver = baseDrivers.find(d => d.racingNumber === selectedDriverNumber.value);
    if (!selectedDriver) {
        // Should not happen, but as a fallback
        return baseDrivers.map(d => ({ ...d, displayInterval: isQualifying.value ? d.qualiInterval : d.gapToAhead }));
    }

    const selectedDriverTimeSource = isQualifying.value ? selectedDriver.qualifyingTime?.Value : selectedDriver.gapToLeader;
    const selectedDriverTimeSeconds = parseTimeToSeconds(selectedDriverTimeSource, isQualifying.value);

    return baseDrivers.map(driver => {
        let displayInterval = isQualifying.value ? driver.qualiInterval : driver.gapToAhead; // Default value

        if (selectedDriverTimeSeconds !== null) {
            const driverTimeSource = isQualifying.value ? driver.qualifyingTime?.Value : driver.gapToLeader;
            const driverTimeSeconds = parseTimeToSeconds(driverTimeSource, isQualifying.value);

            if (driverTimeSeconds !== null) {
                if (driver.racingNumber === selectedDriverNumber.value) {
                    displayInterval = '-';
                } else {
                    const interval = driverTimeSeconds - selectedDriverTimeSeconds;
                    displayInterval = (interval > 0 ? '+' : '') + interval.toFixed(3);
                }
            }
        }
        return { ...driver, displayInterval };
    });
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

function getTyreAge(driver: DriverViewModel) {
  if (driver.currentStint && !isQualifying.value) {
    return driver.currentStint.totalLaps;
  }
  return null;
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
          <template v-if="isQualifying">
            <th>Time</th>
            <th>Gap</th>
            <th>Interval</th>
            <th>In Pits</th>
          </template>
          <template v-else>
            <th v-if="showBest">Best Lap</th>
            <th v-if="showLast">Last Lap</th>
            <th v-if="showGap">Gap</th>
            <th v-if="showInterval">Interval</th>
            <th v-if="showPitstopCount">Pits</th>
          </template>
        </tr>
      </thead>
      <TransitionGroup tag="tbody" name="list">
        <tr
          v-for="(driver) in driversForTable"
          :key="driver.racingNumber"
          :class="{ 'at-risk-elimination': driver.isAtRiskOfElimination, 'selected-driver': driver.racingNumber === selectedDriverNumber }"
          @click="handleDriverClick(driver)"
          :style="{
            borderLeft: `5px solid #${driver.teamColour}`,
            opacity: driver.stopped || driver.retired || driver.isKnockedOut ? 0.5 : 1,
            cursor: (driver.stopped || driver.retired || driver.isKnockedOut) ? 'default' : 'pointer'
          }"
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
          <td v-if="showTire" :style="getTireStyle(driver)">
            {{ driver.currentStint?.compound?.charAt(0) || '' }}
            <span v-if="getTyreAge(driver) !== null" class="tyre-age"> ({{ getTyreAge(driver) }})</span>
          </td>
          <template v-if="isQualifying">
            <td>{{ driver.qualifyingTime?.Value || '-' }}</td>
            <td>{{ driver.qualiGap || '-' }}</td>
            <td>{{ driver.displayInterval || '-' }}</td>
            <td>{{ driver.inPit ? "In Pits" : '' }}</td>
          </template>
          <template v-else>
            <td v-if="showBest">{{ driver.bestLapTime?.Value || '-' }}</td>
            <td v-if="showLast">{{ driver.lastLapTime?.Value || '-' }}</td>
            <td v-if="showGap">{{ driver.gapToLeader || '-' }}</td>
            <td v-if="showInterval">{{ driver.displayInterval || '-' }}</td>
            <td v-if="showPitstopCount">{{ driver.inPit ? "In Pits" : (driver.pitOut ? "Pit exit" : driver.numberOfPitStops) }}</td>
          </template>
        </tr>
        <!-- Empty state -->
         <tr v-if="drivers.length === 0" key="empty-state">
            <td :colspan="tableColspan" style="text-align: center;">Waiting for timing data...</td>
        </tr>
      </TransitionGroup>
    </table>
  </div>
</template>

<style scoped>
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 2px 4px; text-align: left; border-bottom: 1px solid #444; white-space: nowrap; }
  th { background-color: #333; color: #eee; font-weight: bold; }
  td { background-color: #222; color: #ddd; }
  .tyre-age {
    color: #aaa;
    font-size: 0.8em;
  }
  tr:nth-child(even) td { background-color: #282828; }
  tr[style*="opacity: 0.5"] td { color: #888; }

  .knocked-out-pos {
    color: #FF6347; 
    font-weight: bold;
  }

  .at-risk-elimination td {
    background-color: #4a2a2a !important;
  }

  .selected-driver td {
    background-color: rgba(247, 0, 255, 0.733) !important;
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