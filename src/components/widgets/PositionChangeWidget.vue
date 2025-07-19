<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import { useF1Store } from '@/stores/f1Store';
import type { DriverViewModel } from '@/types/dataTypes';

const f1Store = useF1Store();

const props = defineProps({
  displayMode: { type: String, default: 'All' }, // All, Leaderboard
  filterMode: { type: String, default: 'Both' }, // Both, Gainers, Losers
  messageFontSize: { type: Number, default: 90 }
});

const internalDisplayMode = ref(props.displayMode);
const internalFilterMode = ref(props.filterMode);

watch(() => props.displayMode, (newVal) => internalDisplayMode.value = newVal);
watch(() => props.filterMode, (newVal) => internalFilterMode.value = newVal);

interface PositionChangeInfo extends DriverViewModel {
  positionChange: number;
}

const widgetEl = ref<HTMLElement | null>(null);
const columnCount = ref(1);

const widgetTitle = computed(() => {
  const display = internalDisplayMode.value.toLowerCase();
  const filter = internalFilterMode.value.toLowerCase();

  const filterText = filter.charAt(0).toUpperCase() + filter.slice(1);

  if (display === 'leaderboard') {
    if (filter === 'both') return 'Top Movers';
    return `${filterText} Leaderboard`;
  }
  
  if (filter === 'both') return 'Position Changes';
  
  return `Position Changes: ${filterText}`;
});

const driverList = computed(() => {
  let drivers: PositionChangeInfo[] = Array.from(f1Store.driversViewModelMap.values())
    .filter(d => d.startingPosition && parseInt(d.startingPosition, 10) > 0 && d.position && !d.retired)
    .map(d => ({
      ...d,
      positionChange: parseInt(d.startingPosition, 10) - parseInt(d.position, 10)
    }));

  if (internalFilterMode.value.toLowerCase() === 'gainers') {
    drivers = drivers.filter(d => d.positionChange > 0);
  } else if (internalFilterMode.value.toLowerCase() === 'losers') {
    drivers = drivers.filter(d => d.positionChange < 0);
  }

  drivers.sort((a, b) => b.positionChange - a.positionChange);

  if (internalDisplayMode.value.toLowerCase() === 'leaderboard') {
    if (internalFilterMode.value.toLowerCase() === 'gainers') {
        return drivers.slice(0, 3);
    } else if (internalFilterMode.value.toLowerCase() === 'losers') {
        return drivers.slice(-3).reverse();
    }
    const gainers = drivers.filter(d => d.positionChange > 0).slice(0, 3);
    const losers = drivers.filter(d => d.positionChange < 0).slice(-3).reverse();
    return [...gainers, ...losers];
  }

  return drivers;
});

const widgetStyle = computed(() => ({
    fontSize: `${props.messageFontSize}%`
}));

const settingsDefinition = computed(() => [
  {
    id: 'displayMode',
    label: 'Display Mode',
    type: 'string',
    component: 'Select',
    options: [{label: 'All', value: "All"}, {label: 'Leaderboard', value: "Leaderboard"}]
  },
  {
    id: 'filterMode',
    label: 'Filter Mode',
    type: 'string',
    component: 'Select',
    options: [{label: 'Both', value: "Both"}, {label: 'Gainers', value: "Gainers"}, {label: 'Losers', value: "Losers"}]
  },
  {
    id: 'messageFontSize',
    label: 'Font Size (%)',
    type: 'number',
    component: 'Slider',
    props: { min: 50, max: 150, step: 10 }
  },
]);

defineExpose({ settingsDefinition });

let observer: ResizeObserver;

onMounted(() => {
  if (widgetEl.value) {
    observer = new ResizeObserver(entries => {
      const entry = entries[0];
      const width = entry.contentRect.width;
      if (width > 500) {
        columnCount.value = 3;
      } else if (width > 250) {
        columnCount.value = 2;
      } else {
        columnCount.value = 1;
      }
    });
    observer.observe(widgetEl.value);
  }
});

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
  }
});

</script>

<template>
  <div class="position-change-widget" :style="widgetStyle" ref="widgetEl">
    <div class="header">
      <h3>{{ widgetTitle }}</h3>
    </div>
    <div class="driver-list" :style="{ '--column-count': columnCount }">
      <div v-for="driver in driverList" :key="driver.racingNumber" class="driver-item">
        <div class="position">{{ driver.position }}</div>
        <div class="team-color" :style="{ backgroundColor: '#' + driver.teamColour }"></div>
        <div class="tla">{{ driver.tla }}</div>
        <div class="change" :class="{
          gainer: driver.positionChange > 0,
          loser: driver.positionChange < 0
        }">
          {{ driver.positionChange > 0 ? '+' : '' }}{{ driver.positionChange }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.position-change-widget {
  font-family: 'Formula1', sans-serif;
  color: #fff;
  padding: 10px;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.header h3 {
  margin: 0;
  font-size: 1.2em;
  text-align: center;
  width: 100%;
}
.driver-list {
  flex-grow: 1;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(var(--column-count, 1), 1fr);
  gap: 0 10px;
}
.driver-item {
  display: grid;
  grid-template-columns: 30px 5px 1fr 50px;
  align-items: center;
  padding: 5px 0;
  border-bottom: 1px solid #444;
  gap: 5px;
}
.position {
  font-weight: bold;
  text-align: center;
}
.team-color {
  width: 5px;
  height: 20px;
  border-radius: 2px;
}
.tla {
  font-weight: bold;
}
.change {
  text-align: right;
  font-weight: bold;
}
.gainer {
  color: #00ff00;
}
.loser {
  color: #ff0000;
}
</style>