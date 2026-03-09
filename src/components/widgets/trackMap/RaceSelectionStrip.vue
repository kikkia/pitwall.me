<template>
  <div class="driver-strip" @click.stop>
    <button class="strip-close" @click="$emit('close')" aria-label="Close selected driver banner">×</button>
    <div class="race-strip-grid">
      <DriverStripCard
        :driver="driverAhead"
        :metrics="aheadMetrics"
        :metric-classes="aheadMetricClasses"
        empty-label="LEADER"
      />

      <div class="gap-chip" :class="[aheadGapTrendClass, { 'gap-chip--empty': !driverAhead }]">
        {{ driverAhead ? displayedAheadGap : '' }}
      </div>

      <DriverStripCard
        :driver="selectedDriver"
        :selected="true"
        :metrics="[selectedDriver.lastLapTime?.Value || '-']"
      />

      <div class="gap-chip" :class="[behindGapTrendClass, { 'gap-chip--empty': !driverBehind }]">
        {{ driverBehind ? displayedBehindGap : '' }}
      </div>

      <DriverStripCard
        :driver="driverBehind"
        :metrics="behindMetrics"
        :metric-classes="behindMetricClasses"
        empty-label="TAIL"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { DriverViewModel } from '@/types/dataTypes';
import { timeStringToMillis, formatDiff } from '@/utils/formatUtils';
import DriverStripCard from './DriverStripCard.vue';

const props = defineProps<{
  selectedDriver: DriverViewModel;
  driverAhead: DriverViewModel | null;
  driverBehind: DriverViewModel | null;
  displayedAheadGap: string;
  displayedBehindGap: string;
  aheadGapTrendClass: string;
  behindGapTrendClass: string;
}>();

const selectedDriverLastLapMillis = computed(() => timeStringToMillis(props.selectedDriver?.lastLapTime?.Value));

const driverAheadLastLapMillis = computed(() => timeStringToMillis(props.driverAhead?.lastLapTime?.Value));

const driverBehindLastLapMillis = computed(() => timeStringToMillis(props.driverBehind?.lastLapTime?.Value));

const aheadMetrics = computed(() => {
  const lastLap = props.driverAhead?.lastLapTime?.Value || '-';
  if (selectedDriverLastLapMillis.value === Infinity || driverAheadLastLapMillis.value === Infinity) {
    return [lastLap];
  }
  const diff = driverAheadLastLapMillis.value - selectedDriverLastLapMillis.value;
  return [lastLap, formatDiff(diff)];
});

const aheadMetricClasses = computed(() => {
  if (aheadMetrics.value.length < 2) return [];
  const diff = driverAheadLastLapMillis.value - selectedDriverLastLapMillis.value;
  return [undefined, diff > 0 ? 'lap-diff-positive' : 'lap-diff-negative'];
});

const behindMetrics = computed(() => {
  const lastLap = props.driverBehind?.lastLapTime?.Value || '-';
  if (selectedDriverLastLapMillis.value === Infinity || driverBehindLastLapMillis.value === Infinity) {
    return [lastLap];
  }
  const diff = driverBehindLastLapMillis.value - selectedDriverLastLapMillis.value;
  return [lastLap, formatDiff(diff)];
});

const behindMetricClasses = computed(() => {
  if (behindMetrics.value.length < 2) return [];
  const diff = driverBehindLastLapMillis.value - selectedDriverLastLapMillis.value;
  return [undefined, diff > 0 ? 'lap-diff-positive' : 'lap-diff-negative'];
});

defineEmits<{
  (e: 'close'): void;
}>();
</script>

<style scoped>
.driver-strip {
  position: absolute;
  left: 6px;
  right: 6px;
  bottom: 6px;
  z-index: 14;
  border: 1px solid #3f3f46;
  background: rgba(25, 25, 25, 0.92);
  backdrop-filter: blur(2px);
  color: #ddd;
  font-family: 'Formula1-Regular', sans-serif;
  padding: 4px 10px;
  border-radius: 4px;
}

.strip-close {
  position: absolute;
  right: 6px;
  top: 2px;
  border: none;
  background: transparent;
  color: #aaa;
  font-size: 18px;
  cursor: pointer;
  line-height: 1;
}

.race-strip-grid {
  display: grid;
  grid-template-columns: minmax(170px, 1fr) auto minmax(170px, 1fr) auto minmax(170px, 1fr);
  gap: 8px;
  align-items: center;
  padding-right: 16px;
}

.gap-chip {
  color: #d4d4d8;
  font-size: 0.8rem;
  font-weight: 700;
  white-space: nowrap;
  text-align: center;
  transition: color 0.2s ease;
}

.gap-chip--empty {
  opacity: 0;
}

.gap-increasing {
  color: #f87171;
  animation: gapPulse 0.5s ease-out;
}

.gap-decreasing {
  color: #4ade80;
  animation: gapPulse 0.5s ease-out;
}

@keyframes gapPulse {
  0% { transform: scale(1); }
  45% { transform: scale(1.08); }
  100% { transform: scale(1); }
}

@media (max-width: 900px) {
  .race-strip-grid {
    grid-template-columns: 1fr;
    gap: 4px;
  }

  .gap-chip {
    text-align: left;
  }
}
</style>
