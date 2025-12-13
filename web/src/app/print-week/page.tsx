"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Printer, Users } from "lucide-react";

type Member = { id: string; name: string; color: string };
type Event = {
  id: string;
  title: string;
  date: string;
  timeRange: string;
  location?: string;
  tag: string;
  tagColor: string;
  members?: string[]; // 参加メンバー
};
type Task = {
  id: string;
  title: string;
  due: string;
  status: string;
  assignee?: string; // メンバー名
};

const defaultMembers: Member[] = [
  { id: "c1", name: "子どもA", color: "bg-emerald-500" },
  { id: "c2", name: "子どもB", color: "bg-orange-500" },
  { id: "p1", name: "保護者A", color: "bg-blue-500" },
];

export default function PrintWeekPage() {
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [admissionEvents, setAdmissionEvents] = useState<Event[]>([]);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [weekOffset, setWeekOffset] = useState(0);
  const [members, setMembers] = useState<Member[]>(defaultMembers);
  const [selectedMembers, setSelectedMembers] = useState<string[]>(defaultMembers.map((m) => m.id));
  const weekDays = useMemo(() => buildWeekDays(todayIso(), weekOffset), [weekOffset]);

  // load from localStorage (mock data + admission-derived events)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const evRaw = window.localStorage.getItem("mockEvents");
      const taskRaw = window.localStorage.getItem("mockTasks");
      const memberRaw = window.localStorage.getItem("familyMembers");
      if (memberRaw) {
        const names = (JSON.parse(memberRaw) as string[]).filter(Boolean);
        if (names.length) {
          const palette = ["bg-blue-500", "bg-emerald-500", "bg-orange-500", "bg-indigo-500", "bg-amber-500"];
          const ms = names.map<Member>((name, idx) => ({ id: `m${idx + 1}`, name, color: palette[idx % palette.length] }));
          setMembers(ms);
          setSelectedMembers(ms.map((m) => m.id));
        }
      }
      if (evRaw) setEvents(JSON.parse(evRaw));
      if (taskRaw) setTasks(JSON.parse(taskRaw));

      const favRaw = window.localStorage.getItem("hsFavorites");
      const examRaw = window.localStorage.getItem("hsExamEntries");
      const admission: Event[] = [];
      if (favRaw && examRaw) {
        const favs = JSON.parse(favRaw) as Record<string, boolean>;
        const exams = JSON.parse(examRaw) as Record<string, any[]>;
        Object.entries(favs).forEach(([key, isFav]) => {
          if (!isFav) return;
          const entries = exams[key];
          if (!Array.isArray(entries)) return;
          const parts = key.split(":");
          const schoolName = parts[2] ?? "学校";
          entries.forEach((entry) => {
            const suffix = entry.kind ? ` (${entry.kind})` : "";
            const courseLabel = entry.course ? ` ${entry.course}` : "";
            const addEvent = (date: string | null, label: string) => {
              if (!date) return;
              admission.push({
                id: `hs-${key}-${entry.id}-${label}`,
                title: `${schoolName}${courseLabel} ${label}${suffix}`,
                date,
                timeRange: "終日",
                location: schoolName,
                tag: "入試",
                tagColor: "bg-red-100 text-red-700",
                members: [], // 全員対象
              });
            };
            addEvent(entry.applyStart, "願書受付開始");
            addEvent(entry.applyEnd, "願書締切");
            addEvent(entry.examDate, "試験日");
            addEvent(entry.resultDate, "合格発表");
            addEvent(entry.procedureDeadline, "入学手続締切");
          });
        });
      }
      setAdmissionEvents(admission);
    } catch (e) {
      console.warn("print-week load error", e);
    }
  }, []);

  const combinedEvents = useMemo(() => [...events, ...admissionEvents], [events, admissionEvents]);

  const eventsByDay = useMemo(() => {
    return combinedEvents.reduce<Record<string, Event[]>>((acc, ev) => {
      if (!acc[ev.date]) acc[ev.date] = [];
      acc[ev.date].push(ev);
      return acc;
    }, {});
  }, [combinedEvents]);

  const tasksByDay = useMemo(() => {
    return tasks.reduce<Record<string, Task[]>>((acc, t) => {
      if (!acc[t.due]) acc[t.due] = [];
      acc[t.due].push(t);
      return acc;
    }, {});
  }, [tasks]);

  const filteredMembers = members.filter((m) => selectedMembers.includes(m.id));
  const effectiveMembers = filteredMembers.length ? filteredMembers : members; // 全解除された場合は全員表示

  const isEventVisible = (ev: Event, memberId: string) => {
    if (!ev.members || ev.members.length === 0) return true; // 全員対象
    return ev.members.includes(memberId);
  };

  const isTaskVisible = (task: Task, memberId: string) => {
    if (!task.assignee) return true;
    const target = members.find((m) => m.id === memberId);
    return target ? task.assignee === target.name : false;
  };

  return (
    <div className="min-h-screen bg-white px-6 py-8 font-sans text-zinc-900">
      <style jsx global>{`
        @media print {
          .screen-only {
            display: none !important;
          }
          .print-page {
            page-break-after: always;
          }
          .print-page:last-of-type {
            page-break-after: auto;
          }
          body {
            margin: 0;
          }
        }
      `}</style>

      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center gap-3 screen-only">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-sm">
              <CalendarDays className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">週次PDF出力</h1>
              <p className="text-sm text-zinc-500">週の予定・タスクを印刷/保存（ブラウザ印刷でPDF保存）</p>
            </div>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              onClick={() => setWeekOffset((v) => v - 1)}
              className="rounded-full bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-200"
            >
              <ChevronLeft className="mr-1 inline h-4 w-4" strokeWidth={1.5} />
              前の週
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              className="rounded-full bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-200"
            >
              今週
            </button>
            <button
              onClick={() => setWeekOffset((v) => v + 1)}
              className="rounded-full bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-200"
            >
              次の週
              <ChevronRight className="ml-1 inline h-4 w-4" strokeWidth={1.5} />
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90"
            >
              <Printer className="h-4 w-4" strokeWidth={1.5} />
              印刷 / PDF保存
            </button>
            <Link
              href="/"
              className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90"
            >
              トップに戻る
            </Link>
          </div>
        </header>

        <div className="screen-only rounded-3xl border border-zinc-100 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
            <Users className="h-4 w-4" strokeWidth={1.5} />
            印刷対象メンバー
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {members.map((m) => {
              const checked = selectedMembers.includes(m.id);
              return (
                <label
                  key={m.id}
                  className="flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-700"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      setSelectedMembers((prev) =>
                        e.target.checked ? [...prev, m.id] : prev.filter((id) => id !== m.id),
                      );
                    }}
                  />
                  {m.name}
                </label>
              );
            })}
          </div>
        </div>

        <div className="screen-only rounded-3xl border border-zinc-100 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="border-b border-zinc-100 px-6 py-4 text-sm font-semibold text-zinc-700">
            {formatWeekRange(weekDays)}
          </div>
          <div className="grid gap-0 border-t border-zinc-100 md:grid-cols-2">
            {weekDays.map((day) => (
              <div key={day.date} className="border-b border-zinc-100 px-6 py-4">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-zinc-900">{day.label}</div>
                    <div className="text-xs text-zinc-500">{day.date}</div>
                  </div>
                </div>
                <div className="space-y-2">
                  {(eventsByDay[day.date] || []).map((ev) => (
                    <div key={ev.id} className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-zinc-900">{ev.title}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${ev.tagColor}`}>{ev.tag}</span>
                      </div>
                      <div className="text-xs text-zinc-500">
                        {ev.timeRange}
                        {ev.location ? ` / ${ev.location}` : ""}
                      </div>
                    </div>
                  ))}
                  {(tasksByDay[day.date] || []).map((t) => (
                    <div key={t.id} className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-zinc-900">{t.title}</span>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-amber-700">{t.status}</span>
                      </div>
                    </div>
                  ))}
                  {!((eventsByDay[day.date] || []).length || (tasksByDay[day.date] || []).length) && (
                    <div className="text-xs text-zinc-400">予定はありません</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 印刷用（メンバー別 1 カラム） */}
        <div className="space-y-6">
          {effectiveMembers.map((m) => (
            <section key={m.id} className="print-page rounded-3xl border border-zinc-100 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <header className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
                <div>
                  <div className="text-sm font-semibold text-zinc-500">{formatWeekRange(weekDays)}</div>
                  <div className="text-lg font-bold text-zinc-900">{m.name}</div>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${m.color} text-white`}>
                  {m.name.slice(0, 1)}
                </div>
              </header>
              <div className="grid grid-cols-1 divide-y divide-zinc-100">
                {weekDays.map((day) => {
                  const dayEvents = (eventsByDay[day.date] || []).filter((ev) => isEventVisible(ev, m.id));
                  const dayTasks = (tasksByDay[day.date] || []).filter((t) => isTaskVisible(t, m.id));
                  return (
                    <div key={`${m.id}-${day.date}`} className="px-6 py-4">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="text-sm font-semibold text-zinc-900">{day.label}</div>
                        <div className="text-xs text-zinc-500">{day.date}</div>
                      </div>
                      <div className="space-y-2 text-sm">
                        {dayEvents.map((ev) => (
                          <div key={ev.id} className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-zinc-900">{ev.title}</span>
                              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${ev.tagColor}`}>{ev.tag}</span>
                            </div>
                            <div className="text-xs text-zinc-500">
                              {ev.timeRange}
                              {ev.location ? ` / ${ev.location}` : ""}
                            </div>
                          </div>
                        ))}
                        {dayTasks.map((t) => (
                          <div key={t.id} className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-zinc-900">{t.title}</span>
                              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-amber-700">{t.status}</span>
                            </div>
                          </div>
                        ))}
                        {!dayEvents.length && !dayTasks.length && (
                          <div className="text-xs text-zinc-400">予定はありません</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
function startOfWeekMonday(date: Date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Monday=0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}
function buildWeekDays(anchorIso: string, offset = 0) {
  const anchor = new Date(anchorIso);
  const monday = startOfWeekMonday(anchor);
  monday.setDate(monday.getDate() + offset * 7);
  return Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + idx);
    return {
      date: d.toISOString().slice(0, 10),
      day: d.getDate(),
      label: `${d.getMonth() + 1}/${d.getDate()}`,
    };
  });
}

function formatWeekRange(weekDays: { date: string }[]) {
  if (!weekDays.length) return "";
  const first = new Date(weekDays[0].date);
  const last = new Date(weekDays[weekDays.length - 1].date);
  return `${first.getMonth() + 1}/${first.getDate()} - ${last.getMonth() + 1}/${last.getDate()}`;
}

const initialEvents: Event[] = [
  {
    id: "e1",
    title: "模試 (英語)",
    date: todayIso(),
    timeRange: "09:00 - 11:00",
    location: "市民ホール",
    tag: "模試",
    tagColor: "bg-blue-100 text-blue-700",
    members: ["c1", "p1"],
  },
  {
    id: "e2",
    title: "塾 面談",
    date: addDaysString(todayIso(), 1),
    timeRange: "18:00 - 18:45",
    location: "塾本校",
    tag: "塾",
    tagColor: "bg-indigo-100 text-indigo-700",
    members: ["p1"],
  },
  {
    id: "e3",
    title: "本番試験A",
    date: addDaysString(todayIso(), 3),
    timeRange: "08:30 - 12:00",
    location: "大学キャンパスA",
    tag: "試験",
    tagColor: "bg-red-100 text-red-700",
    members: ["c1", "p1"],
  },
  {
    id: "e4",
    title: "サッカー練習",
    date: addDaysString(todayIso(), 4),
    timeRange: "16:00 - 18:00",
    location: "市民グラウンド",
    tag: "部活",
    tagColor: "bg-green-100 text-green-700",
    members: ["c2"],
  },
];

const initialTasks: Task[] = [
  { id: "t1", title: "受験票印刷", due: todayIso(), status: "進行中", assignee: "保護者A" },
  { id: "t2", title: "持ち物チェック", due: addDaysString(todayIso(), 1), status: "未対応", assignee: "子どもA" },
  { id: "t3", title: "会場アクセス確認", due: addDaysString(todayIso(), 2), status: "完了", assignee: "保護者A" },
];

function addDaysString(dateIso: string, days = 0) {
  const d = new Date(dateIso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
