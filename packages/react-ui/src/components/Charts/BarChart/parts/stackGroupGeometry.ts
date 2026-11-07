/** One segment of a stacked bar slot, in data units. */
export interface StackSegment {
  key: string;
  /** Lower and upper ends, y0 <= y1. */
  y0: number;
  y1: number;
  /** Whether the segment sits below zero. */
  isNegative: boolean;
  /** The outermost segment of its sign: the only one that rounds its corners. */
  isOutermost: boolean;
}

/**
 * The segments of one stacked slot in one row, stacked the way
 * `variant: "stacked"` stacks every series (`stackOffsetDivergingZeroPreserving`):
 * positive values stack up from zero, negative values stack down, and a zero
 * rides the positive running total. Zero-height segments are dropped, so they
 * never claim the rounded corners.
 */
export function stackSegments(
  row: Record<string, string | number>,
  keys: string[],
): StackSegment[] {
  let positive = 0;
  let negative = 0;
  const segments: StackSegment[] = [];
  for (const key of keys) {
    const value = Number(row[key]) || 0;
    if (value > 0) {
      segments.push({
        key,
        y0: positive,
        y1: positive + value,
        isNegative: false,
        isOutermost: false,
      });
      positive += value;
    } else if (value < 0) {
      segments.push({
        key,
        y0: negative + value,
        y1: negative,
        isNegative: true,
        isOutermost: false,
      });
      negative += value;
    }
  }
  const lastPositive = segments.map((s) => !s.isNegative).lastIndexOf(true);
  const lastNegative = segments.map((s) => s.isNegative).lastIndexOf(true);
  if (lastPositive >= 0) segments[lastPositive]!.isOutermost = true;
  if (lastNegative >= 0) segments[lastNegative]!.isOutermost = true;
  return segments;
}
