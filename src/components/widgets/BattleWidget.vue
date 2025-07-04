<template>
  <div class="battle-widget" :style="widgetStyle">
    <div v-if="selectedBattle" class="battle-content">
       <div class="battle-table-container">
           <table class="battle-table">
               <tbody>
                   <tr class="main-info-row">
                       <td class="metric-label">Battle for P{{ selectedBattle.position }}</td>
                       <td class="driver-info">
                           <div class="drs-indicator" :class="{ 'drs-active': selectedBattle.driverAhead.drs >= 12 }"></div>
                           <span>{{ selectedBattle.driverAhead.tla }}</span>
                       </td>
                       <td class="diff">
                           <div class="gap" :class="gapTrendClass">
                               <span>{{ displayedGap.toFixed(3) }}s</span>
                           </div>
                       </td>
                       <td class="driver-info">
                           <span>{{ selectedBattle.driverBehind.tla }}</span>
                           <div class="drs-indicator" :class="{ 'drs-active': selectedBattle.driverBehind.drs >= 12 }"></div>
                       </td>
                   </tr>
                   <tr>
                       <td class="metric-label">Last Lap</td>
                       <td :class="lapTimeComparison.aheadClass">{{ lastCompletedLaps.ahead?.LapTime || '-' }}</td>
                       <td class="diff" :class="lapTimeComparison.diffClass">{{ lapTimeComparison.diff }}</td>
                       <td :class="lapTimeComparison.behindClass">{{ lastCompletedLaps.behind?.LapTime || '-' }}</td>
                   </tr>
                   <tr v-for="i in 3" :key="i">
                       <td class="metric-label">Sector {{ i }}</td>
                       <td :class="sectorComparison(i-1).aheadClass">{{ lastCompletedLaps.ahead?.Sectors[i-1]?.Value || '-' }}</td>
                       <td class="diff" :class="sectorComparison(i-1).diffClass">{{ sectorComparison(i-1).diff }}</td>
                       <td :class="sectorComparison(i-1).behindClass">{{ lastCompletedLaps.behind?.Sectors[i-1]?.Value || '-' }}</td>
                   </tr>
               </tbody>
           </table>
       </div>
   </div>
    <div v-else-if="activeBattles.length > 0" class="battle-selection-prompt">
        <h3>Select a battle to view</h3>
        <Dropdown
            v-model="internalSelectedBattlePosition"
            :options="availableBattles"
            optionLabel="label"
            optionValue="value"
            placeholder="Select a Battle"
            class="w-full"
            @change="handleBattleSelection"
        />
    </div>
    <div v-else class="no-battles-prompt">
      <p>No close battles on track at the moment.</p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useF1Store } from '@/stores/f1Store';
import Dropdown from 'primevue/dropdown';
import { timeStringToMillis } from '@/utils/formatUtils';

const props = defineProps({
  threshold: { type: Number, default: 1.5 },
  messageFontSize: { type: Number, default: 90 },
  selectedBattlePosition: { type: Number, default: null },
  auto: { type: Boolean, default: false },
});

const emit = defineEmits(['update:widgetConfig']);

const f1Store = useF1Store();
const internalSelectedBattlePosition = ref(props.selectedBattlePosition);

const displayedGap = ref(0);
const gapTrend = ref('stable'); // 'stable', 'increasing', 'decreasing'
const previousGap = ref(null);
const trendTimeout = ref(null);
const autoSelectInterval = ref(null);

watch(() => props.selectedBattlePosition, (newVal) => {
  internalSelectedBattlePosition.value = newVal;
});

watch(() => props.auto, (newVal, oldVal) => {
    if (newVal) {
        startAutoSelect();
    } else {
        stopAutoSelect();
    }
}, { immediate: true });

function findClosestBattle() {
    if (activeBattles.value.length > 0) {
        const closestBattle = activeBattles.value.reduce((closest, current) => {
            return parseFloat(current.gap) < parseFloat(closest.gap) ? current : closest;
        });
        internalSelectedBattlePosition.value = closestBattle.position;
    }
}

function startAutoSelect() {
    stopAutoSelect();
    findClosestBattle();
    autoSelectInterval.value = setInterval(findClosestBattle, 10000);
}

