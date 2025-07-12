
/**
 * Converts a time string (e.g., "1:32.228" or "23.567") to milliseconds.
 * Returns Infinity for invalid or unparsable strings.
 * @param timeStr The time string to convert.
 * @returns The time in milliseconds, or Infinity if not parsable.
 */
export function timeStringToMillis(timeStr: string | null | undefined): number {
  if (!timeStr || timeStr === '-' || timeStr.trim() === '') {
    return Infinity;
  }

  const parts = timeStr.split(':');
  let millis = 0;

  try {
    if (parts.length === 3) { // HH:MM:SS.ms
        millis += parseInt(parts[0], 10) * 60 * 60 * 1000; 
        millis += parseInt(parts[1], 10) * 60 * 1000;    
        millis += parseFloat(parts[2]) * 1000;          
    } else if (parts.length === 2) { // MM:SS.ms
      millis += parseInt(parts[0], 10) * 60 * 1000;
      millis += parseFloat(parts[1]) * 1000;      
    } else if (parts.length === 1) { // SS.ms
      millis += parseFloat(parts[0]) * 1000;      
    } else {
      return Infinity; // Invalid format
    }
  } catch (error) {
      console.warn(`Error parsing time string "${timeStr}":`, error);
      return Infinity;
  }

  return isNaN(millis) ? Infinity : Math.round(millis);
}

/**
 * Converts milliseconds to a formatted lap time string (MM:SS.ms or S.ms).
 * @param seconds The time in seconds.
 * @returns Formatted time string.
 */
export function formatLapTimeSeconds(seconds: number): string {
  return formatLapTime(seconds * 1000)
}

/**
 * Converts milliseconds to a formatted lap time string (MM:SS.ms or S.ms).
 * @param millis The time in milliseconds.
 * @returns Formatted time string.
 */
export function formatLapTime(millis: number | null | undefined): string {
  if (millis === null || millis === undefined || millis === Infinity) {
    return '-';
  }
  const totalSeconds = millis / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const ms = Math.round((totalSeconds - Math.floor(totalSeconds)) * 1000);

  const formattedMinutes = minutes > 0 ? `${minutes}:` : '';
  const formattedSeconds = minutes > 0 ? String(seconds).padStart(2, '0') : String(seconds);
  const formattedMs = String(ms).padStart(3, '0');

  return `${formattedMinutes}${formattedSeconds}.${formattedMs}`;
}

/**
 * Converts milliseconds to a formatted sector time string (S.ms).
 * @param millis The time in milliseconds.
 * @returns Formatted time string.
 */
export function formatSectorTime(millis: number | null | undefined): string {
  if (millis === null || millis === undefined || millis === Infinity) {
    return '-';
  }
  const totalSeconds = millis / 1000;
  const seconds = Math.floor(totalSeconds);
  const ms = Math.round((totalSeconds - seconds) * 1000);

  const formattedSeconds = String(seconds);
  const formattedMs = String(ms).padStart(3, '0');

  return `${formattedSeconds}.${formattedMs}`;
}

/**
 * Formats a time difference in milliseconds.
 * @param diffMillis The difference in milliseconds.
 * @returns Formatted diff string (e.g., "+1.234", "-0.500", "0.000").
 */
export function formatDiff(diffMillis: number | null | undefined): string {
  if (diffMillis === null || diffMillis === undefined || isNaN(diffMillis)) {
    return '-';
  }
  const sign = diffMillis >= 0 ? '+' : '-';
  const absMillis = Math.abs(diffMillis);
  const totalSeconds = absMillis / 1000;
  const seconds = Math.floor(totalSeconds);
  const ms = Math.round((totalSeconds - seconds) * 1000);

  const formattedSeconds = String(seconds);
  const formattedMs = String(ms).padStart(3, '0');

  return `${sign}${formattedSeconds}.${formattedMs}`;
}

/**
 * Converts milliseconds to a formatted live time string (MM:SS.d).
 * @param millis The time in milliseconds.
 * @returns Formatted time string with one decimal place.
 */
export function formatLiveTime(millis: number | null | undefined): string {
  if (millis === null || millis === undefined || millis === Infinity) {
    return '-';
  }
  const totalSeconds = millis / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const tenths = Math.floor((totalSeconds - Math.floor(totalSeconds)) * 10);

  const formattedMinutes = minutes > 0 ? `${minutes}:` : '';
  const formattedSeconds = minutes > 0 ? String(seconds).padStart(2, '0') : String(seconds);
  const formattedTenths = String(tenths);

  return `${formattedMinutes}${formattedSeconds}.${formattedTenths}`;
}