export function getMinisectorClass(segmentStatus: number | undefined): string {
  switch (segmentStatus) {
    case 2048: return 'minisector-set'; 
    case 0: return 'minisector-stopped'; 
    case 2049: return 'minisector-pb'; 
    case 2051: return 'minisector-ob';
    case 2064: return 'minisector-pit';
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