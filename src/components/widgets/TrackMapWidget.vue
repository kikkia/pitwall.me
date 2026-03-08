<template>
  <div class="track-map-widget">
    <div class="map-canvas">
      <svg
        v-if="bounds"
        :viewBox="`${bounds[0]} ${bounds[1]} ${bounds[2]} ${bounds[3]}`"
        class="track-map-svg"
        @click="handleMapBackgroundClick"
      >
        <path
          class="track-outline"
          stroke-width="300"
          stroke-linejoin="round"
          fill="transparent"
          :d="trackPath"
        />
        <path
          v-for="sector in renderedSectors"
          :key="`map.sector.${sector.number}`"
          :class="sector.color"
          :stroke-width="sector.strokeWidth"
          stroke-linecap="round"
          stroke-linejoin="round"
          fill="transparent"
          :d="sector.d"
          :style="sector.pulse ? { animation: `${sector.pulse * 100}ms linear infinite pulse` } : {}"
        />
        <defs>
          <pattern id="checkeredFlag" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
            <rect x="0" y="0" width="50" height="50" fill="white" />
            <rect x="50" y="50" width="50" height="50" fill="white" />
            <rect x="50" y="0" width="50" height="50" fill="black" />
            <rect x="0" y="50" width="50" height="50" fill="black" />
          </pattern>
        </defs>
        <rect
          v-if="finishLine"
          :x="finishLine.x - 300"
          :y="finishLine.y - 50"
          width="700"
          height="250"
          fill="url(#checkeredFlag)"
          stroke="none"
          :transform="`rotate(${finishLine.startAngle + 90}, ${finishLine.x + 25}, ${finishLine.y})`"
        />
        <CornerNumber
          v-if="showCornerNumbers"
          v-for="corner in corners"
          :key="`corner.${corner.number}`"
          :number="corner.number"
          :x="corner.labelPos.x"
          :y="corner.labelPos.y"
          :font-size="cornerNumberFontSize"
        />
        <template v-if="centerX && centerY && driversViewModelMap">
          <CarDot
            v-for="driver in activeDrivers"
            :key="`map.driver.${driver.racingNumber}`"
            :racing-number="driver.racingNumber"
            :name="driver.tla"
            :color="driver.teamColour"
            :pit="driver.inPit"
            :pos="{ X: driver.posX, Y: driver.posY, Z: driver.posZ }"
            :rotation="rotation"
            :centerX="centerX"
            :centerY="centerY"
            :is-focused="isDriverFocused(driver.tla)"
            :has-focused-drivers="focusedDrivers.length > 0"
            :visual-state="getDriverVisualState(driver.racingNumber)"
            :selectable="props.enableSelectableDrivers"
            :name-tag-font-size="nameTagFontSize"
            :car-dot-size="carDotSize"
            :data-interpolation-window="dataInterpolationWindow"
            @select-driver="handleDriverSelect"
          />
        </template>
      </svg>

      <div v-else class="loading-placeholder">
        <div class="h-full w-full animate-pulse rounded-lg bg-zinc-800" />
      </div>

      <div v-if="weatherData">
        <div v-for="(group, position) in groupedIndicators" :key="position">
          <div v-if="group.length > 0" :class="['weather-overlay', `weather-overlay--${position}`]">
            <div v-for="indicator in group" :key="indicator.type" class="weather-item">
              <template v-if="indicator.type === 'wind'">
                <div class="wind-indicator" :style="{ transform: `rotate(${windRotation}deg)` }">↑</div>
                <div class="weather-value">{{ weatherData.WindSpeed }} kph</div>
              </template>
              <template v-if="indicator.type === 'trackTemp'">
                <div class="weather-label">Track</div>
                <div class="weather-value">{{ weatherData.TrackTemp }}°C</div>
              </template>
              <template v-if="indicator.type === 'rainfall'">
                <div class="weather-label">Rain</div>
                <div class="weather-value">{{ weatherData.Rainfall }}%</div>
              </template>
            </div>
          </div>
        </div>
      </div>

      <RaceSelectionStrip
        v-if="props.enableSelectableDrivers && selectedDriver && isRaceSession"
        :selected-driver="selectedDriver"
        :driver-ahead="raceDriverAhead"
        :driver-behind="raceDriverBehind"
        :displayed-ahead-gap="displayedAheadGap"
        :displayed-behind-gap="displayedBehindGap"
        :ahead-gap-trend-class="aheadGapTrendClass"
        :behind-gap-trend-class="behindGapTrendClass"
        @close="clearSelectedDriver"
      />

      <NonRaceSelectionStrip
        v-if="props.enableSelectableDrivers && selectedDriver && !isRaceSession"
        :selected-driver="selectedDriver"
        :selected-driver-live-lap="selectedDriverLiveLap"
        @close="clearSelectedDriver"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useF1Store } from '@/stores/f1Store';
