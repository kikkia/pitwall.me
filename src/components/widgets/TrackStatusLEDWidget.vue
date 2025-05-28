<template>
  <div :class="['flag-widget', flagClasses]">
    <span v-if="showSCText" class="flag-text">SC</span>
    <span v-if="showVSCText" class="flag-text">VSC</span>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useF1Store } from '@/stores/f1Store'; 

const f1Store = useF1Store();

const trackStatus = computed(() => f1Store.raceData?.TrackStatus?.Message ?? 'Unknown');

const flagClasses = computed(() => {
  switch (trackStatus.value) {
    case 'AllClear':
      return 'flag-green';
    case 'Yellow':
      return 'flag-yellow flag-flashing-yellow';
    case 'SCDeployed':
      return 'flag-off flag-safety-car flag-sc-vsc-active'; 
    case 'VSCDeployed':
      return 'flag-off flag-safety-car flag-sc-vsc-active'; 
    case 'Red': 
      return 'flag-red flag-flashing-red';
    default:
      return 'flag-off';
  }
});

const showSCText = computed(() => trackStatus.value === 'SCDeployed');
const showVSCText = computed(() => trackStatus.value === 'VSCDeployed');

</script>

<style scoped>
.flag-widget {
  width: 100%; 
  height: 100%;
  border: 2px solid #555; 
  background-color: #333;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden; 
  box-sizing: border-box;
}

.flag-text {
  font-family: Arial, sans-serif; 
  font-weight: bold;
  font-size: 28px; 
  color: white;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.flag-off {
  background-color: #333;
  border-color: #555; 
}

.flag-green {
  background-color: #00cc00; 
  border-color: #00cc00; 
  animation: none; 
}

.flag-green .flag-text {
    color: black;
    animation: none;
}

.flag-yellow {
  background-color: yellow;
  border-color: yellow;
}

.flag-yellow .flag-text {
    color: black;
    animation: none;
}


.flag-red {
  background-color: red;
  border-color: red; 
}

.flag-red .flag-text {
    color: white; 
    animation: none;
}

.flag-flashing-yellow {
  animation: flash-yellow 1s infinite step-end; 
}
@keyframes flash-yellow {
  0%, 100% { background-color: yellow; border-color: yellow; } 
  50% { background-color: #333; border-color: #555; } 
}

.flag-flashing-red {
  animation: flash-red 0.8s infinite step-end; 
}
@keyframes flash-red {
  0%, 100% { background-color: red; border-color: red; color: white;} 
  50% { background-color: #333; border-color: #555; color: transparent;}  
}


.flag-safety-car {
    animation: safety-car 1s infinite step-end;
    border-width: thick; 
}

@keyframes safety-car {
  0%, 100% { border-color: yellow; } 
  50% { border-color: transparent; } 
}

.flag-sc-vsc-active .flag-text {
    color: white; 
    animation: text-flash-white 1s infinite step-end;
}

@keyframes text-flash-white {
   0%, 100% { color: white; } 
   50% { color: transparent; } 
}

</style>