<script setup lang="ts">
import { computed, ref } from 'vue';
import { useF1Store } from '@/stores/f1Store';
import { timeStringToMillis } from '@/utils/formatUtils'
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';

const f1Store = useF1Store();

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
  messageFontSize: { type: Number, default: 90 }
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
  }
]);

defineExpose({ settingsDefinition });

const tableStyle = computed(() => ({
    fontSize: `${props.messageFontSize}%`
}));

function formatTime(timeValue: string | null | undefined): string {
  // Pad single-digit seconds with a leading zero if needed for alignment
  if (timeValue && timeValue.includes(':') && timeValue.match(/\.\d$/)) {
      // Handle M:SS.s -> M:SS.s0
      timeValue += '0';
  } else if (timeValue && !timeValue.includes(':') && timeValue.match(/\.\d$/)) {
      // Handle SS.s -> SS.s0
      timeValue += '0';
  }
  return timeValue || '-.--';
}

function getMinisectorClass(segmentStatus: number | undefined): string {
  switch (segmentStatus) {
    case 2048: return 'minisector-set'; 
    case 0: return 'minisector-stopped'; 
    case 2049: return 'minisector-pb'; 
    case 2051: return 'minisector-ob';
    case 2064: return 'minisector-pit';
    default: return 'minisector-unknown'; 
  }
}

// Gets class for the LAST sector/lap time span
function getLastTimeClass(timeData: any | null | undefined): string {
  if (!timeData) return '';
  if (timeData.OverallFastest) return 'sector-overall-best';
  if (timeData.PersonalFastest) return 'sector-personal-best';
  return '';
}

// Gets class for the BEST sector/lap time span
function getBestTimeClass(timeData: any | null | undefined): string {
  // Best time only gets purple highlight if it's overall best
  if (!timeData) return '';
  if (timeData.Position == 1) return 'sector-overall-best';
  return '';
}

</script>

