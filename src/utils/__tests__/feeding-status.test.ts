import i18n from "@/i18n";
import { feedingStatus } from "@/utils/feeding-status";

const t = i18n.getFixedT("en");

describe("feedingStatus", () => {
  it("reports never fed when there is no record", () => {
    const status = feedingStatus(t, undefined, undefined);

    expect(status.line).toBe("Never fed");
    expect(status.overdue).toBe(false);
    expect(status.icon).toBe("fork.knife");
  });

  it("reports a relative line when fed within the schedule", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-03-10T12:00:00.000Z"));

    const status = feedingStatus(t, "2026-03-08T12:00:00.000Z", {
      frequency: "weekly",
    });

    expect(status.line).toBe("2 days ago");
    expect(status.overdue).toBe(false);
    jest.useRealTimers();
  });

  it("reports overdue with the day count and feeding icon", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-03-10T12:00:00.000Z"));

    const status = feedingStatus(t, "2026-03-01T12:00:00.000Z", {
      frequency: "weekly",
    });

    expect(status.line).toBe("2 days overdue");
    expect(status.overdue).toBe(true);
    expect(status.icon).toBe("fork.knife");
    jest.useRealTimers();
  });
});
