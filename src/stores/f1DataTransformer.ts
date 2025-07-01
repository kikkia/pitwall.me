import { reactive } from 'vue';
import type {
  RaceData,
  DriverViewModel,
  StintViewModel,
  TimingDataLine,
  TimingStatsLine,
  TimingAppDataLine,
  StintData,
  ValueWithLap,
  Sector,
} from '@/types/dataTypes'; 

export function createOrUpdateDriverViewModel(
  racingNumber: string,
  raceData: RaceData,
  existingViewModel: DriverViewModel | null = null
): DriverViewModel {
  const vm = existingViewModel || reactive<DriverViewModel>({
    racingNumber,
    tla: '',
    fullName: '',
    teamName: '',
    teamColour: '808080',
    headshotUrl: '',
    position: '',
    gapToLeader: '',
    gapToAhead: '',
    lastLapTime: null,
    bestLapTime: null,
    lapNumber: 0,
    inPit: false,
    pitOut: false,
    retired: false,
    stopped: false,
    sectors: [],
    bestSectors: [],
    numberOfPitStops: 0,
    personalBestLap: null,
    currentStint: null,
    stintHistory: [],
    rpm: 0,
    speed: 0,
    gear: 0,
    throttle: 0,
    brake: 0,
    drs: 0,
    positionStatus: '',
    posX: 0,
    posY: 0,
    posZ: 0,
    isQualifying: false,
    isKnockedOut: false,
    isCutoff: false,
    qualifyingTime: null,
    gapToNextElimination: '',
    gapToPole: '',
  });

  const driverInfo = raceData.DriverList?.[racingNumber] || null;
  const timingDataLine = raceData.TimingData?.Lines?.[racingNumber] || null;
  const timingStatsLine = raceData.TimingStats?.Lines?.[racingNumber] || null;
  const timingAppDataLine = raceData.TimingAppData?.Lines?.[racingNumber] || null;
  // TyreStintSeries.Stints is Record<string, StintData[]>
  const stintSeriesForDriver = raceData.TyreStintSeries?.Stints?.[racingNumber] || [];


  if (driverInfo) {
    vm.tla = driverInfo.Tla;
    vm.fullName = driverInfo.FullName;
    vm.teamName = driverInfo.TeamName;
    vm.teamColour = driverInfo.TeamColour || '808080'; 
    vm.headshotUrl = driverInfo.HeadshotUrl;
  }

  if (timingDataLine) {
    vm.position = timingDataLine.Position;
    vm.gapToLeader = ''; 
    vm.gapToAhead = ''; 

    if (timingDataLine.GapToLeader && !timingDataLine.GapToLeader.includes("LAP")) {
        vm.gapToLeader = timingDataLine.GapToLeader;
    }
    if (timingDataLine.IntervalToPositionAhead?.Value && !timingDataLine.IntervalToPositionAhead.Value.includes("LAP")) {
        vm.gapToAhead = timingDataLine.IntervalToPositionAhead.Value;
    }

    vm.lastLapTime = timingDataLine.LastLapTime;
    vm.bestLapTime = timingDataLine.BestLapTime;
    vm.lapNumber = timingDataLine.NumberOfLaps;
    vm.inPit = timingDataLine.InPit;
    vm.pitOut = timingDataLine.PitOut;
    vm.numberOfPitStops = timingDataLine.NumberOfPitStops;
    vm.retired = timingDataLine.Retired;
    vm.stopped = timingDataLine.Stopped;
    vm.sectors = timingDataLine.Sectors as Sector[];

    // Qualifying specific data
    vm.isQualifying = raceData.SessionInfo?.Type === 'Qualifying';
    vm.isKnockedOut = timingDataLine.KnockedOut || false;
    vm.isCutoff = timingDataLine.Cutoff || false;
    vm.qualifyingTime = timingDataLine.BestLapTime; 
    vm.gapToNextElimination = timingDataLine.IntervalToPositionAhead?.Value || ''; // TODO
    vm.gapToPole = timingDataLine.GapToLeader || ''; // TODO

  } else {
    vm.position = '';
    vm.gapToLeader = '';
    vm.gapToAhead = '';
    vm.lastLapTime = null;
    vm.bestLapTime = null;
    vm.numberOfPitStops = 0;
    vm.pitOut = false;
    vm.inPit = false;
    vm.retired = false;
    vm.stopped = false;
    vm.sectors = [];
    vm.isQualifying = raceData.SessionInfo?.Type === 'Qualifying';
    vm.isKnockedOut = false;
    vm.isCutoff = false;
    vm.qualifyingTime = null;
    vm.gapToNextElimination = '';
    vm.gapToPole = '';
  }

  if (timingStatsLine) {
    vm.personalBestLap = timingStatsLine.PersonalBestLapTime;
    vm.bestSectors = timingStatsLine.BestSectors as Sector[];
  } else {
    vm.personalBestLap = null;
    vm.bestSectors = [];
  }

  const mapStintToViewModel = (stint: StintData): StintViewModel => ({
    compound: stint.Compound,
    totalLaps: stint.TotalLaps,
    startLaps: stint.StartLaps,
    newTyre: stint.New === 'true',
  });

  if (stintSeriesForDriver.length > 0) {
    vm.stintHistory = stintSeriesForDriver.map(mapStintToViewModel);
  } else if (timingAppDataLine?.Stints?.length > 0) {
    vm.stintHistory = timingAppDataLine.Stints.map(mapStintToViewModel);
  } else {
    vm.stintHistory = [];
  }
  vm.currentStint = vm.stintHistory.length > 0 ? vm.stintHistory[vm.stintHistory.length - 1] : null;

  return vm;
}

export function buildDriverViewModels(raceData: RaceData): Map<string, DriverViewModel> {
  const map = reactive(new Map<string, DriverViewModel>()); 
  const driverSource = raceData.DriverList && Object.keys(raceData.DriverList).length > 0
    ? raceData.DriverList
    : raceData.TimingData?.Lines || {};

  for (const racingNumber in driverSource) {
    if (Object.prototype.hasOwnProperty.call(driverSource, racingNumber)) {
        const vm = createOrUpdateDriverViewModel(racingNumber, raceData, null);
        map.set(racingNumber, vm);
    }
  }
  return map;
}

export const sortByBasePos = (driverA: DriverViewModel, driverB: DriverViewModel): number => {
  return parseInt(driverA.position, 10) - parseInt(driverB.position, 10);
};