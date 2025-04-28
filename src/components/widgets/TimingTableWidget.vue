<script setup lang="ts">
import { computed } from 'vue';
import { useF1Store } from '@/stores/f1Store';

const f1Store = useF1Store();

const drivers = computed(() => f1Store.sortedDriversViewModel.filter((driver) => driver.racingNumber != "_kf"));


</script>

<template>
  <div class="widget timing-table">
    <table>
      <thead>
        <tr>
          <th>Pos</th>
          <th>#</th>
          <th>Driver</th>
          <th>Best Lap</th>
          <th>Last Lap</th>
          <th>Gap</th>
          <th>Interval</th>
          <th>Pits</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="driver in drivers" :key="driver.racingNumber" :style="{ borderLeft: `5px solid #${driver.teamColour}`, opacity: driver.stopped ? 0.5 : 1 }">
          <td>{{ driver.position }}</td>
          <td>{{ driver.racingNumber }}</td>
          <td>{{ driver.tla }}</td>
          <td>{{ driver.bestLapTime?.Value || '-' }}</td>
          <td>{{ driver.lastLapTime?.Value || '-' }}</td>
          <td>{{ driver.gapToLeader || '-' }}</td>
          <td>{{ driver.gapToAhead || '-' }}</td>
          <td>{{ driver.inPit ? "In Pits" : (driver.pitOut ? "Pit exit" : driver.numberOfPitStops) }}</td>
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
  table { width: 100%; border-collapse: collapse; font-size: 0.9em; } 
  th, td { padding: 2px 4px; text-align: left; border-bottom: 1px solid #444; white-space: nowrap; }
  th { background-color: #333; color: #eee; font-weight: bold; }
  td { background-color: #222; color: #ddd; }
  tr:nth-child(even) td { background-color: #282828; }
  tr[style*="opacity: 0.5"] td { color: #888; } 
</style>