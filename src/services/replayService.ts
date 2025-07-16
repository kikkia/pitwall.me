import { useF1Store } from '@/stores/f1Store';
import { useSettingsStore } from '@/stores/settingsStore';
import type { RaceData } from '@/types/dataTypes';
import { ref } from 'vue';

interface RecordedMessage {
  timestamp: Date;
  payload: any;
}

export const isReplaying = ref(false);
export const isPaused = ref(false);
let timeoutId: number | null = null;
let messages: RecordedMessage[] = [];
let currentIndex = 0;

function parseLog(content: string): RecordedMessage[] {
  const lines = content.split('\n');
  const parsedMessages: RecordedMessage[] = [];

  for (const line of lines) {
    const match = line.match(/^\[(.*?)\]\s*(\{.*\})$/);
    if (match) {
      try {
        const timestamp = new Date(match[1]);
        const payload = JSON.parse(match[2]);
        parsedMessages.push({ timestamp, payload });
      } catch (e) {
        console.warn('Skipping invalid log line:', line, e);
      }
    }
  }
  return parsedMessages;
}

function processMessage(message: RecordedMessage) {
    const f1Store = useF1Store();
    const payload = message.payload;

    if (payload.R && payload.R.ExtrapolatedClock && payload.R.ExtrapolatedClock.Utc) {
        const recordedUtc = new Date(payload.R.ExtrapolatedClock.Utc);
        const timeDiff = recordedUtc.getTime() - message.timestamp.getTime();
        payload.R.ExtrapolatedClock.Utc = new Date(Date.now() + timeDiff).toISOString();
    }

    if (payload.M) {
        for (const entry of payload.M) {
            if (entry.A && entry.A[0] === 'ExtrapolatedClock') {
                entry.A[1].Utc = new Date().toISOString();
                if (entry.A[2]) {
                    entry.A[2] = new Date().toISOString();
                }
            }
        }
    }

    if (payload.R) {
        f1Store.setInitialState(payload.R as Partial<RaceData>);
    } else if (payload.M) {
        for (const entry of payload.M) {
             if (entry.H === 'Streaming' && entry.M === 'feed' && entry.A) {
                f1Store.applyFeedUpdate(entry.A[0], entry.A[1]);
             }
        }
    }
}


function scheduleNextMessage() {
  if (!isReplaying.value || isPaused.value || currentIndex >= messages.length) {
    if (currentIndex >= messages.length) {
        stopReplay();
    }
    return;
  }

  const currentMessage = messages[currentIndex];
  processMessage(currentMessage);

  currentIndex++;

  if (currentIndex < messages.length) {
    const nextMessage = messages[currentIndex];
    const delay = nextMessage.timestamp.getTime() - currentMessage.timestamp.getTime();
    const settingsStore = useSettingsStore();
    const adjustedDelay = delay / settingsStore.replayTimeFactor;

    timeoutId = window.setTimeout(scheduleNextMessage, adjustedDelay);
  } else {
    stopReplay();
  }
}

export function startReplay(recordingContent: string) {
  if (isReplaying.value) {
    stopReplay();
  }

  messages = parseLog(recordingContent);
  if (messages.length === 0) {
    console.error('No valid messages found in recording to replay.');
    return;
  }

  isReplaying.value = true;
  isPaused.value = false;
  currentIndex = 0;
  
  scheduleNextMessage();
}

export function pauseReplay() {
  if (!isReplaying.value || isPaused.value) return;
  isPaused.value = true;
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
}

export function resumeReplay() {
  if (!isReplaying.value || !isPaused.value) return;
  isPaused.value = false;
  scheduleNextMessage();
}

export function stopReplay() {
  isReplaying.value = false;
  isPaused.value = false;
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
  console.log('Replay stopped.');
}

