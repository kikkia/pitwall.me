<script setup lang="ts">
import { ref, computed, watch, onUnmounted, onMounted } from 'vue';
import { useF1Store } from '@/stores/f1Store';
import { useSettingsStore } from '@/stores/settingsStore';
import { MiniSectorStatus } from '@/types/dataTypes';
import type { DriverViewModel, Sector } from '@/types/dataTypes';
import { getMinisectorClass, getLastTimeClass, getBestTimeClass } from '@/utils/sectorFormattingUtils';
import { timeStringToMillis, formatLapTime, formatLiveTime } from '@/utils/formatUtils';
import type { PropType } from 'vue';

const props = defineProps({
    widgetId: {
        type: [String, Number]
    },
    selectedDriverNumber: {
        type: String as PropType<string | null>,
        default: null,
    },
    auto: {
        type: Boolean,
        default: true,
    },
    messageFontSize: {
        type: Number,
        default: 90,
    },
});

const emit = defineEmits(['update:widgetConfig']);

const f1Store = useF1Store();
const settingsStore = useSettingsStore();

const flyingLapDriver = ref<DriverViewModel | null>(null);
const sectorStartTime = ref(0);
const displayTime = ref("--:--.---");
let lapTimerIntervalId: number | null = null;

const isAnimating = ref(false);
const animationDisplayTime = ref("");
const animationDiff = ref("");
const isDriverSelectionLocked = ref(false);

const validMiniSectorStatuses = [
    MiniSectorStatus.OverallFastest,
    MiniSectorStatus.PersonalBest,
    MiniSectorStatus.Set,
];

const sessionType = computed(() => f1Store.raceData.SessionInfo?.Type);
const isQualiOrPractice = computed(() => sessionType.value === 'Qualifying' || sessionType.value === 'Practice');

const targetOpponent = computed<DriverViewModel | null>(() => {
    if (!flyingLapDriver.value || !isQualiOrPractice.value) {
        return null;
    }

    const drivers = f1Store.sortedDriversViewModel;
    if (drivers.length === 0) {
        return null;
    }

    const leader = drivers.find(d => d.position === '1' && !d.isKnockedOut);
    const currentDriver = flyingLapDriver.value;
    const currentDriverPos = parseInt(currentDriver.position, 10);

    const currentQualifyingPart = f1Store.currentQualifyingPart;
    let isAtRisk = false;
    let safePosition: number | null = null;

    if (currentQualifyingPart === 1) {
        safePosition = 15;
        isAtRisk = currentDriverPos >= 16;
    } else if (currentQualifyingPart === 2) {
        safePosition = 10;
        isAtRisk = currentDriverPos >= 11;
    }

    if (isAtRisk && safePosition) {
        const safeDriver = drivers.find(d => parseInt(d.position, 10) === safePosition);
        return safeDriver || leader || null;
    }

    return leader || null;
});

const targetOpponentTime = computed<string | null>(() => {
    if (!targetOpponent.value || !targetOpponentBestLapSectors.value || !flyingLapDriver.value) {
        return null;
    }

    const opponentSectors = targetOpponentBestLapSectors.value;
    if (opponentSectors.length === 0) return null;

    const flyingSectors = flyingLapDriver.value.sectors.filter(s => s.Segments?.every(m => validMiniSectorStatuses.includes(m.Status)));
    const flyingSectorsCount = flyingSectors.length;

    let targetMillis = 0;

    // Show full lap
    if (flyingSectorsCount == 3) {
      if (targetOpponent.value.qualifyingTime?.Value) {
            return targetOpponent.value.qualifyingTime.Value;
        }
        opponentSectors.forEach(sector => {
            if (sector.Value) {
                targetMillis += timeStringToMillis(sector.Value);
            }
        });
    }

    for (let i = 0; i < flyingSectorsCount + 1; i++) {
        if (opponentSectors[i]?.Value) {
            targetMillis += timeStringToMillis(opponentSectors[i].Value);
        }
    }

    if (targetMillis === 0) {
        return null;
    }

    return formatLapTime(targetMillis);
});

