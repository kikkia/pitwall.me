<template>
    <div class="track-map-widget">
        <svg v-if="bounds" :viewBox="`${bounds[0]} ${bounds[1]} ${bounds[2]} ${bounds[3]}`" class="track-map-svg">
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
                :x="finishLine.x - 150"
                :y="finishLine.y - 50"
                width="480"
                height="100"
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
                <SafetyCar
                    v-if="safetyCar && safetyCar.pos.Z !== 0"
                    name="Safety Car"
                    :pos="safetyCar.pos"
                    :rotation="rotation"
                    :centerX="centerX"
                    :centerY="centerY"
                    :color="safetyCar.color"
                    :useSafetyCarColors="useSafetyCarColors"
                    :name-tag-font-size="nameTagFontSize"
                    :car-dot-size="carDotSize"
                />
                <CarDot
                    v-for="driver in activeDrivers"
                    :key="`map.driver.${driver.racingNumber}`"
                    :name="driver.tla"
                    :color="driver.teamColour"
                    :pit="driver.inPit"
                    :pos="{ X: driver.posX, Y: driver.posY, Z: driver.posZ }"
                    :rotation="rotation"
                    :centerX="centerX"
                    :centerY="centerY"
                    :is-focused="isDriverFocused(driver.tla)"
                    :has-focused-drivers="focusedDrivers.length > 0"
                    :name-tag-font-size="nameTagFontSize"
                    :car-dot-size="carDotSize"
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
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useF1Store } from '@/stores/f1Store';
import { fetchMap } from '@/services/mapService';
import { createSectors, findYellowSectors, getSectorColor, prioritizeColoredSectors, rotate, rad } from '@/utils/mapUtils';
import type { TrackPosition, MapSector } from '@/types/mapTypes';
import CornerNumber from './trackMap/CornerNumber.vue';
import CarDot from './trackMap/CarDot.vue';
import SafetyCar from './trackMap/SafetyCar.vue';

const SPACE = 1000;
const ROTATION_FIX = 90;

type Corner = {
    number: number;
    pos: TrackPosition;
    labelPos: TrackPosition;
};

const props = withDefaults(defineProps<{
    showCornerNumbers?: boolean;
    useSafetyCarColors?: boolean;
    focusedDrivers?: string[];
    cornerNumberFontSize?: number;
    nameTagFontSize?: number;
    carDotSize?: number;
    windIndicatorPosition?: string;
    trackTempIndicatorPosition?: string;
    rainfallIndicatorPosition?: string;
}>(), {
    showCornerNumbers: true,
    useSafetyCarColors: true,
    focusedDrivers: () => [],
    cornerNumberFontSize: 100,
    nameTagFontSize: 100,
    carDotSize: 100,
    windIndicatorPosition: 'top-left',
    trackTempIndicatorPosition: 'top-left',
    rainfallIndicatorPosition: 'top-left',
});

const positionOptions = [ 'off', 'top-left', 'top-right', 'bottom-left', 'bottom-right'];

const settingsDefinition = ref([
  { id: 'showCornerNumbers', label: 'Show corner numbers', type: 'boolean', component: 'Checkbox' },
  { id: 'useSafetyCarColors', label: 'Show safety car', type: 'boolean', component: 'Checkbox' },
  { id: 'windIndicatorPosition', label: 'Wind Indicator', type: 'string', component: 'Select', options: positionOptions },
  { id: 'trackTempIndicatorPosition', label: 'Track Temp Indicator', type: 'string', component: 'Select', options: positionOptions },
  { id: 'rainfallIndicatorPosition', label: 'Rainfall Indicator', type: 'string', component: 'Select', options: positionOptions },
  { id: 'focusedDrivers', label: 'Focused Drivers', type: 'array', options: computed(() => Array.from(f1Store.driversViewModelMap.values()).map(d => d.tla)), component: 'MultiSelect' },
  { id: 'cornerNumberFontSize', label: 'Corner Number Font Size (%)', type: 'number', component: 'Slider', props: { min: 50, max: 300, step: 10 } },
  { id: 'nameTagFontSize', label: 'Name Tag Font Size (%)', type: 'number', component: 'Slider', props: { min: 50, max: 300, step: 10 } },
  { id: 'carDotSize', label: 'Car Dot Size (%)', type: 'number', component: 'Slider', props: { min: 50, max: 300, step: 10 } },
]);

defineExpose({ settingsDefinition });

const f1Store = useF1Store();
const weatherData = computed(() => f1Store.raceData.WeatherData);
const circuitKey = computed(() => f1Store.raceData.SessionInfo?.Meeting.Circuit.Key);
const driversViewModelMap = computed(() => f1Store.driversViewModelMap);
const raceControlMessages = computed(() => f1Store.raceData.RaceControlMessages?.Messages);
const trackStatus = computed(() => f1Store.raceData.TrackStatus);

const windRotation = computed(() => {
    if (!weatherData.value) return 0;
    // Seemed more accurate by eye
    return parseFloat(weatherData.value.WindDirection) - ROTATION_FIX;
    // return parseFloat(weatherData.value.WindDirection) - rotation.value;
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

const safetyCar = computed(() => {
    const sc1 = driversViewModelMap.value.get('241');
    const sc2 = driversViewModelMap.value.get('242');
    const sc3 = driversViewModelMap.value.get('243');

    if (sc1 && sc1.posX !== 0 && sc1.posY !== 0) return { pos: { X: sc1.posX, Y: sc1.posY, Z: sc1.posZ }, color: '229971' };
    if (sc2 && sc2.posX !== 0 && sc2.posY !== 0) return { pos: { X: sc2.posX, Y: sc2.posY, Z: sc2.posZ }, color: '229971' };
    if (sc3 && sc3.posX !== 0 && sc3.posY !== 0) return { pos: { X: sc3.posX, Y: sc3.posY, Z: sc3.posZ }, color: 'B90F09' };
    return null;
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

const isDriverFocused = (tla: string) => {
    return props.focusedDrivers.includes(tla);
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

    sectors.value = createSectors(mapJson).map((s) => ({
        ...s,
        start: rotate(s.start.x, s.start.y, fixedRotation, newCenterX, newCenterY),
        end: rotate(s.end.x, s.end.y, fixedRotation, newCenterX, newCenterY),
        points: s.points.map((p) => rotate(p.x, p.y, fixedRotation, newCenterX, newCenterY)),
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
    return `M${points.value[0].x},${points.value[0].y} ${points.value.map((point) => `L${point.x},${point.y}`).join(" ")}`;
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
                d: `M${sector.points[0].x},${sector.points[0].y} ${sector.points.map((point) => `L${point.x},${point.y}`).join(" ")}`,
            };
        })
        .sort(prioritizeColoredSectors);
});

onMounted(loadMap);
watch(circuitKey, loadMap);

</script>

<style scoped>
.track-map-widget {
    width: 100%;
    height: 100%;
    background-color: #1a1a1a;
    overflow: hidden;
    position: relative;
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

.track-map-svg {
    width: 100%;
    height: 100%;
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