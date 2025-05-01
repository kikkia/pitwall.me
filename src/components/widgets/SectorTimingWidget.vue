<script setup lang="ts">
import { computed, ref } from 'vue';
import { useF1Store } from '@/stores/f1Store';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';

// Used to better sort by time
function timeStringToMillis(timeStr: string | null | undefined): number {
  if (!timeStr || timeStr === '-') return Infinity;
  const parts = timeStr.split(':');
  let millis = 0;
  if (parts.length === 2) {
    millis += parseInt(parts[0], 10) * 60 * 1000;
    millis += parseFloat(parts[1]) * 1000;
  } else if (parts.length === 1) {
    millis += parseFloat(parts[0]) * 1000;
  } else {
    return Infinity; 
  }
  return isNaN(millis) ? Infinity : Math.round(millis);
}

const f1Store = useF1Store();

const driversViewModel = computed(() => {
  return f1Store.sortedDriversViewModel
    .filter((driver) => driver.racingNumber != "_kf")
    .map(driver => ({
      ...driver,
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
    }));
});


const props = defineProps({
  showBestLap: { type: Boolean, default: true },
  showLastLap: { type: Boolean, default: true },
  showBestS1: { type: Boolean, default: true },
  showLastS1: { type: Boolean, default: true },
  showBestS2: { type: Boolean, default: true },
  showLastS2: { type: Boolean, default: true },
  showBestS3: { type: Boolean, default: true },
  showLastS3: { type: Boolean, default: true },
  showMinisectors: { type: Boolean, default: true },
  messageFontSize: { type: Number, default: 90 }
});

const settingsDefinition = ref([
  { id: 'showBestLap', label: 'Show Best Lap', type: 'boolean', component: 'Checkbox' },
  { id: 'showLastLap', label: 'Show Last Lap', type: 'boolean', component: 'Checkbox' },
  { id: 'showBestS1', label: 'Show Best S1', type: 'boolean', component: 'Checkbox' },
  { id: 'showLastS1', label: 'Show Last S1', type: 'boolean', component: 'Checkbox' },
  { id: 'showBestS2', label: 'Show Best S2', type: 'boolean', component: 'Checkbox' },
  { id: 'showLastS2', label: 'Show Last S2', type: 'boolean', component: 'Checkbox' },
  { id: 'showBestS3', label: 'Show Best S3', type: 'boolean', component: 'Checkbox' },
  { id: 'showLastS3', label: 'Show Last S3', type: 'boolean', component: 'Checkbox' },
  { id: 'showMinisectors', label: 'Show Minisectors', type: 'boolean', component: 'Checkbox' },
  {
    id: 'messageFontSize', label: 'Font Size (%)', type: 'number', component: 'Slider',
    props: { min: 50, max: 150, step: 10 }
  }
]);

defineExpose({ settingsDefinition });

const tableStyle = computed(() => ({
    fontSize: `${props.messageFontSize}%`
}));

function formatTime(timeValue: string | null | undefined): string {
  return timeValue || '-';
}

function getSectorClass(sectorData: any | null | undefined): string {
  if (!sectorData) return '';
  if (sectorData.OverallFastest) return 'sector-overall-best';
  if (sectorData.PersonalFastest) return 'sector-personal-best';
  return '';
}

function getMinisectorClass(segmentStatus: number | undefined): string {
  switch (segmentStatus) {
    case 2048: 
      return 'minisector-set'; 
    case 0: 
      return 'minisector-stopped'; 
    case 2049: return 'minisector-pb'; 
    case 2051: return 'minisector-ob';
    case 2064: return 'minisector-pit';
    default:
      return 'minisector-unknown'; 
  }
}

</script>

