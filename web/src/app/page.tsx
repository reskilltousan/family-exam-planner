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
  notes?: EventNote[];
};

type ExternalEvent = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  source: string;
  organizer?: string | null;
};

type EventNote = {
  id: string;
  content: string;
  createdBy?: string | null;
  createdAt: string;
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
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  type FilterType = "all" | EventType;
  const [filterMember, setFilterMember] = useState<string>("all");
  const [filterType, setFilterType] = useState<FilterType>("all");

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

  const { data: members, mutate: mutateMembers } = useSWR<Member[]>(
    familyId ? "/api/members" : null,
    fetcher,
  );

  const { data: events, mutate: mutateEvents } = useSWR<Event[]>(
    familyId ? "/api/events" : null,
    fetcher,
  );

  const {
    data: externalEvents,
    mutate: mutateExternal,
    isLoading: loadingExternal,
  } = useSWR<ExternalEvent[]>(familyId ? "/api/google/events" : null, fetcher);

  const filteredEvents = useMemo(() => {
    if (!events) return [];
    return events.filter((ev) => {
      const memberOk =
        filterMember === "all" ||
        ev.participants.some((p) => p.memberId === filterMember);
      const typeOk = filterType === "all" || ev.type === filterType;
      return memberOk && typeOk;
    });
  }, [events, filterMember, filterType]);

  const conflictIds = useMemo(() => {
    const mapped = filteredEvents.map((e) => ({
      id: e.id,
      importance: e.importance,
      startAt: new Date(e.startAt),
      endAt: new Date(e.endAt),
      participants: e.participants.map((p) => ({ memberId: p.memberId })),
    }));
    return detectConflicts(mapped);
  }, [filteredEvents]);

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

  async function handleUpdateTask(eventId: string, task: Task, updates: Partial<Task>) {
    if (!familyId) return;
    try {
      await fetch(`/api/events/${eventId}/tasks`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-family-id": familyId,
        },
        body: JSON.stringify({ ...task, ...updates }),
      });
      await mutateEvents();
    } catch (e) {
      setMessage((e as Error).message);
    }
  }

  async function handleDeleteTask(eventId: string, taskId: string) {
    if (!familyId) return;
    try {
      await fetch(`/api/events/${eventId}/tasks`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-family-id": familyId,
        },
        body: JSON.stringify({ taskId }),
      });
      await mutateEvents();
    } catch (e) {
      setMessage((e as Error).message);
    }
  }

  async function handleAddMember(name: string, role: "parent" | "child", grade?: string) {
    if (!familyId || !name) return;
    try {
      await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-family-id": familyId },
        body: JSON.stringify({ name, role, grade }),
      });
      await mutateMembers();
    } catch (e) {
      setMessage((e as Error).message);
    }
  }

  async function handleAddNote(eventId: string, content: string) {
    if (!familyId || !content) return;
    try {
      await fetch(`/api/events/${eventId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-family-id": familyId },
        body: JSON.stringify({ content }),
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
                {(members ?? []).map((m) => {
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
          <h2 className="text-lg font-semibold">メンバー追加</h2>
          <MemberForm onAdd={handleAddMember} />
          <div className="mt-3 space-y-1 text-sm">
            {(members ?? []).map((m) => (
              <div key={m.id} className="rounded border border-zinc-200 p-2">
                {m.name} <span className="text-xs text-zinc-500">({m.role})</span>{" "}
                {m.grade && <span className="text-xs text-zinc-500">/ {m.grade}</span>}
              </div>
            ))}
          </div>
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
          <a
            className="mt-2 inline-block text-xs text-blue-600 underline"
            href={`/api/google/auth?familyId=${familyId}`}
          >
            Google連携を開始/再認可する
          </a>
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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold">イベント一覧</h2>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <select
                className="rounded border border-zinc-300 px-2 py-1"
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as "week" | "month")}
              >
                <option value="week">週ビュー</option>
                <option value="month">月ビュー</option>
              </select>
              <select
                className="rounded border border-zinc-300 px-2 py-1"
                value={filterMember}
                onChange={(e) => setFilterMember(e.target.value)}
              >
                <option value="all">全メンバー</option>
                {(members ?? []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <select
                className="rounded border border-zinc-300 px-2 py-1"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as FilterType)}
              >
                <option value="all">全タイプ</option>
                {Object.values(EventType).map((t) => (
                  <option key={t} value={t}>
                    {typeLabel[t as EventType]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3 space-y-3">
            {groupEventsByDay(filteredEvents, viewMode).map(({ label, events: dayEvents }) => (
              <div key={label}>
                <div className="text-sm font-semibold text-zinc-700">{label}</div>
                <div className="mt-2 space-y-2">
                  {dayEvents.map((ev) => {
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
                          {conflicted && <span className="text-xs font-semibold text-red-600">WARN conflict</span>}
                        </div>
                        <div className="text-xs text-zinc-600">
                          {new Date(ev.startAt).toLocaleString()} - {new Date(ev.endAt).toLocaleString()}
                        </div>
                        <div className="text-xs text-zinc-700">
                          参加者: {ev.participants.map((p) => p.member?.name ?? p.memberId).join(", ")}
                        </div>
                        <TaskList
                          tasks={ev.tasks}
                          onAdd={(title) => handleAddTask(ev.id, title)}
                          onUpdate={(task, updates) => handleUpdateTask(ev.id, task, updates)}
                          onDelete={(taskId) => handleDeleteTask(ev.id, taskId)}
                        />
                        <NotesSection
                          eventId={ev.id}
                          notes={ev.notes}
                          onAdd={handleAddNote}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {filteredEvents.length === 0 && <div className="text-sm text-zinc-500">該当するイベントがありません</div>}
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">子ども別ビュー（簡易）</h2>
          <div className="mt-2 space-y-2 text-sm">
            {(members ?? [])
              .filter((m) => m.role === "child")
              .map((child) => {
                const childEvents = (filteredEvents ?? []).filter((ev) =>
                  ev.participants.some((p) => p.memberId === child.id),
                );
                const childTasks = childEvents.flatMap((ev) => ev.tasks);
                return (
                  <div key={child.id} className="rounded border border-zinc-200 p-2">
                    <div className="font-medium">{child.name}</div>
                    <div className="text-xs text-zinc-600">今週/今月のイベント: {childEvents.length}件</div>
                    <div className="text-xs text-zinc-600">
                      タスク: {childTasks.length}件 (done: {childTasks.filter((t) => t.status === "done").length})
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
  tasks,
  onAdd,
  onUpdate,
  onDelete,
}: {
  tasks: Task[];
  onAdd: (title: string) => void;
  onUpdate: (task: Task, updates: Partial<Task>) => void;
  onDelete: (taskId: string) => void;
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
            <span className="flex flex-col">
              <span className="font-medium">{t.title}</span>
              <span className="text-zinc-500">
                {t.status} {t.dueDate && ` / ${new Date(t.dueDate).toLocaleDateString()}`}
              </span>
            </span>
            <div className="flex items-center gap-1">
              <select
                className="rounded border border-zinc-300 px-1 py-0.5"
                value={t.status}
                onChange={(e) => onUpdate(t, { status: e.target.value as TaskStatus })}
              >
                {Object.values(TaskStatus).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button
                onClick={() => onDelete(t.id)}
                className="rounded bg-red-500 px-2 py-1 text-white"
                aria-label="delete task"
              >
                削除
              </button>
            </div>
          </li>
        ))}
        {tasks.length === 0 && <li className="text-zinc-500">タスクなし</li>}
      </ul>
    </div>
  );
}

function MemberForm({ onAdd }: { onAdd: (name: string, role: "parent" | "child", grade?: string) => void }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<"parent" | "child">("parent");
  const [grade, setGrade] = useState("");
  return (
    <div className="mt-2 flex flex-col gap-2 text-sm">
      <input
        className="rounded border border-zinc-300 px-3 py-2 text-sm"
        placeholder="名前"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="flex gap-2">
        <select
          className="rounded border border-zinc-300 px-3 py-2 text-sm"
          value={role}
          onChange={(e) => setRole(e.target.value as "parent" | "child")}
        >
          <option value="parent">parent</option>
          <option value="child">child</option>
        </select>
        <input
          className="flex-1 rounded border border-zinc-300 px-3 py-2 text-sm"
          placeholder="学年 (任意)"
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
        />
      </div>
      <button
        onClick={() => {
          onAdd(name, role, grade || undefined);
          setName("");
        }}
        className="self-start rounded bg-emerald-600 px-3 py-1.5 text-white"
      >
        追加
      </button>
    </div>
  );
}

function NotesSection({
  eventId,
  notes,
  onAdd,
}: {
  eventId: string;
  notes?: EventNote[];
  onAdd: (eventId: string, content: string) => void;
}) {
  const [content, setContent] = useState("");
  return (
    <div className="mt-3 space-y-1 text-xs">
      <div className="font-semibold text-zinc-700">メモ</div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="flex-1 rounded border border-zinc-300 px-2 py-1 text-xs"
          placeholder="メモを追加"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <button
          onClick={() => {
            onAdd(eventId, content);
            setContent("");
          }}
          className="rounded bg-blue-600 px-2 py-1 text-white"
        >
          追加
        </button>
      </div>
      <ul className="space-y-1">
        {(notes ?? []).map((n) => (
          <li key={n.id} className="rounded border border-zinc-200 p-2">
            <div className="font-medium">{n.content}</div>
            <div className="text-[10px] text-zinc-500">{new Date(n.createdAt).toLocaleString()}</div>
          </li>
        ))}
        {(!notes || notes.length === 0) && <li className="text-zinc-500">メモなし</li>}
      </ul>
    </div>
  );
}

function groupEventsByDay(events: Event[], mode: "week" | "month") {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  if (mode === "week") {
    const day = now.getDay();
    start.setDate(now.getDate() - day);
    end.setDate(start.getDate() + 7);
  } else {
    start.setDate(1);
    end.setMonth(start.getMonth() + 1);
    end.setDate(0);
  }
  const grouped: { [key: string]: Event[] } = {};
  events
    .filter((ev) => {
      const s = new Date(ev.startAt);
      return s >= start && s <= end;
    })
    .forEach((ev) => {
      const key = new Date(ev.startAt).toDateString();
      grouped[key] = grouped[key] ? [...grouped[key], ev] : [ev];
    });
  return Object.entries(grouped).map(([label, evs]) => ({ label, events: evs }));
}