function stopAutoSelect() {
    if (autoSelectInterval.value) {
        clearInterval(autoSelectInterval.value);
        autoSelectInterval.value = null;
    }
}

const activeBattles = computed(() => {
  const drivers = Array.from(f1Store.driversViewModelMap.values()).sort((a, b) => parseInt(a.position) - parseInt(b.position));
  const battles = [];

  for (let i = 1; i < drivers.length; i++) {
    const driverBehind = drivers[i];
    const driverAhead = drivers[i-1];
    
    if (driverBehind && driverAhead) {
        const gap = parseFloat(driverBehind.gapToAhead?.replace('s', ''));
        if (!isNaN(gap) && gap <= props.threshold) {
            battles.push({
                position: parseInt(driverBehind.position),
                driverAhead: driverAhead,
                driverBehind: driverBehind,
                gap: gap.toFixed(3),
            });
        }
    }
  }

  return battles;
});

const availableBattles = computed(() => {
    return activeBattles.value.map(battle => ({
        label: `Battle for P${battle.position} (${battle.driverAhead.tla} vs ${battle.driverBehind.tla})`,
        value: battle.position
    }));
});

const selectedBattle = computed(() => {
    if (!internalSelectedBattlePosition.value) return null;
    return activeBattles.value.find(b => b.position === internalSelectedBattlePosition.value);
});

watch(() => selectedBattle.value?.position, (newPos, oldPos) => {
    if (newPos !== oldPos) {
        previousGap.value = null;
        gapTrend.value = 'stable';
        if (trendTimeout.value) clearTimeout(trendTimeout.value);
        if (selectedBattle.value) {
            const newGap = parseFloat(selectedBattle.value.gap);
            if (!isNaN(newGap)) {
                displayedGap.value = newGap;
                previousGap.value = newGap;
            }
        }
    }
});

watch(() => selectedBattle.value?.gap, (newGapStr) => {
    if (newGapStr === undefined || newGapStr === null) {
        if (selectedBattle.value) {
            displayedGap.value = parseFloat(selectedBattle.value.gap);
        }
        return;
    };

    const newGap = parseFloat(newGapStr);
    if (isNaN(newGap)) return;

    if (previousGap.value === null) {
        displayedGap.value = newGap;
        previousGap.value = newGap;
        return;
    }
    
    if (previousGap.value && newGap.toFixed(3) === previousGap.value.toFixed(3)) {
        return;
    }

    if (newGap > previousGap.value) {
        gapTrend.value = 'increasing';
    } else if (newGap < previousGap.value) {
        gapTrend.value = 'decreasing';
    } else {
        gapTrend.value = 'stable';
        return;
    }

    const startValue = displayedGap.value;
    const endValue = newGap;
    const duration = 500;
    let startTime = null;

    function animate(currentTime) {
        if (!startTime) startTime = currentTime;
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        
        displayedGap.value = startValue + (endValue - startValue) * easedProgress;

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            displayedGap.value = endValue;
        }
    }

    requestAnimationFrame(animate);

    previousGap.value = newGap;

    if (trendTimeout.value) clearTimeout(trendTimeout.value);
    trendTimeout.value = setTimeout(() => {
        gapTrend.value = 'stable';
    }, 2000);
}, { immediate: true });

const gapTrendClass = computed(() => {
    if (gapTrend.value === 'increasing') return 'gap-increasing';
    if (gapTrend.value === 'decreasing') return 'gap-decreasing';
    return '';
});

const lastCompletedLaps = computed(() => {
    if (!selectedBattle.value) return { ahead: null, behind: null };
    
    const aheadHistory = f1Store.raceData.LapHistoryMap?.[selectedBattle.value.driverAhead.racingNumber];
    const behindHistory = f1Store.raceData.LapHistoryMap?.[selectedBattle.value.driverBehind.racingNumber];

    const aheadLastLap = aheadHistory?.CompletedLaps?.[aheadHistory.CompletedLaps.length - 1];
    const behindLastLap = behindHistory?.CompletedLaps?.[behindHistory.CompletedLaps.length - 1];

    return { ahead: aheadLastLap, behind: behindLastLap };
});

