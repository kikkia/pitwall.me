<template>
  <div class="driver-strip" @click.stop>
    <button class="strip-close" @click="$emit('close')" aria-label="Close selected driver banner">×</button>
    <div class="non-race-strip-row">
      <DriverStripCard
        :driver="selectedDriver"
        :selected="true"
        :non-race="true"
        :metrics="[
          `Live ${selectedDriverLiveLap}`,
          `B ${selectedDriver.bestLapTime?.Value || '-'}`,
          `I ${selectedDriver.qualiInterval || '-'}`
        ]"
      />
      <div class="mini-row" v-for="(sector, index) in selectedDriver.sectors.slice(0, 3)" :key="`selected.mini.${index}`">
        <span :class="['mini-label', getLastTimeClass(sector)]">S{{ index + 1 }} {{ sector.Value || '-' }}</span>
        <div class="minisector-container">
          <span
            v-for="(segment, segmentIndex) in (sector.Segments || [])"
            :key="`selected.mini.${index}.${segmentIndex}`"
            :class="['minisector', getMinisectorClass(segment.Status)]"
          ></span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DriverViewModel } from '@/types/dataTypes';
import { getMinisectorClass, getLastTimeClass } from '@/utils/sectorFormattingUtils';
import DriverStripCard from './DriverStripCard.vue';

defineProps<{
  selectedDriver: DriverViewModel;
  selectedDriverLiveLap: string;
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

.non-race-strip-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-right: 16px;
  overflow-x: auto;
  white-space: nowrap;
}

.mini-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.mini-label {
  font-size: 0.72rem;
  line-height: 1;
}

.minisector-container {
  display: flex;
  gap: 2px;
}

.minisector {
  width: 10px;
  height: 6px;
  border-radius: 2px;
  background: #374151;
}

.minisector-set { background-color: #facc15; }
.minisector-pb { background-color: #4ade80; }
.minisector-ob { background-color: #c084fc; }
.minisector-pit { background-color: #9ca3af; }
.minisector-stopped { background-color: #1f2937; }
.minisector-unknown { background-color: #4b5563; }

.sector-overall-best { color: #c084fc; }
.sector-personal-best { color: #4ade80; }
.sector-set { color: #facc15; }

@media (max-width: 900px) {
  .non-race-strip-row {
    gap: 6px;
  }
}
</style>
