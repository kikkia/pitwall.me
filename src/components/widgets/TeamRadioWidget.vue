<script setup lang="ts">
import { computed, ref, watch, nextTick, onUnmounted } from 'vue';
import { useF1Store } from '@/stores/f1Store';
import type { TeamRadioCapture } from '@/types/dataTypes';

const f1Store = useF1Store();

const props = defineProps({
  showTimestamp: { type: Boolean, default: true },
  focusedDrivers: { type: Array, default: () => [] },
  focusedTeams: { type: Array, default: () => [] },
  messageFontSize: { type: Number, default: 90 },
  autoplay: { type: Boolean, default: false }
});

const drivers = computed(() => Array.from(f1Store.driversViewModelMap.values()));
const teams = computed(() => {
    const teamSet = new Set<string>();
    drivers.value.forEach(d => teamSet.add(d.teamName));
    return Array.from(teamSet).map(t => ({ label: t, value: t }));
});

const settingsDefinition = ref([
  {
    id: 'showTimestamp',       
    label: 'Show Timestamp',    
    type: 'boolean',            
    component: 'Checkbox'
  },
  {
    id: 'autoplay',
    label: 'Autoplay new messages',
    type: 'boolean',
    component: 'Checkbox'
  },
  {
    id: 'messageFontSize',
    label: 'Message Font Size (%)',
    type: 'number',
    component: 'Slider',        
    props: {                    
      min: 50,                  
      max: 150,                
      step: 10 
    }
  },
  {
    id: 'focusedDrivers',
    label: 'Focus on Drivers',
    type: 'array',
    component: 'MultiSelect',
    options: computed(() =>
      drivers.value
        .filter(d => d.racingNumber != "_kf")
        .map(d => ({
          label: `${d.tla} (${d.racingNumber})`,
          value: d.racingNumber
        }))
    ),
    props: {
      optionLabel: 'label',
      optionValue: 'value',
      filter: true,
      placeholder: 'Select Drivers'
    }
  },
  {
    id: 'focusedTeams',
    label: 'Focus on Teams',
    type: 'array',
    component: 'MultiSelect',
    options: teams,
    props: {
        optionLabel: 'label',
        optionValue: 'value',
        filter: true,
        placeholder: 'Select Teams'
    }
  }
]);

defineExpose({
  settingsDefinition
});

const sessionPath = computed(() => f1Store.raceData.SessionInfo?.Path);
const basePath = computed(() => `https://livetiming.formula1.com/static/${sessionPath.value}`);

const messages = computed(() => f1Store.raceData.TeamRadio.Captures);
const messagesContainerRef = ref<HTMLElement | null>(null);
const highlightedMessageId = ref<string | null>(null);

const currentlyPlayingAudio = ref<HTMLAudioElement | null>(null);
const currentlyPlayingMessage = ref<TeamRadioCapture | null>(null);
const isPlaying = ref(false);

const filteredMessages = computed(() => {
  const allMessages = messages.value || [];
  return allMessages.filter(message => {
    const driver = drivers.value.find(d => d.racingNumber === message.RacingNumber);
    const driverFocused = props.focusedDrivers.length === 0 || props.focusedDrivers.includes(message.RacingNumber);
    const teamFocused = props.focusedTeams.length === 0 || (driver && props.focusedTeams.includes(driver.teamName));
    return driverFocused && teamFocused;
  });
});

watch(() => filteredMessages.value.length, (newLength, oldLength) => {
  if (newLength > (oldLength || 0)) {
    const newMessage = filteredMessages.value[filteredMessages.value.length - 1];
    const messageId = `${newMessage.Utc}`;

    highlightedMessageId.value = messageId;
    
    if (props.autoplay) {
        playAudio(newMessage);
    }

    setTimeout(() => {
      if (highlightedMessageId.value === messageId) {
        highlightedMessageId.value = null;
      }
    }, 4000);

    nextTick(() => {
      if (messagesContainerRef.value) {
        messagesContainerRef.value.scrollTop = messagesContainerRef.value.scrollHeight;
      }
    });
  }
}, { immediate: true });

const tableStyle = computed(() => ({
    fontSize: `${props.messageFontSize}%` 
}));

function getDriverTla(racingNumber: string) {
    return drivers.value.find(d => d.racingNumber === racingNumber)?.tla ?? racingNumber;
}

function getTeamName(racingNumber: string) {
    const driver = drivers.value.find(d => d.racingNumber === racingNumber);
    return driver ? driver.teamName : 'Unknown';
}

