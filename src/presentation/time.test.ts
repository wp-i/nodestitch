import { describe, expect, it } from "vitest";
import { formatNodeTime } from "./time";

describe("formatNodeTime", () => {
  it("shows only time for today and month/day for older nodes", () => {
    const now = new Date(2026, 7, 9, 18, 0).getTime();
    expect(formatNodeTime(new Date(2026, 7, 9, 8, 5).getTime(), now)).toBe("08:05");
    expect(formatNodeTime(new Date(2026, 7, 8, 8, 5).getTime(), now)).toBe("08/08 08:05");
  });
});