const lapTimeComparison = computed(() => {
    const aheadTimeStr = lastCompletedLaps.value.ahead?.LapTime;
    const behindTimeStr = lastCompletedLaps.value.behind?.LapTime;
    return calculateTimeComparison(aheadTimeStr, behindTimeStr);
});

function sectorComparison(sectorIndex) {
    const aheadSector = lastCompletedLaps.value.ahead?.Sectors[sectorIndex];
    const behindSector = lastCompletedLaps.value.behind?.Sectors[sectorIndex];
    return calculateTimeComparison(aheadSector?.Value, behindSector?.Value);
}

function calculateTimeComparison(aheadTimeStr, behindTimeStr) {
    const aheadTime = timeStringToMillis(aheadTimeStr);
    const behindTime = timeStringToMillis(behindTimeStr);

    if (!aheadTime || !behindTime || aheadTime === 0 || behindTime === 0) {
        return { aheadClass: '', behindClass: '', diff: '-', diffClass: '' };
    }

    const diff = behindTime - aheadTime;
    const diffSeconds = (diff / 1000).toFixed(3);

    let diffClass = '';
    if (diff < -0.01) diffClass = 'faster';
    if (diff > 0.01) diffClass = 'slower';

    return {
        aheadClass: diff > 0 ? 'faster' : 'slower',
        behindClass: diff < 0 ? 'faster' : 'slower',
        diff: diff > 0 ? `+${diffSeconds}` : diffSeconds,
        diffClass: diffClass
    };
}


const widgetStyle = computed(() => ({
  fontSize: `${props.messageFontSize}%`,
}));

const settingsDefinition = computed(() => [
  {
    id: 'selectedBattlePosition',
    label: 'Selected Battle',
    type: 'number',
    component: 'Dropdown',
    options: availableBattles.value,
    props: { 
        placeholder: "Select a Battle",
        optionLabel: "label",
        optionValue: "value"
    },
  },
  {
    id: 'threshold',
    label: 'Gap Threshold (s)',
    type: 'number',
    component: 'Slider',
    props: { min: 0.5, max: 5, step: 0.1 },
  },
  {
    id: 'messageFontSize',
    label: 'Font Size (%)',
    type: 'number',
    component: 'Slider',
    props: { min: 50, max: 150, step: 10 },
  },
    {
    id: 'auto',
    label: 'Auto Select Closest Battle',
    type: 'boolean',
    component: 'Checkbox',
  },
]);

defineExpose({ settingsDefinition });

function handleBattleSelection(event) {
    internalSelectedBattlePosition.value = event.value;
    emit('update:widgetConfig', { ...props, selectedBattlePosition: event.value });
}

</script>

<style scoped>
.battle-widget {
  padding: 1rem;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.battle-content {
    width: 100%;
}

.battle-table-container {
    width: 100%;
}

.battle-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9em;
}

.battle-table td {
    padding: 0.25rem;
    text-align: center;
    white-space: nowrap;
}

.main-info-row {
    font-size: 1.1em;
    font-weight: bold;
}

.battle-table tr {
    display: grid;
    grid-template-columns: 25% 27.5% 20% 27.5%;
    align-items: center;
}

.driver-info {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    font-weight: bold;
}

.drs-indicator {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background-color: #555;
    transition: background-color 0.3s;
}

.drs-active {
    background-color: #4dff4d;
}

.metric-label {
    text-align: left;
    font-weight: bold;
    color: #aaa;
    width: 20%;
}

.diff {
    font-weight: bold;
    width: 20%;
}

.faster {
    color: #4dff4d;
    font-weight: bold;
}

.slower {
    color: #ff4d4d;
}

.gap {
   display: auto;
   align-items: center;
   justify-content: center;
   font-weight: bold;
   transition: color 0.3s ease-in-out;
}

.gap-increasing {
   color: #ff4d4d;
}

.gap-decreasing {
   color: #4dff4d;
}

.battle-selection-prompt, .no-battles-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: #ddd;
}

.battle-selection-prompt h3 {
  margin-bottom: 1rem;
  color: #eee;
}

.w-full {
  width: 100%;
}
</style>
