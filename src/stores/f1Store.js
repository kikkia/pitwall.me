import { defineStore } from 'pinia';
import { reactive, readonly, computed } from 'vue';
import * as f1WebSocketService from '@/services/websocketService';
import * as transformer from '@/stores/f1DataTransformer';
import pako from 'pako';

const createInitialRaceData = () => ({
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
  TimingData: { NoEntries: [], SessionPart: 0, Lines: {}, Withheld: false, CutOffTime: '', CutOffPercentage: '' },
  DriverList: {}, 
  CarDataZ: '',
  PositionZ: '',
  TeamRadio: { Captures: [] },      
  TyreStintSeries: { Stints: {} },
  LapCount: {}
});

export const useF1Store = defineStore('f1', () => {
  // === STATE ===
  const state = reactive({
    isConnected: false,
    lastRawMessage: null, // Optional: For debugging WS messages
    /** @type {ReturnType<typeof createInitialRaceData>} */
    raceData: createInitialRaceData(),
    driversViewModelMap: new Map(),
  });

  const sortedDriversViewModel = computed(() => {
    const drivers = Array.from(state.driversViewModelMap.values());
    // Sort drivers by position (handle non-numeric/missing positions)
    drivers.sort((a, b) => {
         const posA = parseInt(a.position || '99', 10);
         const posB = parseInt(b.position || '99', 10);
         // Handle retired drivers - maybe push them to the bottom?

         if ((a.retired || a.stopped) && !(b.retired || b.stopped)) return 1;
         if (!(a.retired || a.stopped) && (b.retired || b.stopped)) return -1;
         return posA - posB;
    });
    return drivers;
  });

  // === ACTIONS ===

  /** @param {boolean} status */
  function setConnected(status) {
    state.isConnected = status;
    if (!status) {
        // Option: Reset parts of the data when disconnected?
        // state.raceData = createInitialRaceData(); // Full reset
        console.log("Store: Connection status set to disconnected.");
    }
  }

  /** @param {string | null} message */
  function setLastRawMessage(message) {
    state.lastRawMessage = message;
  }

  /**
    * Sets the entire initial RaceData state from the first WebSocket message.
    * @param {object} initialDataR - The 'R' object from the initial message.
    */
  function setInitialState(initialDataR) {
        console.log("Store Action: Setting initial state...");
        // Replace the entire raceData object. This ensures clean state.
        // Ensure initialDataR has all expected fields, or merge carefully.
        state.raceData = {
            ...createInitialRaceData(), // Start with default structure
            ...initialDataR           // Overwrite with received data
        };

        // Validate specific nested structures if necessary
        state.raceData.TopThree = state.raceData.TopThree || { Lines: [], SessionPart: 0, Withheld: false };
        state.raceData.TimingStats = state.raceData.TimingStats || { Lines: {}, Withheld: false, SessionType: '' };
        state.raceData.TimingAppData = state.raceData.TimingAppData || { Lines: {} };
        state.raceData.RaceControlMessages = state.raceData.RaceControlMessages || { Messages: [] };
        state.raceData.SessionData = state.raceData.SessionData || { Series: [], StatusSeries: [] };
        state.raceData.TimingData = state.raceData.TimingData || { NoEntries: [], SessionPart: 0, Lines: {}, Withheld: false, CutOffTime: '', CutOffPercentage: '' };
        state.raceData.DriverList = state.raceData.DriverList || {};
        state.raceData.TeamRadio = state.raceData.TeamRadio || { Captures: [] };
        state.raceData.TyreStintSeries = state.raceData.TyreStintSeries || { Stints: {} };
        state.raceData.LapCount = state.raceData.LapCount || {};

        state.driversViewModelMap = transformer.buildDriverViewModels(state.raceData);

        console.log("Store Action: Initial state applied.");
        // console.log("Initial DriverList:", state.raceData.DriverList); // Debug
  }

  function inflateData(base64String) {
    try {
        const binaryString = atob(base64String);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const inflated = pako.inflateRaw(bytes, {to: "string"});
        return JSON.parse(inflated);
    } catch (error) {
        console.error("Error inflating data:", error, "Input:", base64String.substring(0, 50) + "...");
        return null;
    }
  }

  /**
   * Applies a partial update payload to the raceData state.
   * @param {string} fieldName - The top-level field in RaceData (e.g., "TimingData", "WeatherData")
   * @param {any} payload - The update data for that field
   */
  function applyFeedUpdate(fieldName, payload) {
    const target = state.raceData; // Target the main data object
    let affectedDriverNumbers = new Set();

    switch (fieldName) {
        case "Heartbeat":
        case "ExtrapolatedClock":
        case "WeatherData":
        case "TrackStatus":
        case "SessionInfo":
        case "TopThree":
        case "SessionData": // TODO: On new qualifying part then wipe timing data, eliminate bottom 5
            deepMergeObjects(target[fieldName], payload);
            break;

        case "DriverList":
            deepMergeObjects(target.DriverList, payload);
            break;

        case "TimingStats":
        case "TimingAppData":
        case "TimingData":
            if (payload.Lines) {
                if (!target[fieldName]) target[fieldName] = { Lines: {} }; // Initialize if missing
                if (!target[fieldName].Lines) target[fieldName].Lines = {};
                for (const driverNumber in payload.Lines) {
                    const driverUpdate = payload.Lines[driverNumber];
                    if (!target[fieldName].Lines[driverNumber]) {
                        target[fieldName].Lines[driverNumber] = {};
                    }
                    deepMergeObjects(target[fieldName].Lines[driverNumber], driverUpdate);
                    affectedDriverNumbers.add(driverNumber); 
                }
                // Update other fields like Withheld, SessionType if present
                if (payload.Withheld !== undefined) target[fieldName].Withheld = payload.Withheld;
                if (payload.SessionType !== undefined) target[fieldName].SessionType = payload.SessionType;

            }
            break;
        
        case "TyreStintSeries":
            if (payload.Stints) {
                if (!target.TyreStintSeries) target.TyreStintSeries = { Stints: {} };
                if (!target.TyreStintSeries.Stints) target.TyreStintSeries.Stints = {};

                for (const [driverNumber, stintUpdate] of Object.entries(payload.Stints)) {
                        if (!target.TyreStintSeries.Stints[driverNumber]) {
                            target.TyreStintSeries.Stints[driverNumber] = []; // Create if new driver
                        }
                        const targetStints = target.TyreStintSeries.Stints[driverNumber];
                        applyUpdatesByMappedIndex(stintUpdate, targetStints); // Use your existing merge helper
                        affectedDriverNumbers.add(driverNumber); // Mark this driver
                }
            }
            break;

        case "RaceControlMessages": // Append new messages
            if (target.RaceControlMessages && payload.Messages) {
                // Assuming payload.Messages is an array of new messages or a map like {"index": message}
                if (Array.isArray(payload.Messages)) {
                    target.RaceControlMessages.Messages.push(...payload.Messages);
                } else if (typeof payload.Messages === 'object') { // Map format
                      Object.values(payload.Messages).forEach(msg => {
                          if (msg) target.RaceControlMessages.Messages.push(msg);
                      });
                }
            }
            break;

        case "TeamRadio": 
            if (target.TeamRadio && payload.Captures) {
                if (Array.isArray(payload.Captures)) {
                    target.TeamRadio.Captures.push(...payload.Captures);
                } else if (typeof payload.Captures === 'object') {
                    Object.values(payload.Captures).forEach(cap => {
                        if (cap) target.TeamRadio.Captures.push(cap);
                    });
                }
            }
            break;

        case "CarData.z":
            { 
                target.CarDataZ = payload;
                const inflatedData = inflateData(payload);

                if (inflatedData && inflatedData.Entries && Array.isArray(inflatedData.Entries) && inflatedData.Entries.length > 0) {
                    const latestSnapshot = inflatedData.Entries[inflatedData.Entries.length - 1];
                    if (latestSnapshot && latestSnapshot.Cars) {
                        for (const [driverNumber, carEntry] of Object.entries(latestSnapshot.Cars)) {
                            const vm = state.driversViewModelMap.get(driverNumber);
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
                { 
                    target.PositionZ = payload; 
                    const inflatedData = inflateData(payload);

                    if (inflatedData && inflatedData.Position && Array.isArray(inflatedData.Position) && inflatedData.Position.length > 0) {
                        const latestSnapshot = inflatedData.Position[inflatedData.Position.length - 1];
                        if (latestSnapshot && latestSnapshot.Entries) {

                            for (const [driverNumber, positionEntry] of Object.entries(latestSnapshot.Entries)) {
                                const vm = state.driversViewModelMap.get(driverNumber);
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

        default:
            console.warn(`Store Action: Unhandled field name in applyFeedUpdate: ${fieldName}`);
            if (target[fieldName] === undefined) {
                target[fieldName] = payload;
            } else if (typeof target[fieldName] === 'object' && target[fieldName] !== null && typeof payload === 'object' && payload !== null) {
                deepMergeObjects(target[fieldName], payload);
            } else {
                target[fieldName] = payload;
            }
    }
    if (affectedDriverNumbers.size > 0) {
        // console.debug("Updating view models for drivers:", Array.from(affectedDriverNumbers));
        for (const driverNumber of affectedDriverNumbers) {
            const existingVM = state.driversViewModelMap.get(driverNumber);
            // Pass the *entire updated raw state* to the transformer
            const updatedVM = transformer.createOrUpdateDriverViewModel(driverNumber, state.raceData, existingVM);
             // If the driver is new (no existingVM) or updated, set it in the map
             if (!existingVM || updatedVM !== existingVM) {
                state.driversViewModelMap.set(driverNumber, updatedVM);
             }
        }
    }
  }

  function applyUpdatesByMappedIndex(fullUpdate, array) {
    for (const [index, update] of Object.entries(fullUpdate)) {
        let parsedIndex = parseInt(index);
        if (isNaN(parsedIndex)) {
            console.warn("update index was not parseable??? Recieved " + index);
            continue;
        }
        if (parsedIndex == array.length) {
            // New stint, we should NEVER get a stint > 1 index above our current length
            array.push(update);
            return;
        } else if (parsedIndex > array.length) {
            console.warn("Recieved a index update at a higher than expected max index.");
            return;
        }
    
        let existing = array[parsedIndex];

        if (typeof update === 'object' && update !== null) {
            if (typeof existing !== 'object' || existing === null) {
                // If existing item isn't an object, replace it entirely
                array[parsedIndex] = update;
            } else {
                // Deep merge into the existing object at the index
                deepMergeObjects(existing, update);
            }
        } else {
             // If the update is a primitive, just replace the value at the index
             array[parsedIndex] = update;
        }
    } 
  }

function deepMergeObjects(target, source) {
    if (typeof target !== 'object' || target === null || Array.isArray(target) ||
        typeof source !== 'object' || source === null || Array.isArray(source)) {
        console.error("Internal Error: deepMergeObjects called with invalid types", target, source);
        return target;
    }

    for (const key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
            const sourceValue = source[key];
            const targetValue = target[key];

            // Both targetValue and sourceValue are objects, go deeper
            if (typeof sourceValue === 'object' && sourceValue !== null && !Array.isArray(sourceValue) &&
                typeof targetValue === 'object' && targetValue !== null && !Array.isArray(targetValue)) {
                return deepMergeObjects(targetValue, sourceValue); // Recurse on objects

            // TargetValue is an Array and sourceValue is an Object. Use applyUpdatesByMappedIndex.
            // This handles updates like {"Sectors": {"2": {...}}} where Sectors is an array.
            } else if (Array.isArray(targetValue) && typeof sourceValue === 'object' && sourceValue !== null && !Array.isArray(sourceValue)) {
                applyUpdatesByMappedIndex(sourceValue, targetValue);
            } else {
                target[key] = sourceValue;
            }
        }
    }
    return target;
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
    state: readonly(state),
    isConnected: readonly(computed(() => state.isConnected)),
    lastRawMessage: readonly(computed(() => state.lastRawMessage)),

    driversViewModelMap: readonly(state.driversViewModelMap), 
    sortedDriversViewModel: sortedDriversViewModel, 

    setConnected, 
    setInitialState,
    applyFeedUpdate,
    setLastRawMessage,
    initialize,
    terminate,
  };
});