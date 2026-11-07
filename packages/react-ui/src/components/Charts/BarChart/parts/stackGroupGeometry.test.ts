import { describe, expect, it } from "vitest";
import { stackSegments } from "./stackGroupGeometry";

describe("stackSegments (one stacked slot of a grouped bar chart)", () => {
  it("stacks positive values up from zero, in key order", () => {
    expect(stackSegments({ android: 86, ios: 360 }, ["android", "ios"])).toEqual([
      { key: "android", y0: 0, y1: 86, isNegative: false, isOutermost: false },
      { key: "ios", y0: 86, y1: 446, isNegative: false, isOutermost: true },
    ]);
  });

  it("stacks negative values down from zero and rounds the outermost of each sign", () => {
    const s = stackSegments({ a: 10, b: -4, c: 5, d: -6 }, ["a", "b", "c", "d"]);
    expect(s.map((x) => [x.key, x.y0, x.y1, x.isOutermost])).toEqual([
      ["a", 0, 10, false],
      ["b", -4, 0, false],
      ["c", 10, 15, true],
      ["d", -10, -4, true],
    ]);
  });

  it("drops zero and missing values, so they never take the rounded top", () => {
    const s = stackSegments({ a: 5, b: 0 }, ["a", "b", "c"]);
    expect(s).toEqual([{ key: "a", y0: 0, y1: 5, isNegative: false, isOutermost: true }]);
  });

  it("treats numeric strings as numbers and an empty slot as no segments", () => {
    expect(stackSegments({ a: "3", b: "2" }, ["a", "b"]).map((x) => x.y1)).toEqual([3, 5]);
    expect(stackSegments({ a: 0 }, ["a"])).toEqual([]);
  });
});
