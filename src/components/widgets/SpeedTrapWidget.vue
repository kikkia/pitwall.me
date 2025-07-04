<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useF1Store } from '@/stores/f1Store';
import type { DriverViewModel } from '@/types/dataTypes';

const f1Store = useF1Store();

const drivers = computed(() => {
  return f1Store.sortedDriversViewModel
    .filter((driver) => driver.racingNumber !== "_kf" && driver.bestSpeeds)
    .sort((a, b) => {
      const sortBy = props.sortBy as keyof import('@/types/dataTypes').BestSpeedsMap;
      const speedA = parseFloat(a.bestSpeeds?.[sortBy]?.Value ?? '0');
      const speedB = parseFloat(b.bestSpeeds?.[sortBy]?.Value ?? '0');
      return speedB - speedA;
    });
});

const highlightedRows = ref<Record<string, boolean>>({});

watch(drivers, (newDrivers: DriverViewModel[], oldDrivers: DriverViewModel[]) => {
  const oldDriversMap = new Map(oldDrivers.map((d: DriverViewModel) => [d.racingNumber, d]));
  
  for (const driver of newDrivers) {
    const oldDriver = oldDriversMap.get(driver.racingNumber);
    if (oldDriver && JSON.stringify(driver.bestSpeeds) !== JSON.stringify(oldDriver.bestSpeeds)) {
      highlightedRows.value[driver.racingNumber] = true;
      setTimeout(() => {
        if (highlightedRows.value[driver.racingNumber]) {
          delete highlightedRows.value[driver.racingNumber];
        }
      }, 4000);
    }
  }
}, { deep: true });

const props = defineProps({
  messageFontSize: { type: Number, default: 90 },
  showI1: { type: Boolean, default: true },
  showI2: { type: Boolean, default: true },
  showFL: { type: Boolean, default: true },
  showST: { type: Boolean, default: true },
  sortBy: { type: String, default: 'ST' }
});

const settingsDefinition = ref([
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
  },
  { id: 'showI1', label: 'Show Intermediate 1', type: 'boolean', component: 'Checkbox' },
  { id: 'showI2', label: 'Show Intermediate 2', type: 'boolean', component: 'Checkbox' },
  { id: 'showFL', label: 'Show Finish Line', type: 'boolean', component: 'Checkbox' },
  { id: 'showST', label: 'Show Speed Trap', type: 'boolean', component: 'Checkbox' },
  {
    id: 'sortBy',
    label: 'Sort By',
    type: 'string',
    component: 'Dropdown',
    options: [
      { label: 'Intermediate 1', value: 'I1' },
      { label: 'Intermediate 2', value: 'I2' },
      { label: 'Finish Line', value: 'FL' },
      { label: 'Speed Trap', value: 'ST' }
    ],
    props: {
      optionLabel: 'label',
      optionValue: 'value'
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
  if (props.showI1) count++;
  if (props.showI2) count++;
  if (props.showFL) count++;
  if (props.showST) count++;
  return count;
});

</script>

<template>
  <div class="widget speed-trap-table">
    <table :style="tableStyle">
      <thead>
        <tr>
          <th>Pos</th>
          <th></th>
          <th v-if="showI1">I1</th>
          <th v-if="showI2">I2</th>
          <th v-if="showFL">FL</th>
          <th v-if="showST">ST</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(driver, index) in drivers"
          :key="driver.racingNumber"
          :style="{ borderLeft: `5px solid #${driver.teamColour}` }"
          :class="{ 'highlight-fade': highlightedRows[driver.racingNumber] }"
        >
          <td>{{ driver.position }}</td>
          <td>{{ driver.tla }}</td>
          <td v-if="showI1">{{ driver.bestSpeeds?.I1?.Value || '-' }}</td>
          <td v-if="showI2">{{ driver.bestSpeeds?.I2?.Value || '-' }}</td>
          <td v-if="showFL">{{ driver.bestSpeeds?.FL?.Value || '-' }}</td>
          <td v-if="showST">{{ driver.bestSpeeds?.ST?.Value || '-' }}</td>
        </tr>
        <!-- Empty state -->
         <tr v-if="drivers.length === 0">
            <td :colspan="tableColspan" style="text-align: center;">Waiting for speed data...</td>
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

  tr.highlight-fade td {
    background-color: rgba(247, 0, 255, 0.733);
    transition: background-color 4s ease-out;
  }

  tr:not(.highlight-fade):nth-child(odd) td {
      background-color: #222;
  }

  tr:not(.highlight-fade):nth-child(even) td {
      background-color: #282828;
  }
</style>