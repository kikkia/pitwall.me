import type { DriverViewModel } from '@/types/dataTypes';

export function getTyreCompoundAbbrev(compound?: string | null): string {
  switch (compound) {
    case 'SOFT': return 'S';
    case 'MEDIUM': return 'M';
    case 'HARD': return 'H';
    case 'INTERMEDIATE': return 'I';
    case 'WET': return 'W';
    default: return '-';
  }
}

export function getTyreCompoundClass(compound?: string | null): string {
  switch (compound) {
    case 'SOFT': return 'tyre-soft';
    case 'MEDIUM': return 'tyre-medium';
    case 'HARD': return 'tyre-hard';
    case 'INTERMEDIATE': return 'tyre-intermediate';
    case 'WET': return 'tyre-wet';
    default: return 'tyre-unknown';
  }
}

export function getTyreAgeLabel(totalLaps?: number | null): string {
  if (typeof totalLaps !== 'number' || !Number.isFinite(totalLaps)) {
    return '-';
  }
  return `${totalLaps}`;
}

export function getDriverTyreInfo(driver: DriverViewModel | null) {
  const compound = driver?.currentStint?.compound;
  const totalLaps = driver?.currentStint?.totalLaps;

  return {
    abbrev: getTyreCompoundAbbrev(compound),
    className: getTyreCompoundClass(compound),
    ageLabel: getTyreAgeLabel(totalLaps),
  };
}