function playAudio(message: TeamRadioCapture) {
    if (!sessionPath.value) return;

    if (currentlyPlayingAudio.value) {
        currentlyPlayingAudio.value.pause();
        currentlyPlayingAudio.value.remove();
        currentlyPlayingAudio.value = null;
    }

    if (currentlyPlayingMessage.value?.Path === message.Path && isPlaying.value) {
        currentlyPlayingMessage.value = null;
        isPlaying.value = false;
        return;
    }

    const audio = new Audio(`${basePath.value}${message.Path}`);
    currentlyPlayingAudio.value = audio;
    currentlyPlayingMessage.value = message;
    isPlaying.value = true;

    audio.play();
    audio.addEventListener('ended', () => {
        isPlaying.value = false;
        currentlyPlayingMessage.value = null;
    });
}

const nowPlayingDriver = computed(() => {
    if (!currentlyPlayingMessage.value) return null;
    return drivers.value.find(d => d.racingNumber === currentlyPlayingMessage.value?.RacingNumber);
});

const bannerStyle = computed(() => {
    if (nowPlayingDriver.value) {
        return {
            backgroundColor: `#${nowPlayingDriver.value.teamColour}`
        };
    }
    return {};
});

onUnmounted(() => {
    if (currentlyPlayingAudio.value) {
        currentlyPlayingAudio.value.pause();
    }
});

</script>

<template>
    <div class="widget team-radio-feed">
        <div v-if="currentlyPlayingMessage && nowPlayingDriver" class="now-playing-banner" :style="bannerStyle">
             Now Playing: {{ nowPlayingDriver.tla }} - {{ nowPlayingDriver.teamName }}
        </div>
        <div ref="messagesContainerRef" class="messages-container" :style="tableStyle">
            <table>
                <thead>
                <tr>
                    <th v-if="props.showTimestamp">Timestamp</th>
                    <th>Driver</th>
                    <th>Team</th>
                    <th>Message</th>
                </tr>
                </thead>
                <tbody>
                <tr v-if="filteredMessages?.length === 0">
                    <td :colspan="3 + (props.showTimestamp ? 1:0)" style="text-align: center;">
                        Waiting for team radio...
                    </td>
                </tr>
                <tr
                    v-for="radioMessage in filteredMessages"
                    :key="radioMessage.Utc"
                    :class="{ 'highlight-fade': radioMessage.Utc === highlightedMessageId }"
                >
                    <td v-if="props.showTimestamp">{{ new Date(radioMessage.Utc).toLocaleTimeString() }}</td>
                    <td>{{ getDriverTla(radioMessage.RacingNumber) }}</td>
                    <td>{{ getTeamName(radioMessage.RacingNumber) }}</td>
                    <td>
                        <button @click="playAudio(radioMessage)" class="play-button">
                            {{ (currentlyPlayingMessage?.Path === radioMessage.Path && isPlaying) ? '❚❚' : '►' }}
                        </button>
                    </td>
                </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<style scoped>
   .widget.team-radio-feed {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: #222; 
   }
   .messages-container {
    flex-grow: 1; 
    overflow-y: auto; 
    overflow-x: hidden;
    position: relative; 
    border: 1px solid #333;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  thead {
    position: sticky;
    top: 0;
    z-index: 1;
    background-color: #333;
  }

  th, td {
    padding: 2px 4px;
    text-align: left;
    border-bottom: 1px solid #444;
  }

  td {
    background-color: #222;
    color: #ddd;
    word-break: break-word;
    white-space: normal;
    transition: background-color 4s ease-out;
  }

  th {
    background-color: #333;
    color: #eee;
    font-weight: bold;
  }

  tr:nth-child(even) td {
    background-color: #282828;
  }

  tr.highlight-fade td {
    background-color: rgba(0, 255, 170, 0.733);
  }

  tr:nth-child(odd):not(.highlight-fade) td {
      background-color: #222;
  }

  tr:nth-child(even):not(.highlight-fade) td {
      background-color: #282828;
  }
  .now-playing-banner {
    color: white;
    padding: 10px;
    text-align: center;
    font-size: 1.2em;
    font-weight: bold;
    border-bottom: 1px solid #333;
    text-shadow: 1px 1px 2px black;
  }
  .play-button {
    background: #333;
    border: 1px solid #555;
    color: white;
    cursor: pointer;
    padding: 5px 10px;
    border-radius: 5px;
  }
  .play-button:hover {
    background: #444;
  }
</style>