import { ref, watch, onUnmounted, type Ref } from 'vue';

type GapTrend = 'stable' | 'increasing' | 'decreasing';

function parseGapSeconds(gap: string | undefined | null): number | null {
  if (!gap || gap === '-' || gap.toUpperCase().includes('LAP')) {
    return null;
  }
  const parsed = parseFloat(gap.replace('+', '').replace('s', '').trim());
  return Number.isNaN(parsed) ? null : parsed;
}

function formatGapSeconds(value: number): string {
  return `+${value.toFixed(3)}`;
}

export function useAnimatedGap(source: Ref<string>) {
  const displayValue = ref('-');
  const trend = ref<GapTrend>('stable');
  let trendTimeout: ReturnType<typeof setTimeout> | null = null;

  const animateGapValue = (start: number, end: number) => {
    const duration = 450;
    let startTime: number | null = null;

    const tick = (currentTime: number) => {
      if (startTime === null) {
        startTime = currentTime;
      }

      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = start + (end - start) * eased;
      displayValue.value = formatGapSeconds(value);

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  };

  watch(source, (rawValue) => {
    const next = parseGapSeconds(rawValue);
    if (next === null) {
      displayValue.value = rawValue || '-';
      trend.value = 'stable';
      return;
    }

    const current = parseGapSeconds(displayValue.value);
    if (current === null) {
      displayValue.value = formatGapSeconds(next);
      trend.value = 'stable';
      return;
    }

    if (Math.abs(next - current) < 0.0005) {
      return;
    }

    trend.value = next > current ? 'increasing' : 'decreasing';
    animateGapValue(current, next);

    if (trendTimeout) {
      clearTimeout(trendTimeout);
    }
    trendTimeout = setTimeout(() => {
      trend.value = 'stable';
    }, 1800);
  }, { immediate: true });

  onUnmounted(() => {
    if (trendTimeout) {
      clearTimeout(trendTimeout);
      trendTimeout = null;
    }
  });

  return {
    displayValue,
    trend,
  };
}
