import type { CompletedLap, StintData } from '@/types/dataTypes';
import { timeStringToMillis, formatLapTime } from '@/utils/formatUtils';

export interface ChartMetric {
  id: string;
  label: string;
  valueGetter: (lap: CompletedLap, stintHistory: StintData[]) => number | null;
  formatter: (value: number) => string;
}

export interface ChartFilter {
  id: 'ignorePittedLaps' | 'slowLapThreshold' | 'selectedTyreCompounds';
  label: string;
  component: 'Checkbox' | 'Slider' | 'MultiSelect';
  defaultValue: any;
  props?: Record<string, any>;
  options?: { label: string, value: string }[];
  appliesTo: string[]; // Array of metric ids
}

export const metrics: ChartMetric[] = [
  {
    id: 'lapTime',
    label: 'Lap Time',
    valueGetter: (lap) => {
      if (!lap.LapTime) return null;
      return timeStringToMillis(lap.LapTime);
    },
    formatter: (value) => formatLapTime(value),
  },
  {
    id: 'position',
    label: 'Position',
    valueGetter: (lap) => {
        if (!lap.Position) return null;
        return parseInt(lap.Position, 10);
    },
    formatter: (value) => `P${value}`,
  },
  {
    id: 'tyreAge',
    label: 'Tyre Age',
    valueGetter: (lap, stintHistory) => {
        let targetLap = lap.Lap - 1
        if (stintHistory && stintHistory.length > 0) {
            for (let i = 0; i < stintHistory.length; i++) {
                let stint = stintHistory[i];
                let stintLength = stint.TotalLaps - stint.StartLaps
                if (stintLength > targetLap) {
                  return targetLap;
                } else {
                  targetLap -= stintLength
                }
            }
        }
        return lap.Lap; // Happens for new tires at start of race
    },
    formatter: (value) => `${value} Laps`,
  }
];

export const tyreCompounds = ['SOFT', 'MEDIUM', 'HARD', 'INTERMEDIATE', 'WET'];

export const filters: ChartFilter[] = [
    {
        id: 'ignorePittedLaps',
        label: 'Ignore Pitted Laps',
        component: 'Checkbox',
        defaultValue: true,
        appliesTo: ['lapTime', 'position', 'tyreAge'],
    },
    {
        id: 'slowLapThreshold',
        label: 'Ignore laps X% slower than fastest',
        component: 'Slider',
        defaultValue: 40,
        props: { min: 0, max: 100, step: 1 },
        appliesTo: ['lapTime'],
    },
    {
        id: 'selectedTyreCompounds',
        label: 'Filter by Tyre Compound',
        component: 'MultiSelect',
        defaultValue: [...tyreCompounds],
        options: tyreCompounds.map(c => ({ label: c.charAt(0) + c.slice(1).toLowerCase(), value: c })),
        props: {
            placeholder: "Select Compounds",
            optionLabel: 'label',
            optionValue: 'value'
        },
        appliesTo: ['lapTime', 'position', 'tyreAge'],
    }
];