<script setup lang="ts">
import { computed, ref } from 'vue';
import { useF1Store } from '@/stores/f1Store';
import { formatLapTime, timeStringToMillis } from '@/utils/formatUtils';
import { getMinisectorClass, getLastTimeClass } from '@/utils/sectorFormattingUtils';

const f1Store = useF1Store();

const props = defineProps({
  displayMode: { type: String, default: 'interval' }, // 'interval', 'leader'
  dankMode: { type: Boolean, default: false },
  messageFontSize: { type: Number, default: 90 },
});

const isQualifying = computed(() => f1Store.isQuali);
const currentQualifyingPart = computed(() => f1Store.currentQualifyingPart);

const drivers = computed(() => {
  return f1Store.sortedDriversViewModel
    .filter((driver) => driver.racingNumber !== "_kf")
    .map(driver => {
      let isAtRisk = false;
      if (isQualifying.value) {
        const driverPositionNum = parseInt(driver.position);
        if (currentQualifyingPart.value === 1) {
          isAtRisk = driverPositionNum >= 16 && driverPositionNum <= 20;
        } else if (currentQualifyingPart.value === 2) {
          isAtRisk = driverPositionNum >= 11 && driverPositionNum <= 15;
        }
      }
      return {
        ...driver,
        isAtRiskOfElimination: isAtRisk
      };
    });
});

const settingsDefinition = ref([
    {
    id: 'displayMode',
    label: 'Race Display Mode',
    type: 'string',
    component: 'Dropdown',
    options: [
        { label: 'Gap to Ahead', value: 'interval' },
        { label: 'Gap to Leader', value: 'leader' },
    ]
    },
    { id: 'dankMode', label: 'Dank Mode (Color TLA by Sector)', type: 'boolean', component: 'Checkbox' },
  {
    id: 'messageFontSize',
    label: 'Font Size (%)',
    type: 'number',
    component: 'Slider',
    props: { min: 50, max: 150, step: 10 }
  },
]);

defineExpose({ settingsDefinition });

const tableStyle = computed(() => ({
    fontSize: `${props.messageFontSize}%`
}));

const getTeamLogoUrl = (teamName: string) => {
  if (!teamName) return '';
  const sanitizedTeamName = teamName.toLowerCase().replace(/\s+/g, '_');
  return `/teams/${sanitizedTeamName}_icon.png`;
};

const getMiniSectorClass = (status: number) => {
    return getMinisectorClass(status);
}

const getTlaCharClass = (sector: any) => {
    return getLastTimeClass(sector);
}

const isRaceSession = computed(() => f1Store.isRace);

const computedDisplayValue = (driver: any) => {
    if (!isRaceSession.value) {
        const time = driver.qualifyingTime?.Value;
        if (!time) {
            if (driver.inPit) return 'IN PIT';
            if (driver.sectors && driver.sectors.some((s: any) => s.Value)) return 'OutLap';
            return 'No Time';
        }
        return formatLapTime(timeStringToMillis(time));
    }
    // Race
    if (driver.position === '1') return formatLapTime(timeStringToMillis(driver.lastLapTime?.Value));

    if (props.displayMode === 'leader') {
        return driver.gapToLeader;
    }
    // interval
    return driver.gapToAhead;
}

</script>

