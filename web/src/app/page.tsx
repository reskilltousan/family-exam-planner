"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Importance, EventType, TaskStatus } from "@prisma/client";
import { detectConflicts } from "@/lib/conflict";

type Member = {
  id: string;
  name: string;
  role: string;
  grade?: string | null;
};

type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  dueDate?: string | null;
  assigneeId?: string | null;
};

type Event = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  type: EventType;
  importance: Importance;
  location?: string | null;
  note?: string | null;
  participants: { memberId: string; member?: Member }[];
  tasks: Task[];
};

type ExternalEvent = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  source: string;
  organizer?: string | null;
};

const importanceLabel: Record<Importance, string> = {
  must: "Must",
  should: "Should",
  optional: "Optional",
};

const typeLabel: Record<EventType, string> = {
  school: "School",
  cram: "Cram",
  lesson: "Lesson",
  exam: "Exam",
  other: "Other",
};

export default function Home() {
  const defaultFamily = process.env.NEXT_PUBLIC_DEFAULT_FAMILY_ID ?? "";
  const [familyId, setFamilyId] = useState<string>(defaultFamily);
  const [message, setMessage] = useState<string>("");

  // Form state
  const [newEvent, setNewEvent] = useState({
    title: "",
    startAt: "",
    endAt: "",
    type: EventType.exam as EventType,
    importance: Importance.must as Importance,
    participantIds: [] as string[],
  });

  const fetcher = async <T,>(url: string) => {
    const res = await fetch(url, {
      headers: { "x-family-id": familyId },
    });
    if (!res.ok) throw new Error(await res.text());
    return (await res.json()) as T;
  };

  const {
    data: members,
    mutate: mutateMembers,
    isLoading: loadingMembers,
  } = useSWR<Member[]>(familyId ? "/api/members" : null, fetcher);

  const {
    data: events,
    mutate: mutateEvents,
    isLoading: loadingEvents,
  } = useSWR<Event[]>(familyId ? "/api/events" : null, fetcher);

  const {
    data: externalEvents,
    mutate: mutateExternal,
    isLoading: loadingExternal,
  } = useSWR<ExternalEvent[]>(familyId ? "/api/google/events" : null, fetcher);

  const conflictIds = useMemo(() => {
    const mapped = (events ?? []).map((e) => ({
      ...e,
      startAt: new Date(e.startAt),
      endAt: new Date(e.endAt),
    }));
    return detectConflicts(mapped as any);
  }, [events]);

  async function handleCreateEvent() {
    if (!familyId) {
      setMessage("familyId is required");
      return;
    }
    if (!newEvent.title || !newEvent.startAt || !newEvent.endAt) {
      setMessage("title/start/end are required");
      return;
    }
    try {
      await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-family-id": familyId,
        },
        body: JSON.stringify(newEvent),
      });
      setNewEvent({
        title: "",
        startAt: "",
        endAt: "",
        type: EventType.exam,
        importance: Importance.must,
        participantIds: [],
      });
      await mutateEvents();
      setMessage("Event created");
    } catch (e) {
      setMessage((e as Error).message);
    }
  }

  async function handleAddTask(eventId: string, title: string) {
    if (!familyId || !title) return;
    try {
      await fetch("/api/events/" + eventId + "/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-family-id": familyId,
        },
        body: JSON.stringify({ title }),
      });
      await mutateEvents();
    } catch (e) {
      setMessage((e as Error).message);
    }
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <header className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Family Exam Planner</h1>
          <p className="text-sm text-zinc-600">
            イベント、タスク、Google予定を家族で一元管理
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
            placeholder="familyId"
            value={familyId}
            onChange={(e) => setFamilyId(e.target.value)}
          />
          <button
            onClick={() => {
              mutateMembers();
              mutateEvents();
              mutateExternal();
            }}
            className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            Sync data
          </button>
        </div>
      </header>

      {message && (
        <div className="mx-auto max-w-6xl px-6 pb-2 text-sm text-red-600">{message}</div>
      )}

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 pb-12 lg:grid-cols-3">
        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold">イベント作成</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              className="rounded border border-zinc-300 px-3 py-2 text-sm"
              placeholder="タイトル"
              value={newEvent.title}
              onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
            />
            <div className="flex gap-2">
              <input
                type="datetime-local"
                className="flex-1 rounded border border-zinc-300 px-3 py-2 text-sm"
                value={newEvent.startAt}
                onChange={(e) => setNewEvent({ ...newEvent, startAt: e.target.value })}
              />
              <input
                type="datetime-local"
                className="flex-1 rounded border border-zinc-300 px-3 py-2 text-sm"
                value={newEvent.endAt}
                onChange={(e) => setNewEvent({ ...newEvent, endAt: e.target.value })}
              />
            </div>
            <select
              className="rounded border border-zinc-300 px-3 py-2 text-sm"
              value={newEvent.type}
              onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as EventType })}
            >
              {Object.values(EventType).map((t) => (
                <option key={t} value={t}>
                  {typeLabel[t as EventType]}
                </option>
              ))}
            </select>
            <select
              className="rounded border border-zinc-300 px-3 py-2 text-sm"
              value={newEvent.importance}
              onChange={(e) =>
                setNewEvent({ ...newEvent, importance: e.target.value as Importance })
              }
            >
              {Object.values(Importance).map((v) => (
                <option key={v} value={v}>
                  {importanceLabel[v as Importance]}
                </option>
              ))}
            </select>
            <div className="col-span-1 sm:col-span-2">
              <p className="text-xs text-zinc-600">参加者を選択</p>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => {
                  const checked = newEvent.participantIds.includes(m.id);
                  return (
                    <label key={m.id} className="flex items-center gap-1 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const list = e.target.checked
                            ? [...newEvent.participantIds, m.id]
                            : newEvent.participantIds.filter((id) => id !== m.id);
                          setNewEvent({ ...newEvent, participantIds: list });
                        }}
                      />
                      {m.name} ({m.role})
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
          <button
            onClick={handleCreateEvent}
            className="mt-3 rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
          >
            イベントを追加
          </button>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Google予定の読み取り</h2>
          <p className="mt-1 text-sm text-zinc-600">連携後に /api/google/events を呼び出します。</p>
          <button
            onClick={() => mutateExternal()}
            disabled={!familyId || loadingExternal}
            className="mt-3 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {loadingExternal ? "取得中..." : "外部イベント再取得"}
          </button>
          <div className="mt-3 space-y-2 text-sm">
            {(externalEvents ?? []).map((ev) => (
              <div key={ev.id} className="rounded border border-zinc-200 p-2">
                <div className="font-medium">{ev.title}</div>
                <div className="text-xs text-zinc-600">
                  {new Date(ev.startAt).toLocaleString()} - {new Date(ev.endAt).toLocaleString()}
                </div>
                <div className="text-xs text-blue-600">Google</div>
              </div>
            ))}
          </div>
        </section>

        <section className="lg:col-span-2 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">イベント一覧</h2>
          <div className="mt-3 space-y-3">
            {(events ?? []).map((ev) => {
              const conflicted = conflictIds.has(ev.id);
              return (
                <div
                  key={ev.id}
                  className={`rounded border p-3 ${conflicted ? "border-red-400" : "border-zinc-200"}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">
                      {ev.title}{" "}
                      <span className="text-xs text-zinc-500">
                        {typeLabel[ev.type]} / {importanceLabel[ev.importance]}
                      </span>
                    </div>
                    {conflicted && <span className="text-xs font-semibold text-red-600">⚠ conflict</span>}
                  </div>
                  <div className="text-xs text-zinc-600">
                    {new Date(ev.startAt).toLocaleString()} - {new Date(ev.endAt).toLocaleString()}
                  </div>
                  <div className="text-xs text-zinc-700">
                    参加者: {ev.participants.map((p) => p.member?.name ?? p.memberId).join(", ")}
                  </div>
                  <TaskList
                    eventId={ev.id}
                    tasks={ev.tasks}
                    onAdd={(title) => handleAddTask(ev.id, title)}
                  />
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">子ども別ビュー（簡易）</h2>
          <div className="mt-2 space-y-2 text-sm">
            {(members ?? [])
              .filter((m) => m.role === "child")
              .map((child) => {
                const childEvents = (events ?? []).filter((ev) =>
                  ev.participants.some((p) => p.memberId === child.id),
                );
                const childTasks = childEvents.flatMap((ev) => ev.tasks);
                return (
                  <div key={child.id} className="rounded border border-zinc-200 p-2">
                    <div className="font-medium">{child.name}</div>
                    <div className="text-xs text-zinc-600">今週のイベント: {childEvents.length}件</div>
                    <div className="text-xs text-zinc-600">
                      今週のタスク: {childTasks.length}件 (done:{" "}
                      {childTasks.filter((t) => t.status === "done").length})
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      </main>
    </div>
  );
}

function TaskList({
  eventId,
  tasks,
  onAdd,
}: {
  eventId: string;
  tasks: Task[];
  onAdd: (title: string) => void;
}) {
  const [title, setTitle] = useState("");
  return (
    <div className="mt-2 space-y-1">
      <div className="text-xs font-semibold text-zinc-700">タスク</div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="flex-1 rounded border border-zinc-300 px-2 py-1 text-xs"
          placeholder="新規タスク"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button
          onClick={() => {
            onAdd(title);
            setTitle("");
          }}
          className="rounded bg-emerald-500 px-2 py-1 text-xs font-medium text-white"
        >
          追加
        </button>
      </div>
      <ul className="space-y-1 text-xs">
        {tasks.map((t) => (
          <li key={t.id} className="flex items-center justify-between rounded border border-zinc-200 px-2 py-1">
            <span>
              {t.title}{" "}
              <span className="text-zinc-500">({t.status})</span>
            </span>
            {t.dueDate && <span className="text-zinc-500">{new Date(t.dueDate).toLocaleDateString()}</span>}
          </li>
        ))}
        {tasks.length === 0 && <li className="text-zinc-500">タスクなし</li>}
      </ul>
    </div>
  );
}
