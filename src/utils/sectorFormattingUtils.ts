import { MiniSectorStatus } from "@/types/dataTypes";

export function getMinisectorClass(segmentStatus: number | undefined): string {
  switch (segmentStatus) {
    case MiniSectorStatus.Set: return 'minisector-set';
    case MiniSectorStatus.Unset: return 'minisector-stopped';
    case MiniSectorStatus.PersonalBest: return 'minisector-pb';
    case MiniSectorStatus.OverallFastest: return 'minisector-ob';
    case MiniSectorStatus.InPits: return 'minisector-pit';
    default: return 'minisector-unknown';
  }
}

// Gets class for the LAST sector/lap time span
export function getLastTimeClass(timeData: any | null | undefined): string {
  if (!timeData) return '';
  if (timeData.OverallFastest) return 'sector-overall-best';
  if (timeData.PersonalFastest) return 'sector-personal-best';
  return '';
}

// Gets class for the BEST sector/lap time span
export function getBestTimeClass(timeData: any | null | undefined): string {
  // Best time only gets purple highlight if it's overall best
  if (!timeData) return '';
  if (timeData.Position == 1) return 'sector-overall-best';
  return '';
}