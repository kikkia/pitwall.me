<script setup lang="ts">
import { computed } from 'vue';
import { useF1Store } from '@/stores/f1Store';

const f1Store = useF1Store();

// Use computed for efficient updates when relevant data changes
const timingLines = computed(() => {
  if (!f1Store.state.raceData?.TimingData?.Lines) return [];
  // Combine TimingData with DriverList info and sort
  return Object.values(f1Store.state.raceData?.TimingData.Lines)
    .map(timing => {
      const driverInfo = f1Store.state.raceData?.DriverList?.[timing.RacingNumber];
      return {
        ...timing, // Spread timing data
        Tla: driverInfo?.Tla || 'N/A',
        TeamColour: driverInfo?.TeamColour || 'FFFFFF',
        FullName: driverInfo?.FullName || 'Unknown Driver',
        // Add other needed driver details
      };
    })
    .sort((a, b) => {
        const posA = parseInt(a.Position, 10); // Position often comes as string
        const posB = parseInt(b.Position, 10);
        if (!isNaN(posA) && !isNaN(posB)) return posA - posB;
        return a.Line - b.Line; // Fallback to Line (grid position) if Position NaN
    }); // Sort by Position
});

// Access other parts of the state as needed
const sessionType = computed(() => f1Store.state.raceData?.SessionInfo?.Type);
const trackStatus = computed(() => f1Store.state.raceData?.TrackStatus?.Status);

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
        <tr v-for="driver in timingLines" :key="driver.RacingNumber" :style="{ borderLeft: `5px solid #${driver.TeamColour}` }">
          <td>{{ driver.Position }}</td>
          <td>{{ driver.RacingNumber }}</td>
          <td>{{ driver.Tla }}</td>
          <td>{{ driver.BestLapTime?.Value || '-' }}</td>
           <td>{{ driver.LastLapTime?.Value || '-' }}</td>
          <td>{{ /* Calculate Gap - driver.Stats[CurrentSessionPart]?.TimeDiffToFastest */ '-' }}</td>
          <td>{{ /* Calculate Interval - driver.Stats[CurrentSessionPart]?.TimeDifftoPositionAhead */ '-' }}</td>
          <td>{{ driver.NumberOfPitStops }}</td>
          <!-- Add other cells -->
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
table { width: 100%; border-collapse: collapse; }
th, td { padding: 1px 2px; text-align: left; border-bottom: 1px solid #ccc; }
</style>