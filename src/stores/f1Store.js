import { defineStore } from 'pinia';
import { reactive, readonly } from 'vue'; 
import * as f1WebSocketService from '@/services/websocketService';


/**
 * @typedef {import('./f1DataModels').DriverInfo} DriverInfo // Assuming models are defined elsewhere
 * @typedef {import('./f1DataModels').RaceData} RaceData // Assuming models are defined elsewhere
 */

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
  TyreStintSeries: { Stints: {} } 
});

export const useF1Store = defineStore('f1', () => {
  // === STATE ===
  const state = reactive({
    isConnected: false,
    lastRawMessage: null, // Optional: For debugging WS messages
    /** @type {ReturnType<typeof createInitialRaceData>} */
    raceData: createInitialRaceData(),
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


        console.log("Store Action: Initial state applied.");
        // console.log("Initial DriverList:", state.raceData.DriverList); // Debug
  }

  /**
   * Applies a partial update payload to the raceData state.
   * @param {string} fieldName - The top-level field in RaceData (e.g., "TimingData", "WeatherData")
   * @param {any} payload - The update data for that field
   */
  function applyFeedUpdate(fieldName, payload) {
    // console.debug(`Store Action: Applying update for ${fieldName}`, payload); // Debug

    // ***** START: DETAILED MERGE LOGIC (FROM PREVIOUS ANSWER) *****
    // This section NEEDS the full switch statement and helper functions
    // (deepMerge, applyMapUpdatesToSlice, specific mergers) to handle
    // all the different data types and nested structures correctly.
    // Without this, updates WILL NOT WORK properly.

    // Example Snippet (Needs full implementation for all cases):
    const target = state.raceData; // Target the main data object

    switch (fieldName) {
        case "Heartbeat":
            target.Heartbeat.Utc = payload.Utc;
            break;

        case "ExtrapolatedClock":
            deepMergeObjects(target.ExtrapolatedClock, payload);
            break;

        case "WeatherData":
            deepMergeObjects(target.WeatherData, payload);
            break;

        case "TrackStatus":
            deepMergeObjects(target.TrackStatus, payload);
            break;

        case "SessionInfo":
            deepMergeObjects(target.SessionInfo, payload);
            break;

        case "CarData.z":
            target.CarDataZ = payload;
            break;
        case "Position.z":
            target.PositionZ = payload;
            break;

        case "DriverList":
            deepMergeObjects(target.DriverList, payload);
            break;

        case "TimingStats":
            if (payload.Lines) {
                if (!target.TimingStats.Lines) target.TimingStats.Lines = {};
                for (const driverNumber in payload.Lines) {
                    const driverUpdate = payload.Lines[driverNumber];
                    if (!target.TimingStats.Lines[driverNumber]) {
                            target.TimingStats.Lines[driverNumber] = {}; // Create if new
                    }
                    deepMergeObjects(target.TimingStats.Lines[driverNumber], driverUpdate);
                }
            }
            break;

        case "TimingAppData":
            if (payload.Lines) {
                if (!target.TimingAppData.Lines) target.TimingAppData.Lines = {};
                for (const driverNumber in payload.Lines) {
                    const driverUpdate = payload.Lines[driverNumber];
                    if (!target.TimingAppData.Lines[driverNumber]) {
                            target.TimingAppData.Lines[driverNumber] = {}; // Create if new
                    }
                    deepMergeObjects(target.TimingAppData.Lines[driverNumber], driverUpdate);
                }
            }
            break;
            
        case "TimingData":
            if (payload.Lines) {
                if (!target.TimingData.Lines) target.TimingData.Lines = {};
                for (const driverNumber in payload.Lines) {
                    const driverUpdate = payload.Lines[driverNumber];
                    if (!target.TimingData.Lines[driverNumber]) {
                            target.TimingData.Lines[driverNumber] = {}; // Create if new
                    }
                    deepMergeObjects(target.TimingData.Lines[driverNumber], driverUpdate);
                }
            }
            break;
        
        case "TyreStintSeries": // Add TyreStintSeries (map of driver -> array of stints)
            if (target.TyreStintSeries && target.TyreStintSeries.Stints) {
                for (const [driver, stintUpdate] of Object.entries(payload.Stints)) {
                    if (!target.TyreStintSeries.Stints[driver]) {
                            target.TyreStintSeries.Stints[driver] = []; // Create if new
                    }
                    const targetStints = target.TyreStintSeries.Stints[driver];
                    // Basically these come in keyed to index in array, so we can iterate over all values 
                    // expecting them to parse to ints and checking against the array we have
                    // If present, merge, if abscent add to array
                    applyUpdatesByMappedIndex(stintUpdate, targetStints);
                }
            }

        case "TopThree":
            // Lines in our update payload seems to be an array with ALL data for the driver
            // Lets try deep merge to see if basic array replace works
            deepMergeObjects(target.TopThree, payload)
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

        case "SessionData":
            // Also seems to send full arrays on any update
            // Try deep merge to see if array replaces work consistently
            deepMergeObjects(target.SessionData, payload);
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

        default:
            console.warn(`Store Action: Unhandled field name in applyFeedUpdate: ${fieldName}`);
    }
  }

  function applyUpdatesByMappedIndex(fullUpdate, array) {
    for (const [index, update] of Object.entries(fullUpdate)) {
        let parsedIndex = parseInt(index);
        if (isNaN(parsedIndex)) {
            console.warn("update index was not parseable??? Recieved " + index);
            return;
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
    
        if (typeof existing !== 'object' || existing === null) {
            console.warn(`Cannot update fields of non-object/non-array element at index ${parsedIndex}. Element type: ${typeof existing}`);
            return; 
        }
    
        // Directly assign updated fields
        for (const [fieldName, newValue] of Object.entries(update)) {
            if (Array.isArray(existing[fieldName])) {
                // Nested array, try recursive handling
                for (const [nestedIndex, nestedUpdate] of Object.entries(newValue)) {
                    applyUpdatesByMappedIndex(nestedIndex, nestedUpdate, existing[fieldName]);
                }
            } else {
                existing[fieldName] = newValue;
            }
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
                deepMergeObjects(targetValue, sourceValue); // Recurse on objects

            // TargetValue is an Array and sourceValue is an Object. Use applyUpdatesByMappedIndex.
            // This handles updates like {"Sectors": {"2": {...}}} where Sectors is an array.
            } else if (Array.isArray(targetValue) && typeof sourceValue === 'object' && sourceValue !== null && !Array.isArray(sourceValue)) {
                 applyUpdatesByMappedIndex(sourceValue, targetValue);
            } else {
                // Handles primative replacements
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
    setConnected, 
    setInitialState,
    applyFeedUpdate, 
    setLastRawMessage, 
    initialize,
    terminate,
  };
});