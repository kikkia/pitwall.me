<script setup lang="ts">
import { computed, ref } from 'vue';
import { useF1Store } from '@/stores/f1Store';
import { timeStringToMillis, formatLapTime } from '@/utils/formatUtils';
import { getMinisectorClass, getLastTimeClass, getBestTimeClass } from '@/utils/sectorFormattingUtils';

const f1Store = useF1Store();

type SortKeys = 'tla' | 'lastLapTimeMillis' | 'lastS1TimeMillis' | 'lastS2TimeMillis' | 'lastS3TimeMillis' | 'position';

const driversViewModel = computed(() => {
  const isQualifying = f1Store.currentSessionType === 'Qualifying';
  const currentQualifyingPart = f1Store.currentQualifyingPart;

  return f1Store.sortedDriversViewModel
    .filter((driver) => driver.racingNumber != "_kf")
    .map(driver => {
      let isAtRisk = false;
      if (isQualifying) {
        const driverPositionNum = parseInt(driver.position);
        if (currentQualifyingPart === 1) {
          isAtRisk = driverPositionNum >= 16 && driverPositionNum <= 20;
        } else if (currentQualifyingPart === 2) {
          isAtRisk = driverPositionNum >= 11 && driverPositionNum <= 15;
        }
      }
      return {
        ...driver,
        position: parseInt(driver.position, 10),
        lastLapTimeMillis: timeStringToMillis(driver.lastLapTime?.Value),
        bestLapTimeMillis: timeStringToMillis(driver.bestLapTime?.Value),
        lastS1TimeMillis: timeStringToMillis(driver.sectors?.[0]?.Value),
        lastS2TimeMillis: timeStringToMillis(driver.sectors?.[1]?.Value),
        lastS3TimeMillis: timeStringToMillis(driver.sectors?.[2]?.Value),
        bestS1TimeValue: driver.bestSectors[0]?.Value || null,
        bestS2TimeValue: driver.bestSectors[1]?.Value || null,
        bestS3TimeValue: driver.bestSectors[2]?.Value || null,
        bestS1TimeMillis: timeStringToMillis(driver.bestSectors[0]?.Value),
        bestS2TimeMillis: timeStringToMillis(driver.bestSectors[1]?.Value),
        bestS3TimeMillis: timeStringToMillis(driver.bestSectors[2]?.Value),
        isAtRiskOfElimination: isAtRisk,
        isKnockedOut: driver.isKnockedOut,
        isCutoff: driver.isCutoff,
        isQualifying: isQualifying,
      };
    });
});

const props = defineProps({
  showBestLap: { type: Boolean, default: true },
  showLastLap: { type: Boolean, default: true },
  showBestSectors: { type: Boolean, default: true },
  showLastSectors: { type: Boolean, default: true },
  showMinisectors: { type: Boolean, default: true },
  messageFontSize: { type: Number, default: 90 },
  sortKey: { type: String as () => SortKeys, default: 'position' },
  sortOrder: { type: String as () => 'asc' | 'desc', default: 'asc' }
});

const sortedDrivers = computed(() => {
  const drivers = driversViewModel.value;
  const key = props.sortKey;
  if (!key) {
    return drivers;
  }
  const order = props.sortOrder === 'asc' ? 1 : -1;
  return [...drivers].sort((a, b) => {
    const valA = a[key];
    const valB = b[key];

    if (key === 'tla') {
      const strA = (valA as string) || '';
      const strB = (valB as string) || '';
      return strA.localeCompare(strB) * order;
    }

    const numA = (valA as number) || Infinity;
    const numB = (valB as number) || Infinity;

    if (numA < numB) return -1 * order;
    if (numA > numB) return 1 * order;
    return 0;
  });
});

