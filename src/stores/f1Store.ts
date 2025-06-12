import { defineStore } from 'pinia';
import { reactive, computed, ref } from 'vue';
import * as f1WebSocketService from '@/services/websocketService'; 
import * as transformer from '@/stores/f1DataTransformer';
import pako from 'pako';

import type {
  RaceData,
  DriverViewModel,
  TopThree,
  TimingStats,
  TimingAppData,
  RaceControlMessages,
  SessionData,
  TimingData,
  DriverList,
  TeamRadio,
  TyreStintSeries,
  LapCount,
  InflatedCarData,
  InflatedPositionData,
  LapHistory,
  CompletedLap,
  RaceControlMessage,
  TeamRadioCapture
} from '@/types/dataTypes';


const createInitialRaceData = (): RaceData => ({
  Heartbeat: null,
  ExtrapolatedClock: null,
  WeatherData: null,
  TrackStatus: null,
  TopThree: { Lines: [], SessionPart: 0, Withheld: false },
  TimingStats: { Lines: {}, Withheld: false, SessionType: '' },
  TimingAppData: { Lines: {} },
  RaceControlMessages: { Messages: [] },
  SessionInfo: null,
  SessionData: { Series: [], StatusSeries: [] },
  TimingData: { Lines: {}, SessionPart: 0, Withheld: false, CutOffTime: '', CutOffPercentage: '' , NoEntries: []},
  DriverList: {},
  CarDataZ: '',
  PositionZ: '',
  TeamRadio: { Captures: [] },
  TyreStintSeries: { Stints: {} },
  LapCount: {} ,
  LapHistoryMap: {}
});

interface F1StoreState {
  isConnected: boolean;
  raceData: RaceData;
  driversViewModelMap: Map<string, DriverViewModel>;
}

