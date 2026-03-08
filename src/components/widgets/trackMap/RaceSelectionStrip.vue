<template>
  <div class="driver-strip" @click.stop>
    <button class="strip-close" @click="$emit('close')" aria-label="Close selected driver banner">×</button>
    <div class="race-strip-grid">
      <DriverStripCard :driver="driverAhead" :metrics="[driverAhead?.lastLapTime?.Value || '-']" empty-label="LEADER" />

      <div class="gap-chip" :class="[aheadGapTrendClass, { 'gap-chip--empty': !driverAhead }]">
        {{ driverAhead ? displayedAheadGap : '' }}
      </div>

      <DriverStripCard
        :driver="selectedDriver"
        :selected="true"
        :metrics="[`L ${selectedDriver.gapToLeader || '-'}`]"
      />

      <div class="gap-chip" :class="[behindGapTrendClass, { 'gap-chip--empty': !driverBehind }]">
        {{ driverBehind ? displayedBehindGap : '' }}
      </div>

      <DriverStripCard :driver="driverBehind" :metrics="[driverBehind?.lastLapTime?.Value || '-']" empty-label="TAIL" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DriverViewModel } from '@/types/dataTypes';
import DriverStripCard from './DriverStripCard.vue';

defineProps<{
  selectedDriver: DriverViewModel;
  driverAhead: DriverViewModel | null;
  driverBehind: DriverViewModel | null;
  displayedAheadGap: string;
  displayedBehindGap: string;
  aheadGapTrendClass: string;
  behindGapTrendClass: string;
}>();

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
