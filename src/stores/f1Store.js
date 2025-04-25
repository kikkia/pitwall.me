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
        case "ExtrapolatedClock":
        case "WeatherData":
        case "TrackStatus":
        case "SessionInfo":
            // Simple assignment/merge for top-level objects that are fully replaced or simple
            if (target[fieldName] && typeof payload === 'object' && payload !== null) {
                // Could merge if partial updates are possible for these
                Object.assign(target[fieldName], payload);
            } else {
                target[fieldName] = payload; // Replace if null or different type
            }
            break;

        case "CarData.z":
            target.CarDataZ = payload; // Direct assignment for strings
            break;
        case "Position.z":
            target.PositionZ = payload; // Direct assignment for strings
            break;

        case "DriverList":
        case "TimingStats":
        case "TimingAppData":
        case "TimingData":
        case "TyreStintSeries": // Add TyreStintSeries (map of driver -> array of stints)
            // --- Complex Map/Nested Object/Array Updates ---
            // These require the detailed merging logic using helpers.
            // Example placeholder for TimingData:
            if (fieldName === "TimingData" && target.TimingData) {
                if (payload.Lines) {
                    if (!target.TimingData.Lines) target.TimingData.Lines = {};
                    for (const driverNumber in payload.Lines) {
                        const driverUpdate = payload.Lines[driverNumber];
                        if (!target.TimingData.Lines[driverNumber]) {
                              target.TimingData.Lines[driverNumber] = {}; // Create if new
                        }
                        // *** Call your detailed merge function for DriverTimingData ***
                        mergeDriverTimingData(target.TimingData.Lines[driverNumber], driverUpdate);
                        console.warn(`Placeholder: Need detailed merge for TimingData driver ${driverNumber}`);
                        Object.assign(target.TimingData.Lines[driverNumber], driverUpdate); // INSUFFICIENT
                    }
                }
                // Update other top-level fields in TimingData if present in payload
                if (payload.SessionPart !== undefined) target.TimingData.SessionPart = payload.SessionPart;
                if (payload.NoEntries !== undefined) target.TimingData.NoEntries = payload.NoEntries;
                // ... handle other fields like Withheld, CutOffTime etc.
            } else {
                // Implement similar logic for DriverList, TimingStats, TimingAppData, TyreStintSeries
                console.warn(`Placeholder: Need detailed merge for ${fieldName}`);
                // Basic merge - LIKELY WRONG for nested structures
                  if (target[fieldName] && payload.Lines) {
                    Object.assign(target[fieldName].Lines, payload.Lines);
                  }
            }
            break;

        case "TopThree": // Array update often uses map indices in payload
            if (target.TopThree && payload.Lines) {
                // *** Use applyMapUpdatesToSlice helper ***
                // applyMapUpdatesToSlice(target.TopThree.Lines, payload.Lines, () => ({}));
                console.warn("Placeholder: Need applyMapUpdatesToSlice for TopThree.Lines");
            }
            if (target.TopThree && payload.SessionPart !== undefined) target.TopThree.SessionPart = payload.SessionPart;
            if (target.TopThree && payload.Withheld !== undefined) target.TopThree.Withheld = payload.Withheld;
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
                  // Optional: Limit array size
                  // const MAX_MESSAGES = 100;
                  // if (target.RaceControlMessages.Messages.length > MAX_MESSAGES) {
                  //    target.RaceControlMessages.Messages = target.RaceControlMessages.Messages.slice(-MAX_MESSAGES);
                  // }
            }
            break;

        case "SessionData":
            if (target.SessionData) {
                if (payload.Series) {
                    // applyMapUpdatesToSlice(target.SessionData.Series, payload.Series, () => ({}));
                    console.warn("Placeholder: Need applyMapUpdatesToSlice for SessionData.Series");
                }
                if (payload.StatusSeries) {
                    // applyMapUpdatesToSlice(target.SessionData.StatusSeries, payload.StatusSeries, () => ({}));
                    console.warn("Placeholder: Need applyMapUpdatesToSlice for SessionData.StatusSeries");
                }
            }
            break;

        case "TeamRadio": // Append new captures
            if (target.TeamRadio && payload.Captures) {
                if (Array.isArray(payload.Captures)) {
                    target.TeamRadio.Captures.push(...payload.Captures);
                } else if (typeof payload.Captures === 'object') { // Map format {"index": capture}
                    Object.values(payload.Captures).forEach(cap => {
                        if (cap) target.TeamRadio.Captures.push(cap);
                    });
                }
                // Optional: Limit array size
            }
            break;

        default:
            console.warn(`Store Action: Unhandled field name in applyFeedUpdate: ${fieldName}`);
    }
    // ***** END: DETAILED MERGE LOGIC PLACEHOLDER *****

  }

  // --- Actions to Trigger Service ---
  function initialize() {
    console.log("Store Action: Initializing connection...");
    // No longer fetches driver list here
    f1WebSocketService.connect(); // Just connect the WebSocket
  }

  function terminate() {
    console.log("Store Action: Terminating connection...");
    f1WebSocketService.disconnect();
  }

  // === GETTERS ===
  // (Add computed properties here later if needed e.g., sorted timing list)

  return {
    // Use readonly for safer access from components
    state: readonly(state),
    // Expose specific actions needed by components/services
    setConnected, // Needed by service
    setInitialState, // Needed by service
    applyFeedUpdate, // Needed by service
    setLastRawMessage, // Needed by service
    // Actions for components
    initialize,
    terminate,
  };
});