import { reactive } from 'vue';

/**
 * Represents the consolidated data for a single driver, optimized for UI display.
 */
export class DriverViewModel {
    racingNumber = '';
    tla = '';
    fullName = '';
    teamName = '';
    teamColour = '808080';
    headshotUrl = '';

    position = '';
    gapToLeader = '';
    gapToAhead = '';
    lastLapTime = null;
    bestLapTime = null; 
    lapNumber = 0;
    inPit = false;
    pitOut = false;
    retired = false;
    stopped = false;
    sectors = []; 
    bestSectors = [];
    numberOfPitStops = 0;

    personalBestLap = null; 

    currentStint = null; 
    stintHistory = []; 


    constructor(racingNumber) {
        this.racingNumber = racingNumber;
    }
}

export function createOrUpdateDriverViewModel(racingNumber, raceData, existingViewModel = null) {
    const vm = existingViewModel ? existingViewModel : reactive(new DriverViewModel(racingNumber));

    const driverInfo = raceData.DriverList?.[racingNumber] || null;
    const timingData = raceData.TimingData?.Lines?.[racingNumber] || null;
    const timingStats = raceData.TimingStats?.Lines?.[racingNumber] || null;
    const timingAppData = raceData.TimingAppData?.Lines?.[racingNumber] || null;
    const stintSeries = raceData.TyreStintSeries?.Stints?.[racingNumber] || []; // Array of stints


    if (driverInfo) {
        vm.tla = driverInfo.Tla;
        vm.fullName = driverInfo.FullName;
        vm.teamName = driverInfo.TeamName;
        vm.teamColour = driverInfo.TeamColour || '808080';
        vm.headshotUrl = driverInfo.HeadshotUrl;
    }

    if (timingData) {
        vm.position = timingData.Position;
        vm.gapToLeader = '';
        vm.gapToAhead = '';
        if (!timingData.GapToLeader?.includes("LAP")) {
            vm.gapToLeader = timingData.GapToLeader || '';
        }
        if (!timingData.IntervalToPositionAhead?.Value.includes("LAP")) {
            vm.gapToAhead = timingData.IntervalToPositionAhead?.Value || '';
        }
        vm.lastLapTime = timingData.LastLapTime;
        vm.bestLapTime = timingData.BestLapTime;
        vm.lapNumber = timingData.NumberOfLaps;
        vm.inPit = timingData.InPit;
        vm.pitOut = timingData.PitOut; 
        vm.numberOfPitStops = timingData.NumberOfPitStops;
        vm.retired = timingData.Retired;
        vm.stopped = timingData.Stopped;
        vm.sectors = timingData.Sectors || [];
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
    }

    if (timingStats) {
        vm.personalBestLap = timingStats.PersonalBestLapTime;
        vm.bestSectors = timingStats.BestSectors;
    } else {
         vm.personalBestLap = null;
    }

    if (stintSeries.length > 0) {
        vm.stintHistory = stintSeries.map(stint => ({
            compound: stint.Compound,
            totalLaps: stint.TotalLaps,
            startLaps: stint.StartLaps,
            newTyre: stint.New === 'true',
        }));
        vm.currentStint = vm.stintHistory[vm.stintHistory.length - 1];
    } else if (timingAppData?.Stints?.length > 0) {
        // Fallback to TimingAppData if TyreStintSeries is empty
        vm.stintHistory = timingAppData.Stints.map(stint => ({
             compound: stint.Compound,
             totalLaps: stint.TotalLaps,
             startLaps: stint.StartLaps,
             newTyre: stint.New === 'true',
         }));
        vm.currentStint = vm.stintHistory[vm.stintHistory.length - 1];
    } else {
         vm.stintHistory = [];
         vm.currentStint = null;
    }

    return vm;
}

export function buildDriverViewModels(raceData) {
    const map = reactive(new Map());
    const driverSource = raceData.DriverList && Object.keys(raceData.DriverList).length > 0
        ? raceData.DriverList
        : raceData.TimingData?.Lines || {};

    for (const racingNumber in driverSource) {
        const vm = createOrUpdateDriverViewModel(racingNumber, raceData, null);
        map.set(racingNumber, vm);
    }
    return map;
}