<script setup lang="ts">
import { computed, ref } from 'vue';
import { useF1Store } from '@/stores/f1Store';

const f1Store = useF1Store();
const activeTab = ref<'drivers' | 'teams'>('drivers');

const teamPointsFromRace = computed(() => {
    const teamPoints = new Map<string, number>();
    for (const driver of f1Store.driversViewModelMap.values()) {
        const position = parseInt(driver?.position || '99', 10);
        let pointsFromRace = 0;
        if (isSprint.value) {
            if (position > 0 && position <= sprintPoints.length) {
                pointsFromRace = sprintPoints[position - 1];
            }
        } else {
            if (position > 0 && position <= racePoints.length) {
                pointsFromRace = racePoints[position - 1];
            }
            if (driver.racingNumber === fastestLapDriver.value) {
                pointsFromRace += 1;
            }
        }
        
        if (driver.teamName) {
            const currentTeamPoints = teamPoints.get(driver.teamName) || 0;
            teamPoints.set(driver.teamName, currentTeamPoints + pointsFromRace);
        }
    }
    return teamPoints;
});

const racePoints = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
const sprintPoints = [8, 7, 6, 5, 4, 3, 2, 1];

function parseLapTime(lapTime: string): number {
  if (!lapTime) return Infinity;
  const parts = lapTime.split(':');
  if (parts.length === 2) {
    const minutes = parseInt(parts[0], 10);
    const seconds = parseFloat(parts[1]);
    return minutes * 60 + seconds;
  }
  return parseFloat(lapTime);
}

const fastestLapDriver = computed(() => {
    let fastestTime = Infinity;
    let fastestDriverNum: string | null = null;

    for (const driver of f1Store.driversViewModelMap.values()) {
        if (driver.bestLapTime?.Value) {
            const time = parseLapTime(driver.bestLapTime.Value);
            if (time < fastestTime) {
                fastestTime = time;
                fastestDriverNum = driver.racingNumber;
            }
        }
    }
    
    if (fastestDriverNum) {
        const driver = f1Store.driversViewModelMap.get(fastestDriverNum);
        if (driver && parseInt(driver.position, 10) <= 10) {
            return fastestDriverNum;
        }
    }
    return null;
});

const isSprint = computed(() => {
    return f1Store.raceData.SessionInfo?.Name?.toLowerCase().includes('sprint') ?? false;
});

const driverPredictions = computed(() => {
  const predictions = f1Store.raceData.ChampionshipPrediction?.Drivers;
  if (!predictions) return [];

  return Object.entries(predictions)
    .map(([racingNumber, prediction]) => {
      const driverInfo = f1Store.driversViewModelMap.get(racingNumber);
      const position = parseInt(driverInfo?.position || '99', 10);
      
      let pointsFromRace = 0;
      if (isSprint.value) {
          if (position > 0 && position <= sprintPoints.length) {
              pointsFromRace = sprintPoints[position - 1];
          }
      } else {
          if (position > 0 && position <= racePoints.length) {
              pointsFromRace = racePoints[position - 1];
          }
          if (racingNumber === fastestLapDriver.value) {
              pointsFromRace += 1;
          }
      }

      const projectedPoints = prediction.PredictedPoints ?? 0;
      const currentPoints = projectedPoints - pointsFromRace;
      const diff = pointsFromRace;

      return {
        racingNumber,
        tla: driverInfo?.tla || 'N/A',
        teamColour: driverInfo?.teamColour || '808080',
        predictedPosition: prediction.PredictedPosition,
        currentPoints,
        projectedPoints,
        diff,
      };
    })
    .sort((a, b) => (a.predictedPosition || 99) - (b.predictedPosition || 99));
});

const teamPredictions = computed(() => {
  const predictions = f1Store.raceData.ChampionshipPrediction?.Teams;
  if (!predictions) return [];

  const teamInfoMap = new Map<string, { color: string }>();
  for (const driver of f1Store.driversViewModelMap.values()) {
      if (driver.teamName && driver.teamColour && !teamInfoMap.has(driver.teamName)) {
          teamInfoMap.set(driver.teamName, { color: driver.teamColour });
      }
  }

  return Object.entries(predictions)
    .map(([predictionTeamName, prediction]) => {
      let bestMatch: string | undefined;
      let longestMatchLength = 0;

      for (const driverListTeamName of teamInfoMap.keys()) {
          const simplifiedDriverListName = driverListTeamName.replace(' F1 Team', '');
          if (predictionTeamName.startsWith(simplifiedDriverListName)) {
              if (simplifiedDriverListName.length > longestMatchLength) {
                  longestMatchLength = simplifiedDriverListName.length;
                  bestMatch = driverListTeamName;
              }
          }
      }
      const matchedTeamName = bestMatch;
      
      const teamColour = matchedTeamName ? teamInfoMap.get(matchedTeamName)?.color ?? '808080' : '808080';
      const pointsFromRace = matchedTeamName ? teamPointsFromRace.value.get(matchedTeamName) || 0 : 0;
      
      const projectedPoints = prediction.PredictedPoints ?? 0;
      const currentPoints = projectedPoints - pointsFromRace;
      const diff = pointsFromRace;

      return {
        teamName: matchedTeamName || predictionTeamName,
        teamColour: teamColour,
        predictedPosition: prediction.PredictedPosition,
        currentPoints,
        projectedPoints,
        diff,
      };
    })
    .sort((a, b) => (a.predictedPosition || 99) - (b.predictedPosition || 99));
});