export const useF1Store = defineStore('f1', () => {
  const isConnected = ref(false);
  const raceData = reactive<RaceData>(createInitialRaceData());
  const driversViewModelMap = reactive<Map<string, DriverViewModel>>(new Map<string, DriverViewModel>());

  const sortedDriversViewModel = computed<DriverViewModel[]>(() => {
    const drivers = Array.from(driversViewModelMap.values());
    drivers.sort((a, b) => {
      let posA = parseInt(a.position || '99', 10);
      let posB = parseInt(b.position || '99', 10);

      if ((a.retired || a.stopped) && !(b.retired || b.stopped)) return 1;
      if (!(a.retired || a.stopped) && (b.retired || b.stopped)) return -1;
      return posA - posB;
    });
    return drivers;
  });

  // === ACTIONS ===

  function setConnected(status: boolean) {
    isConnected.value = status;
    if (!status) {
      console.log("Store: Connection status set to disconnected.");
    }
  }

  function setInitialState(initialDataR: Partial<RaceData>) {
    console.log("Store Action: Setting initial state...");
    Object.assign(raceData, createInitialRaceData(), initialDataR);

    driversViewModelMap.clear();
    const newMap = transformer.buildDriverViewModels(raceData); // Use direct raceData
    newMap.forEach((value, key) => driversViewModelMap.set(key, value));    console.log("Store Action: Initial state applied.");
  }

  function inflateData(base64String: string): InflatedCarData | InflatedPositionData | null {
    try {
      const binaryString = atob(base64String);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const inflated = pako.inflateRaw(bytes, { to: "string" });
      return JSON.parse(inflated); // Caller will need to assert the type
    } catch (error) {
      console.error("Error inflating data:", error, "Input:", base64String.substring(0, 50) + "...");
      return null;
    }
  }

  // K extends keyof RaceData makes fieldName type-safe
  // P extends RaceData[K] makes payload type-safe for that fieldName
  function applyFeedUpdate<K extends keyof RaceData>(
    fieldName: K,
    payload: Partial<RaceData[K]> // Use Partial for updates
  ) {
    const target = raceData;
    let affectedDriverNumbers = new Set<string>();

    // Type assertion can be useful here if deepMergeObjects isn't perfectly generic
    // Or, handle each case with specific logic for merging that part of RaceData
    switch (fieldName) {
      case "Heartbeat":
      case "ExtrapolatedClock":
      case "WeatherData":
      case "TrackStatus":
      case "SessionInfo":
      case "LapCount":
        if (target[fieldName] && payload) {
          target[fieldName] = deepMergeObjects(target[fieldName] as object, payload as object) as RaceData[K];
        } else if (payload) {
          target[fieldName] = payload as RaceData[K]; // Cast for assignment
        }
        break;
      case "TopThree": // TopThree has Lines array
         if (payload && target.TopThree) {
            target.TopThree = deepMergeObjects(target.TopThree, payload as Partial<TopThree>);
         }
        break;
      case "SessionData":
         if (payload && target.SessionData) {
            target.SessionData = deepMergeObjects(target.SessionData, payload as Partial<SessionData>);
         }
        break;
      case "DriverList":
        if (payload && target.DriverList) {
            target.DriverList = deepMergeObjects(target.DriverList, payload as Partial<DriverList>);
        }
        break;

      case "TimingStats":
      case "TimingAppData":
      case "TimingData":
        const typedPayloadLines = (payload as Partial<TimingData | TimingStats | TimingAppData>)?.Lines;
        if (typedPayloadLines) {
            const targetField = target[fieldName] as TimingData | TimingStats | TimingAppData; // Help TS
            if (!targetField.Lines) targetField.Lines = {};

            for (const driverNumber in typedPayloadLines) {
                const driverUpdate = typedPayloadLines[driverNumber];
                if (!targetField.Lines[driverNumber]) {
                    targetField.Lines[driverNumber] = {} as any; // Initialize, cast as any for broad compatibility or use specific type
                }
                if (driverUpdate) { // Check if driverUpdate is not undefined
                    targetField.Lines[driverNumber] = deepMergeObjects(
                      targetField.Lines[driverNumber] as object, // This is the old state
                      driverUpdate as object) as any; // Add 'as any' or the correct specific type
                }
                affectedDriverNumbers.add(driverNumber);
            }
            // Update other fields like Withheld, SessionType if present
            if ((payload as Partial<TimingStats>).Withheld !== undefined) (target[fieldName] as TimingStats).Withheld = (payload as Partial<TimingStats>).Withheld!;
            if ((payload as Partial<TimingStats>).SessionType !== undefined) (target[fieldName] as TimingStats).SessionType = (payload as Partial<TimingStats>).SessionType!;

        }
        break;

      case "TyreStintSeries":
        const stintPayload = payload as Partial<TyreStintSeries>;
        if (stintPayload.Stints) {
            if (!target.TyreStintSeries) target.TyreStintSeries = { Stints: {} };
            if (!target.TyreStintSeries.Stints) target.TyreStintSeries.Stints = {};

            for (const [driverNumber, stintUpdateArray] of Object.entries(stintPayload.Stints)) {
                if (!target.TyreStintSeries.Stints[driverNumber]) {
                    target.TyreStintSeries.Stints[driverNumber] = [];
                }
                const targetStints = target.TyreStintSeries.Stints[driverNumber];
                // The update is an object where keys are indices: e.g. {"0": stint, "1": stintUpdate}
                if (typeof stintUpdateArray === 'object' && stintUpdateArray !== null && !Array.isArray(stintUpdateArray)) {
                     applyUpdatesByMappedIndex(stintUpdateArray as Record<string, any>, targetStints);
                } else if (Array.isArray(stintUpdateArray)) { // Full array replacement for a driver
                    target.TyreStintSeries.Stints[driverNumber] = stintUpdateArray;
                }
                affectedDriverNumbers.add(driverNumber);
            }
        }
        break;

      case "RaceControlMessages":
        const rcmPayload = payload as Partial<RaceControlMessages>;
        if (target.RaceControlMessages && rcmPayload.Messages) {
            if (Array.isArray(rcmPayload.Messages)) {
                target.RaceControlMessages.Messages.push(...rcmPayload.Messages);
            } else if (typeof rcmPayload.Messages === 'object') { // Map format {"index": message}
                Object.values(rcmPayload.Messages).forEach(msg => {
                    if (msg) target.RaceControlMessages.Messages.push(msg as RaceControlMessage);
                });
            }
        }
        break;

      case "TeamRadio":
        const radioPayload = payload as Partial<TeamRadio>;
        if (target.TeamRadio && radioPayload.Captures) {
            if (Array.isArray(radioPayload.Captures)) {
                target.TeamRadio.Captures.push(...radioPayload.Captures);
            } else if (typeof radioPayload.Captures === 'object') {
                Object.values(radioPayload.Captures).forEach(cap => {
                    if (cap) target.TeamRadio.Captures.push(cap as TeamRadioCapture);
                });
            }
        }
        break;

      case "CarData.z":
        const carDataZPayload = payload as any as string;
        target.CarDataZ = carDataZPayload;
        const inflatedCar = inflateData(carDataZPayload);
        if (inflatedCar && 'Entries' in inflatedCar) { // Type guard for InflatedCarData
            const carData = inflatedCar as InflatedCarData;
            if (carData.Entries && Array.isArray(carData.Entries) && carData.Entries.length > 0) {
                const latestSnapshot = carData.Entries[carData.Entries.length - 1];
                if (latestSnapshot && latestSnapshot.Cars) {
                    for (const [driverNumber, carEntry] of Object.entries(latestSnapshot.Cars)) {
                        const vm = driversViewModelMap.get(driverNumber);
                        if (vm && carEntry.Channels) {
                            const channels = carEntry.Channels;
                            vm.rpm = channels["0"] ?? vm.rpm;
                            vm.speed = channels["2"] ?? vm.speed;
                            vm.gear = channels["3"] ?? vm.gear;
                            vm.throttle = channels["4"] ?? vm.throttle;
                            vm.brake = channels["5"] ?? vm.brake;
                            vm.drs = channels["45"] ?? vm.drs;
                        }
                    }
                }
            }
        }
        break;

      case "Position.z":
        const positionZPayload = payload as any as string;
        target.PositionZ = positionZPayload;
        const inflatedPos = inflateData(positionZPayload);
        if (inflatedPos && 'Position' in inflatedPos) { // Type guard for InflatedPositionData
            const posData = inflatedPos as InflatedPositionData;
            if (posData.Position && Array.isArray(posData.Position) && posData.Position.length > 0) {
                const latestSnapshot = posData.Position[posData.Position.length - 1];
                if (latestSnapshot && latestSnapshot.Entries) {
                    for (const [driverNumber, positionEntry] of Object.entries(latestSnapshot.Entries)) {
                        const vm = driversViewModelMap.get(driverNumber);
                        if (vm) {
                            vm.positionStatus = positionEntry.Status ?? vm.positionStatus;
                            vm.posX = positionEntry.X ?? vm.posX;
                            vm.posY = positionEntry.Y ?? vm.posY;
                            vm.posZ = positionEntry.Z ?? vm.posZ;
                        }
                    }
                }
            }
        }
        break;

      case "LapHistory":
        const lapHistoryPayload = payload as any as { RacingNumber: string; CompletedLap: CompletedLap };
        if (lapHistoryPayload && lapHistoryPayload.RacingNumber && lapHistoryPayload.CompletedLap) {
            const { RacingNumber, CompletedLap } = lapHistoryPayload;
            if (!target.LapHistoryMap[RacingNumber]) {
                target.LapHistoryMap[RacingNumber] = { RacingNumber: RacingNumber, CompletedLaps: [] };
            }
            target.LapHistoryMap[RacingNumber].CompletedLaps.push(CompletedLap);
            affectedDriverNumbers.add(RacingNumber);
            console.log(`ADDED LAP FOR: ${lapHistoryPayload.RacingNumber}`)
        }
        break;

      default:
        console.warn(`Store Action: Unhandled field name in applyFeedUpdate: ${fieldName}`);
        const currentVal = target[fieldName as keyof RaceData]; // Use keyof for safety
        if (currentVal === undefined && payload !== undefined) {
             (target as any)[fieldName] = payload;
        } else if (typeof currentVal === 'object' && currentVal !== null &&
                   typeof payload === 'object' && payload !== null) {
            deepMergeObjects(currentVal as object, payload as object);
        } else if (payload !== undefined) {
            (target as any)[fieldName] = payload;
        }
    }

    if (affectedDriverNumbers.size > 0) {
      for (const driverNumber of affectedDriverNumbers) {
        const existingVM = driversViewModelMap.get(driverNumber);
        const updatedVM = transformer.createOrUpdateDriverViewModel(driverNumber, raceData, existingVM || null);
        if (!existingVM || updatedVM !== existingVM) { // Check if VM actually changed
            driversViewModelMap.set(driverNumber, updatedVM);
        }
      }
    }
  }

  // Generic deepMerge and applyUpdates functions
  function applyUpdatesByMappedIndex<T>(fullUpdate: Record<string, Partial<T> | T>, array: T[]): void {
    for (const [indexStr, update] of Object.entries(fullUpdate)) {
        const parsedIndex = parseInt(indexStr, 10);
        if (isNaN(parsedIndex)) {
            console.warn("update index was not parseable: " + indexStr);
            continue;
        }
        if (update === null || update === undefined) { 
            if (parsedIndex < array.length) array[parsedIndex] = update as T; 
            continue;
        }

        if (parsedIndex === array.length) {
            array.push(update as T); 
        } else if (parsedIndex < array.length) {
            const existing = array[parsedIndex];
            if (typeof update === 'object' && update !== null && typeof existing === 'object' && existing !== null && !Array.isArray(update) && !Array.isArray(existing)) {
                array[parsedIndex] = deepMergeObjects(existing, update as Partial<T>);
            } else {
                array[parsedIndex] = update as T; // Replace primitive or replace object with non-object
            }
        } else {
            console.warn(`Received an index update at a higher than expected max index. Index: ${parsedIndex}, Array length: ${array.length}`);
        }
    }
  }

  function deepMergeObjects<T extends object, S extends object>(target: T, source: S): T & S {
    if (typeof target !== 'object' || target === null || Array.isArray(target) ||
        typeof source !== 'object' || source === null || Array.isArray(source)) {
        console.error("Internal Error: deepMergeObjects called with invalid types", target, source);
        return target as T & S;
    }

    const output = { ...target } as T & S;

    for (const key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
            const sourceValue = source[key as keyof S];
            const targetValue = (target as any)[key]; // Use any for targetValue as key might not exist on T initially

            if (Array.isArray(targetValue) && typeof sourceValue === 'object' && sourceValue !== null && !Array.isArray(sourceValue)) {
                 // Source is an object of indexed updates for a target array
                const newArray = [...targetValue]; // Clone array
                applyUpdatesByMappedIndex(sourceValue as Record<string, any>, newArray);
                (output as any)[key] = newArray;
            } else if (typeof sourceValue === 'object' && sourceValue !== null && !Array.isArray(sourceValue) &&
                       typeof targetValue === 'object' && targetValue !== null && !Array.isArray(targetValue)) {
                (output as any)[key] = deepMergeObjects(targetValue, sourceValue);
            } else {
                (output as any)[key] = sourceValue;
            }
        }
    }
    return output;
  }


  function initialize() {
    console.log("Store Action: Initializing connection...");
    f1WebSocketService.connect();
  }

  function terminate() {
    console.log("Store Action: Terminating connection...");
    f1WebSocketService.disconnect();
  }
  return {
    get isConnected() { return isConnected; },
    get raceData() { return raceData as Readonly<RaceData>; }, // Expose as readonly
    get driversViewModelMap() { return driversViewModelMap as ReadonlyMap<string, DriverViewModel>; },
    
    sortedDriversViewModel,

    setConnected,
    setInitialState,
    applyFeedUpdate,
    initialize,
    terminate,
  };
});