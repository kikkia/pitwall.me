import he from 'he';

export function sanitize(str: string): string {
  if (typeof str !== 'string') {
    return '';
  }
  return he.encode(str);
}