<template>
  <div class="widget sector-timing-table compact-timing">
    <DataTable
      :value="driversViewModel"
      responsiveLayout="scroll"
      class="p-datatable-sm"
      :style="tableStyle"
      sortMode="multiple"
      removableSort
      rowHover
      :rowClass="(data: any) => ({
        'at-risk-elimination': data.isAtRiskOfElimination,
        'disabled-driver': data.stopped || data.retired || data.isKnockedOut
      })"
    >
      <Column field="tla" header="Driver" sortable :style="{ width: '50px' }" frozen>
         <template #body="slotProps">
            <span v-if="slotProps.data.isQualifying">
              <span v-if="slotProps.data.isKnockedOut" class="knocked-out-pos">{{ slotProps.data.position }}</span>
              <span v-else class="driver-pos">{{ slotProps.data.position }}</span>
            </span>
            <span v-else class="driver-pos">{{ slotProps.data.position }}</span>
             <span class="driver-tla" :style="{ borderLeft: `4px solid #${slotProps.data.teamColour}`, paddingLeft: '4px' }">
               {{ slotProps.data.tla }}
             </span>
          </template>
        </Column>

       <Column :style="{ width: '5px' }" />

      <Column field="lastLapTimeMillis" header="Lap" sortable headerClass="compact-header">
        <template #body="slotProps">
          <div class="time-cell-content">
            <div class="time-row">
                <span v-if="props.showLastLap"
                      :class="['time-value last-time', getLastTimeClass(slotProps.data.lastLapTime)]">
                  {{ formatTime(slotProps.data.lastLapTime?.Value) }}
                </span>
                <span v-if="props.showBestLap"
                      :class="['time-value best-time', getBestTimeClass(slotProps.data.personalBestLap)]">
                  {{ formatTime(slotProps.data.personalBestLap?.Value) }}
                </span>
            </div>
          </div>
        </template>
      </Column>

      <Column :style="{ width: '10px' }" />

      <Column field="lastS1TimeMillis" header="S1" sortable headerClass="compact-header">
         <template #body="slotProps">
            <div class="time-cell-content">
                <div class="time-row">
                    <span v-if="props.showLastSectors"
                          :class="['time-value last-time', getLastTimeClass(slotProps.data.sectors?.[0])]">
                       {{ formatTime(slotProps.data.sectors?.[0]?.Value) }}
                    </span>
                    <span v-if="props.showLastSectors && props.showBestSectors">/</span>
                     <span v-if="props.showBestSectors"
                          :class="['time-value best-time', getBestTimeClass(slotProps.data.bestSectors?.[0])]">
                       {{ formatTime(slotProps.data.bestSectors?.[0]?.Value) }}
                    </span>
                </div>
                <div v-if="props.showMinisectors" class="minisector-row">
                    <div class="minisector-container">
                      <span
                        v-for="(segment, index) in slotProps.data.sectors?.[0]?.Segments"
                        :key="`s1-${index}`"
                        :class="['minisector', getMinisectorClass(segment.Status)]"
                      ></span>
                    </div>
                </div>
            </div>
         </template>
      </Column>

      <Column :style="{ width: '5px' }" />

       <Column field="lastS2TimeMillis" header="S2" sortable headerClass="compact-header">
         <template #body="slotProps">
             <div class="time-cell-content">
                 <div class="time-row">
                     <span v-if="props.showLastSectors"
                           :class="['time-value last-time', getLastTimeClass(slotProps.data.sectors?.[1])]">
                        {{ formatTime(slotProps.data.sectors?.[1]?.Value) }}
                     </span>
                     <span v-if="props.showLastSectors && props.showBestSectors">/</span>
                     <span v-if="props.showBestSectors"
                           :class="['time-value best-time', getBestTimeClass(slotProps.data.bestSectors?.[1])]">
                        {{ formatTime(slotProps.data.bestSectors?.[1]?.Value) }}
                     </span>
                 </div>
                 <div v-if="props.showMinisectors" class="minisector-row">
                     <div class="minisector-container">
                       <span
                         v-for="(segment, index) in slotProps.data.sectors?.[1]?.Segments"
                         :key="`s2-${index}`"
                         :class="['minisector', getMinisectorClass(segment.Status)]"
                       ></span>
                     </div>
                 </div>
             </div>
         </template>
      </Column>

      <Column :style="{ width: '5px' }" />

      <Column field="lastS3TimeMillis" header="S3" sortable headerClass="compact-header">
         <template #body="slotProps">
             <div class="time-cell-content">
                 <div class="time-row">
                     <span v-if="props.showLastSectors"
                           :class="['time-value last-time', getLastTimeClass(slotProps.data.sectors?.[2])]">
                        {{ formatTime(slotProps.data.sectors?.[2]?.Value) }}
                     </span>
                     <span v-if="props.showLastSectors && props.showBestSectors">/</span>
                     <span v-if="props.showBestSectors"
                           :class="['time-value best-time', getBestTimeClass(slotProps.data.bestSectors?.[2])]">
                        {{ formatTime(slotProps.data.bestSectors?.[2]?.Value) }}
                     </span>
                 </div>
                 <div v-if="props.showMinisectors" class="minisector-row">
                     <div class="minisector-container">
                       <span
                         v-for="(segment, index) in slotProps.data.sectors?.[2]?.Segments"
                         :key="`s3-${index}`"
                         :class="['minisector', getMinisectorClass(segment.Status)]"
                       ></span>
                     </div>
                 </div>
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

   .sector-timing-table :deep(.p-datatable .p-datatable-thead > tr > th.compact-header) {
      text-align: center; 
   }


  .sector-timing-table :deep(.p-datatable .p-datatable-tbody > tr > td) {
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

  .sector-timing-table :deep(.p-datatable .p-datatable-tbody > tr:nth-child(even) > td) {
    background-color: #282828;
  }

  .sector-timing-table :deep(.p-datatable .p-datatable-tbody > tr.p-datatable-row-hover > td) {
     background-color: #3a3a3a;
   }

  .sector-timing-table :deep(.p-datatable .p-datatable-tbody > tr.disabled-driver > td) {
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

  .p-datatable-sm { width: 100%; }

  .knocked-out-pos {
    color: #FF6347; 
    font-weight: bold;
    margin-right: 5px;
  }

  .driver-pos {
    margin-right: 5px;
  }

  .sector-timing-table :deep(.p-datatable .p-datatable-tbody > tr.at-risk-elimination > td) {
    background-color: #4a2a2a !important;
  }

</style>