import { fetchMap } from '@/services/mapService';
import { createSectors, findYellowSectors, getSectorColor, prioritizeColoredSectors, rotate, rad } from '@/utils/mapUtils';
import { MiniSectorStatus } from '@/types/dataTypes';
import type { TrackPosition, MapSector } from '@/types/mapTypes';
import type { DriverViewModel } from '@/types/dataTypes';
import { formatLiveTime, timeStringToMillis } from '@/utils/formatUtils';
import { useAnimatedGap } from '@/composables/useAnimatedGap';
import CornerNumber from './trackMap/CornerNumber.vue';
import CarDot from './trackMap/CarDot.vue';
import RaceSelectionStrip from './trackMap/RaceSelectionStrip.vue';
import NonRaceSelectionStrip from './trackMap/NonRaceSelectionStrip.vue';

const SPACE = 1000;
const ROTATION_FIX = 90;
const FLYING_LAP_TIME_CUTOFF = 150000;

const validMiniSectorStatuses = [
  MiniSectorStatus.OverallFastest,
  MiniSectorStatus.PersonalBest,
  MiniSectorStatus.Set,
];

type Corner = {
  number: number;
  pos: TrackPosition;
  labelPos: TrackPosition;
};

const props = withDefaults(defineProps<{
  showCornerNumbers?: boolean;
  enableSelectableDrivers?: boolean;
  focusedDrivers?: string[];
  cornerNumberFontSize?: number;
  nameTagFontSize?: number;
  carDotSize?: number;
  windIndicatorPosition?: string;
  trackTempIndicatorPosition?: string;
  rainfallIndicatorPosition?: string;
  dataInterpolationWindow?: number;
}>(), {
  showCornerNumbers: true,
  enableSelectableDrivers: true,
  focusedDrivers: () => [],
  cornerNumberFontSize: 100,
  nameTagFontSize: 100,
  carDotSize: 100,
  windIndicatorPosition: 'top-left',
  trackTempIndicatorPosition: 'top-left',
  rainfallIndicatorPosition: 'top-left',
  dataInterpolationWindow: 1.7,
});

const f1Store = useF1Store();

const positionOptions = [
  { label: 'Off', value: 'off' },
  { label: 'Top Left', value: 'top-left' },
  { label: 'Top Right', value: 'top-right' },
  { label: 'Bottom Left', value: 'bottom-left' },
  { label: 'Bottom Right', value: 'bottom-right' }
];

