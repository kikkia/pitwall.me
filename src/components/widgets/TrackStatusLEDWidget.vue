<template>
  <div :class="['flag-widget', flagClasses]">
    <span v-if="showSCText" class="flag-text">SC</span>
    <span v-if="showVSCText" class="flag-text">VSC</span>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useF1Store } from '@/stores/f1Store'; // Assuming your store path is correct

const f1Store = useF1Store();

// Possible values: AllClear, SCDeployed, VSCDeployed, Red, Yellow, (Maybe add 'TrackClear' or handle null/undefined)
// Ensure raceData and TrackStatus exist before accessing Message
const trackStatus = computed(() => f1Store.state.raceData?.TrackStatus?.Message ?? 'Unknown');

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
  border: 2px solid #555; /* Base dark border */
  background-color: #333; /* Base dark background */
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

/* --- Flag States (Background Colors) --- */
.flag-off {
  background-color: #333;
  border-color: #555; /* Restore base border color */
}

.flag-green {
  background-color: #00cc00; /* Bright green */
  border-color: #00cc00; /* Green border */
  animation: none; /* Ensure no animation */
}
/* Text color for solid flags */
.flag-green .flag-text {
    color: black;
    animation: none;
}

.flag-yellow {
  background-color: yellow;
  border-color: yellow; /* Yellow border */
}
/* Text color for solid flags */
.flag-yellow .flag-text {
    color: black;
    animation: none;
}


.flag-red {
  background-color: red;
  border-color: red; /* Red border */
}
/* Text color for solid flags */
.flag-red .flag-text {
    color: white; /* Red flag text is usually white */
    animation: none;
}

.flag-flashing-yellow {
  animation: flash-yellow 1s infinite step-end; 
}
@keyframes flash-yellow {
  0%, 100% { background-color: yellow; border-color: yellow; } 
  50% { background-color: #333; border-color: #555; } /* Flash to dark background/border */
}

/* Used for Flashing Red Flag */
.flag-flashing-red {
  animation: flash-red 0.8s infinite step-end; 
}
@keyframes flash-red {
  0%, 100% { background-color: red; border-color: red; color: white;} 
  50% { background-color: #333; border-color: #555; color: transparent;}  
}


/* --- SC/VSC Specific Styles & Animations --- */
.flag-safety-car {
    /* This class applies the border animation */
    animation: safety-car 1s infinite step-end;
    border-width: thick; /* Make border thicker */
}

/* Keyframes for flashing the BORDER (used by .flag-safety-car) */
@keyframes safety-car {
  0%, 100% { border-color: yellow; } /* Border is yellow */
  50% { border-color: transparent; } /* Border is invisible */
}

/* Apply styles and text animation when SC or VSC is active */
.flag-sc-vsc-active .flag-text {
    color: white; /* Base text color is white */
    animation: text-flash-white 1s infinite step-end; /* Apply text flashing animation */
}

/* Keyframes for flashing the WHITE text */
@keyframes text-flash-white {
   0%, 100% { color: white; } /* Text is white */
   50% { color: transparent; } /* Text is invisible */
}

</style>