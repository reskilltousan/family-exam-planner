"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, GripVertical, MapPin, Plus, Tag, User } from "lucide-react";

type Member = { id: string; name: string; color: string };
type Event = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  timeRange: string;
  location?: string;
  members: string[];
  tag: string;
  tagColor: string;
};
type Task = {
  id: string;
  title: string;
  due: string;
  assignee: string;
  status: "未対応" | "進行中" | "完了";
};
type SectionKey = "quick" | "week" | "tasks" | "events";

const defaultMembers: Member[] = [
  { id: "p1", name: "保護者A", color: "bg-blue-500" },
  { id: "c1", name: "子どもA", color: "bg-emerald-500" },
  { id: "c2", name: "子どもB", color: "bg-orange-500" },
];

const initialEvents: Event[] = [
  {
    id: "e1",
    title: "模試 (英語)",
    date: todayIso(),
    timeRange: "09:00 - 11:00",
    location: "市民ホール",
    members: ["c1", "p1"],
    tag: "模試",
    tagColor: "bg-blue-100 text-blue-700",
  },
  {
    id: "e2",
    title: "塾 面談",
    date: addDaysString(new Date(), 1),
    timeRange: "18:00 - 18:45",
    location: "塾本校",
    members: ["p1"],
    tag: "塾",
    tagColor: "bg-indigo-100 text-indigo-700",
  },
  {
    id: "e3",
    title: "本番試験A",
    date: addDaysString(new Date(), 3),
    timeRange: "08:30 - 12:00",
    location: "大学キャンパスA",
    members: ["c1", "p1"],
    tag: "試験",
    tagColor: "bg-red-100 text-red-700",
  },
];

const initialTasks: Task[] = [
  { id: "t1", title: "受験票印刷", due: addDaysString(new Date(), 1), assignee: "保護者A", status: "進行中" },
  { id: "t2", title: "持ち物チェック", due: addDaysString(new Date(), 2), assignee: "子どもA", status: "未対応" },
  { id: "t3", title: "会場アクセス確認", due: addDaysString(new Date(), 2), assignee: "保護者A", status: "完了" },
];

