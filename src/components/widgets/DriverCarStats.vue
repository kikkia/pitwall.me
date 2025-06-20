<script setup lang="ts">
import { computed, ref, watch, onUnmounted, type PropType } from 'vue';
import { useF1Store } from '@/stores/f1Store';
import type { CarData } from '@/types/dataTypes';
import Dropdown from 'primevue/dropdown';

const f1Store = useF1Store();

const props = defineProps({
  selectedDriverNumber: {
    type: String as PropType<string | null>,
    default: null,
  },
  interpolationRate: {
    type: Number,
    default: 60, // Increased default for smoother animation
  },
  shiftLightMode: {
    type: String as PropType<'linear' | 'converging'>,
    default: 'linear',
  },
  speedUnit: {
    type: String as PropType<'kmh' | 'mph'>,
    default: 'kmh',
  },
});

const emit = defineEmits(['update:widgetConfig']);

const internalSelectedDriverNumber = ref(props.selectedDriverNumber);
const internalShiftLightMode = ref(props.shiftLightMode);
const internalSpeedUnit = ref(props.speedUnit);


watch(() => props.shiftLightMode, (newVal) => {
  internalShiftLightMode.value = newVal;
});

watch(() => props.speedUnit, (newVal) => {
  internalSpeedUnit.value = newVal;
});

