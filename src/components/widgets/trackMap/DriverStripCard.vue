<template>
  <div
    class="compact-driver-card"
    :class="{
      'compact-driver-card--selected': selected,
      'compact-driver-card--empty': !driver,
      'compact-driver-card--non-race': nonRace,
    }"
  >
    <template v-if="driver">
      <span class="pos">P{{ driver.position }}</span>
      <span class="tla" :style="{ borderLeftColor: `#${driver.teamColour}` }">{{ driver.tla }}</span>
      <span class="tyre-pill" :class="tyreInfo.className">
        <span class="tyre-pill-label">{{ tyreInfo.abbrev }}</span>
        <span class="tyre-pill-age">{{ tyreInfo.ageLabel }}</span>
      </span>
      <span v-for="(metric, index) in metrics" :key="`${driver.racingNumber}.metric.${index}`" class="lap-val">{{ metric }}</span>
    </template>
    <template v-else>
      <span class="lap-val">{{ emptyLabel }}</span>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { DriverViewModel } from '@/types/dataTypes';
import { getDriverTyreInfo } from '@/utils/tyreUtils';

const props = withDefaults(defineProps<{
  driver: DriverViewModel | null;
  metrics?: string[];
  selected?: boolean;
  nonRace?: boolean;
  emptyLabel?: string;
}>(), {
  metrics: () => [],
  selected: false,
  nonRace: false,
  emptyLabel: '-',
});

const tyreInfo = computed(() => getDriverTyreInfo(props.driver));
</script>

<style scoped>
.compact-driver-card {
  border: 1px solid #444;
  background: #222;
  padding: 4px 6px;
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  white-space: nowrap;
  overflow: hidden;
}

.compact-driver-card--selected {
  border-color: #666;
  background: #252525;
}

.compact-driver-card--empty {
  justify-content: center;
  color: #71717a;
}

.compact-driver-card--non-race {
  min-width: 320px;
}

.pos {
  color: #f4f4f5;
  min-width: 24px;
  font-weight: 700;
}

.tla {
  border-left: 4px solid #888;
  padding-left: 6px;
  font-weight: 700;
}

.lap-val {
  color: #b4b4b8;
  font-size: 0.78rem;
}

.tyre-pill {
  position: relative;
  z-index: 1;
  display: inline-flex;
  gap: 2px;
  align-items: center;
  padding: 1px 6px;
  border-radius: 10px;
  color: #000;
  font-weight: 700;
  font-size: 0.72rem;
  line-height: 1;
}

.tyre-pill-label {
  min-width: 8px;
  text-align: center;
}

.tyre-pill-age {
  opacity: 0.85;
}

.tyre-soft { background-color: #E74C3C; }
.tyre-medium { background-color: #F1C40F; }
.tyre-hard { background-color: #FFFFFF; }
.tyre-intermediate { background-color: #27AE60; }
.tyre-wet { background-color: #2d04e4; color: #fff; }
.tyre-unknown { background-color: #808080; }
</style>
