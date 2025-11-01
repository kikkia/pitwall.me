import { useSessionRecordingStore } from '@/stores/sessionRecordingStore';
import type { RecordingsIndex, SessionRecordingGroup, SessionRecording } from '@/stores/sessionRecordingStore';

const API_URL = import.meta.env.VITE_API_URL;

function transformRecordings(recordingsIndex: RecordingsIndex): SessionRecordingGroup[] {
    const groups = Object.entries(recordingsIndex).map(([eventName, recordings]) => {
        const transformedEventName = eventName
            .replace('recordings/', '')
            .replace(/_/g, ' ');

        const processedRecordings = recordings
            .map(recording => ({
                ...recording,
                name: (recording.path.split('/').pop()?.replace('.txt', '') || '').replace(/_/g, ' ')
            }))
            .sort((a, b) => new Date(a.finishedAt).getTime() - new Date(b.finishedAt).getTime());

        return {
            eventName: transformedEventName,
            recordings: processedRecordings,
            countryFlagCode: recordings.length > 0 ? recordings[0].countryFlagCode : ''
        };
    });

    return groups.sort((a, b) => {
        const aDate = a.recordings.length > 0 ? new Date(a.recordings[0].finishedAt).getTime() : 0;
        const bDate = b.recordings.length > 0 ? new Date(b.recordings[0].finishedAt).getTime() : 0;
        return aDate - bDate;
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