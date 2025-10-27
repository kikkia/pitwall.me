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
export const isLoadingReplay = ref(false);
export const isSeeking = ref(false);
let timeoutId: number | null = null;
let messages: RecordedMessage[] = [];
let currentIndex = 0;
let initialReplayState: Partial<RaceData> | null = null;

export const replayProgress = ref({
  startTime: null as Date | null,
  endTime: null as Date | null,
  currentTime: null as Date | null
});

function parseLog(content: string): RecordedMessage[] {
  const lines = content.split('\n');
  const parsedMessages: RecordedMessage[] = [];

  for (const line of lines) {
    const match = line.match(/^\[(.*?)\]\s*(\{.*\}|\[.*\])$/);
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

    if (Array.isArray(payload)) {
        f1Store.applyFeedUpdate(payload[0], payload[1]);
    } else {
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
            const initialState = payload.R as Partial<RaceData>;
            if (!initialReplayState) {
                initialReplayState = JSON.parse(JSON.stringify(initialState));
            }
            f1Store.setInitialState(initialState);
        } else if (payload.M) {
            for (const entry of payload.M) {
                 if (entry.H === 'Streaming' && entry.M === 'feed' && entry.A) {
                    f1Store.applyFeedUpdate(entry.A[0], entry.A[1]);
                 }
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
  replayProgress.value.currentTime = currentMessage.timestamp;

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

export async function startReplay(recordingContent: string) {
  if (isReplaying.value) {
    stopReplay();
  }

  isLoadingReplay.value = true;

  await new Promise<void>((resolve) => {
    setTimeout(() => {
      messages = parseLog(recordingContent);
      resolve();
    }, 0);
  });

  if (messages.length === 0) {
    console.error('No valid messages found in recording to replay.');
    isLoadingReplay.value = false;
    return;
  }

  replayProgress.value = {
    startTime: messages[0]?.timestamp,
    endTime: messages[messages.length - 1]?.timestamp,
    currentTime: messages[0]?.timestamp
  };
  initialReplayState = null;

  isReplaying.value = true;
  isPaused.value = false;
  currentIndex = 0;

  isLoadingReplay.value = false;

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
  replayProgress.value = {
    startTime: null,
    endTime: null,
    currentTime: null
  };
  console.log('Replay stopped.');
}

export function seek(seekTime: Date) {
  if (!isReplaying.value || messages.length === 0) return;

  isSeeking.value = true;
  pauseReplay();

  setTimeout(() => {
    const f1Store = useF1Store();
    const seekTimestamp = seekTime.getTime();
    const currentTimestamp = messages[currentIndex]?.timestamp.getTime() || 0;

    let nextIndex = -1;

    if (seekTimestamp < currentTimestamp) {
      // Reset and seek from the beginning
      if(initialReplayState) {
        f1Store.setInitialState(JSON.parse(JSON.stringify(initialReplayState)));
      }
      nextIndex = messages.findIndex(m => m.timestamp.getTime() >= seekTimestamp);
      currentIndex = 0;
    } else {
      // Seek forward from the current position
      nextIndex = messages.findIndex((m, i) => i >= currentIndex && m.timestamp.getTime() >= seekTimestamp);
    }
    
    if (nextIndex === -1) {
      nextIndex = messages.length -1;
    }

    // Process messages without delay until the seek target
    while (currentIndex < nextIndex) {
      processMessage(messages[currentIndex]);
      replayProgress.value.currentTime = messages[currentIndex].timestamp;
      currentIndex++;
    }

    isSeeking.value = false;
    resumeReplay();
  }, 50);
}

