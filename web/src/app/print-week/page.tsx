"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Event = {
  id: string;
  title: string;
  date: string;
  timeRange: string;
  location?: string;
  tag: string;
  tagColor: string;
};

type Task = {
  id: string;
  title: string;
  due: string;
  status: string;
};

export default function PrintWeekPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const weekDays = useMemo(() => buildWeekDays(todayIso(), weekOffset), [weekOffset]);

  // load from localStorage (mock data + admission-derived events)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const evRaw = window.localStorage.getItem("mockEvents");
      const taskRaw = window.localStorage.getItem("mockTasks");
      const baseEvents: Event[] = evRaw ? JSON.parse(evRaw) : [];
      const baseTasks: Task[] = taskRaw ? JSON.parse(taskRaw) : [];

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

      setEvents([...baseEvents.filter((e) => !e.id?.startsWith?.("hs-")), ...admission]);
      setTasks(baseTasks);
    } catch (e) {
      console.warn("print-week load error", e);
    }
  }, []);

  const eventsByDay = useMemo(() => {
    return events.reduce<Record<string, Event[]>>((acc, ev) => {
      if (!acc[ev.date]) acc[ev.date] = [];
      acc[ev.date].push(ev);
      return acc;
    }, {});
  }, [events]);

  const tasksByDay = useMemo(() => {
    return tasks.reduce<Record<string, Task[]>>((acc, t) => {
      if (!acc[t.due]) acc[t.due] = [];
      acc[t.due].push(t);
      return acc;
    }, {});
  }, [tasks]);

  return (
    <div className="min-h-screen bg-white px-6 py-8 font-sans text-zinc-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">週次PDF出力</h1>
            <p className="text-sm text-zinc-500">
              今週の予定・タスクを印刷/保存（ブラウザの印刷メニューでPDF保存してください）
            </p>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              onClick={() => setWeekOffset((v) => v - 1)}
              className="rounded-full bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-200"
            >
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
            </button>
            <button
              onClick={() => window.print()}
              className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90"
            >
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

        <div className="rounded-3xl border border-zinc-100 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
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
      </div>
    </div>
  );
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
function addDaysString(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function buildWeekDays(today: string, offset: number) {
  const start = startOfWeek(new Date(today), offset);
  return Array.from({ length: 7 }).map((_, i) => {
    const d = addDaysString(start, i);
    return { date: d, label: formatLabel(d) };
  });
}
function startOfWeek(base: Date, offsetWeeks: number) {
  const d = new Date(base);
  const day = d.getDay();
  const diff = (day + 6) % 7; // Monday start
  d.setDate(d.getDate() - diff + offsetWeeks * 7);
  return d;
}
function formatLabel(iso: string) {
  const d = new Date(iso);
  const w = ["月", "火", "水", "木", "金", "土", "日"][d.getDay() === 0 ? 6 : d.getDay() - 1];
  return `${d.getMonth() + 1}/${d.getDate()} (${w})`;
}
function formatWeekRange(weekDays: { date: string; label: string }[]) {
  if (!weekDays.length) return "";
  return `${weekDays[0].label} - ${weekDays[6].label}`;
}