const props = defineProps({
  messageFontSize: { type: Number, default: 90 }
});

const tableStyle = computed(() => ({
    fontSize: `${props.messageFontSize}%`
}));

const settingsDefinition = ref([
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
  }
]);

defineExpose({
  settingsDefinition
});

</script>

<template>
  <div class="championship-prediction-widget">
    <div class="tabs">
      <button :class="{ active: activeTab === 'drivers' }" @click="activeTab = 'drivers'">Drivers</button>
      <button :class="{ active: activeTab === 'teams' }" @click="activeTab = 'teams'">Teams</button>
    </div>

    <div class="table-container" :style="tableStyle">
      <table v-if="activeTab === 'drivers'" class="prediction-table">
        <thead>
          <tr>
            <th class="pos-col">Pos</th>
            <th>Driver</th>
            <th>Points</th>
          </tr>
        </thead>
        <TransitionGroup tag="tbody" name="list">
          <tr
            v-for="driver in driverPredictions"
            :key="driver.racingNumber"
            :style="{ borderLeft: `5px solid #${driver.teamColour}` }"
          >
            <td>{{ driver.predictedPosition }}</td>
            <td>{{ driver.tla }}</td>
            <td>
              {{ driver.currentPoints?.toFixed(0) }}
              <span :style="{ color: driver.diff > 0 ? '#27AE60' : '#E74C3C' }">
                ({{ driver.diff > 0 ? '+' : '' }}{{ driver.diff.toFixed(0) }})
              </span>
              =
              <span class="projected-points">{{ driver.projectedPoints?.toFixed(0) }}</span>
            </td>
          </tr>
        </TransitionGroup>
      </table>

      <table v-if="activeTab === 'teams'" class="prediction-table">
        <thead>
          <tr>
            <th class="pos-col">Pos</th>
            <th>Team</th>
            <th>Points</th>
          </tr>
        </thead>
        <TransitionGroup tag="tbody" name="list">
          <tr
            v-for="team in teamPredictions"
            :key="team.teamName"
            :style="{ borderLeft: `5px solid #${team.teamColour}` }">
            <td>{{ team.predictedPosition }}</td>
            <td>{{ team.teamName }}</td>
            <td>
                {{ team.currentPoints?.toFixed(0) }}
                <span :style="{ color: team.diff > 0 ? '#27AE60' : (team.diff !== 0 ? '#E74C3C' : '') }">
                ({{ team.diff > 0 ? '+' : '' }}{{ team.diff.toFixed(0) }})
                </span>
                =
                <span class="projected-points">{{ team.projectedPoints?.toFixed(0) }}</span>
            </td>
          </tr>
        </TransitionGroup>
      </table>
    </div>
  </div>
</template>

<style scoped>
.championship-prediction-widget {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background-color: #1a1a1a;
  color: #fff;
  overflow: hidden;
}

.tabs {
  display: flex;
  border-bottom: 1px solid #444;
}

.tabs button {
  padding: 8px 16px;
  background-color: transparent;
  border: none;
  color: #ccc;
  cursor: pointer;
  font-size: 0.9em;
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
}

.tabs button:hover {
  background-color: #2c2c2c;
}

.tabs button.active {
  color: #fff;
  border-bottom: 2px solid #007bff;
  font-weight: bold;
}

.table-container {
  flex-grow: 1;
  overflow-y: auto;
}

.prediction-table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 4px 8px;
  text-align: left;
  border-bottom: 1px solid #444;
  white-space: nowrap;
}

th {
  background-color: #333;
  font-weight: bold;
}

td {
  background-color: #222;
}

tr:nth-child(even) td {
  background-color: #282828;
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

.projected-points {
    font-weight: bold;
    font-size: 1.1em;
}
.pos-col {
    width: 40px;
}
</style>