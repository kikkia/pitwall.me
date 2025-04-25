// src/services/f1WebSocketService.js
import { useF1Store } from '@/stores/f1Store';

// Use environment variables for configuration if possible
const WS_URL = import.meta.env.VITE_WS_PROXY_URL || 'ws://localhost:8080/ws';
let websocket = null;
let connectionAttemptTimer = null; // To prevent rapid reconnect attempts
const RECONNECT_DELAY = 5000; // 5 seconds

// Helper to get store instance
function getStore() {
  // Ensure Pinia is initialized before calling this
  try {
      return useF1Store();
  } catch (error) {
      console.error("Pinia store not available yet. Ensure Pinia is initialized before the service connects.", error);
      // Return a dummy store or throw to prevent further errors, depending on desired behavior
      // Returning a dummy might mask initialization order issues.
      throw new Error("Pinia store not ready for WebSocket service.");
  }
}

export function connect() {
  if (websocket && (websocket.readyState === WebSocket.OPEN || websocket.readyState === WebSocket.CONNECTING)) {
    console.log(`Service: WebSocket already ${websocket.readyState === WebSocket.OPEN ? 'connected' : 'connecting'}.`);
    clearTimeout(connectionAttemptTimer); // Clear any pending reconnect timer
    connectionAttemptTimer = null;
    return;
  }

  console.log(`Service: Connecting WebSocket to proxy: ${WS_URL}`);
  websocket = new WebSocket(WS_URL);
  let store; // Declare store variable

  websocket.onopen = () => {
    console.log('Service: WebSocket connection established.');
    clearTimeout(connectionAttemptTimer); // Clear reconnect timer on successful connection
    connectionAttemptTimer = null;
    try {
        store = getStore(); // Get store instance *after* connection established
        store.setConnected(true); // Update store state
    } catch (error) {
        console.error("Error getting store instance on WebSocket open:", error);
        // Consider disconnecting if the store isn't ready
        disconnect();
    }
     // Note: No initial message sent here, we wait for the server to send the state
  };

  websocket.onmessage = (event) => {
    try {
      store = getStore(); // Get store instance for message handling
      const message = JSON.parse(event.data);
      // console.log('Service: Received message:', message); // Debug: Log raw message

      // --- Detect Initial State Message ---
      // Characterized by the top-level "R" object and possibly "I"
      if (message && typeof message === 'object' && message.R && typeof message.R === 'object') {
          console.log("Service: Detected initial state message.");
          store.setInitialState(message.R); // Pass the entire 'R' object
          store.setLastRawMessage(null); // Clear raw message debug after processing initial state
      }
      // --- Assume Update Message Format ---
      // Expecting ["FieldName", {payload}] based on Go ApplyFeedUpdate
      else if (Array.isArray(message) && message.length >= 2 && typeof message[0] === 'string') {
        // console.log(`Service: Detected update message for field: ${message[0]}`); // Debug
        const [fieldName, payload] = message;
        store.applyFeedUpdate(fieldName, payload); // Call store action
        store.setLastRawMessage(null); // Clear raw message debug after processing update
      }

      else if (message && typeof message === 'object' && message.M && Array.isArray(message.M)) {
        message.M.forEach((entry) => {
          if (
            entry &&
            entry.H === "Streaming" &&
            entry.M === "feed" &&
            Array.isArray(entry.A) &&
            entry.A.length >= 2
          ) {
            const [fieldName, payload] = entry.A;
            store.applyFeedUpdate(fieldName, payload);
          } else {
            console.warn("Service: Unrecognized entry in wrapped feed message:", entry);
          }
        });
        store.setLastRawMessage(null);
      }
      // --- Handle other formats if necessary (e.g., simple heartbeats) ---
      // else if (typeof message === 'string' && message === 'Heartbeat') { ... }
      else {
        console.warn('Service: Received unknown WebSocket message format:', message);
        store.setLastRawMessage(event.data); // Keep raw message for debugging unknown formats
      }

    } catch (e) {
      console.error("Service: Failed to process WebSocket message:", e, event.data);
      try {
          store = getStore();
          store.setLastRawMessage(`Error parsing: ${event.data}`); // Show error context
      } catch(storeError) {
          console.error("Could not update store with parse error message.", storeError);
      }
    }
  };

  websocket.onerror = (error) => {
    console.error('Service: WebSocket error:', error);
    // Don't try to update store here as connection is likely lost or failed
  };

  websocket.onclose = (event) => {
    console.log(`Service: WebSocket disconnected - Code: ${event.code}, Reason: "${event.reason}"`);
    if (websocket) { // Ensure we don't update store if disconnect was called manually already
         try {
             store = getStore();
             store.setConnected(false);
             // store.resetState(); // Optionally reset parts of the state on disconnect
         } catch (error) {
             console.error("Error getting store instance on WebSocket close:", error);
         }
    }
    websocket = null;

    // Simple automatic reconnection logic (optional)
    if (!connectionAttemptTimer) { // Prevent multiple timers
        console.log(`Service: Attempting to reconnect in ${RECONNECT_DELAY / 1000} seconds...`);
        connectionAttemptTimer = setTimeout(() => {
            connectionAttemptTimer = null; // Clear timer reference before attempting
            connect();
        }, RECONNECT_DELAY);
    }
  };
}

export function disconnect() {
  clearTimeout(connectionAttemptTimer); // Stop any pending reconnect attempts
  connectionAttemptTimer = null;
  if (websocket) {
    console.log("Service: Closing WebSocket connection manually.");
    // Update store state immediately *before* closing
    try {
        const store = getStore();
        store.setConnected(false);
    } catch(error) {
        console.error("Error getting store instance on manual disconnect:", error);
    }
    websocket.close(1000, "Client disconnected"); // Close gracefully
    websocket = null; // Nullify immediately after calling close
  } else {
      console.log("Service: No active WebSocket connection to disconnect.");
  }
}