export default function MockPage() {
  const [familyId, setFamilyId] = useState<string>(process.env.NEXT_PUBLIC_DEFAULT_FAMILY_ID ?? "");
  const [members, setMembers] = useState<Member[]>(defaultMembers);
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [message, setMessage] = useState<string>("");
  const [createForm, setCreateForm] = useState({
    title: "",
    date: todayIso(),
    start: "09:00",
    end: "10:00",
    location: "",
    memberIds: [] as string[],
    tag: "模試",
    tagColor: "bg-blue-100 text-blue-700",
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const weekDays = useMemo(() => buildWeekDays(todayIso(), weekOffset), [weekOffset]);
  const groupedEvents = useMemo(() => {
    return events.reduce<Record<string, Event[]>>((acc, ev) => {
      if (!acc[ev.date]) acc[ev.date] = [];
      acc[ev.date].push(ev);
      return acc;
    }, {});
  }, [events]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // 認証ページで保存した family メンバー名があれば反映
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const fid = window.localStorage.getItem("familyId");
      if (fid) queueMicrotask(() => setFamilyId(fid));
      const raw = window.localStorage.getItem("familyMembers");
      if (!raw) return;
      const names = (JSON.parse(raw) as string[]).filter(Boolean);
      if (!names.length) return;
      const palette = ["bg-blue-500", "bg-emerald-500", "bg-orange-500", "bg-indigo-500", "bg-amber-500"];
      const updated = names.map<Member>((name, idx) => ({
        id: `m${idx + 1}`,
        name,
        color: palette[idx % palette.length],
      }));
      // enqueue to avoid lint set-state-in-effect warning (non-critical, single render)
      queueMicrotask(() => setMembers(updated));
    } catch (e) {
      console.warn("familyMembers localStorage parse error", e);
    }
  }, []);

  // お気に入り学校の入試日程（/highschools で保存したローカルデータ）をイベントとして追加
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const favRaw = window.localStorage.getItem("hsFavorites");
      const examRaw = window.localStorage.getItem("hsExamEntries");
      if (!favRaw || !examRaw) return;
      const favs = JSON.parse(favRaw) as Record<string, boolean>;
      const exams = JSON.parse(examRaw) as Record<string, any[]>;
      const generated: Event[] = [];

      Object.entries(favs).forEach(([key, isFav]) => {
        if (!isFav) return;
        const entries = exams[key];
        if (!Array.isArray(entries) || !entries.length) return;
        const parts = key.split(":");
        const schoolName = parts[2] ?? "学校";
        entries.forEach((entry) => {
          const baseId = `${key}:${entry.id}`;
          const suffix = entry.kind ? ` (${entry.kind})` : "";
          const courseLabel = entry.course ? ` ${entry.course}` : "";
          const addEvent = (date: string | null, label: string) => {
            if (!date) return;
            generated.push({
              id: `hs-${baseId}-${label}`,
              title: `${schoolName}${courseLabel} ${label}${suffix}`,
              date,
              timeRange: "終日",
              location: schoolName,
              members: [],
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

      if (generated.length) {
        setEvents((prev) => {
          const base = prev.filter((e) => !e.id.startsWith("hs-"));
          return [...base, ...generated];
        });
      }
    } catch (e) {
      console.warn("hs exam events parse error", e);
    }
  }, []);

  const [order, setOrder] = useState<SectionKey[]>(["quick", "week", "tasks", "events"]);
  const [dragging, setDragging] = useState<SectionKey | null>(null);
  const [over, setOver] = useState<SectionKey | null>(null);

  const sections: Record<
    SectionKey,
    { span: "full" | "half"; render: () => JSX.Element; label: string }
  > = {
    quick: { span: "full", render: () => <QuickActions onOpenCreate={() => setShowCreateModal(true)} />, label: "クイックアクション" },
    week: {
      span: "full",
      render: () => (
        <WeekView
          weekDays={weekDays}
          groupedEvents={groupedEvents}
          tasks={tasks}
          members={members}
          weekLabel={formatWeekRange(weekDays)}
          onPrevWeek={() => setWeekOffset((v) => v - 1)}
          onNextWeek={() => setWeekOffset((v) => v + 1)}
          onToday={() => setWeekOffset(0)}
          onSelectEvent={(ev) => {
            setSelectedTask(null);
            setSelectedEvent(ev);
          }}
          onSelectTask={(task) => {
            setSelectedEvent(null);
            setSelectedTask(task);
          }}
        />
      ),
      label: "カレンダー",
    },
    tasks: {
      span: "half",
      render: () => (
        <TaskList
          tasks={tasks}
          onSelectTask={(t) => {
            setSelectedEvent(null);
            setSelectedTask(t);
          }}
        />
      ),
      label: "タスク",
    },
    events: {
      span: "full",
      render: () => (
        <EventList
          events={events}
          members={members}
          onSelectEvent={(ev) => {
            setSelectedTask(null);
            setSelectedEvent(ev);
          }}
        />
      ),
      label: "イベント一覧",
    },
  };

  async function handleCreateEvent() {
    setMessage("");
    if (!createForm.title.trim()) {
      setMessage("タイトルを入力してください");
      return;
    }
    if (!createForm.date || !createForm.start || !createForm.end) {
      setMessage("日付と時間を入力してください");
      return;
    }
    const start = new Date(`${createForm.date}T${createForm.start}:00`);
    const end = new Date(`${createForm.date}T${createForm.end}:00`);
    if (end <= start) {
      setMessage("終了時間は開始より後にしてください");
      return;
    }

    const payload = {
      title: createForm.title.trim(),
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      type: "exam",
      importance: "must",
      participantIds: createForm.memberIds,
      location: createForm.location || null,
    };

    try {
      if (!familyId) {
        setMessage("familyId が未設定です（ヘッダー入力欄を確認してください）");
      } else {
        await fetch("/api/events", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-family-id": familyId,
          },
          body: JSON.stringify(payload),
        });
        setMessage("イベントを登録しました（API送信済み）");
      }
    } catch (e) {
      setMessage((e as Error).message);
    }

    const newEvent: Event = {
      id: crypto.randomUUID(),
      title: createForm.title.trim(),
      date: createForm.date,
      timeRange: `${createForm.start} - ${createForm.end}`,
      location: createForm.location || undefined,
      members: createForm.memberIds,
      tag: createForm.tag,
      tagColor: createForm.tagColor,
    };
    setEvents((prev) => [...prev, newEvent]);
    setCreateForm((prev) => ({
      ...prev,
      title: "",
      location: "",
      memberIds: [],
    }));
  }

  function handleUpdateEvent(update: Event) {
    setEvents((prev) => prev.map((e) => (e.id === update.id ? update : e)));
  }

  function handleUpdateTask(update: Task) {
    setTasks((prev) => prev.map((t) => (t.id === update.id ? update : t)));
  }

  const handleDrop = (source: SectionKey, target: SectionKey) => {
    if (source === target) return;
    setOrder((prev) => {
      const next = [...prev];
      const from = next.indexOf(source);
      const to = next.indexOf(target);
      if (from === -1 || to === -1) return prev;
      next.splice(from, 1);
      next.splice(to, 0, source);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900">
      <header className="sticky top-0 z-10 border-b border-zinc-200/50 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-sm">
              <CalendarDays className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight">Mock Family Planner</div>
              <div className="text-xs text-zinc-500">カードをドラッグして配置カスタム</div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-zinc-600">
            <User className="h-4 w-4" strokeWidth={1.5} />
            {familyId ? (
              <span className="hidden rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-white sm:inline">
                family: {familyId.slice(0, 10)}
              </span>
            ) : (
              <span className="hidden sm:inline text-amber-600">family未設定</span>
            )}
            <a
              href="/signin"
              className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90"
            >
              {familyId ? "切替 / ログイン" : "新規作成 / ログイン"}
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-6">
        <div className="rounded-2xl border border-zinc-100 bg-white px-4 py-3 text-sm text-zinc-600 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          カードをドラッグ＆ドロップして、お好きな配置に並べ替えできます。
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {order.map((id) => {
            const section = sections[id];
            return (
              <DraggableWrapper
                key={id}
                span={section.span}
                label={section.label}
                isDragging={dragging === id}
                isOver={over === id}
                onDragStart={() => setDragging(id)}
                onDragEnter={() => setOver(id)}
                onDragLeave={() => setOver(null)}
                onDragEnd={() => {
                  setDragging(null);
                  setOver(null);
                }}
                onDrop={(source) => {
                  handleDrop(source, id);
                  setDragging(null);
                  setOver(null);
                }}
              >
                {section.render()}
              </DraggableWrapper>
            );
          })}
        </div>
      </main>
      <DetailSheet
        key={selectedEvent?.id ?? selectedTask?.id ?? "detail-none"}
        event={selectedEvent}
        task={selectedTask}
        members={members}
        onSaveEvent={handleUpdateEvent}
        onSaveTask={handleUpdateTask}
        onClose={() => {
          setSelectedEvent(null);
          setSelectedTask(null);
        }}
      />
      <CreateEventModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        createForm={createForm}
        setCreateForm={setCreateForm}
        onSubmit={() => {
          handleCreateEvent();
          setShowCreateModal(false);
        }}
        members={members}
        message={message}
      />
    </div>
  );
}

function DetailSheet({
  event,
  task,
  onClose,
  members,
  onSaveEvent,
  onSaveTask,
}: {
  event?: Event | null;
  task?: Task | null;
  onClose: () => void;
  members: Member[];
  onSaveEvent: (ev: Event) => void;
  onSaveTask: (task: Task) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [formEvent, setFormEvent] = useState(() => {
    if (!event) return null;
    const [start = "", end = ""] = event.timeRange.split("-").map((s) => s.trim());
    return { ...event, start, end };
  });
  const [formTask, setFormTask] = useState(() => (task ? { ...task } : null));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !editing) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, editing]);

  const isEvent = !!event;
  if (!event && !task) return null;
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 px-4 py-8">
      <div className="w-full max-w-md rounded-3xl border border-zinc-100 bg-white p-5 shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">{isEvent ? "イベント詳細" : "タスク詳細"}</div>
          <button
            onClick={onClose}
            className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-800 hover:opacity-90"
          >
            閉じる
          </button>
        </div>
        {isEvent && event && formEvent && (
          <div className="space-y-3 pt-3 text-sm text-zinc-700">
            {editing ? (
              <>
                <input
                  className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  value={formEvent.title}
                  onChange={(e) => setFormEvent({ ...formEvent, title: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    className="rounded-2xl border border-zinc-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    value={formEvent.date}
                    onChange={(e) => setFormEvent({ ...formEvent, date: e.target.value })}
                  />
                  <input
                    className="rounded-2xl border border-zinc-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    value={formEvent.location ?? ""}
                    placeholder="場所（任意）"
                    onChange={(e) => setFormEvent({ ...formEvent, location: e.target.value || undefined })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="time"
                    className="rounded-2xl border border-zinc-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    value={formEvent.start}
                    onChange={(e) => setFormEvent({ ...formEvent, start: e.target.value })}
                  />
                  <input
                    type="time"
                    className="rounded-2xl border border-zinc-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    value={formEvent.end}
                    onChange={(e) => setFormEvent({ ...formEvent, end: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-zinc-600">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4" strokeWidth={1.5} />
                    <input
                      className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      value={formEvent.tag}
                      onChange={(e) => setFormEvent({ ...formEvent, tag: e.target.value })}
                    />
                  </div>
                  <input
                    className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    value={formEvent.tagColor}
                    onChange={(e) => setFormEvent({ ...formEvent, tagColor: e.target.value })}
                  />
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-zinc-600">
                  {members.map((m) => {
                    const checked = formEvent.members.includes(m.id);
                    return (
                      <label key={m.id} className="flex items-center gap-1 rounded-full border border-zinc-200 px-3 py-1">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...formEvent.members, m.id]
                              : formEvent.members.filter((id) => id !== m.id);
                            setFormEvent({ ...formEvent, members: next });
                          }}
                        />
                        {m.name}
                      </label>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <button
                    className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90"
                    onClick={() => {
                      if (!formEvent.start || !formEvent.end) return;
                      const updated: Event = {
                        id: event.id,
                        title: formEvent.title || event.title,
                        date: formEvent.date,
                        timeRange: `${formEvent.start} - ${formEvent.end}`,
                        location: formEvent.location,
                        members: formEvent.members,
                        tag: formEvent.tag,
                        tagColor: formEvent.tagColor,
                      };
                      onSaveEvent(updated);
                      setEditing(false);
                    }}
                  >
                    保存
                  </button>
                  <button
                    className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:opacity-90"
                    onClick={() => setEditing(false)}
                  >
                    編集をやめる
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-base font-semibold text-zinc-900">{event.title}</div>
                <div className="text-xs text-zinc-500">
                  {event.date} / {event.timeRange}
                </div>
                {event.location && <div className="text-xs text-zinc-600">場所: {event.location}</div>}
                <div className="flex items-center gap-2 text-xs text-zinc-600">
                  <Tag className="h-4 w-4" strokeWidth={1.5} />
                  <span className={`rounded-full px-2 py-0.5 text-[11px] ${event.tagColor}`}>{event.tag}</span>
                </div>
                <div className="text-xs text-zinc-600">
                  参加メンバー:{" "}
                  {event.members
                    .map((id) => members.find((m) => m.id === id)?.name ?? id)
                    .join(", ")}
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90"
                    onClick={() => setEditing(true)}
                  >
                    編集
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        {!isEvent && task && formTask && (
          <div className="space-y-3 pt-3 text-sm text-zinc-700">
            {editing ? (
              <>
                <input
                  className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  value={formTask.title}
                  onChange={(e) => setFormTask({ ...formTask, title: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    className="rounded-2xl border border-zinc-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    value={formTask.due}
                    onChange={(e) => setFormTask({ ...formTask, due: e.target.value })}
                  />
                  <select
                    className="rounded-2xl border border-zinc-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    value={formTask.assignee ?? ""}
                    onChange={(e) => setFormTask({ ...formTask, assignee: e.target.value })}
                  >
                    <option value="">担当なし</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.name}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <select
                  className="rounded-2xl border border-zinc-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  value={formTask.status}
                  onChange={(e) => setFormTask({ ...formTask, status: e.target.value as Task["status"] })}
                >
                  <option value="未対応">未対応</option>
                  <option value="進行中">進行中</option>
                  <option value="完了">完了</option>
                </select>
                <div className="flex gap-2">
                  <button
                    className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90"
                    onClick={() => {
                      onSaveTask(formTask);
                      setEditing(false);
                    }}
                  >
                    保存
                  </button>
                  <button
                    className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:opacity-90"
                    onClick={() => setEditing(false)}
                  >
                    編集をやめる
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-base font-semibold text-zinc-900">{task.title}</div>
                <div className="text-xs text-zinc-600">期限: {task.due}</div>
                <div className="text-xs text-zinc-600">担当: {task.assignee}</div>
                <div className="text-xs text-zinc-600">ステータス: {task.status}</div>
                <div className="flex gap-2 pt-2">
                  <button
                    className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90"
                    onClick={() => setEditing(true)}
                  >
                    編集
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DraggableWrapper({
  span,
  children,
  label,
  isDragging,
  isOver,
  onDragStart,
  onDragEnter,
  onDragLeave,
  onDragEnd,
  onDrop,
}: {
  span: "full" | "half";
  children: React.ReactNode;
  label: string;
  isDragging: boolean;
  isOver: boolean;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onDragEnd: () => void;
  onDrop: (source: SectionKey) => void;
}) {
  return (
    <div
      className={`${span === "full" ? "lg:col-span-2" : ""} group relative`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", label);
        onDragStart();
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        onDragEnter();
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => onDragLeave()}
      onDrop={(e) => {
        e.preventDefault();
        const sourceLabel = e.dataTransfer.getData("text/plain");
        // Map back by label for simplicity
        onDrop(labelToKey(sourceLabel));
      }}
      onDragEnd={() => onDragEnd()}
    >
      <div className="pointer-events-none absolute right-4 top-3 flex items-center gap-1 text-xs text-zinc-400 opacity-0 transition group-hover:opacity-100">
        <GripVertical className="h-4 w-4" strokeWidth={1.5} />
        <span>ドラッグで移動</span>
      </div>
      <div
        className={`rounded-3xl transition ${
          isDragging ? "ring-2 ring-blue-200/70" : ""
        } ${isOver ? "outline outline-2 outline-blue-300/80" : ""}`}
      >
        {children}
      </div>
    </div>
  );
}

function QuickActions({ onOpenCreate }: { onOpenCreate: () => void }) {
  return (
    <Card className="grid gap-4 sm:grid-cols-3">
      <ActionCard
        icon={<Plus className="h-5 w-5" strokeWidth={1.5} />}
        iconBg="bg-blue-50 text-blue-600"
        title="イベント追加"
        subtitle="新しい予定を登録"
        actionLabel="作成"
        actionTone="primary"
        onAction={onOpenCreate}
      />
      <ActionCard
        icon={<ListTodoIcon className="h-5 w-5" strokeWidth={1.5} />}
        iconBg="bg-emerald-50 text-emerald-600"
        title="タスク確認"
        subtitle="準備タスクの進捗"
        actionLabel="開く"
        actionTone="ghost"
      />
      <ActionCard
        icon={<Clock className="h-5 w-5" strokeWidth={1.5} />}
        iconBg="bg-indigo-50 text-indigo-600"
        title="今週の予定"
        subtitle="家族の空き状況"
        actionLabel="確認"
        actionTone="ghost"
      />
    </Card>
  );
}

function WeekView({
  weekDays,
  groupedEvents,
  tasks,
  members,
  weekLabel,
  onPrevWeek,
  onNextWeek,
  onToday,
  onSelectEvent,
  onSelectTask,
}: {
  weekDays: { iso: string; day: number; label: string }[];
  groupedEvents: Record<string, Event[]>;
  tasks: Task[];
  members: Member[];
  weekLabel: string;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onSelectEvent: (ev: Event) => void;
  onSelectTask: (task: Task) => void;
}) {
  return (
    <Card className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold">ウィークビュー</div>
          <div className="text-xs text-zinc-500">{weekLabel}（月曜始まり）</div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={onPrevWeek}
            className="flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1.5 font-semibold text-zinc-800 hover:opacity-90"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
            前の週
          </button>
          <button
            onClick={onToday}
            className="rounded-full bg-zinc-900 px-3 py-1.5 font-semibold text-white shadow-sm hover:opacity-90"
          >
            今週
          </button>
          <button
            onClick={onNextWeek}
            className="flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1.5 font-semibold text-zinc-800 hover:opacity-90"
          >
            次の週
            <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-zinc-100 bg-white">
        <div className="grid grid-cols-7 divide-x divide-zinc-100 border-b border-zinc-100 text-center text-xs font-semibold text-zinc-500">
          {["月", "火", "水", "木", "金", "土", "日"].map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 divide-x divide-zinc-100">
          {weekDays.map((d) => {
            const isToday = d.iso === todayIso();
            const dayEvents = groupedEvents[d.iso] ?? [];
            const dayTasks = tasks.filter((t) => t.due === d.iso);
            return (
              <div key={d.iso} className="flex min-h-[180px] max-h-[220px] flex-col gap-3 border-b border-zinc-100 p-5">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                      isToday ? "bg-red-500 text-white" : "bg-zinc-100 text-zinc-800"
                    }`}
                  >
                    {d.day}
                  </div>
                  <div className="text-xs text-zinc-500">{d.label}</div>
                </div>
                <div className="space-y-1 overflow-y-auto pr-1 max-h-[160px]">
                  {dayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-100 bg-white px-3 py-2 text-xs shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition hover:shadow-md"
                      onClick={() => onSelectEvent(ev)}
                    >
                      <span className={`h-6 w-1 rounded-full ${ev.tagColor}`} />
                      <div className="flex-1">
                        <div className="font-semibold text-zinc-900">{ev.title}</div>
                        <div className="text-[11px] text-zinc-500">
                          {ev.timeRange}
                          {ev.members.length > 0 && (
                            <span className="ml-1 text-[10px] text-zinc-500">
                              / {ev.members.map((id) => members.find((m) => m.id === id)?.name ?? id).join(", ")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {dayTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-100 bg-white px-3 py-2 text-xs shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition hover:shadow-md"
                      onClick={() => onSelectTask(task)}
                    >
                      <span className={`h-6 w-1 rounded-full ${statusColor(task.status)}`} />
                      <div className="flex-1">
                        <div className="font-semibold text-zinc-900">{task.title}</div>
                        <div className="text-[11px] text-zinc-500">
                          期限: {task.due} / 担当: {task.assignee || "未割当"}
                        </div>
                      </div>
                    </div>
                  ))}
                  {dayEvents.length === 0 && <div className="text-[11px] text-zinc-400">イベントなし</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

function TaskList({ tasks, onSelectTask }: { tasks: Task[]; onSelectTask: (task: Task) => void }) {
  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <ListTodoIcon className="text-zinc-500" />
        <div className="text-sm font-semibold">タスク</div>
      </div>
      <div className="space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex cursor-pointer items-center gap-4 rounded-2xl border border-zinc-100 bg-white px-3 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition hover:shadow-md"
            onClick={() => onSelectTask(task)}
          >
            <span className={`h-10 w-1 rounded-full ${statusColor(task.status)}`} />
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-zinc-50 text-zinc-500">
              <ListTodoIcon className="h-4 w-4" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-zinc-900">{task.title}</div>
              <div className="text-xs text-zinc-500 flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span>期限: {task.due}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <User className="h-4 w-4" strokeWidth={1.5} />
              <span>{task.assignee}</span>
            </div>
            <button className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:opacity-90">
              {task.status === "done" ? "完了済" : "完了"}
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function EventList({
  events,
  members,
  onSelectEvent,
}: {
  events: Event[];
  members: Member[];
  onSelectEvent: (ev: Event) => void;
}) {
  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
          <div className="text-sm font-semibold">イベント一覧</div>
        </div>
        <button className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-800 hover:opacity-90">
          すべて表示
        </button>
      </div>
      <div className="space-y-3">
        {events.map((ev) => (
          <div
            key={ev.id}
            className="flex cursor-pointer items-center gap-4 rounded-2xl border border-zinc-100 bg-white px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition hover:shadow-md"
            onClick={() => onSelectEvent(ev)}
          >
            <span className={`h-12 w-1 rounded-full ${ev.tagColor}`} />
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-50 text-zinc-500">
              <CalendarDays className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="text-sm font-semibold text-zinc-900">{ev.title}</div>
                <span className={`rounded-full px-2 py-0.5 text-[11px] ${ev.tagColor}`}>{ev.tag}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span>
                    {ev.date} / {ev.timeRange}
                  </span>
                </div>
                {ev.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} />
                    <span>{ev.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span>
                    {ev.members
                      .map((id) => members.find((m) => m.id === id)?.name ?? id)
                      .join(", ")}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Tag className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>{ev.tag}</span>
            </div>
            <button
              className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:opacity-90"
              onClick={(e) => {
                e.stopPropagation();
                onSelectEvent(ev);
              }}
            >
              詳細
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function CreateEventModal({
  open,
  onClose,
  createForm,
  setCreateForm,
  onSubmit,
  members,
  message,
}: {
  open: boolean;
  onClose: () => void;
  createForm: {
    title: string;
    date: string;
    start: string;
    end: string;
    location: string;
    memberIds: string[];
    tag: string;
    tagColor: string;
  };
  setCreateForm: React.Dispatch<
    React.SetStateAction<{
      title: string;
      date: string;
      start: string;
      end: string;
      location: string;
      memberIds: string[];
      tag: string;
      tagColor: string;
    }>
  >;
  onSubmit: () => void;
  onClose: () => void;
  members: Member[];
  message: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-xl rounded-3xl border border-zinc-100 bg-white p-6 shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">イベント追加</div>
            <div className="text-xs text-zinc-500">familyId がある場合は API にも送信されます</div>
          </div>
          <button
            className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-800 hover:opacity-90"
            onClick={onClose}
          >
            閉じる
          </button>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <input
            className="rounded-2xl border border-zinc-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none sm:col-span-2"
            placeholder="タイトル"
            value={createForm.title}
            onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))}
          />
          <input
            type="date"
            className="rounded-2xl border border-zinc-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            value={createForm.date}
            onChange={(e) => setCreateForm((p) => ({ ...p, date: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="time"
              className="rounded-2xl border border-zinc-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              value={createForm.start}
              onChange={(e) => setCreateForm((p) => ({ ...p, start: e.target.value }))}
            />
            <input
              type="time"
              className="rounded-2xl border border-zinc-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              value={createForm.end}
              onChange={(e) => setCreateForm((p) => ({ ...p, end: e.target.value }))}
            />
          </div>
          <input
            className="rounded-2xl border border-zinc-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none sm:col-span-2"
            placeholder="場所（任意）"
            value={createForm.location}
            onChange={(e) => setCreateForm((p) => ({ ...p, location: e.target.value }))}
          />
          <div className="sm:col-span-2">
            <div className="mb-1 text-xs text-zinc-500">参加メンバー</div>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => {
                const checked = createForm.memberIds.includes(m.id);
                return (
                  <label
                    key={m.id}
                    className="flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-700"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...createForm.memberIds, m.id]
                          : createForm.memberIds.filter((id) => id !== m.id);
                        setCreateForm((p) => ({ ...p, memberIds: next }));
                      }}
                    />
                    {m.name}
                  </label>
                );
              })}
            </div>
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button
              className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-800 hover:opacity-90"
              onClick={onClose}
            >
              キャンセル
            </button>
            <button
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
              onClick={onSubmit}
            >
              追加して登録
            </button>
          </div>
          {message && (
            <div className="sm:col-span-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">{message}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-zinc-100 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] ${className}`}
    >
      {children}
    </div>
  );
}

function ActionCard({
  icon,
  iconBg,
  title,
  subtitle,
  actionLabel,
  actionTone,
  onAction,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  actionLabel: string;
  actionTone: "primary" | "ghost";
  onAction?: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-zinc-100 bg-white px-3 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${iconBg}`}>{icon}</div>
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-xs text-zinc-500">{subtitle}</div>
        </div>
      </div>
      {actionTone === "primary" ? (
        <button
          onClick={onAction}
          className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90"
        >
          {actionLabel}
        </button>
      ) : (
        <button
          onClick={onAction}
          className="rounded-full bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-800 hover:opacity-90"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function addDaysString(date: Date, days = 0) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function buildWeekDays(anchorIso: string, offset = 0) {
  const anchor = new Date(anchorIso);
  const monday = startOfWeekMonday(anchor);
  monday.setDate(monday.getDate() + offset * 7);
  return Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + idx);
    return {
      iso: d.toISOString().slice(0, 10),
      day: d.getDate(),
      label: `${d.getMonth() + 1}/${d.getDate()}`,
    };
  });
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

function statusColor(status: Task["status"]) {
  if (status === "完了") return "bg-emerald-500";
  if (status === "進行中") return "bg-amber-400";
  return "bg-zinc-300";
}

function formatWeekRange(weekDays: { iso: string }[]) {
  if (weekDays.length === 0) return "";
  const first = new Date(weekDays[0].iso);
  const last = new Date(weekDays[weekDays.length - 1].iso);
  return `${first.getMonth() + 1}/${first.getDate()} - ${last.getMonth() + 1}/${last.getDate()}`;
}

function labelToKey(label: string): SectionKey {
  if (label.includes("クイック")) return "quick";
  if (label.includes("カレンダー") || label.includes("ウィーク")) return "week";
  if (label.includes("タスク")) return "tasks";
  return "events";
}

function ListTodoIcon(props: React.SVGProps<SVGSVGElement>) {
  return <CalendarDays className="h-5 w-5" strokeWidth={1.5} {...props} />;
}
