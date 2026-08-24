import i18n from "@/i18n";
import {
  DAYS_BEFORE_MONTHS,
  daysSince,
  formatAbsoluteDate,
  formatAbsoluteTime,
  fromCalendarDate,
  fromUtcMidnight,
  relativeYearsMonths,
  toCalendarDate,
} from "@/utils/format-date";

describe("formatAbsoluteDate", () => {
  it("formats an ISO date with the locale's punctuation", () => {
    expect(formatAbsoluteDate("2019-04-12")).toBe("Apr 12, 2019");
  });

  it("does not zero-pad the day", () => {
    expect(formatAbsoluteDate("2025-01-05T09:30:00.000Z")).toBe("Jan 5, 2025");
  });

  it("uses compact Portuguese month abbreviations", async () => {
    await i18n.changeLanguage("pt-BR");

    try {
      expect(formatAbsoluteDate("2026-08-01")).toBe("1 ago. 2026");
    } finally {
      await i18n.changeLanguage("en");
    }
  });

  it("labels an instant with its local calendar date, not its UTC one", () => {
    const lateEvening = new Date(2026, 6, 27, 23, 30).toISOString();
    const earlyMorning = new Date(2026, 6, 27, 0, 30).toISOString();

    expect(formatAbsoluteDate(lateEvening)).toBe("Jul 27, 2026");
    expect(formatAbsoluteDate(earlyMorning)).toBe("Jul 27, 2026");
  });

  it("returns a placeholder for an unparseable value", () => {
    expect(formatAbsoluteDate("not-a-date")).toBe("—");
  });

  it("returns a placeholder for an impossible calendar date", () => {
    expect(formatAbsoluteDate("2026-02-29")).toBe("—");
  });
});

describe("daysSince", () => {
  it("counts whole calendar days", () => {
    expect(daysSince("2026-07-14", new Date(2026, 6, 23))).toBe(9);
  });

  it("returns 0 for today", () => {
    expect(daysSince("2026-07-23", new Date(2026, 6, 23))).toBe(0);
  });

  it("ignores the time component so a same-day record reads as today", () => {
    expect(daysSince("2026-07-23T23:45:00.000Z", new Date(2026, 6, 23))).toBe(
      0,
    );
  });

  it("counts an instant from its local calendar date, not its UTC one", () => {
    const lateEvening = new Date(2026, 6, 27, 23, 30).toISOString();
    const earlyMorning = new Date(2026, 6, 27, 0, 30).toISOString();

    expect(daysSince(lateEvening, new Date(2026, 6, 27))).toBe(0);
    expect(daysSince(lateEvening, new Date(2026, 6, 29))).toBe(2);
    expect(daysSince(earlyMorning, new Date(2026, 6, 27))).toBe(0);
    expect(daysSince(earlyMorning, new Date(2026, 6, 29))).toBe(2);
  });

  it("counts across a month boundary", () => {
    expect(daysSince("2026-06-28", new Date(2026, 6, 3))).toBe(5);
  });

  it("clamps a future date to 0 rather than going negative", () => {
    expect(daysSince("2030-01-01", new Date(2026, 6, 23))).toBe(0);
  });

  it("returns null for an unparseable value", () => {
    expect(daysSince("not-a-date")).toBeNull();
  });

  it("always reports a non-zero month count above the cutoff", () => {
    for (let month = 0; month < 12; month += 1) {
      for (const day of [1, 15, 28, 31]) {
        const start = new Date(Date.UTC(2026, month, day));
        if (start.getUTCMonth() !== month) continue;

        const now = new Date(start);
        now.setUTCDate(now.getUTCDate() + DAYS_BEFORE_MONTHS);

        const iso = start.toISOString().slice(0, 10);
        const duration = relativeYearsMonths(
          iso,
          new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
        );

        expect(duration?.months).toBeGreaterThan(0);
      }
    }
  });
});

