import { Event } from "@prisma/client";

type EventWithParticipants = Event & { participants?: { memberId: string }[] };

export function detectConflicts(events: EventWithParticipants[]) {
  const mustEvents = events.filter((e) => e.importance === "must");
  const conflicts = new Set<string>();

  // Group by participant to check overlap
  const byMember = new Map<string, EventWithParticipants[]>();
  for (const ev of mustEvents) {
    const participants = ev.participants ?? [];
    for (const p of participants) {
      if (!byMember.has(p.memberId)) byMember.set(p.memberId, []);
      byMember.get(p.memberId)!.push(ev);
    }
  }

  for (const [, list] of byMember) {
    list.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
    for (let i = 0; i < list.length - 1; i += 1) {
      const cur = list[i];
      const next = list[i + 1];
      if (cur.endAt > next.startAt) {
        conflicts.add(cur.id);
        conflicts.add(next.id);
      }
    }
  }

  return conflicts;
}