const settingsDefinition = ref([
  { id: 'showCornerNumbers', label: 'Show corner numbers', type: 'boolean', component: 'Checkbox' },
  { id: 'enableSelectableDrivers', label: 'Enable Selectable Drivers', type: 'boolean', component: 'Checkbox' },
  { id: 'windIndicatorPosition', label: 'Wind Indicator', type: 'string', component: 'Select', options: positionOptions },
  { id: 'trackTempIndicatorPosition', label: 'Track Temp Indicator', type: 'string', component: 'Select', options: positionOptions },
  { id: 'rainfallIndicatorPosition', label: 'Rainfall Indicator', type: 'string', component: 'Select', options: positionOptions },
  {
    id: 'focusedDrivers',
    label: 'Focused Drivers',
    type: 'array',
    component: 'MultiSelect',
    options: computed(() =>
      Array.from(f1Store.driversViewModelMap.values()).map(d => ({
        label: `${d.tla} (${d.racingNumber})`,
        value: d.tla
      }))
    ),
    props: {
      optionLabel: 'label',
      optionValue: 'value',
      filter: true,
      placeholder: 'Select Focused Drivers'
    }
  },
  { id: 'cornerNumberFontSize', label: 'Corner Number Font Size (%)', type: 'number', component: 'Slider', props: { min: 50, max: 300, step: 10 } },
  { id: 'nameTagFontSize', label: 'Name Tag Font Size (%)', type: 'number', component: 'Slider', props: { min: 50, max: 300, step: 10 } },
  { id: 'carDotSize', label: 'Car Dot Size (%)', type: 'number', component: 'Slider', props: { min: 50, max: 300, step: 10 } },
  {
    id: 'dataInterpolationWindow',
    label: 'Data Interpolation Window (s)',
    type: 'number',
    component: 'Slider',
    props: { min: 1, max: 3, step: 0.1 },
    tooltip: 'How long to interpolate car positions for. Higher values can smooth out lag, but increase perceived delay.'
  },
]);

defineExpose({ settingsDefinition });

const weatherData = computed(() => f1Store.raceData.WeatherData);
const circuitKey = computed(() => f1Store.raceData.SessionInfo?.Meeting.Circuit.Key);
const driversViewModelMap = computed(() => f1Store.driversViewModelMap);
const raceControlMessages = computed(() => f1Store.raceData.RaceControlMessages?.Messages);
const trackStatus = computed(() => f1Store.raceData.TrackStatus);
const sessionType = computed(() => f1Store.raceData.SessionInfo?.Type);
const isRaceSession = computed(() => sessionType.value === 'Race');

const selectedDriverNumber = ref<string | null>(null);
const timerNow = ref(Date.now());
let timerIntervalId: number | null = null;

const windRotation = computed(() => {
  if (!weatherData.value) return 0;
  return parseFloat(weatherData.value.WindDirection) - ROTATION_FIX;
});

const groupedIndicators = computed(() => {
  const groups: { [key: string]: any[] } = {
    'top-left': [],
    'top-right': [],
    'bottom-left': [],
    'bottom-right': [],
  };

  if (!weatherData.value) return groups;

  if (props.windIndicatorPosition && props.windIndicatorPosition !== 'off') {
    groups[props.windIndicatorPosition].push({ type: 'wind' });
  }
  if (props.trackTempIndicatorPosition && props.trackTempIndicatorPosition !== 'off') {
    groups[props.trackTempIndicatorPosition].push({ type: 'trackTemp' });
  }
  if (props.rainfallIndicatorPosition && props.rainfallIndicatorPosition !== 'off') {
    groups[props.rainfallIndicatorPosition].push({ type: 'rainfall' });
  }

  return groups;
});

const bounds = ref<[number, number, number, number] | null>(null);
const centerX = ref<number | null>(null);
const centerY = ref<number | null>(null);
const points = ref<{ x: number; y: number }[] | null>(null);
const sectors = ref<MapSector[]>([]);
const corners = ref<Corner[]>([]);
const rotation = ref<number>(0);
const finishLine = ref<{ x: number; y: number; startAngle: number } | null>(null);

const activeDrivers = computed(() => {
  return Array.from(driversViewModelMap.value.values()).filter(driver =>
    !driver.retired && !driver.stopped && driver.posX !== 0 && driver.posY !== 0
  );
});

const positionedDrivers = computed(() => {
  return f1Store.sortedDriversViewModel
    .filter(driver => driver.racingNumber !== '_kf' && !driver.retired && !driver.stopped)
    .map((driver) => ({ ...driver, positionNum: parseInt(driver.position, 10) }))
    .filter(driver => !Number.isNaN(driver.positionNum))
    .sort((a, b) => a.positionNum - b.positionNum);
});