const settingsDefinition = ref([
  { id: 'showLastLap', label: 'Show Last Lap', type: 'boolean', component: 'Checkbox' },
  { id: 'showBestLap', label: 'Show Best Lap', type: 'boolean', component: 'Checkbox' },
  { id: 'showLastSectors', label: 'Show Last Sectors', type: 'boolean', component: 'Checkbox' },
  { id: 'showBestSectors', label: 'Show Best Sectors', type: 'boolean', component: 'Checkbox' },
  { id: 'showMinisectors', label: 'Show Minisectors', type: 'boolean', component: 'Checkbox' },
  {
    id: 'messageFontSize', label: 'Font Size (%)', type: 'number', component: 'Slider',
    props: { min: 50, max: 150, step: 10 }
  },
  {
    id: 'sortKey',
    label: 'Sort By',
    type: 'string',
    component: 'Dropdown',
    options: [
      { label: 'Position', value: 'position' },
      { label: 'Driver Name', value: 'tla' },
      { label: 'Last Lap Time', value: 'lastLapTimeMillis' },
      { label: 'Best Lap Time', value: 'bestLapTimeMillis' },
      { label: 'Best Sector 1', value: 'bestS1TimeMillis' },
      { label: 'Best Sector 2', value: 'bestS2TimeMillis' },
      { label: 'Best Sector 3', value: 'bestS3TimeMillis' },
    ]
  },
  {
    id: 'sortOrder',
    label: 'Sort Order',
    type: 'string',
    component: 'Dropdown',
    options: [
        { label: 'Ascending', value: 'asc' },
        { label: 'Descending', value: 'desc' }
    ]
  }
]);

defineExpose({ settingsDefinition });

const tableStyle = computed(() => ({
    fontSize: `${props.messageFontSize}%`
}));



</script>

<template>
  <div class="widget sector-timing-table compact-timing">
    <table :style="tableStyle">
      <thead>
        <tr>
          <th>Driver</th>
          <th class="compact-header">Lap</th>
          <th class="compact-header">S1</th>
          <th class="compact-header">S2</th>
          <th class="compact-header">S3</th>
        </tr>
      </thead>
      <TransitionGroup tag="tbody" name="list">
        <tr v-if="sortedDrivers.length === 0" key="empty-state">
            <td colspan="5" style="text-align: center; padding: 20px;">Waiting for timing data...</td>
        </tr>
        <tr v-for="driver in sortedDrivers" :key="driver.racingNumber" :class="{
          'at-risk-elimination': driver.isAtRiskOfElimination,
          'disabled-driver': driver.stopped || driver.retired || driver.isKnockedOut
        }">
          <td>
            <span v-if="driver.isQualifying">
              <span v-if="driver.isKnockedOut" class="knocked-out-pos">{{ driver.position }}</span>
              <span v-else class="driver-pos">{{ driver.position }}</span>
            </span>
            <span v-else class="driver-pos">{{ driver.position }}</span>
            <span class="driver-tla" :style="{ borderLeft: `4px solid #${driver.teamColour}`, paddingLeft: '4px' }">
              {{ driver.tla }}
            </span>
          </td>
          <td class="compact-header">
            <div class="time-cell-content">
              <div class="time-row">
                <span v-if="props.showLastLap" :class="['time-value last-time', getLastTimeClass(driver.lastLapTime)]">
                  {{ formatLapTime(timeStringToMillis(driver.lastLapTime?.Value)) }}
                </span>
                <span v-if="props.showBestLap" :class="['time-value best-time', getBestTimeClass(driver.personalBestLap)]">
                  {{ formatLapTime(timeStringToMillis(driver.personalBestLap?.Value)) }}
                </span>
              </div>
            </div>
          </td>
          <td class="compact-header">
            <div class="time-cell-content">
              <div class="time-row">
                <span v-if="props.showLastSectors" :class="['time-value last-time', getLastTimeClass(driver.sectors?.[0])]">
                  {{ formatLapTime(timeStringToMillis(driver.sectors?.[0]?.Value)) }}
                </span>
                <span v-if="props.showLastSectors && props.showBestSectors">/</span>
                <span v-if="props.showBestSectors" :class="['time-value best-time', getBestTimeClass(driver.bestSectors?.[0])]">
                  {{ formatLapTime(timeStringToMillis(driver.bestSectors?.[0]?.Value)) }}
                </span>
              </div>
              <div v-if="props.showMinisectors" class="minisector-row">
                <div class="minisector-container">
                  <span v-for="(segment, index) in driver.sectors?.[0]?.Segments" :key="`s1-${index}`" :class="['minisector', getMinisectorClass(segment.Status)]"></span>
                </div>
              </div>
            </div>
          </td>
          <td class="compact-header">
            <div class="time-cell-content">
              <div class="time-row">
                <span v-if="props.showLastSectors" :class="['time-value last-time', getLastTimeClass(driver.sectors?.[1])]">
                  {{ formatLapTime(timeStringToMillis(driver.sectors?.[1]?.Value)) }}
                </span>
                <span v-if="props.showLastSectors && props.showBestSectors">/</span>
                <span v-if="props.showBestSectors" :class="['time-value best-time', getBestTimeClass(driver.bestSectors?.[1])]">
                  {{ formatLapTime(timeStringToMillis(driver.bestSectors?.[1]?.Value)) }}
                </span>
              </div>
              <div v-if="props.showMinisectors" class="minisector-row">
                <div class="minisector-container">
                  <span v-for="(segment, index) in driver.sectors?.[1]?.Segments" :key="`s2-${index}`" :class="['minisector', getMinisectorClass(segment.Status)]"></span>
                </div>
              </div>
            </div>
          </td>
          <td class="compact-header">
            <div class="time-cell-content">
              <div class="time-row">
                <span v-if="props.showLastSectors" :class="['time-value last-time', getLastTimeClass(driver.sectors?.[2])]">
                  {{ formatLapTime(timeStringToMillis(driver.sectors?.[2]?.Value)) }}
                </span>
                <span v-if="props.showLastSectors && props.showBestSectors">/</span>
                <span v-if="props.showBestSectors" :class="['time-value best-time', getBestTimeClass(driver.bestSectors?.[2])]">
                  {{ formatLapTime(timeStringToMillis(driver.bestSectors?.[2]?.Value)) }}
                </span>
              </div>
              <div v-if="props.showMinisectors" class="minisector-row">
                <div class="minisector-container">
                  <span v-for="(segment, index) in driver.sectors?.[2]?.Segments" :key="`s3-${index}`" :class="['minisector', getMinisectorClass(segment.Status)]"></span>
                </div>
              </div>
            </div>
          </td>
        </tr>
      </TransitionGroup>
    </table>
  </div>