const targetOpponentBestLapSectors = computed<{ Value: string }[] | null>(() => {
    if (!targetOpponent.value) return null;

    const opponentNumber = targetOpponent.value.racingNumber;
    const opponentBestTime = targetOpponent.value.qualifyingTime?.Value;
    if (!opponentBestTime) return null;

    const lapHistory = f1Store.raceData.LapHistoryMap[opponentNumber];
    if (!lapHistory || !lapHistory.CompletedLaps) return null;

    const bestLap = (lapHistory.CompletedLaps as any[]).find(lap => lap.LapTime === opponentBestTime);

    if (bestLap && bestLap.Sectors) {
        return bestLap.Sectors;
    }

    return null;
});

const animationDiffClass = computed(() => {
    if (!animationDiff.value) return '';
    const diffValue = parseFloat(animationDiff.value);
    return diffValue > 0 ? 'diff-positive' : 'diff-negative';
});


const sessionBestSectors = computed(() => {
    const bests = new Map<number, number>();
    for (const driver of f1Store.driversViewModelMap.values()) {
        driver.sectors.forEach((sector, index) => {
            if (sector.Value) {
                const time = timeStringToMillis(sector.Value);
                if (time !== Infinity && (!bests.has(index) || time < bests.get(index)!)) {
                    bests.set(index, time);
                }
            }
        });
    }
    return bests;
});

function isDriverOnFlyingLap(driver: DriverViewModel | null): boolean {
  if (!driver || driver.inPit || driver.retired || driver.stopped) {
    return false;
  }

  const hasCompletedMinisector = driver.sectors.some(s =>
    s.Segments?.some(seg => validMiniSectorStatuses.includes(seg.Status))
  );

  if (!hasCompletedMinisector) {
    return false;
  }

  const hasPittedInSectors = driver.sectors.some(s => s.Segments?.some(seg => seg.Status === MiniSectorStatus.InPits));
  if (hasPittedInSectors) {
      return false;
  }

  if (driver.sectors.length > 0) {
    for (let i = 0; i < driver.sectors.length; i++) {
      const sector = driver.sectors[i];
      const bestSectorTime = sessionBestSectors.value.get(i);
      if (sector && sector.Value && bestSectorTime) {
        const sectorTime = timeStringToMillis(sector.Value);
        if (sectorTime > bestSectorTime * 1.05) {
          return false;
        }
      }
    }
  }

  return true;
}

const runLapTimer = () => {
    if (flyingLapDriver.value) {
        if (flyingLapDriver.value.inPit) {
            displayTime.value = "IN PIT";
        } else if (flyingLapDriver.value.stopped || flyingLapDriver.value.retired) {
            displayTime.value = "STOPPED";
        } else if (isDriverOnFlyingLap(flyingLapDriver.value)) {
            const elapsedSinceLapStart = Date.now() - sectorStartTime.value;
            displayTime.value = formatLiveTime(elapsedSinceLapStart);
        } else {
            displayTime.value = "-:--.-";
        }
    } else {
        displayTime.value = "-:--.-";
    }
};

onMounted(() => {
    if (!lapTimerIntervalId) {
        lapTimerIntervalId = window.setInterval(runLapTimer, 100);
    }
});

onUnmounted(() => {
  if (lapTimerIntervalId) {
    clearInterval(lapTimerIntervalId);
    lapTimerIntervalId = null;
  }
});

watch(flyingLapDriver, (newDriver, oldDriver) => {
    if (newDriver && (!oldDriver || newDriver.racingNumber !== oldDriver.racingNumber)) {
        if (newDriver.lastSectorCompleted) {
            sectorStartTime.value = newDriver.lastSectorCompleted - calculateTimerOffset(newDriver);
        } else {
            sectorStartTime.value = Date.now();
        }
    }
});

function calculateTimerOffset(driver: DriverViewModel): number {
  let cumulativeTime = 0;
  let validSectors = driver.sectors.filter(s=> s.Value != "");
  for (let i = 0; i < validSectors.length; i++) {
    const sector = validSectors[i];
    cumulativeTime += timeStringToMillis(sector.Value);
    if (i == 2) { // Sector 3 is populated, this only happens when we are on a new lap befor S1 is done
      cumulativeTime = 0
      break
    }
  }
  console.log("Calculated: " + cumulativeTime)
  return cumulativeTime
}