describe("relativeYearsMonths", () => {
  it("computes whole years and months", () => {
    expect(relativeYearsMonths("2019-04-12", new Date(2026, 6, 16))).toEqual({
      years: 7,
      months: 3,
    });
  });

  it("computes acquired-style durations", () => {
    expect(relativeYearsMonths("2020-02-01", new Date(2026, 6, 16))).toEqual({
      years: 6,
      months: 5,
    });
  });

  it("borrows a month when the day-of-month has not been reached", () => {
    expect(relativeYearsMonths("2019-04-20", new Date(2026, 6, 16))).toEqual({
      years: 7,
      months: 2,
    });
  });

  it("collapses same-month deltas to zero", () => {
    expect(relativeYearsMonths("2026-07-01", new Date(2026, 6, 16))).toEqual({
      years: 0,
      months: 0,
    });
  });

  it("returns months for under-a-year durations", () => {
    expect(relativeYearsMonths("2026-01-10", new Date(2026, 6, 16))).toEqual({
      years: 0,
      months: 6,
    });
  });

  it("handles the cross-year boundary without going negative", () => {
    expect(relativeYearsMonths("2025-12-15", new Date(2026, 0, 10))).toEqual({
      years: 0,
      months: 0,
    });
  });

  it("clamps a future date to zero rather than emit a negative duration", () => {
    expect(relativeYearsMonths("2030-01-01", new Date(2026, 6, 16))).toEqual({
      years: 0,
      months: 0,
    });
  });

  it("returns null for an unparseable value", () => {
    expect(relativeYearsMonths("not-a-date")).toBeNull();
  });
});

describe("formatAbsoluteTime", () => {
  it("reads a full instant as a clock time", () => {
    expect(formatAbsoluteTime("2026-07-21T15:38:00.000Z")).toMatch(
      /^\d{1,2}:\d{2}\s?(AM|PM)$/,
    );
  });

  it("returns null for a bare calendar date, which carries no time", () => {
    expect(formatAbsoluteTime("2026-07-21")).toBeNull();
  });

  it("returns null for an unparseable value", () => {
    expect(formatAbsoluteTime("not-a-date")).toBeNull();
  });

  it("returns null when the value is absent altogether", () => {
    expect(formatAbsoluteTime(undefined as unknown as string)).toBeNull();
  });
});

describe("calendar dates", () => {
  it("writes the local day, not the UTC one", () => {
    expect(toCalendarDate(new Date(2019, 3, 12))).toBe("2019-04-12");
  });

  it("writes the same day for a late-evening pick", () => {
    expect(toCalendarDate(new Date(2019, 3, 12, 23, 30))).toBe("2019-04-12");
  });

  it("zero-pads month and day", () => {
    expect(toCalendarDate(new Date(2019, 0, 5))).toBe("2019-01-05");
  });

  it("reads back to local midnight on the same day", () => {
    const parsed = fromCalendarDate("2019-04-12");

    expect(parsed?.getFullYear()).toBe(2019);
    expect(parsed?.getMonth()).toBe(3);
    expect(parsed?.getDate()).toBe(12);
    expect(parsed?.getHours()).toBe(0);
  });

  it("round-trips a picked day unchanged", () => {
    for (const day of [1, 15, 28]) {
      const picked = new Date(2019, 3, day);
      expect(fromCalendarDate(toCalendarDate(picked))).toEqual(picked);
    }
  });

  it("returns null for a value that is not a date", () => {
    expect(fromCalendarDate("not-a-date")).toBeNull();
  });

  it("returns null for an impossible calendar date", () => {
    expect(fromCalendarDate("2026-04-31")).toBeNull();
  });

  it("accepts February 29 in a leap year", () => {
    expect(fromCalendarDate("2024-02-29")?.getDate()).toBe(29);
  });
});

describe("fromUtcMidnight", () => {
  it("keeps the calendar day the Android picker reported", () => {
    for (const [month, day] of [
      [0, 1],
      [7, 24],
      [11, 31],
    ] as const) {
      const picked = new Date(Date.UTC(2026, month, day));

      expect(toCalendarDate(fromUtcMidnight(picked))).toBe(
        toCalendarDate(new Date(2026, month, day)),
      );
    }
  });

  it("returns local midnight so stored and displayed days agree", () => {
    const local = fromUtcMidnight(new Date(Date.UTC(2026, 7, 24)));

    expect(local.getFullYear()).toBe(2026);
    expect(local.getMonth()).toBe(7);
    expect(local.getDate()).toBe(24);
    expect(local.getHours()).toBe(0);
  });
});
