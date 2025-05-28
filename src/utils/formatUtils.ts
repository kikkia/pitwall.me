
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
        millis += parseInt(parts[0], 10) * 60 * 60 * 1000; // Hours
        millis += parseInt(parts[1], 10) * 60 * 1000;    // Minutes
        millis += parseFloat(parts[2]) * 1000;           // Seconds
    } else if (parts.length === 2) { // MM:SS.ms
      millis += parseInt(parts[0], 10) * 60 * 1000; // Minutes
      millis += parseFloat(parts[1]) * 1000;        // Seconds
    } else if (parts.length === 1) { // SS.ms
      millis += parseFloat(parts[0]) * 1000;        // Seconds
    } else {
      return Infinity; // Invalid format
    }
  } catch (error) {
      console.warn(`Error parsing time string "${timeStr}":`, error);
      return Infinity;
  }

  return isNaN(millis) ? Infinity : Math.round(millis);
}