watch(() => flyingLapDriver.value?.sectors, (newSectors, oldSectors) => {
    if (isAnimating.value || !newSectors || !oldSectors) return;

    for (let i = 0; i < newSectors.length; i++) {
        const newSector = newSectors[i];
        const oldSector = oldSectors[i];

        if (newSector && oldSector && newSector.Value && !oldSector.Value) {
            isAnimating.value = true;
            isDriverSelectionLocked.value = true;
            animationDiff.value = "";

            let cumulativeTime = 0;
            let opponentCumulativeTime = 0;
            for (let j = 0; j <= i; j++) {
                if (newSectors[j] && newSectors[j].Value) {
                    cumulativeTime += timeStringToMillis(newSectors[j].Value);

                    // Calc target sectors
                    if (targetOpponentBestLapSectors.value) {
                      const opponentSector = targetOpponentBestLapSectors.value[j];
                      if (opponentSector && opponentSector.Value) {
                          opponentCumulativeTime += timeStringToMillis(opponentSector.Value);
                      }
                    }
                }
            }
            animationDisplayTime.value = formatLapTime(cumulativeTime);

            if (opponentCumulativeTime > 0) {
                    const diff = cumulativeTime - opponentCumulativeTime;
                    animationDiff.value = (diff / 1000).toFixed(3);
            }
            
            if (i === 2) {
              sectorStartTime.value = Date.now();
            } else {
              sectorStartTime.value = Date.now() - cumulativeTime;
            }

            setTimeout(() => {
                isAnimating.value = false;
                isDriverSelectionLocked.value = false;
                animationDiff.value = "";
            }, 3000);

            break;
        }
    }
}, { deep: true });

watch(() => [f1Store.driversViewModelMap, props.auto, props.selectedDriverNumber], () => {
  if (isDriverSelectionLocked.value && props.auto) {
    return;
  }
  if (!isQualiOrPractice.value) {
    flyingLapDriver.value = null;
    return;
  }

  if (props.auto) {
    let bestCandidate: DriverViewModel | null = null;
    let bestCandidateScore = -1;

    const drivers = Array.from(f1Store.driversViewModelMap.values());

    for (const driver of drivers) {
      if (!isDriverOnFlyingLap(driver)) {
        continue;
      }

      let minisectorCount = 0;
      driver.sectors.forEach(sector => {
        if (sector.Segments) {
            sector.Segments.forEach(segment => {
                if (validMiniSectorStatuses.includes(segment.Status)) {
                    minisectorCount++;
                }
            });
        }
      });
      let score = minisectorCount;


      if (score > bestCandidateScore) {
        bestCandidateScore = score;
        bestCandidate = driver;
      }
    }
    flyingLapDriver.value = bestCandidate;

  } else if (props.selectedDriverNumber) {
    flyingLapDriver.value = f1Store.driversViewModelMap.get(props.selectedDriverNumber) || null;
  } else {
    flyingLapDriver.value = null;
  }
}, { deep: true, immediate: true });


const messageFontSize = computed(() => {
    const size = props.messageFontSize ?? 90;
    return `${size}%`;
});



function getSectorClass(sector: Sector | undefined): string {
  if (!sector || sector.Stopped) return '';
  if (sector.OverallFastest) return 'sector-fill-overall-best';
  if (sector.PersonalFastest) return 'sector-fill-personal-best';
  return 'sector-fill-completed';
}