const selectedDriver = computed<DriverViewModel | null>(() => {
  if (!selectedDriverNumber.value) return null;
  return driversViewModelMap.value.get(selectedDriverNumber.value) ?? null;
});

const raceDriverAhead = computed<DriverViewModel | null>(() => {
  if (!isRaceSession.value || !selectedDriver.value) return null;
  const selectedPosition = parseInt(selectedDriver.value.position, 10);
  if (Number.isNaN(selectedPosition) || selectedPosition <= 1) return null;
  return positionedDrivers.value.find(driver => driver.positionNum === selectedPosition - 1) ?? null;
});

const raceDriverBehind = computed<DriverViewModel | null>(() => {
  if (!isRaceSession.value || !selectedDriver.value) return null;
  const selectedPosition = parseInt(selectedDriver.value.position, 10);
  if (Number.isNaN(selectedPosition)) return null;
  return positionedDrivers.value.find(driver => driver.positionNum === selectedPosition + 1) ?? null;
});

const relatedDriverNumbers = computed(() => {
  const numbers = new Set<string>();

  if (!props.enableSelectableDrivers || !selectedDriver.value) {
    return numbers;
  }

  numbers.add(selectedDriver.value.racingNumber);

  if (isRaceSession.value) {
    if (raceDriverAhead.value) numbers.add(raceDriverAhead.value.racingNumber);
    if (raceDriverBehind.value) numbers.add(raceDriverBehind.value.racingNumber);
  }

  return numbers;
});

const shouldDimDrivers = computed(() => {
  return props.enableSelectableDrivers && !!selectedDriver.value;
});

const selectedDriverLiveLap = computed(() => {
  timerNow.value;

  if (!selectedDriver.value || isRaceSession.value) {
    return '-:--.-';
  }

  return getLiveLapDisplay(selectedDriver.value);
});

const rawAheadGap = computed(() => {
  if (!isRaceSession.value || !selectedDriver.value) return '-';
  return selectedDriver.value.gapToAhead || '-';
});

const rawBehindGap = computed(() => {
  if (!isRaceSession.value || !raceDriverBehind.value) return '-';
  return raceDriverBehind.value.gapToAhead || '-';
});

const { displayValue: displayedAheadGap, trend: aheadGapTrend } = useAnimatedGap(rawAheadGap);
const { displayValue: displayedBehindGap, trend: behindGapTrend } = useAnimatedGap(rawBehindGap);

const aheadGapTrendClass = computed(() => {
  if (aheadGapTrend.value === 'increasing') return 'gap-increasing';
  if (aheadGapTrend.value === 'decreasing') return 'gap-decreasing';
  return '';
});

const behindGapTrendClass = computed(() => {
  if (behindGapTrend.value === 'increasing') return 'gap-decreasing';
  if (behindGapTrend.value === 'decreasing') return 'gap-increasing';
  return '';
});

const isDriverFocused = (tla: string) => props.focusedDrivers.includes(tla);

const getDriverVisualState = (racingNumber: string): 'default' | 'selected' | 'related' | 'muted' => {
  if (!props.enableSelectableDrivers || !selectedDriver.value) {
    return 'default';
  }
  if (selectedDriver.value.racingNumber === racingNumber) {
    return 'selected';
  }
  if (relatedDriverNumbers.value.has(racingNumber)) {
    return 'related';
  }
  if (shouldDimDrivers.value) {
    return 'muted';
  }
  return 'default';
};

const handleDriverSelect = (racingNumber: string) => {
  if (!props.enableSelectableDrivers) {
    return;
  }
  selectedDriverNumber.value = selectedDriverNumber.value === racingNumber ? null : racingNumber;
};

const clearSelectedDriver = () => {
  selectedDriverNumber.value = null;
};

const handleMapBackgroundClick = () => {
  if (!props.enableSelectableDrivers || !selectedDriverNumber.value) {
    return;
  }
  clearSelectedDriver();
};