</template>

<style scoped>
  .sector-timing-table table {
    width: 100%;
    border-collapse: collapse;
  }
  .sector-timing-table th {
    background-color: #333;
    color: #eee;
    font-weight: bold;
    padding: 4px 6px;
    border: none;
    border-bottom: 1px solid #555;
    text-align: left;
    white-space: nowrap;
  }
  .sector-timing-table th.sortable {
    cursor: pointer;
  }
  .sector-timing-table th.compact-header {
    text-align: center;
  }
  .sector-timing-table td {
    background-color: #222;
    color: #ddd;
    padding: 1px 4px;
    border: none;
    border-bottom: 1px solid #444;
    white-space: nowrap;
    vertical-align: middle;
    height: 2.9em;
    line-height: 1.1;
  }
  .sector-timing-table tr:nth-child(even) td {
    background-color: #282828;
  }
  .sector-timing-table tr:hover td {
    background-color: #3a3a3a;
  }
  .sector-timing-table tr.disabled-driver {
    opacity: 0.5;
    color: #888;
  }
  .time-cell-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    width: 100%;
  }
  .time-row {
    display: flex;
    justify-content: center;
    align-items: baseline;
    gap: 5px;
    width: 100%;
    min-height: 1.2em;
  }
  .time-value {
    display: inline-block;
    font-family: monospace;
    font-size: 0.95em;
    line-height: 1.1;
    text-align: right;
    flex-shrink: 0;
  }
  .best-time {
    color: #888;
  }
  .best-time.sector-personal-best,
  .best-time.sector-overall-best {
    color: inherit;
    font-size: inherit;
    font-weight: bold;
  }
  .last-time.sector-personal-best,
  .last-time.sector-overall-best {
    font-weight: bold;
  }
  .minisector-row {
    width: 100%;
    margin-top: 1px;
    min-height: 0.8em;
    line-height: 1;
  }
  .minisector-container {
    display: flex;
    gap: 1px;
    height: 0.7em;
    align-items: center;
    justify-content: center;
  }
  .minisector {
    display: inline-block;
    width: 5px;
    height: 0.7em;
    border-radius: 1px;
  }
  .sector-overall-best { color: #b13bff !important; }
  .sector-personal-best { color: #4caf50 !important; }
  .minisector-set { background-color: #fdd835; }
  .minisector-stopped { background-color: #555; }
  .minisector-unknown { background-color: #777; }
  .minisector-pb { background-color: #4caf50; }
  .minisector-ob { background-color: #b13bff; }
  .minisector-pit { background-color: #2196F3; }
  .driver-tla { display: inline-block; font-weight: bold; }
  .knocked-out-pos {
    color: #FF6347;
    font-weight: bold;
    margin-right: 5px;
  }
  .driver-pos {
    margin-right: 5px;
  }
  .at-risk-elimination td {
    background-color: #4a2a2a !important;
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