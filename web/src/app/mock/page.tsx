"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Clock, GripVertical, MapPin, Plus, Tag, User } from "lucide-react";

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
  status: "not_started" | "in_progress" | "done";
};
type SectionKey = "quick" | "week" | "tasks" | "events";

const members: Member[] = [
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

const tasks: Task[] = [
  { id: "t1", title: "受験票印刷", due: addDaysString(new Date(), 1), assignee: "保護者A", status: "in_progress" },
  { id: "t2", title: "持ち物チェック", due: addDaysString(new Date(), 2), assignee: "子どもA", status: "not_started" },
  { id: "t3", title: "会場アクセス確認", due: addDaysString(new Date(), 2), assignee: "保護者A", status: "done" },
];

export default function MockPage() {
  const [familyId, setFamilyId] = useState<string>(process.env.NEXT_PUBLIC_DEFAULT_FAMILY_ID ?? "");
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [message, setMessage] = useState<string>("");
  const [registerForm, setRegisterForm] = useState({ name: "", email: "", password: "" });
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [authLoading, setAuthLoading] = useState(false);
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

  const weekDays = useMemo(() => buildWeekDays(todayIso()), []);
  const groupedEvents = useMemo(() => {
    return events.reduce<Record<string, Event[]>>((acc, ev) => {
      if (!acc[ev.date]) acc[ev.date] = [];
      acc[ev.date].push(ev);
      return acc;
    }, {});
  }, [events]);

  async function handleRegister() {
    if (!registerForm.name.trim() || !registerForm.email.trim() || !registerForm.password.trim()) {
      setMessage("family名・メール・パスワードを入力してください");
      return;
    }
    setAuthLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerForm),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { id: string; name: string; email: string };
      setFamilyId(data.id);
      setMessage("familyを作成して選択しました");
      setRegisterForm({ name: "", email: "", password: "" });
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogin() {
    if (!loginForm.email.trim() || !loginForm.password.trim()) {
      setMessage("メール・パスワードを入力してください");
      return;
    }
    setAuthLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { id: string; name: string; email: string };
      setFamilyId(data.id);
      setMessage("ログインして family を選択しました");
      setLoginForm({ email: "", password: "" });
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLoadFromSession() {
    setAuthLoading(true);
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        setMessage("ログイン情報が見つかりません");
        return;
      }
      const data = (await res.json()) as { id: string; name: string; email?: string };
      setFamilyId(data.id);
      setMessage("Cookieから family を復元しました");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setAuthLoading(false);
    }
  }

  const [order, setOrder] = useState<SectionKey[]>(["quick", "week", "tasks", "events"]);
  const [dragging, setDragging] = useState<SectionKey | null>(null);
  const [over, setOver] = useState<SectionKey | null>(null);

  const sections: Record<
    SectionKey,
    { span: "full" | "half"; render: () => JSX.Element; label: string }
  > = {
    quick: { span: "full", render: () => <QuickActions />, label: "クイックアクション" },
    week: { span: "full", render: () => <WeekView weekDays={weekDays} groupedEvents={groupedEvents} />, label: "カレンダー" },
    tasks: { span: "half", render: () => <TaskList />, label: "タスク" },
    events: { span: "full", render: () => <EventList events={events} />, label: "イベント一覧" },
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
          <div className="flex items-center gap-2 text-sm text-zinc-600">
            <User className="h-4 w-4" strokeWidth={1.5} />
            <span>Demo User</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-6">
        <div className="rounded-2xl border border-zinc-100 bg-white px-4 py-3 text-sm text-zinc-600 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          カードをドラッグ＆ドロップして、お好きな配置に並べ替えできます。
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">家族ID / Google連携前提</div>
                <div className="text-xs text-zinc-500">familyId を指定して API 連携を有効化</div>
              </div>
              <User className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
            </div>
            <input
              value={familyId}
              onChange={(e) => setFamilyId(e.target.value)}
              className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="familyId を入力"
            />
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                className="rounded-full bg-zinc-900 px-3 py-1 font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
                onClick={handleLoadFromSession}
                disabled={authLoading}
              >
                Cookieから読み込む
              </button>
              <button
                className="rounded-full bg-blue-600 px-3 py-1 font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
                onClick={handleRegister}
                disabled={authLoading}
              >
                新規作成
              </button>
              <button
                className="rounded-full bg-zinc-100 px-3 py-1 font-semibold text-zinc-800 hover:opacity-90 disabled:opacity-60"
                onClick={handleLogin}
                disabled={authLoading}
              >
                ログイン
              </button>
              {authLoading && <span className="text-zinc-500">処理中...</span>}
            </div>
            <div className="grid gap-2 text-xs sm:grid-cols-3">
              <input
                className="rounded-2xl border border-zinc-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="family名 / name"
                value={registerForm.name}
                onChange={(e) => setRegisterForm((p) => ({ ...p, name: e.target.value }))}
              />
              <input
                className="rounded-2xl border border-zinc-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="メール"
                value={registerForm.email}
                onChange={(e) => {
                  setRegisterForm((p) => ({ ...p, email: e.target.value }));
                  setLoginForm((p) => ({ ...p, email: e.target.value }));
                }}
              />
              <input
                type="password"
                className="rounded-2xl border border-zinc-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="パスワード"
                value={registerForm.password}
                onChange={(e) => {
                  setRegisterForm((p) => ({ ...p, password: e.target.value }));
                  setLoginForm((p) => ({ ...p, password: e.target.value }));
                }}
              />
            </div>
            {message && <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">{message}</div>}
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">イベント追加（API + ローカルに反映）</div>
                <div className="text-xs text-zinc-500">タイトル・日時を入力して登録</div>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Plus className="h-4 w-4" strokeWidth={1.5} />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
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
                <div className="text-xs text-zinc-500 mb-1">参加メンバー</div>
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
              <div className="sm:col-span-2 flex justify-end">
                <button
                  className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
                  onClick={handleCreateEvent}
                >
                  追加して登録
                </button>
              </div>
            </div>
          </Card>
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

function QuickActions() {
  return (
    <Card className="grid gap-4 sm:grid-cols-3">
      <ActionCard
        icon={<Plus className="h-5 w-5" strokeWidth={1.5} />}
        iconBg="bg-blue-50 text-blue-600"
        title="イベント追加"
        subtitle="新しい予定を登録"
        actionLabel="作成"
        actionTone="primary"
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
}: {
  weekDays: { iso: string; day: number; label: string }[];
  groupedEvents: Record<string, Event[]>;
}) {
  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">ウィークビュー</div>
          <div className="text-xs text-zinc-500">薄い罫線でシンプルに</div>
        </div>
        <div className="flex gap-2">
          <button className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90">
            予定を追加
          </button>
          <button className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-800 hover:opacity-90">
            表示切替
          </button>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-zinc-100 bg-white">
        <div className="grid grid-cols-7 divide-x divide-zinc-100 border-b border-zinc-100 text-center text-xs font-semibold text-zinc-500">
          {["日", "月", "火", "水", "木", "金", "土"].map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 divide-x divide-zinc-100">
          {weekDays.map((d) => {
            const isToday = d.iso === todayIso();
            const dayEvents = groupedEvents[d.iso] ?? [];
            return (
              <div key={d.iso} className="flex h-36 flex-col gap-3 border-b border-zinc-100 p-5">
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
                <div className="space-y-1">
                  {dayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="flex items-center gap-2 rounded-xl border border-zinc-100 bg-white px-3 py-2 text-xs shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                    >
                      <span className={`h-6 w-1 rounded-full ${ev.tagColor}`} />
                      <div className="flex-1">
                        <div className="font-semibold text-zinc-900">{ev.title}</div>
                        <div className="text-[11px] text-zinc-500">{ev.timeRange}</div>
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

function TaskList() {
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
            className="flex items-center gap-4 rounded-2xl border border-zinc-100 bg-white px-3 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
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

function EventList({ events }: { events: Event[] }) {
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
            className="flex items-center gap-4 rounded-2xl border border-zinc-100 bg-white px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
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
            <button className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:opacity-90">
              詳細
            </button>
          </div>
        ))}
      </div>
    </Card>
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
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  actionLabel: string;
  actionTone: "primary" | "ghost";
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
        <button className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90">
          {actionLabel}
        </button>
      ) : (
        <button className="rounded-full bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-800 hover:opacity-90">
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

function buildWeekDays(anchorIso: string) {
  const anchor = new Date(anchorIso);
  const day = anchor.getDay();
  const sunday = new Date(anchor);
  sunday.setDate(anchor.getDate() - day);
  return Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + idx);
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

function statusColor(status: Task["status"]) {
  if (status === "done") return "bg-emerald-500";
  if (status === "in_progress") return "bg-amber-400";
  return "bg-zinc-300";
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
