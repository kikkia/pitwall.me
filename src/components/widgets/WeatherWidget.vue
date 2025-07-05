<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useF1Store } from '@/stores/f1Store';
import type { WeatherData } from '@/types/dataTypes';

const f1Store = useF1Store();

const weatherData = computed(() => f1Store.raceData.WeatherData);
const changedStates = ref<Record<keyof WeatherData, boolean>>({
  AirTemp: false,
  Humidity: false,
  Pressure: false,
  Rainfall: false,
  TrackTemp: false,
  WindDirection: false,
  WindSpeed: false,
});

const props = defineProps({
  messageFontSize: { type: Number, default: 90 },
  showAirTemp: { type: Boolean, default: true },
  showTrackTemp: { type: Boolean, default: true },
  showHumidity: { type: Boolean, default: true },
  showPressure: { type: Boolean, default: true },
  showWindSpeed: { type: Boolean, default: true },
  showWindDirection: { type: Boolean, default: true },
  showRainfall: { type: Boolean, default: true },
});

const settingsDefinition = ref([
  { id: 'messageFontSize', label: 'Font Size (%)', type: 'number', component: 'Slider', props: { min: 50, max: 150, step: 10 } },
  { id: 'showAirTemp', label: 'Show Air Temp', type: 'boolean', component: 'Checkbox' },
  { id: 'showTrackTemp', label: 'Show Track Temp', type: 'boolean', component: 'Checkbox' },
  { id: 'showHumidity', label: 'Show Humidity', type: 'boolean', component: 'Checkbox' },
  { id: 'showPressure', label: 'Show Pressure', type: 'boolean', component: 'Checkbox' },
  { id: 'showWindSpeed', label: 'Show Wind Speed', type: 'boolean', component: 'Checkbox' },
  { id: 'showWindDirection', label: 'Show Wind Direction', type: 'boolean', component: 'Checkbox' },
  { id: 'showRainfall', label: 'Show Rainfall', type: 'boolean', component: 'Checkbox' },
]);

defineExpose({ settingsDefinition });

const messageStyle = computed(() => ({
  fontSize: `${props.messageFontSize}%`,
}));

const triggerChangeAnimation = (key: keyof WeatherData) => {
  changedStates.value[key] = true;
  setTimeout(() => {
    changedStates.value[key] = false;
  }, 700);
};

watch(weatherData, (newVal, oldVal) => {
  if (!newVal || !oldVal) return;
  (Object.keys(newVal) as Array<keyof WeatherData>).forEach(key => {
    if (newVal[key] !== oldVal[key]) {
      triggerChangeAnimation(key);
    }
  });
}, { deep: true });

</script>

<template>
  <div class="widget-wrapper weather-widget" :style="messageStyle">
    <div v-if="weatherData" class="weather-list">
      <div v-if="props.showAirTemp" class="weather-item" :class="{ 'value-changed': changedStates.AirTemp }">
        <div class="label-container">
          <i class="uil uil-sun icon"></i>
          <span class="label">Air Temp</span>
        </div>
        <span class="value">{{ weatherData.AirTemp }}°C</span>
      </div>
      <div v-if="props.showTrackTemp" class="weather-item" :class="{ 'value-changed': changedStates.TrackTemp }">
        <div class="label-container">
          <i class="uil uil-temperature-half icon"></i>
          <span class="label">Track Temp</span>
        </div>
        <span class="value">{{ weatherData.TrackTemp }}°C</span>
      </div>
      <div v-if="props.showHumidity" class="weather-item" :class="{ 'value-changed': changedStates.Humidity }">
        <div class="label-container">
          <i class="uil uil-raindrops icon"></i>
          <span class="label">Humidity</span>
        </div>
        <span class="value">{{ weatherData.Humidity }}%</span>
      </div>
      <div v-if="props.showPressure" class="weather-item" :class="{ 'value-changed': changedStates.Pressure }">
        <div class="label-container">
          <i class="uil uil-compress-arrows icon"></i>
          <span class="label">Pressure</span>
        </div>
        <span class="value">{{ weatherData.Pressure }} hPa</span>
      </div>
      <div v-if="props.showWindSpeed" class="weather-item" :class="{ 'value-changed': changedStates.WindSpeed }">
        <div class="label-container">
          <i class="uil uil-wind icon"></i>
          <span class="label">Wind Speed</span>
        </div>
        <span class="value">{{ weatherData.WindSpeed }} kph</span>
      </div>
      <div v-if="props.showWindDirection" class="weather-item" :class="{ 'value-changed': changedStates.WindDirection }">
        <div class="label-container">
          <i class="uil uil-compass icon"></i>
          <span class="label">Direction</span>
        </div>
        <span class="value">{{ weatherData.WindDirection }}°</span>
      </div>
      <div v-if="props.showRainfall" class="weather-item" :class="{ 'value-changed': changedStates.Rainfall }">
        <div class="label-container">
          <i class="uil uil-cloud-showers icon"></i>
          <span class="label">Rainfall</span>
        </div>
        <span class="value">{{ weatherData.Rainfall }}%</span>
      </div>
    </div>
    <div v-else class="loading-message">
      <p>> Waiting for weather data...</p>
    </div>
  </div>
</template>

<style scoped>
.weather-widget {
  background-color: var(--vt-c-black-soft);
  color: #a7a7a7;
  font-family: 'Courier New', Courier, monospace;
  padding: 1em;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.loading-message {
  font-size: 1.2em;
  color: #00ff41;
}

.weather-list {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5em 1em; 
  justify-content: center;
}

.weather-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.2em;
  transition: all 0.3s ease;
  flex: 1 1 150px;
  min-width: 150px;
  padding: 0.5em;
  border: 1px solid transparent;
}

.label-container {
  display: flex;
  align-items: center;
  gap: 0.5em;
  margin-bottom: 0.25em;
}

.icon {
  color: #00ff41;
  font-size: 1.2em;
}

.label {
  font-weight: bold;
  color: #a7a7a7;
  text-transform: uppercase;
  white-space: nowrap;
}

.value {
  font-weight: bold;
  color: #ffffff;
  text-align: center;
  white-space: nowrap;
  font-size: 1.6em;
  line-height: 1;
}

.weather-item.value-changed {
  animation: flash-border 0.7s ease-out;
}

@keyframes flash-border {
  0%, 50% {
    border-color: #00ff41;
    box-shadow: 0 0 5px #00ff41;
  }
  100% {
    border-color: transparent;
    box-shadow: none;
  }
}
</style>