const availableDrivers = computed(() => {
  return Array.from(f1Store.driversViewModelMap.values())
    .filter(driver => driver.racingNumber !== "_kf")
    .map(driver => ({
      label: `${driver.tla} (${driver.racingNumber})`,
      value: driver.racingNumber
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
});

const settingsDefinition = computed(() => {
  return [
    {
      id: 'auto',
      label: 'Auto Select Flying Lap',
      type: 'boolean',
      component: 'Checkbox',
    },
    {
      id: 'selectedDriverNumber',
      label: 'Select Driver (if auto is off)',
      type: 'string',
      component: 'Dropdown',
      options: availableDrivers.value,
      props: {
        placeholder: "Select a Driver",
        filter: true
      }
    },
    {
      id: 'messageFontSize',
      label: 'Font Size (%)',
      type: 'number',
      component: 'Slider',
      props: { min: 50, max: 200, step: 10 },
    }
  ];
});

defineExpose({ settingsDefinition });

</script>

<template>
  <div class="flying-lap-widget widget-wrapper" :style="{ fontSize: messageFontSize }">
    <div v-if="!isQualiOrPractice" class="unsupported-session">
      <p>Flying Lap widget is only available during Practice and Qualifying sessions.</p>
    </div>
    <div v-else-if="flyingLapDriver" class="driver-info">
      <div class="header">
        <div class="position">{{ flyingLapDriver.position }}</div>
        <div class="name">
          <span class="tla">{{ flyingLapDriver.tla }}</span>
          <span class="number">{{ flyingLapDriver.racingNumber }}</span>
        </div>
        <div class="tyre" :style="{ color: `var(--team-color-${flyingLapDriver.teamName.toLowerCase().replace(/\s/g, '-')})` }">
            <span :class="`tyre-compound--${flyingLapDriver.currentStint?.compound.toLowerCase()}`">
                {{ flyingLapDriver.currentStint?.compound[0] }}
            </span>
        </div>
      </div>
      <div class="lap-time-container">
        <div class="lap-time" :class="{ 'lap-time-animated': isAnimating }">
          {{ isAnimating ? animationDisplayTime : displayTime }}
           <div v-if="isAnimating && animationDiff" class="lap-time-diff" :class="animationDiffClass">
            {{ animationDiff }}
          </div>
        </div>
        <div v-if="targetOpponentTime && targetOpponent" class="target-time" :style="{ borderBottom: `2px solid #${targetOpponent.teamColour}` }">
            <div class="target-driver">
                <span class="target-tla">{{ targetOpponent.tla }}</span>
                <span class="target-number">{{ targetOpponent.racingNumber }}</span>
            </div>
            <span class="target-value">{{ targetOpponentTime }}</span>
        </div>
      </div>
      <div class="sectors">
        <!-- Render completed sectors -->
        <div v-for="(sector, index) in flyingLapDriver.sectors" :key="index" class="sector-bar">
          <div class="sector-details">
            <span class="sector-label">S{{ index + 1 }}</span>
            <span class="sector-time" :class="getLastTimeClass(sector)">{{ sector.Value }}</span>
          </div>
          <div class="minisectors-track">
            <div class="minisectors-progress" :class="getSectorClass(sector)" :style="{ width: '100%' }">
              <div v-for="(segment, segIndex) in sector.Segments" :key="segIndex" class="minisector" :class="getMinisectorClass(segment.Status)"></div>
            </div>
          </div>
        </div>
        
        <!-- Render placeholder sectors -->
        <div v-for="i in (3 - flyingLapDriver.sectors.length)" :key="'placeholder-' + i" class="sector-bar">
           <div class="sector-details">
            <span class="sector-label">S{{ flyingLapDriver.sectors.length + i }}</span>
          </div>
          <div class="minisectors-track"></div>
        </div>
      </div>
    </div>
    <div v-else class="no-driver">
      <p>Waiting for a driver on a flying lap...</p>
    </div>
  </div>
</template>

<style scoped>
.widget-wrapper {
    font-family: 'Formula1-Regular', sans-serif;
    color: white;
    padding: 10px;
}

.unsupported-session, .no-driver {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    text-align: center;
}

.driver-info {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.header {
    display: flex;
    align-items: center;
    background-color: #1F1F1F;
    padding: 0.3em 0.5em;
    border-radius: 5px;
    border-bottom: 2px solid;
    border-color: var(--vt-c-black);
}

.position {
    font-weight: 900;
    font-size: 1.1em;
    padding: 0.1em 0.4em;
    background-color: white;
    color: black;
    border-radius: 3px;
    margin-right: 0.5em;
}

.name {
    display: flex;
    align-items: baseline;
    gap: 0.4em;
    font-weight: 700;
    flex-grow: 1;
}

.tla {
    font-size: 1.1em;
}

.number {
    font-size: 0.9em;
    opacity: 0.8;
}

.tyre {
    font-size: 1.1em;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
}

.tyre span {
    border: 1px solid;
    border-radius: 50%;
    width: 1.5em;
    height: 1.5em;
    display: inline-flex;
    justify-content: center;
    align-items: center;
    line-height: 1;
}

.lap-time-container {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 1em;
    padding: 0.1em 0.2em;
}

.lap-time {
    font-family: 'Formula1-Bold', sans-serif;
    font-size: 3em;
    font-weight: 700;
    text-align: left;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    transition: all 0.2s ease-in-out;
    line-height: 1;
    position: relative;
}

.target-time {
    font-family: 'Formula1-Regular', sans-serif;
    font-size: 1.2em;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    line-height: 1.1;
    opacity: 0.9;
    background-color: #1f1f1f;
    padding: 0.3em 0.5em;
    border-radius: 4px;
}

.target-driver {
    display: flex;
    align-items: baseline;
    gap: 0.4em;
    font-weight: 700;
}

.target-tla {
    font-size: 1em;
}

.target-number {
    font-size: 0.8em;
    opacity: 0.8;
}

.target-value {
    font-family: 'Formula1-Mono', sans-serif;
    font-weight: 400;
    font-size: 1.2em;
}

.lap-time-diff {
    font-family: 'Formula1-Mono', sans-serif;
    font-size: 0.5em;
    margin-left: 0.5em;
    padding: 0.2em 0.4em;
    border-radius: 4px;
    animation: fade-in 0.5s ease-in-out;
}

@keyframes fade-in {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

.diff-positive {
    background-color: #F95A55; /* Red for slower */
    color: white;
}

.diff-negative {
    background-color: #00F500; /* Green for faster */
    color: black;
}

.lap-time-animated {
    animation: flash-and-grow 0.5s ease-in-out alternate 2; /* Runs twice for a full cycle */
}

@keyframes flash-and-grow {
    from {
        transform: scale(1);
        opacity: 0.8;
        color: #ffffff;
    }
    to {
        transform: scale(1.1);
        opacity: 1;
        color: #F2E205; /* F1 Yellow */
    }
}

.sectors {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.3em;
    margin-top: auto;
}

.sector-bar {
    background-color: #151515;
    border-radius: 3px;
    padding: 0.4em;
    display: flex;
    flex-direction: column;
    gap: 0.3em;
}

.sector-details {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 0.9em;
}

.sector-label {
    font-weight: 700;
    opacity: 0.7;
}

.sector-time {
    font-family: 'Formula1-Mono', sans-serif;
    font-weight: 400;
}

.minisectors-track {
    width: 100%;
    background-color: #333;
    border-radius: 2px;
    height: 6px;
    overflow: hidden;
}

.minisectors-progress {
    display: flex;
    height: 100%;
    width: 100%;
    border-radius: 2px;
}

.minisectors-progress.sector-fill-personal-best {
    background-color: #00F500;
}
.minisectors-progress.sector-fill-overall-best {
    background-color: #B300B3;
}
.minisectors-progress.sector-fill-completed {
    background-color: #F2E205;
}

.minisector {
    flex-grow: 1;
}

.tyre-compound--soft { color: #F95A55; border-color: #F95A55; }
.tyre-compound--medium { color: #F2E205; border-color: #F2E205; }
.tyre-compound--hard { color: #FFFFFF; border-color: #FFFFFF; }
.tyre-compound--intermediate { color: #4CAF50; border-color: #4CAF50; }
.tyre-compound--wet { color: #2196F3; border-color: #2196F3; }

.sector-overall-best { color: #B300B3; }
.sector-personal-best { color: #00F500; }

/* These classes are now applied to the .minisectors-progress div */

.minisector-set { background-color: #F2E205; }
.minisector-stopped { background-color: #333333; }
.minisector-pb { background-color: #00F500; }
.minisector-ob { background-color: #B300B3; }
.minisector-pit { background-color: #2196F3; }
.minisector-unknown { background-color: #555555; }
</style>