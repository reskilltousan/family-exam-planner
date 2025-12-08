import { detectConflicts } from "./conflict";

const baseDate = new Date("2024-01-01T09:00:00Z");
const at = (startHour: number, endHour: number) => ({
  startAt: new Date(baseDate.getTime() + startHour * 60 * 60 * 1000),
  endAt: new Date(baseDate.getTime() + endHour * 60 * 60 * 1000),
});

describe("detectConflicts", () => {
  it("detects overlapping must events per participant", () => {
    const events = [
      { id: "e1", importance: "must", participants: [{ memberId: "m1" }], ...at(9, 11) },
      { id: "e2", importance: "must", participants: [{ memberId: "m1" }], ...at(10, 12) },
      { id: "e3", importance: "must", participants: [{ memberId: "m2" }], ...at(10, 12) },
    ] as any;

    const conflicts = detectConflicts(events);
    expect(conflicts.has("e1")).toBe(true);
    expect(conflicts.has("e2")).toBe(true);
    expect(conflicts.has("e3")).toBe(false);
  });

  it("ignores non-must events", () => {
    const events = [
      { id: "e1", importance: "should", participants: [{ memberId: "m1" }], ...at(9, 11) },
      { id: "e2", importance: "optional", participants: [{ memberId: "m1" }], ...at(10, 12) },
    ] as any;
    const conflicts = detectConflicts(events);
    expect(conflicts.size).toBe(0);
  });
});
