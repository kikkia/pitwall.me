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
  
  // Possible values: AllClear, SCDeployed, VSCDeployed, Red, Yellow, (Maybe add 'TrackClear' or handle null/undefined)
  const trackStatus = computed(() => f1Store.state.raceData?.TrackStatus?.Message ?? 'Unknown');
  
  const flagClasses = computed(() => {
    switch (trackStatus.value) {
      case 'AllClear':
        return 'flag-green';
      case 'Yellow':
        return 'flag-yellow flag-flashing-yellow';
      case 'SCDeployed':
        return 'flag-yellow flag-flashing-yellow flag-sc'; 
      case 'VSCDeployed':
        return 'flag-yellow flag-flashing-yellow flag-vsc'; 
      case '':
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
    transition: background-color 0.1s ease-in-out;
  }
  
  .flag-text {
    font-family: Arial, sans-serif; 
    font-weight: bold;
    font-size: 28px; 
    color: black; 
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
  }
  
  .flag-off {
    background-color: #333;
  }
  
  .flag-green {
    background-color: #00cc00; 
    animation: none;
  }
  
  .flag-yellow {
    background-color: yellow;
  }
  
  .flag-red {
    background-color: red;
  }
  
  .flag-flashing-yellow {
    animation: flash-yellow 1s infinite step-end; 
  }
  
  .flag-flashing-red {
    animation: flash-red 0.8s infinite step-end; 
  }
  
  /* Keyframes for Flashing */
  @keyframes flash-yellow {
    0%, 100% { background-color: yellow; } 
    50% { background-color: #333; }     
  }
  
  @keyframes flash-red {
    0%, 100% { background-color: red; color: white;} 
    50% { background-color: #333; color: transparent;}  
  }
  
  .flag-sc .flag-text,
  .flag-vsc .flag-text {
    color: black;
    animation: text-flash-yellow 1s infinite step-end;
  }
  
  @keyframes text-flash-yellow {
     0%, 100% { color: black; }
     50% { color: transparent; }
  }
  
  /* .flag-sc {} */
  /* .flag-vsc {} */
  
  </style>