const calculateTimerOffset = (driver: DriverViewModel): number => {
  let cumulativeTime = 0;
  const validSectors = driver.sectors.filter((sector) => sector.Value !== '');

  for (let i = 0; i < validSectors.length; i++) {
    const sector = validSectors[i];
    cumulativeTime += timeStringToMillis(sector.Value);
    if (i === 2) {
      cumulativeTime = 0;
      break;
    }
  }

  return cumulativeTime;
};

const isDriverOnFlyingLap = (driver: DriverViewModel | null): boolean => {
  if (!driver || driver.inPit || driver.retired || driver.stopped) {
    return false;
  }

  if (driver.lastSectorCompleted) {
    const lapStartTime = driver.lastSectorCompleted - calculateTimerOffset(driver);
    if ((Date.now() - lapStartTime) > FLYING_LAP_TIME_CUTOFF) {
      return false;
    }
  }

  const hasCompletedMinisector = driver.sectors.some((sector) =>
    sector.Segments?.some((segment) => validMiniSectorStatuses.includes(segment.Status))
  );

  if (!hasCompletedMinisector) {
    return false;
  }

  const hasPittedInSectors = driver.sectors.some((sector) =>
    sector.Segments?.some((segment) => segment.Status === MiniSectorStatus.InPits)
  );

  return !hasPittedInSectors;
};

const getLiveLapDisplay = (driver: DriverViewModel): string => {
  if (driver.inPit) return 'IN PIT';
  if (driver.stopped || driver.retired) return 'STOPPED';
  if (!isDriverOnFlyingLap(driver)) return '-:--.-';
  if (!driver.lastSectorCompleted) return '-:--.-';

  const lapStartTime = driver.lastSectorCompleted - calculateTimerOffset(driver);
  const elapsedSinceLapStart = Date.now() - lapStartTime;
  return formatLiveTime(elapsedSinceLapStart);
};

async function loadMap() {
  if (!circuitKey.value) return;
  const mapJson = await fetchMap(circuitKey.value);
  if (!mapJson) return;

  const newCenterX = (Math.max(...mapJson.x) - Math.min(...mapJson.x)) / 2;
  const newCenterY = (Math.max(...mapJson.y) - Math.min(...mapJson.y)) / 2;
  const fixedRotation = mapJson.rotation + ROTATION_FIX;

  const rotatedPoints = mapJson.x.map((x, index) => rotate(x, mapJson.y[index], fixedRotation, newCenterX, newCenterY));
  const pointsX = rotatedPoints.map((item) => item.x);
  const pointsY = rotatedPoints.map((item) => item.y);

  const cMinX = Math.min(...pointsX) - SPACE;
  const cMinY = Math.min(...pointsY) - SPACE;
  const cWidthX = Math.max(...pointsX) - cMinX + SPACE * 2;
  const cWidthY = Math.max(...pointsY) - cMinY + SPACE * 2;

  bounds.value = [cMinX, cMinY, cWidthX, cWidthY];
  centerX.value = newCenterX;
  centerY.value = newCenterY;
  points.value = rotatedPoints;
  rotation.value = fixedRotation;

  sectors.value = createSectors(mapJson).map((sector) => ({
    ...sector,
    start: rotate(sector.start.x, sector.start.y, fixedRotation, newCenterX, newCenterY),
    end: rotate(sector.end.x, sector.end.y, fixedRotation, newCenterX, newCenterY),
    points: sector.points.map((point) => rotate(point.x, point.y, fixedRotation, newCenterX, newCenterY)),
  }));

  corners.value = mapJson.corners.map((corner) => ({
    number: corner.number,
    pos: rotate(corner.trackPosition.x, corner.trackPosition.y, fixedRotation, newCenterX, newCenterY),
    labelPos: rotate(
      corner.trackPosition.x + 540 * Math.cos(rad(corner.angle)),
      corner.trackPosition.y + 540 * Math.sin(rad(corner.angle)),
      fixedRotation,
      newCenterX,
      newCenterY
    ),
  }));

  const rotatedFinishLine = rotate(mapJson.x[0], mapJson.y[0], fixedRotation, newCenterX, newCenterY);
  const dx = rotatedPoints[3].x - rotatedPoints[0].x;
  const dy = rotatedPoints[3].y - rotatedPoints[0].y;
  const startAngle = Math.atan2(dy, dx) * (180 / Math.PI);
  finishLine.value = { x: rotatedFinishLine.x, y: rotatedFinishLine.y, startAngle };
}