<template>
  <div class="widget sector-timing-table">
    <DataTable
      :value="driversViewModel"
      responsiveLayout="scroll"
      class="p-datatable-sm"
      :style="tableStyle"
      sortMode="multiple"
      removableSort
      rowHover
      ><!-- v-model:sortField="sortState.field" v-model:sortOrder="sortState.order" -->

       <Column field="tla" header="Driver" sortable :style="{ width: '50px' }">
         <template #body="slotProps">
            <span class="driver-tla" :style="{ borderLeft: `4px solid #${slotProps.data.teamColour}`, paddingLeft: '4px' }">
              {{ slotProps.data.tla }}
            </span>
         </template>
       </Column>

      <Column v-if="showLastLap" field="lastLapTimeMillis" header="Last Lap" sortable :style="{ width: '90px' }">
        <template #body="slotProps">
          {{ formatTime(slotProps.data.lastLapTime?.Value) }}
        </template>
      </Column>
      <Column v-if="showBestLap" field="bestLapTimeMillis" header="Best Lap" sortable :style="{ width: '90px' }">
         <template #body="slotProps">
          {{ formatTime(slotProps.data.bestLapTime?.Value) }}
        </template>
      </Column>

      <Column :style="{ width: '10px' }" />

      <Column v-if="showLastS1" field="lastS1TimeMillis" header="Last S1" sortable :style="{ width: '75px' }">
         <template #body="slotProps">
            <span :class="getSectorClass(slotProps.data.sectors?.[0])">
              {{ formatTime(slotProps.data.sectors?.[0]?.Value) }}
            </span>
         </template>
      </Column>
       <Column v-if="showBestS1" field="bestS1TimeMillis" header="Best S1" sortable :style="{ width: '75px' }">
        <template #body="slotProps">
            <span :class="slotProps.data.bestSectors?.[0]?.Position === 1 ? 'sector-overall-best' : ''">
               {{ formatTime(slotProps.data.bestSectors?.[0]?.Value) }}
             </span>
          </template>
      </Column>
       <Column v-if="showMinisectors" header="S1 Segments" :style="{ width: '100px' }">
          <template #body="slotProps">
            <div class="minisector-container">
              <span
                v-for="(segment, index) in slotProps.data.sectors?.[0]?.Segments || []"
                :key="`s1-${index}`"
                :class="['minisector', getMinisectorClass(segment.Status)]"
              ></span>
            </div>
          </template>
       </Column>

      <Column :style="{ width: '10px' }" />

       <Column v-if="showLastS2" field="lastS2TimeMillis" header="Last S2" sortable :style="{ width: '75px' }">
          <template #body="slotProps">
             <span :class="getSectorClass(slotProps.data.sectors?.[1])">
               {{ formatTime(slotProps.data.sectors?.[1]?.Value) }}
             </span>
          </template>
       </Column>
       <Column v-if="showBestS2" field="bestS2TimeMillis" header="Best S2" sortable :style="{ width: '75px' }">
        <template #body="slotProps">
            <span :class="slotProps.data.bestSectors?.[1]?.Position === 1 ? 'sector-overall-best' : ''">
               {{ formatTime(slotProps.data.bestSectors?.[1]?.Value) }}
             </span>
          </template>
       </Column>
       <Column v-if="showMinisectors" header="S2 Segments" :style="{ width: '80px' }">
           <template #body="slotProps">
             <div class="minisector-container">
               <span
                 v-for="(segment, index) in slotProps.data.sectors?.[1]?.Segments || []"
                 :key="`s2-${index}`"
                 :class="['minisector', getMinisectorClass(segment.Status)]"
               ></span>
             </div>
           </template>
       </Column>

      <Column :style="{ width: '10px' }" />

       <Column v-if="showLastS3" field="lastS3TimeMillis" header="Last S3" sortable :style="{ width: '75px' }">
          <template #body="slotProps">
             <span :class="getSectorClass(slotProps.data.sectors?.[2])">
               {{ formatTime(slotProps.data.sectors?.[2]?.Value) }}
             </span>
          </template>
       </Column>
       <Column v-if="showBestS3" field="bestS3TimeMillis" header="Best S3" sortable :style="{ width: '75px' }">
          <template #body="slotProps">
            <span :class="slotProps.data.bestSectors?.[2]?.Position === 1 ? 'sector-overall-best' : ''">
               {{ formatTime(slotProps.data.bestSectors?.[2]?.Value) }}
             </span>
          </template>
       </Column>
        <Column v-if="showMinisectors" header="S3 Segments" :style="{ width: '110px' }">
            <template #body="slotProps">
              <div class="minisector-container">
                <span
                  v-for="(segment, index) in slotProps.data.sectors?.[2]?.Segments || []"
                  :key="`s3-${index}`"
                  :class="['minisector', getMinisectorClass(segment.Status)]"
                ></span>
              </div>
            </template>
        </Column>

       <template #empty>
            <div style="text-align: center; padding: 20px;">Waiting for timing data...</div>
       </template>

    </DataTable>
  </div>
</template>

<style scoped>
  .sector-timing-table :deep(.p-datatable .p-datatable-thead > tr > th) {
    background-color: #333;
    color: #eee;
    font-weight: bold;
    padding: 4px 6px;
    border: none; 
    border-bottom: 1px solid #555;
    text-align: left;
    white-space: nowrap;
  }

  .sector-timing-table :deep(.p-datatable .p-datatable-tbody > tr > td) {
    background-color: #222;
    color: #ddd;
    padding: 3px 6px; 
    border: none;
    border-bottom: 1px solid #444;
    white-space: nowrap;
    vertical-align: middle;
  }

  .sector-timing-table :deep(.p-datatable .p-datatable-tbody > tr:nth-child(even) > td) {
    background-color: #282828;
  }

  .sector-timing-table :deep(.p-datatable .p-datatable-tbody > tr.p-datatable-row-hover > td) {
     background-color: #3a3a3a; 
   }

  .sector-timing-table :deep(.p-datatable .p-datatable-tbody > tr[data-driver-stopped="true"] > td) { 
      opacity: 0.5;
      color: #888;
  }

  .sector-overall-best {
    color: #b13bff; 
    font-weight: bold;
  }

  .sector-personal-best {
    color: #4caf50; 
  }

  .minisector-container {
    display: flex;
    gap: 2px; 
    height: 1em;
    align-items: center;
  }

  .minisector {
    display: inline-block;
    width: 6px; 
    height: 0.7em;
    border-radius: 1px;
  }

  .minisector-set {
    background-color: #fdd835; 
  }

  .minisector-stopped {
    background-color: #555; 
  }

  .minisector-unknown {
     background-color: #777; 
  }

  .minisector-pb { background-color: #4caf50; }
  .minisector-ob { background-color: #b13bff; }
  .minisector-pit { background-color: #2196F3; }


  .driver-tla {
    display: inline-block; 
    font-weight: bold;
  }

  .p-datatable-sm {
    width: 100%;
  }
</style>