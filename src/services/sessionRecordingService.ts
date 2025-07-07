import { useSessionRecordingStore } from '@/stores/sessionRecordingStore';
import type { RecordingsIndex, SessionRecordingGroup, SessionRecording } from '@/stores/sessionRecordingStore';

const API_URL = import.meta.env.VITE_API_URL;

function transformRecordings(recordingsIndex: RecordingsIndex): SessionRecordingGroup[] {
    return Object.entries(recordingsIndex).map(([eventName, paths]) => {
        const transformedEventName = eventName
            .replace('recordings/', '')
            .replace(/_/g, ' ');

        const recordings: SessionRecording[] = paths.map(path => {
            const fileName = path.split('/').pop()?.replace('.txt', '') || '';
            return {
                name: fileName.replace(/_/g, ' '),
                path: path,
                eventName: transformedEventName
            };
        });

        return {
            eventName: transformedEventName,
            recordings: recordings
        };
    });
}

export async function fetchRecordings(): Promise<void> {
  const store = useSessionRecordingStore();
  store.setLoading(true);
  store.setError(null);

  try {
    const response = await fetch(`${API_URL}/recordings`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: RecordingsIndex = await response.json();
    const recordingGroups = transformRecordings(data);
    store.setRecordingGroups(recordingGroups);
  } catch (error: any) {
    store.setError(error.message || 'Failed to fetch recordings');
  } finally {
    store.setLoading(false);
  }
}


export async function downloadAndDecompressRecording(recording: SessionRecording): Promise<string> {
  const response = await fetch(`${API_URL}/${recording.path}`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.text();
}