const trackPath = computed(() => {
  if (!points.value) return '';
  return `M${points.value[0].x},${points.value[0].y} ${points.value.map((point) => `L${point.x},${point.y}`).join(' ')}`;
});

const yellowSectors = computed(() => findYellowSectors(raceControlMessages.value));

const getTrackStatusMessage = (status: string | undefined) => {
  switch (status) {
    case '1': return { trackColor: 'stroke-green-500', bySector: false };
    case '2': return { trackColor: 'stroke-yellow-500', bySector: true, pulse: 1000 };
    case '4': return { trackColor: 'stroke-red-500', bySector: false, pulse: 500 };
    case '5': return { trackColor: 'stroke-red-500', bySector: false, pulse: 500 };
    default: return { trackColor: 'stroke-white', bySector: false };
  }
};

const renderedSectors = computed(() => {
  const status = getTrackStatusMessage(trackStatus.value?.Status);
  return sectors.value
    .map((sector) => {
      const color = getSectorColor(sector, status?.bySector, status?.trackColor, yellowSectors.value);
      return {
        color,
        pulse: status?.pulse,
        number: sector.number,
        strokeWidth: color === 'stroke-white' ? 60 : 120,
        d: `M${sector.points[0].x},${sector.points[0].y} ${sector.points.map((point) => `L${point.x},${point.y}`).join(' ')}`,
      };
    })
    .sort(prioritizeColoredSectors);
});

watch(() => props.enableSelectableDrivers, (enabled) => {
  if (!enabled) {
    clearSelectedDriver();
  }
});

watch(selectedDriver, (driver) => {
  if (!driver && selectedDriverNumber.value) {
    selectedDriverNumber.value = null;
  }
});

onMounted(() => {
  loadMap();
  timerIntervalId = window.setInterval(() => {
    timerNow.value = Date.now();
  }, 100);
});

onUnmounted(() => {
  if (timerIntervalId) {
    clearInterval(timerIntervalId);
    timerIntervalId = null;
  }
});

watch(circuitKey, loadMap);
</script>

<style scoped>
.track-map-widget {
  width: 100%;
  height: 100%;
  position: relative;
  background-color: #1a1a1a;
  overflow: hidden;
}

.map-canvas {
  position: relative;
  height: 100%;
}

.track-map-svg {
  width: 100%;
  height: 100%;
}

.weather-overlay {
  position: absolute;
  display: flex;
  flex-direction: column;
  gap: 5px;
  background-color: rgba(0, 0, 0, 0.4);
  padding: 8px;
  border-radius: 5px;
  color: white;
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.9em;
  z-index: 10;
}

.weather-overlay--top-left {
  top: 10px;
  left: 10px;
}

.weather-overlay--top-right {
  top: 10px;
  right: 10px;
}

.weather-overlay--bottom-left {
  bottom: 10px;
  left: 10px;
}

.weather-overlay--bottom-right {
  bottom: 10px;
  right: 10px;
}

.weather-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.wind-indicator {
  font-size: 20px;
  line-height: 1;
  transition: transform 0.3s ease;
}

.weather-label {
  font-weight: bold;
}

.weather-value {
  font-family: 'Courier New', Courier, monospace;
}

.track-outline {
  stroke: #444;
}

.loading-placeholder {
  width: 100%;
  height: 100%;
  padding: 0.5rem;
}

.stroke-white { stroke: white; }
.stroke-green-500 { stroke: #22c55e; }
.stroke-yellow-500 { stroke: #eab308; }
.stroke-red-500 { stroke: #ef4444; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