<template>
  <div class="timing-tower-widget" :style="tableStyle">
    <div v-if="drivers.length === 0" class="empty-state">
      Waiting for timing data...
    </div>
    <div v-else class="timing-tower-grid">
      <TransitionGroup name="list" tag="div">
        <div v-for="driver in drivers" :key="driver.racingNumber" class="driver-row" :class="{
            'out-of-race': driver.retired || driver.stopped || driver.isKnockedOut,
            'at-risk-elimination': driver.isAtRiskOfElimination
          }">
          <div class="position">
            <template v-if="isQualifying">
              <span v-if="driver.isKnockedOut" class="knocked-out-pos">OUT</span>
              <span v-else>{{ driver.position }}</span>
            </template>
            <template v-else>
              {{ driver.position }}
            </template>
          </div>
          
          <div class="identity-info">
              <div class="team-color-bar" :style="{ backgroundColor: '#' + driver.teamColour }"></div>
              <img :src="getTeamLogoUrl(driver.teamName)" class="team-logo" />
          </div>
        
          <div class="name-and-sectors-stack">
            <div class="driver-name">
                <template v-if="props.dankMode && driver.tla?.length === 3 && driver.sectors?.length > 0">
                    <span :class="getTlaCharClass(driver.sectors?.[0])">{{ driver.tla[0] }}</span>
                    <span :class="getTlaCharClass(driver.sectors?.[1])">{{ driver.tla[1] }}</span>
                    <span :class="getTlaCharClass(driver.sectors?.[2])">{{ driver.tla[2] }}</span>
                </template>
                <template v-else>
                    {{ driver.tla }}
                </template>
            </div>
            <div class="sectors-display" v-if="!props.dankMode">
                <div class="minisector-container">
                    <span v-for="(segment, index) in driver.sectors?.[0]?.Segments" :key="`s1-${index}`" :class="['minisector', getMiniSectorClass(segment.Status)]"></span>
                </div>
                <div class="minisector-container">
                    <span v-for="(segment, index) in driver.sectors?.[1]?.Segments" :key="`s2-${index}`" :class="['minisector', getMiniSectorClass(segment.Status)]"></span>
                </div>
                <div class="minisector-container">
                    <span v-for="(segment, index) in driver.sectors?.[2]?.Segments" :key="`s3-${index}`" :class="['minisector', getMiniSectorClass(segment.Status)]"></span>
                </div>
            </div>
          </div>

          <div class="pit-indicator-container">
            <div v-if="driver.inPit" class="pit-indicator">P</div>
          </div>
        
          <div class="time-display">
            <span>{{ computedDisplayValue(driver) }}</span>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<style scoped>
.timing-tower-widget {
  height: 100%;
  width: 100%;
  color: #fff;
  background-color: #1a1a1a;
  font-family: 'Formula1-Regular', sans-serif;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.empty-state {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    font-size: 1.2em;
}

.timing-tower-grid {
    display: grid;
    grid-template-columns: 1fr;
    flex-grow: 1;
}

.driver-row {
  display: grid;
  grid-template-columns: 30px 35px 1fr 30px 80px;
  align-items: center;
  border-bottom: 1px solid #333;
  padding: 3px 3px;
  gap: 3px;
  min-height: 40px;
}

.driver-row.out-of-race {
  opacity: 0.4;
}

.position {
  font-weight: bold;
  text-align: center;
}

.identity-info {
  display: flex;
  align-items: center;
  height: 100%;
}

.team-color-bar {
    width: 4px;
    height: 90%;
    border-radius: 2px;
}

.team-logo {
  height: 20px;
  width: 20px;
  object-fit: contain;
  margin-left: 4px;
}

.name-and-sectors-stack {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
    align-items: center;
}

.pit-indicator-container {
    display: flex;
    justify-content: center;
    align-items: center;
}

.driver-name {
  font-weight: bold;
}
.driver-name span {
    display: inline-block;
}
.driver-name span.sector-overall-best { color: #b13bff !important; }
.driver-name span.sector-personal-best { color: #4caf50 !important; }
.driver-name span.sector-set { color: #fdd835 !important; }

.pit-indicator {
    background-color: #cccccc;
    color: #000;
    font-weight: bold;
    border-radius: 4px;
    padding: 1px 4px;
    font-size: 0.8em;
}

.sectors-display {
  display: flex;
  gap: 2px;
  min-width: 90%;
}

.minisector-container {
  display: flex;
  gap: 0;
  height: 5px;
  flex: 1;
  background-color: #444;
  border-radius: 1px;
  overflow: hidden;
}

.minisector {
  flex: 1;
  background-color: #555;
  border-radius: 0;
}
.minisector-pb { background-color: #4caf50; }
.minisector-ob { background-color: #b13bff; }
.minisector-set { background-color: #fdd835; }
.minisector-stopped { background-color: #555; }
.minisector-unknown { background-color: #777; }
.minisector-pit { background-color: #2196F3; }


.time-display {
  font-family: monospace;
  text-align: right;
  font-weight: bold;
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

.at-risk-elimination {
  background-color: #4a2a2a !important;
}
.knocked-out-pos {
  color: #FF6347;
  font-weight: bold;
}
</style>