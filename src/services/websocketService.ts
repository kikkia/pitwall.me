import { useF1Store } from '@/stores/f1Store';
import type { RaceData } from '@/types/dataTypes'; 

type DirectFeedUpdateMessage = [keyof RaceData, Partial<RaceData[keyof RaceData]>];

interface WrappedStreamMessageEntry {
  H: "Streaming";
  M: "feed";
  A: [keyof RaceData, any, string?]; 
}

interface WrappedFeedMessage {
  C?: string;
  M?: WrappedStreamMessageEntry[];
  R?: Partial<RaceData>;
  E?: any;
}

type ParsedWebSocketData = Partial<RaceData> | DirectFeedUpdateMessage | WrappedFeedMessage | string | { [key: string]: any };


const WS_URL = import.meta.env.VITE_WS_PROXY_URL || 'ws://localhost:8080/ws';
let websocket: WebSocket | null = null;
let connectionAttemptTimer: number | null = null; 
const RECONNECT_DELAY = 5000;

function getStore() {
  try {
    return useF1Store();
  } catch (error) {
    console.error("Pinia store not available yet. Ensure Pinia is initialized before the service connects.", error);
    throw new Error("Pinia store not ready for WebSocket service.");
  }
}

export function connect(): void {
  if (websocket && (websocket.readyState === WebSocket.OPEN || websocket.readyState === WebSocket.CONNECTING)) {
    console.log(`Service: WebSocket already ${websocket.readyState === WebSocket.OPEN ? 'connected' : 'connecting'}.`);
    if (connectionAttemptTimer !== null) {
      clearTimeout(connectionAttemptTimer);
      connectionAttemptTimer = null;
    }
    return;
  }

  console.log(`Service: Connecting WebSocket to proxy: ${WS_URL}`);
  websocket = new WebSocket(WS_URL);
  let store = getStore(); 

  websocket.onopen = () => {
    console.log('Service: WebSocket connection established.');
    if (connectionAttemptTimer !== null) {
      clearTimeout(connectionAttemptTimer);
      connectionAttemptTimer = null;
    }

    try {
      store.setConnected(true);
    } catch (error) {
      console.error("Error accessing store on WebSocket open (should not happen if initial getStore succeeded):", error);
      disconnect(); 
    }
    // Note: No initial message sent here, we wait for the server to send the state
  };

  websocket.onmessage = (event: MessageEvent) => {
    try {
      // Re-fetch store in case of HMR or other scenarios where instance might change,
      // though typically it shouldn't for a standard session.
      store = getStore();
      const parsedData: ParsedWebSocketData = JSON.parse(event.data as string);

      if (typeof parsedData === 'object' && parsedData !== null && 'R' in parsedData && typeof parsedData.R === 'object') {
        console.log("Service: Detected initial state message (R object).");
        store.setInitialState(parsedData.R as Partial<RaceData>);
      }
      else if (typeof parsedData === 'object' && parsedData !== null && 'M' in parsedData && Array.isArray(parsedData.M)) {
        console.log("Service: Detected wrapped feed message (M array).");
        (parsedData.M as WrappedStreamMessageEntry[]).forEach((entry) => {
          if (
            entry &&
            entry.H === "Streaming" &&
            entry.M === "feed" &&
            Array.isArray(entry.A) &&
            entry.A.length >= 2 &&
            typeof entry.A[0] === 'string' 
          ) {
            const fieldName = entry.A[0] as keyof RaceData;
            const payload = entry.A[1];
            store.applyFeedUpdate(fieldName, payload);
          } else {
            console.warn("Service: Unrecognized entry in wrapped feed message:", entry);
          }
        });
      }
      else if (
        Array.isArray(parsedData) &&
        parsedData.length >= 2 &&
        typeof parsedData[0] === 'string' &&
        Object.keys(store.raceData).includes(parsedData[0])
      ) {
        console.log(`Service: Detected direct update message for field: ${parsedData[0]}`);
        const [fieldName, payload] = parsedData as DirectFeedUpdateMessage;
        store.applyFeedUpdate(fieldName, payload);
      }
      else {
        console.warn('Service: Received unknown WebSocket message format:', parsedData);
      }

    } catch (e) {
      console.error("Service: Failed to process WebSocket message:", e, event.data);
      try {
        store = getStore(); 
      } catch(storeError) {
        console.error("Could not update store with parse error message.", storeError);
      }
    }
  };

  websocket.onerror = (event: Event) => { 
    console.error('Service: WebSocket error:', event);
  };

  websocket.onclose = (event: CloseEvent) => {
    console.log(`Service: WebSocket disconnected - Code: ${event.code}, Reason: "${event.reason}"`);
    try {
      store = getStore();
      store.setConnected(false);
    } catch (error) {
      console.error("Error getting store instance on WebSocket close:", error);
    }
    websocket = null;

    if (event.code !== 1000 && !connectionAttemptTimer) {
      console.log(`Service: Attempting to reconnect in ${RECONNECT_DELAY / 1000} seconds...`);
      connectionAttemptTimer = window.setTimeout(() => {
        connectionAttemptTimer = null;
        connect();
      }, RECONNECT_DELAY);
    }
  };
}

export function disconnect(): void {
  if (connectionAttemptTimer !== null) {
    clearTimeout(connectionAttemptTimer);
    connectionAttemptTimer = null;
  }
  if (websocket) {
    console.log("Service: Closing WebSocket connection manually.");
    try {
      const store = getStore();
      store.setConnected(false);
    } catch(error) {
      console.error("Error getting store instance on manual disconnect:", error);
    }
    websocket.close(1000, "Client disconnected");
    websocket = null;
  } else {
    console.log("Service: No active WebSocket connection to disconnect.");
  }
}