const availableDrivers = computed(() => {
  return Array.from(f1Store.driversViewModelMap.values())
    .filter(driver => driver.racingNumber !== "_kf")
    .map(driver => ({
      label: `${driver.tla} (${driver.racingNumber})`,
      value: driver.racingNumber
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
});

const driverName = computed(() => {
  if (internalSelectedDriverNumber.value && f1Store.raceData?.DriverList) {
    const driver = f1Store.raceData.DriverList[internalSelectedDriverNumber.value];
    return driver ? `${driver.FirstName} ${driver.LastName}` : 'Unknown Driver';
  }
  return 'N/A';
});

const latestCarData = computed<CarData | undefined>(() => {
  if (internalSelectedDriverNumber.value) {
    const driverViewModel = f1Store.driversViewModelMap.get(internalSelectedDriverNumber.value);
    if (driverViewModel) {
      return {
        "0": driverViewModel.rpm,
        "2": driverViewModel.speed,
        "3": driverViewModel.gear,
        "4": driverViewModel.throttle,
        "5": driverViewModel.brake,
        "45": driverViewModel.drs,
      } as CarData;
    }
  }
  return undefined;
});

// Enhanced interpolation system with physics-based prediction
const currentCarData = ref<CarData | undefined>(undefined);
const targetCarData = ref<CarData | undefined>(undefined);
const previousCarData = ref<CarData | undefined>(undefined);

// Store velocities for physics-based prediction
const velocities = ref({
  rpm: 0,
  speed: 0,
  throttle: 0
});

let animationFrameId: number | undefined;
let dataUpdateInterval: number = 1200; // Expected interval between data updates in ms
let lastDataReceiveTime: number = 0;
let nextDataExpectedTime: number = 0;

// Physics-based interpolation - maintains realistic motion patterns
const linearInterpolate = (start: number, end: number, progress: number): number => {
  return start + (end - start) * progress;
};

// Calculate velocity between two data points
const calculateVelocity = (current: number, previous: number, timeInterval: number): number => {
  if (previous === undefined || timeInterval <= 0) return 0;
  return (current - previous) / timeInterval;
};

// Predict next value using current velocity with realistic constraints
const predictWithVelocity = (current: number, velocity: number, deltaTime: number, constraints?: {min?: number, max?: number}): number => {
  let predicted = current + (velocity * deltaTime);
  
  if (constraints) {
    if (constraints.min !== undefined) predicted = Math.max(constraints.min, predicted);
    if (constraints.max !== undefined) predicted = Math.min(constraints.max, predicted);
  }
  
  return predicted;
};

const updateInterpolation = () => {
  const now = performance.now();
  
  if (!currentCarData.value || !targetCarData.value) {
    animationFrameId = requestAnimationFrame(updateInterpolation);
    return;
  }

  const timeSinceLastData = now - lastDataReceiveTime;
  const timeUntilNextData = nextDataExpectedTime - now;
  
  if (previousCarData.value && targetCarData.value) {
    const newCarData: CarData = {
      "0": 0, "2": 0, "3": 0, "4": 0, "5": 0, "45": 0
    };

    // Determine if we should interpolate or predict
    const shouldPredict = timeSinceLastData > dataUpdateInterval * 0.8;
    
    if (shouldPredict && timeUntilNextData < 0) {
      // We're past the expected next data time - use velocity-based prediction
      const predictionTime = Math.abs(timeUntilNextData);
      
      // RPM prediction with realistic constraints
      newCarData["0"] = Math.round(predictWithVelocity(
        targetCarData.value["0"], 
        velocities.value.rpm, 
        predictionTime,
        { min: 0, max: 18000 } // Realistic F1 RPM limits
      ));
      
      // Speed prediction with realistic constraints
      newCarData["2"] = Math.round(predictWithVelocity(
        targetCarData.value["2"], 
        velocities.value.speed, 
        predictionTime,
        { min: 0, max: 400 } // Realistic F1 speed limits
      ));
      
      // Throttle prediction
      newCarData["4"] = Math.round(predictWithVelocity(
        targetCarData.value["4"], 
        velocities.value.throttle, 
        predictionTime,
        { min: 0, max: 100 }
      ));
      
    } else {
      // Normal interpolation phase - use linear interpolation for constant motion
      const progress = Math.min(1, timeSinceLastData / dataUpdateInterval);
      
      // Linear interpolation maintains constant acceleration/deceleration
      newCarData["0"] = Math.round(linearInterpolate(
        previousCarData.value["0"], 
        targetCarData.value["0"], 
        progress
      ));
      
      newCarData["2"] = Math.round(linearInterpolate(
        previousCarData.value["2"], 
        targetCarData.value["2"], 
        progress
      ));
      
      newCarData["4"] = Math.round(linearInterpolate(
        previousCarData.value["4"], 
        targetCarData.value["4"], 
        progress
      ));
    }

    // Gear - only change at specific thresholds to avoid constant switching
    const gearProgress = timeSinceLastData / dataUpdateInterval;
    newCarData["3"] = gearProgress > 0.3 ? targetCarData.value["3"] : previousCarData.value["3"];

    // Brake and DRS - immediate update (binary values)
    newCarData["5"] = targetCarData.value["5"];
    newCarData["45"] = targetCarData.value["45"];

    currentCarData.value = newCarData;
  }

  animationFrameId = requestAnimationFrame(updateInterpolation);
};

// Enhanced data watching with velocity calculation
watch(latestCarData, (newVal, oldVal) => {
  if (newVal) {
    const now = performance.now();
    
    // Calculate actual interval between data updates
    if (lastDataReceiveTime > 0) {
      const actualInterval = now - lastDataReceiveTime;
      // Use exponential moving average to smooth interval estimation
      dataUpdateInterval = dataUpdateInterval * 0.7 + actualInterval * 0.3;
    }
    
    // Calculate velocities for physics-based prediction
    if (oldVal && lastDataReceiveTime > 0) {
      const timeInterval = now - lastDataReceiveTime;
      velocities.value = {
        rpm: calculateVelocity(newVal["0"], oldVal["0"], timeInterval),
        speed: calculateVelocity(newVal["2"], oldVal["2"], timeInterval),
        throttle: calculateVelocity(newVal["4"], oldVal["4"], timeInterval)
      };
    }
    
    lastDataReceiveTime = now;
    nextDataExpectedTime = now + dataUpdateInterval;
    
    if (oldVal && currentCarData.value) {
      // Use current interpolated value as the starting point for smoother transitions
      previousCarData.value = { ...currentCarData.value };
    } else if (oldVal) {
      previousCarData.value = oldVal;
    } else {
      // First data point
      previousCarData.value = newVal;
      currentCarData.value = newVal;
      velocities.value = { rpm: 0, speed: 0, throttle: 0 };
    }
    
    targetCarData.value = newVal;
    
    // Start animation loop if not already running
    if (!animationFrameId) {
      animationFrameId = requestAnimationFrame(updateInterpolation);
    }
  } else {
    // Clean up when no data
    previousCarData.value = undefined;
    targetCarData.value = undefined;
    currentCarData.value = undefined;
    velocities.value = { rpm: 0, speed: 0, throttle: 0 };
    
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = undefined;
    }
  }
}, { immediate: true });

onUnmounted(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
});

const MAX_RPM = 12000; 
const LIGHTS_START_RPM = MAX_RPM * 0.6; 

const shiftLights = computed(() => {
  const rpm = currentCarData.value ? currentCarData.value['0'] : 0;
  const lights = Array(15).fill(false);

  const rpmRangeForLights = MAX_RPM - LIGHTS_START_RPM;

  if (internalShiftLightMode.value === 'linear') {
    const rpmPerLightSegment = rpmRangeForLights / 15;
    for (let i = 0; i < 15; i++) {
      const threshold = LIGHTS_START_RPM + (i * rpmPerLightSegment);
      if (rpm >= threshold) {
        lights[i] = true;
      }
    }
  } else if (internalShiftLightMode.value === 'converging') {
    const numLights = lights.length;
    const numPairs = Math.floor(numLights / 2);
    const middleLightIndex = Math.floor(numLights / 2);

    const rpmPerSegment = rpmRangeForLights / (numPairs + (numLights % 2));

    for (let i = 0; i < numPairs; i++) {
      const threshold = LIGHTS_START_RPM + (i * rpmPerSegment);
      if (rpm >= threshold) {
        lights[i] = true;
        lights[numLights - 1 - i] = true;
      }
    }
    if (numLights % 2 !== 0) {
      const middleThreshold = LIGHTS_START_RPM + (numPairs * rpmPerSegment);
      if (rpm >= middleThreshold) {
        lights[middleLightIndex] = true;
      }
    }
  }
  return lights;
});

const getShiftLightColorClass = (index: number, lightOn: boolean) => {
  if (!lightOn) return '';

  if (internalShiftLightMode.value === 'linear') {
    if (index < 5) return 'shift-light-green';
    if (index >= 5 && index < 10) return 'shift-light-red';
    if (index >= 10) return 'shift-light-blue';
  } else if (internalShiftLightMode.value === 'converging') {
    const numLights = 15;
    const middle = Math.floor(numLights / 2);
    const distance = Math.abs(index - middle);

    if (distance >= 5) return 'shift-light-green';
    if (distance >= 2 && distance <= 4) return 'shift-light-red';
    if (distance <= 1) return 'shift-light-blue';
  }
  return '';
};

const settingsDefinition = computed(() => {
  return [
    {
      id: 'selectedDriverNumber',
      label: 'Select Driver',
      type: 'string',
      component: 'Dropdown',
      options: availableDrivers.value,
      props: {
        placeholder: "Select a Driver",
        filter: true
      }
    },
    {
      id: 'interpolationRate',
      label: 'Interpolation Rate (Hz)',
      type: 'number',
      component: 'Slider',
      props: { min: 30, max: 120, step: 5 }
    },
    {
      id: 'shiftLightMode',
      label: 'Shift Light Mode',
      type: 'string',
      component: 'Dropdown',
      options: [
        { label: 'Linear', value: 'linear' },
        { label: 'Converging', value: 'converging' }
      ],
      props: {}
    },
    {
      id: 'speedUnit',
      label: 'Speed Unit',
      type: 'string',
      component: 'Dropdown',
      options: [
        { label: 'km/h', value: 'kmh' },
        { label: 'mph', value: 'mph' }
      ],
      props: {}
    }
  ];
});

defineExpose({ settingsDefinition });

function convertKmhToMph(kmh: number): number {
  return kmh * 0.621371;
}

function handleDriverSelection(event: any) {
  internalSelectedDriverNumber.value = event.value;
  emit('update:widgetConfig', { selectedDriverNumber: event.value });
}

function handleShiftLightModeChange(event: any) {
  internalShiftLightMode.value = event.value;
  emit('update:widgetConfig', { shiftLightMode: event.value });
}

function handleSpeedUnitChange(event: any) {
  internalSpeedUnit.value = event.value;
  emit('update:widgetConfig', { speedUnit: event.value });
}
</script>

<template>
  <div class="driver-car-stats-widget">
    <div v-if="!internalSelectedDriverNumber" class="driver-selection-prompt">
      <h3>Select a driver to view car stats</h3>
      <Dropdown
        v-model="internalSelectedDriverNumber"
        :options="availableDrivers"
        optionLabel="label"
        optionValue="value"
        placeholder="Select a Driver"
        :filter="true"
        class="w-full"
        @change="handleDriverSelection"
      />
    </div>
    <div v-else>
      <h4>Driver: {{ driverName }} ({{ internalSelectedDriverNumber }})</h4>
      <div v-if="currentCarData" class="car-data-display">
        <div class="shift-light-bar">
          <span
            v-for="(light, index) in shiftLights"
            :key="index"
            class="shift-light"
            :class="getShiftLightColorClass(index, light)"
          ></span>
        </div>
        <div class="data-row">
          <span class="data-label">RPM:</span>
          <span class="data-value">{{ currentCarData['0'].toLocaleString() }}</span>
        </div>
        <div class="data-row">
          <span class="data-label">Speed:</span>
          <span class="data-value">
            {{ internalSpeedUnit === 'mph' ? convertKmhToMph(currentCarData['2']).toFixed(0) : currentCarData['2'] }}
            {{ internalSpeedUnit === 'mph' ? 'mph' : 'km/h' }}
          </span>
        </div>
        <div class="data-row">
          <span class="data-label">Gear:</span>
          <span class="data-value">{{ currentCarData['3'] }}</span>
        </div>
        <div class="data-row">
          <span class="data-label">Throttle:</span>
          <span class="data-value">{{ currentCarData['4'] }}%</span>
        </div>
        <div class="data-row">
          <span class="data-label">Braking:</span>
          <span class="data-value" :class="{ 'active': currentCarData['5'] }">
            {{ currentCarData['5'] ? 'Yes' : 'No' }}
          </span>
        </div>
        <div class="data-row">
          <span class="data-label">DRS:</span>
          <span class="data-value" :class="{ 'active': currentCarData['45'] }">
            {{ currentCarData['45'] ? 'Active' : 'Inactive' }}
          </span>
        </div>
      </div>
      <p v-else>No car data available for this driver.</p>
    </div>
  </div>
</template>

<style scoped>
.driver-car-stats-widget {
  padding: 10px;
  background-color: var(--widget-background-color);
  border-radius: var(--border-radius);
  color: var(--text-color);
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.driver-selection-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: var(--text-color);
}

.driver-selection-prompt h3 {
  margin-bottom: 1rem;
  color: var(--text-color);
}

.car-data-display {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}

.shift-light-bar {
  display: flex;
  justify-content: space-between;
  width: 100%;
  height: 8px; 
  margin-bottom: 10px;
  background-color: rgba(var(--text-color-rgb, 255, 255, 255), 0.05);
  border-radius: 2px;
  overflow: hidden;
}

.shift-light {
  width: 8px; 
  height: 8px; 
  background-color: rgba(var(--text-color-rgb, 255, 255, 255), 0.1); 
  border-radius: 50%; 
  margin: 0 2px; 
  transition: background-color 0.05s ease-out, box-shadow 0.05s ease-out; 
  flex-shrink: 0; 
}

.shift-light:first-child {
  margin-left: 0;
}

.shift-light:last-child {
  margin-right: 0;
}

.shift-light-green {
  background-color: #4ade80; 
  box-shadow: 0 0 5px #4ade80;
}

.shift-light-yellow {
  background-color: #facc15;
  box-shadow: 0 0 5px #facc15;
}

.shift-light-red {
  background-color: #ef4444; 
  box-shadow: 0 0 5px #ef4444;
}

.shift-light-blue {
  background-color: #3b82f6;
  box-shadow: 0 0 5px #3b82f6;
}

.data-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  border-bottom: 1px solid rgba(var(--text-color-rgb, 255, 255, 255), 0.1);
}

.data-label {
  font-weight: 500;
  opacity: 0.8;
}

.data-value {
  font-weight: 600;
  font-family: 'Courier New', monospace;
  transition: color 0.2s ease;
}

.data-value.active {
  color: #4ade80;
}

.w-full {
  width: 100%;
}
</style>