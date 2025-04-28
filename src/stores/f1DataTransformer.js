import { reactive } from 'vue';

/**
 * Represents the consolidated data for a single driver, optimized for UI display.
 * Add more fields as needed by your components.
 */
export class DriverViewModel {
    // Static Info (from DriverList)
    racingNumber = '';
    tla = '';
    fullName = '';
    teamName = '';
    teamColour = '808080'; // Default grey
    headshotUrl = '';

    // Live Timing (from TimingData)
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
    numberOfPitStops = 0;

    personalBestLap = null; 

    // Stints (from TimingAppData & TyreStintSeries)
    currentStint = null; 
    stintHistory = []; 


    constructor(racingNumber) {
        this.racingNumber = racingNumber;
    }
}

/**
 * Creates or updates a DriverViewModel based on the latest full RaceData.
 * It merges data from various parts of the raw state.
 * @param {string} racingNumber - The driver's racing number.
 * @param {RaceData} raceData - The complete current raw race data state.
 * @param {DriverViewModel | null} [existingViewModel=null] - The previous view model for this driver, if available.
 * @returns {DriverViewModel} - The updated or newly created DriverViewModel.
 */
export function createOrUpdateDriverViewModel(racingNumber, raceData, existingViewModel = null) {
    // Start with a new instance or the existing one
    const vm = existingViewModel ? existingViewModel : reactive(new DriverViewModel(racingNumber));

    // --- Get data sources (handle missing data gracefully) ---
    const driverInfo = raceData.DriverList?.[racingNumber] || null;
    const timingData = raceData.TimingData?.Lines?.[racingNumber] || null;
    const timingStats = raceData.TimingStats?.Lines?.[racingNumber] || null;
    const timingAppData = raceData.TimingAppData?.Lines?.[racingNumber] || null;
    const stintSeries = raceData.TyreStintSeries?.Stints?.[racingNumber] || []; // Array of stints

    // --- Update ViewModel fields ---

    // From DriverInfo
    if (driverInfo) {
        vm.tla = driverInfo.Tla;
        vm.fullName = driverInfo.FullName;
        vm.teamName = driverInfo.TeamName;
        vm.teamColour = driverInfo.TeamColour || '808080';
        vm.headshotUrl = driverInfo.HeadshotUrl;
        // Add other static fields if needed
    }

    // From TimingData
    if (timingData) {
        vm.position = timingData.Position;
        vm.gapToLeader = '';
        vm.gapToAhead = '';
        // Leader values include the LAP count. Lets just ignore those for now
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
        // Reset timing data if driver disappears from TimingData
        vm.position = '';
        vm.gapToLeader = '';
        vm.gapToAhead = '';
        vm.lastLapTime = null;
        vm.bestLapTime = null;
        vm.numberOfPitStops = 0;
        vm.pitOut = false;
        // Keep lapNumber? Maybe reset too: vm.lapNumber = 0;
        vm.inPit = false;
        vm.retired = false; // Might be set by DriverList/other source later?
        vm.stopped = false;
        vm.sectors = [];
    }

    // From TimingStats
    if (timingStats) {
        vm.personalBestLap = timingStats.PersonalBestLapTime;
        // Add vm.bestSectors = timingStats.BestSectors; etc. if needed
    } else {
         vm.personalBestLap = null;
    }

    // From TimingAppData & TyreStintSeries (Combine for stint info)
    // TyreStintSeries usually has the definitive history
    if (stintSeries.length > 0) {
        vm.stintHistory = stintSeries.map(stint => ({ // Create simpler objects if desired
            compound: stint.Compound,
            totalLaps: stint.TotalLaps,
            startLaps: stint.StartLaps,
            newTyre: stint.New === 'true', // Convert string boolean
        }));
        // Current stint is likely the last one in the series
        vm.currentStint = vm.stintHistory[vm.stintHistory.length - 1];
    } else if (timingAppData?.Stints?.length > 0) {
        // Fallback to TimingAppData if TyreStintSeries is empty (less common)
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

/**
 * Builds the initial map of DriverViewModels from the complete RaceData.
 * @param {RaceData} raceData
 * @returns {Map<string, DriverViewModel>}
 */
export function buildDriverViewModels(raceData) {
    const map = reactive(new Map());
    // Use DriverList as the primary source of who *should* exist
    // Or TimingData.Lines if DriverList might lag during formation lap etc.
    const driverSource = raceData.DriverList && Object.keys(raceData.DriverList).length > 0
        ? raceData.DriverList
        : raceData.TimingData?.Lines || {};

    for (const racingNumber in driverSource) {
        const vm = createOrUpdateDriverViewModel(racingNumber, raceData, null);
        map.set(racingNumber, vm);
    }
    return map;
}