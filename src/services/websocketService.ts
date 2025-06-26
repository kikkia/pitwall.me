import { useF1Store } from '@/stores/f1Store';
import { useSettingsStore } from '@/stores/settingsStore';
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


const WS_URL = import.meta.env.VITE_WS_PROXY_URL;
let websocket: WebSocket | null = null;
let connectionAttemptTimer: number | null = null; 
const RECONNECT_DELAY = 5000;

const PROCESSING_INTERVAL_MS = 100;

interface QueuedMessage {
  timestamp: number;
  data: ParsedWebSocketData;
}

let messageQueue: QueuedMessage[] = [];
let processingInterval: number | null = null;

function getStore() {
  try {
    return useF1Store();
  } catch (error) {
    console.error("Pinia store not available yet. Ensure Pinia is initialized before the service connects.", error);
    throw new Error("Pinia store not ready for WebSocket service.");
  }
}

function applyParsedData(parsedData: ParsedWebSocketData, store: ReturnType<typeof useF1Store>): void {
  if (typeof parsedData === 'object' && parsedData !== null && 'R' in parsedData && typeof parsedData.R === 'object') {
    console.log("Service: Detected initial state message (R object).");
    store.setInitialState(parsedData.R as Partial<RaceData>);
  }
  else if (typeof parsedData === 'object' && parsedData !== null && 'M' in parsedData && Array.isArray(parsedData.M)) {
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
}

function processMessageQueue(): void {
  const f1Store = getStore();
  const settingsStore = useSettingsStore();
  const now = Date.now();
  const messageDelayMs = settingsStore.websocketDelay * 1000;

  while (messageQueue.length > 0 && now - messageQueue[0].timestamp >= messageDelayMs) {
    const message = messageQueue.shift();
    if (message) {
      try {
        applyParsedData(message.data, f1Store);
      } catch (e) {
        console.error("Service: Failed to process queued WebSocket message:", e, message.data);
      }
    }
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

    if (processingInterval === null) {
      processingInterval = window.setInterval(processMessageQueue, PROCESSING_INTERVAL_MS);
      console.log(`Service: Started message processing interval (every ${PROCESSING_INTERVAL_MS}ms).`);
    }
  };

  websocket.onmessage = (event: MessageEvent) => {
    try {
      const parsedData: ParsedWebSocketData = JSON.parse(event.data as string);
      messageQueue.push({ timestamp: Date.now(), data: parsedData });
    } catch (e) {
      console.error("Service: Failed to parse WebSocket message:", e, event.data);
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

    if (processingInterval !== null) {
      clearInterval(processingInterval);
      processingInterval = null;
      console.log("Service: Cleared message processing interval.");
    }

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

  if (processingInterval !== null) {
    clearInterval(processingInterval);
    processingInterval = null;
    console.log("Service: Cleared message processing interval on manual disconnect.");
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