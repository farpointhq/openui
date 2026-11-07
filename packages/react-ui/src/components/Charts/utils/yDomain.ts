import type { ChartData } from "../types";

/**
 * How stacked series combine — the values mirror Recharts' `stackOffset`:
 * - `"sign"`: positive values stack up from zero, negative values stack down
 *   (bars — Recharts bar charts use `stackOffset="sign"`).
 * - `"none"`: one running total per row; a negative value lowers it (areas —
 *   Recharts area charts use the default `stackOffset`).
 */
export type StackOffset = "sign" | "none";

/**
 * Per-series stack ids for a grouped bar chart: series that share an id stack
 * into one bar, and a series without one stands alone beside them. For
 * `{ android: "mobile", ios: "mobile" }`, `desktop` gets its own bar and
 * `android` + `ios` share a stacked one.
 */
export type StackGroups = Readonly<Partial<Record<string, string>>>;

/** One bar slot in a category: a lone series, or the series of one stack. */
export interface StackSlot {
  id: string;
  keys: string[];
}

/**
 * The bar slots of a grouped chart, in the order their first series appears
 * in `dataKeys`. Without stack groups every series is its own slot, which is
 * the plain grouped chart.
 */
export const stackSlots = (dataKeys: string[], stackGroups?: StackGroups): StackSlot[] => {
  const slots: StackSlot[] = [];
  const byId = new Map<string, StackSlot>();
  for (const key of dataKeys) {
    const group = stackGroups?.[key];
    // A lone series is keyed by itself; the prefix keeps a stack id that
    // happens to equal a series key from merging the two.
    const id = group ? `stack:${group}` : `series:${key}`;
    const existing = byId.get(id);
    if (existing) {
      existing.keys.push(key);
    } else {
      const slot = { id, keys: [key] };
      byId.set(id, slot);
      slots.push(slot);
    }
  }
  return slots;
};

const hasStackGroups = (dataKeys: string[], stackGroups?: StackGroups): boolean =>
  stackSlots(dataKeys, stackGroups).some((slot) => slot.keys.length > 1);

/**
 * The y domain for cartesian value charts, always anchored through zero.
 *
 * Non-stacked: `[min(0, dataMin), max(0, dataMax)]`. Stacked with `"sign"`:
 * per-row positive values stack up from zero and negative values stack down —
 * the offset `useStackedData` applies — so the extent is
 * `[min(0, lowest negative sum), max(0, highest positive sum)]`. Stacked with
 * `"none"`: the extent covers every intermediate running total of each row.
 * All-non-negative data yields `[0, max]` either way.
 *
 * Single source of truth for BOTH `useYScale` (the rendered scale) and
 * `useYAxisWidth` (tick-label measurement): the measured ticks are exactly the
 * rendered ones by construction, including stacked totals — the old width hook
 * measured per-value maxima and clipped stacked top ticks.
 */
export const computeYDomain = (
  data: ChartData,
  dataKeys: string[],
  stacked: boolean,
  stackOffset: StackOffset = "sign",
  stackGroups?: StackGroups,
): [number, number] => {
  let min = 0;
  let max = 0;

  // Grouped bars with stack groups: each slot is its own sign-offset stack,
  // and the extent is the tallest and deepest slot across all rows.
  if (!stacked && hasStackGroups(dataKeys, stackGroups)) {
    const slots = stackSlots(dataKeys, stackGroups);
    for (const row of data) {
      for (const slot of slots) {
        const [slotMin, slotMax] = computeYDomain([row], slot.keys, true, "sign");
        if (slotMax > max) max = slotMax;
        if (slotMin < min) min = slotMin;
      }
    }
    return [min, max];
  }

  for (const row of data) {
    if (stacked && stackOffset === "none") {
      let total = 0;
      for (const key of dataKeys) {
        total += Number(row[key]) || 0;
        if (total > max) max = total;
        if (total < min) min = total;
      }
    } else if (stacked) {
      let positiveSum = 0;
      let negativeSum = 0;
      for (const key of dataKeys) {
        const value = Number(row[key]) || 0;
        if (value >= 0) positiveSum += value;
        else negativeSum += value;
      }
      if (positiveSum > max) max = positiveSum;
      if (negativeSum < min) min = negativeSum;
    } else {
      for (const key of dataKeys) {
        const value = Number(row[key]) || 0;
        if (value > max) max = value;
        if (value < min) min = value;
      }
    }
  }

  return [min, max];
};
