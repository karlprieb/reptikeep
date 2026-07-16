import type { CareSchedule } from "@/state/care-schedule";
import { scheduleDaysOverdue, scheduleIntervalDays } from "@/utils/schedule";

const NOW = new Date(2026, 6, 20);

describe("scheduleIntervalDays", () => {
  it.each([
    ["daily", 1],
    ["everyOtherDay", 2],
    ["weekly", 7],
    ["everyTwoWeeks", 14],
    ["monthly", 30],
  ] as const)("maps %s to %i calendar days", (frequency, days) => {
    expect(scheduleIntervalDays({ frequency })).toBe(days);
  });

  it("accepts positive whole custom intervals only", () => {
    expect(scheduleIntervalDays({ frequency: "custom", days: 9 })).toBe(9);
    expect(scheduleIntervalDays({ frequency: "custom", days: 0 })).toBeNull();
    expect(scheduleIntervalDays({ frequency: "custom", days: 1.5 })).toBeNull();
  });
});

describe("scheduleDaysOverdue", () => {
  const weekly: CareSchedule = { frequency: "weekly" };

  it("becomes one day overdue after the due date", () => {
    expect(scheduleDaysOverdue("2026-07-13", weekly, NOW)).toBeNull();
    expect(scheduleDaysOverdue("2026-07-12", weekly, NOW)).toBe(1);
  });

  it("returns the elapsed days beyond a custom interval", () => {
    expect(
      scheduleDaysOverdue("2026-07-05", { frequency: "custom", days: 10 }, NOW),
    ).toBe(5);
  });

  it("makes no overdue claim without both a schedule and a record", () => {
    expect(scheduleDaysOverdue(undefined, weekly, NOW)).toBeNull();
    expect(scheduleDaysOverdue("2026-07-01", undefined, NOW)).toBeNull();
  });

  it("makes no overdue claim for invalid or future dates", () => {
    expect(scheduleDaysOverdue("not-a-date", weekly, NOW)).toBeNull();
    expect(scheduleDaysOverdue("2030-01-01", weekly, NOW)).toBeNull();
  });
});
