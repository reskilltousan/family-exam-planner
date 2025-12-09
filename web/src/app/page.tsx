"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { Importance, EventType, TaskStatus, Role } from "@prisma/client";
import { detectConflicts } from "@/lib/conflict";

type Member = {
  id: string;
  name: string;
  role: Role;
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

type TemplateTask = {
  id: string;
  title: string;
  daysBeforeEvent?: number | null;
};

type Template = {
  id: string;
  name: string;
  description?: string | null;
  eventType?: EventType | null;
  tasks: TemplateTask[];
  tags?: string[] | null;
};

type ExternalEvent = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  source: string;
  organizer?: string | null;
  location?: string | null;
};

type EventNote = {
  id: string;
  content: string;
  createdBy?: string | null;
  createdAt: string;
};

type GoogleState = {
  connected: boolean;
  expired: boolean;
  expiresAt: string | null;
  lastSyncedAt: string | null;
  hasRefreshToken: boolean;
  externalEventsCount: number;
};

type CalendarItem = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  source: "app" | "google";
  importance?: Importance;
  participants?: string[];
  location?: string | null;
  rawId?: string;
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
  const [filterMember, setFilterMember] = useState<string>("all");
  const [filterType, setFilterType] = useState<"all" | EventType>("all");
  const [eventErrors, setEventErrors] = useState<Record<string, string>>({});
  const [newFamilyName, setNewFamilyName] = useState("");
  const [registerForm, setRegisterForm] = useState({ name: "", email: "", password: "" });
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerErrors, setRegisterErrors] = useState<Record<string, string>>({});
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});
  const [selectedEvent, setSelectedEvent] = useState<
    { kind: "app"; event: Event } | { kind: "google"; event: ExternalEvent } | null
  >(null);
  const [newTemplate, setNewTemplate] = useState<{
    name: string;
    description: string;
    eventType: EventType | "";
    tasks: { title: string; daysBeforeEvent: number | null; position: number }[];
    tags: string;
  }>({
    name: "",
    description: "",
    eventType: "",
    tasks: [],
    tags: "",
  });
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  const [newEvent, setNewEvent] = useState({
    title: "",
    startAt: "",
    endAt: "",
    type: EventType.exam as EventType,
    importance: Importance.must as Importance,
    participantIds: [] as string[],
    templateId: "",
  });

  useEffect(() => {
    const saved = window.localStorage.getItem("familyId");
    if (!defaultFamily && saved) {
      setFamilyId(saved);
    }
  }, [defaultFamily]);

  useEffect(() => {
    if (familyId) {
      window.localStorage.setItem("familyId", familyId);
    }
  }, [familyId]);

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

  const { data: templates, mutate: mutateTemplates } = useSWR<Template[]>(
    familyId ? "/api/templates" : "/api/templates",
    fetcher,
  );
  const [templateSearch, setTemplateSearch] = useState("");
  const filteredTemplates = useMemo(() => {
    const keyword = templateSearch.trim().toLowerCase();
    if (!keyword) return templates ?? [];
    return (templates ?? []).filter((t) => {
      const haystack = [
        t.name ?? "",
        t.description ?? "",
        ...(t.tags ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [templates, templateSearch]);

  const {
    data: externalEvents,
    mutate: mutateExternal,
    isLoading: loadingExternal,
    error: externalError,
  } = useSWR<ExternalEvent[]>(familyId ? "/api/google/events" : null, fetcher);

  const {
    data: googleState,
    mutate: mutateGoogleState,
    error: googleStateError,
  } = useSWR<GoogleState>(familyId ? "/api/google/state" : null, fetcher);

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

  const calendarItems = useMemo(() => {
    const internal = filteredEvents.map<CalendarItem>((ev) => ({
      id: ev.id,
      title: ev.title,
      startAt: ev.startAt,
      endAt: ev.endAt,
      importance: ev.importance,
      participants: ev.participants.map((p) => p.member?.name ?? p.memberId),
      source: "app",
      location: ev.location ?? null,
    }));
    const external = (externalEvents ?? []).map<CalendarItem>((ev) => ({
      id: `ext-${ev.id}`,
      rawId: ev.id,
      title: ev.title,
      startAt: ev.startAt,
      endAt: ev.endAt,
      source: "google",
      location: ev.location ?? null,
    }));
    return [...internal, ...external];
  }, [filteredEvents, externalEvents]);

  async function handleCreateEvent() {
    if (!familyId) {
      setMessage("familyId is required");
      return;
    }
    const errors: Record<string, string> = {};
    if (!newEvent.title) errors.title = "タイトルを入力してください";
    if (!newEvent.startAt) errors.startAt = "開始日時を入力してください";
    if (!newEvent.endAt) errors.endAt = "終了日時を入力してください";
    if (newEvent.startAt && newEvent.endAt) {
      const start = new Date(newEvent.startAt);
      const end = new Date(newEvent.endAt);
      if (end <= start) {
        errors.endAt = "終了日時は開始より後にしてください";
      }
    }
    setEventErrors(errors);
    if (Object.keys(errors).length > 0) return;

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
      setMessage("イベントを追加しました");
      await mutateEvents();
    } catch (e) {
      setMessage((e as Error).message);
    }
  }

  async function handleAddTask(
    eventId: string,
    task: { title: string; dueDate?: string; assigneeId?: string },
  ) {
    if (!familyId || !task.title) return;
    try {
      await fetch("/api/events/" + eventId + "/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-family-id": familyId,
        },
        body: JSON.stringify(task),
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
    if (!window.confirm("タスクを削除しますか？")) return;
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

  async function handleAddMember(name: string, role: Role, grade?: string) {
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

  async function handleUpdateMember(member: Member) {
    if (!familyId) return;
    try {
      await fetch("/api/members", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-family-id": familyId },
        body: JSON.stringify(member),
      });
      await mutateMembers();
    } catch (e) {
      setMessage((e as Error).message);
    }
  }

  async function handleDeleteMember(memberId: string) {
    if (!familyId) return;
    if (!window.confirm("メンバーを削除し、担当タスクを未割当に戻しますか？")) return;
    try {
      await fetch("/api/members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "x-family-id": familyId },
        body: JSON.stringify({ id: memberId }),
      });
      await mutateMembers();
      await mutateEvents();
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

  async function handleUpdateEvent(eventId: string, payload: Omit<Event, "participants" | "tasks" | "notes"> & { participantIds: string[] }) {
    if (!familyId) return;
    try {
      await fetch(`/api/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-family-id": familyId },
        body: JSON.stringify(payload),
      });
      await mutateEvents();
      setMessage("イベントを更新しました");
    } catch (e) {
      setMessage((e as Error).message);
    }
  }

  async function handleCreateFamily() {
    if (!newFamilyName.trim()) {
      setMessage("family名を入力してください");
      return;
    }
    try {
      const res = await fetch("/api/families", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFamilyName.trim() }),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const data = (await res.json()) as { id: string };
      setFamilyId(data.id);
      setMessage("familyを作成し選択しました");
      setNewFamilyName("");
      await mutateMembers();
      await mutateEvents();
      await mutateExternal();
      await mutateGoogleState();
    } catch (e) {
      setMessage((e as Error).message);
    }
  }

  async function handleRegister() {
    const errors: Record<string, string> = {};
    if (!registerForm.name.trim()) errors.name = "family名を入力してください";
    if (!registerForm.email.trim()) errors.email = "emailを入力してください";
    if (!registerForm.password.trim()) errors.password = "passwordを入力してください";
    if (registerForm.password && registerForm.password.length < 6) errors.password = "6文字以上で入力してください";
    setRegisterErrors(errors);
    if (Object.keys(errors).length > 0) return;
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerForm),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "登録に失敗しました");
      }
      const data = (await res.json()) as { id: string; name: string; email: string };
      setFamilyId(data.id);
      setMessage("familyを新規登録し選択しました");
      setRegisterForm({ name: "", email: "", password: "" });
      setRegisterErrors({});
      await mutateMembers();
      await mutateEvents();
      await mutateExternal();
      await mutateGoogleState();
    } catch (e) {
      setMessage((e as Error).message);
    }
  }

  async function handleLogin() {
    const errors: Record<string, string> = {};
    if (!loginForm.email.trim()) errors.email = "emailを入力してください";
    if (!loginForm.password.trim()) errors.password = "passwordを入力してください";
    setLoginErrors(errors);
    if (Object.keys(errors).length > 0) return;
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "ログインに失敗しました");
      }
      const data = (await res.json()) as { id: string; name: string; email: string };
      setFamilyId(data.id);
      setMessage("familyにログインし選択しました");
      setLoginForm({ email: "", password: "" });
      setLoginErrors({});
      await mutateMembers();
      await mutateEvents();
      await mutateExternal();
      await mutateGoogleState();
    } catch (e) {
      setMessage((e as Error).message);
    }
  }

  async function handleDeleteEvent(eventId: string) {
    if (!familyId) return;
    try {
      await fetch(`/api/events/${eventId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "x-family-id": familyId },
      });
      await mutateEvents();
      setSelectedEvent(null);
      setMessage("イベントを削除しました");
    } catch (e) {
      setMessage((e as Error).message);
    }
  }

  async function handleCreateTemplate() {
    if (!newTemplate.name.trim()) {
      setMessage("テンプレート名を入力してください");
      return;
    }
    try {
      const payload = {
        name: newTemplate.name.trim(),
        description: newTemplate.description || undefined,
        eventType: newTemplate.eventType || undefined,
        tasks: newTemplate.tasks.filter((t) => t.title.trim()),
        tags: newTemplate.tags
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };
      const method = editingTemplateId ? "PUT" : "POST";
      const body = editingTemplateId ? { id: editingTemplateId, ...payload } : payload;
      await fetch("/api/templates", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setNewTemplate({ name: "", description: "", eventType: "", tasks: [], tags: "" });
      setEditingTemplateId(null);
      setMessage(editingTemplateId ? "テンプレートを更新しました" : "テンプレートを作成しました");
      await mutateTemplates();
    } catch (e) {
      setMessage((e as Error).message);
    }
  }

  async function handleDeleteTemplate(id: string) {
    const ok = window.confirm("テンプレートを削除しますか？");
    if (!ok) return;
    try {
      await fetch(`/api/templates?id=${id}`, { method: "DELETE" });
      setMessage("テンプレートを削除しました");
      if (editingTemplateId === id) {
        setEditingTemplateId(null);
        setNewTemplate({ name: "", description: "", eventType: "", tasks: [] });
      }
      await mutateTemplates();
    } catch (e) {
      setMessage((e as Error).message);
    }
  }

  const groupedEvents = useMemo(
    () => groupEventsByDay(filteredEvents, viewMode),
    [filteredEvents, viewMode],
  );
  const conflictEvents = useMemo(
    () => filteredEvents.filter((ev) => conflictIds.has(ev.id)),
    [filteredEvents, conflictIds],
  );

  function handleSelectCalendar(item: CalendarItem) {
    if (item.source === "app") {
      const ev = filteredEvents.find((e) => e.id === item.id);
      if (ev) setSelectedEvent({ kind: "app", event: ev });
    } else {
      const targetId = item.rawId ?? item.id.replace("ext-", "");
      const ev = externalEvents?.find((e) => e.id === targetId);
      if (ev) setSelectedEvent({ kind: "google", event: ev });
    }
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <header className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Family Exam Planner</h1>
          <p className="text-sm text-zinc-600">イベント、タスク、Google予定を家族で一元管理</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
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
                mutateGoogleState();
              }}
              className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              disabled={!familyId}
            >
              Sync data
            </button>
          </div>
        </div>
      </header>

      {message && (
        <div className="mx-auto max-w-6xl px-6 pb-2 text-sm text-red-600">{message}</div>
      )}

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 pb-12">
        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">FamilyとGoogle連携状態</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 text-sm">
              <div className="rounded border border-zinc-200 p-3">
                <div className="text-xs text-zinc-500">現在のfamilyId</div>
                <div className="flex items-center gap-2">
                  <div className="font-mono text-sm">{familyId || "未選択"}</div>
                  {familyId && (
                    <button
                      onClick={() => navigator.clipboard?.writeText(familyId)}
                      className="rounded border border-zinc-300 px-2 py-1 text-[11px]"
                    >
                      copy
                    </button>
                  )}
                  {familyId && (
                    <button
                      onClick={() => {
                        setFamilyId("");
                        setSelectedEvent(null);
                      }}
                      className="rounded border border-zinc-300 px-2 py-1 text-[11px]"
                    >
                      クリア
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 rounded border border-zinc-300 px-3 py-2 text-sm"
                  placeholder="新規family名"
                  value={newFamilyName}
                  onChange={(e) => setNewFamilyName(e.target.value)}
                />
                <button
                  onClick={handleCreateFamily}
                  className="rounded bg-emerald-600 px-3 py-2 text-white"
                >
                  作成して選択
                </button>
              </div>
              <div className="rounded border border-zinc-200 p-3 space-y-2">
                <div className="text-xs font-semibold text-zinc-700">サインアップ</div>
              <input
                className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                placeholder="family名"
                value={registerForm.name}
                onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
              />
              {registerErrors.name && <div className="text-xs text-red-600">{registerErrors.name}</div>}
              <input
                className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                placeholder="email"
                value={registerForm.email}
                onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
              />
              {registerErrors.email && <div className="text-xs text-red-600">{registerErrors.email}</div>}
              <input
                type="password"
                className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                placeholder="password (6文字以上)"
                value={registerForm.password}
                onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
              />
              {registerErrors.password && <div className="text-xs text-red-600">{registerErrors.password}</div>}
              <button
                className="rounded bg-emerald-600 px-3 py-2 text-white"
                onClick={handleRegister}
              >
                サインアップして選択
                </button>
              </div>
              <div className="rounded border border-zinc-200 p-3 space-y-2">
                <div className="text-xs font-semibold text-zinc-700">ログイン</div>
              <input
                className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                placeholder="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
              />
              {loginErrors.email && <div className="text-xs text-red-600">{loginErrors.email}</div>}
              <input
                type="password"
                className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                placeholder="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              />
              {loginErrors.password && <div className="text-xs text-red-600">{loginErrors.password}</div>}
              <button
                className="rounded bg-blue-600 px-3 py-2 text-white"
                onClick={handleLogin}
              >
                ログインして選択
                </button>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded px-2 py-1 text-xs font-semibold ${
                    googleState?.connected ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-700"
                  }`}
                >
                  {googleState?.connected ? "Google連携済" : "未連携"}
                </span>
                {googleState?.expired && (
                  <span className="rounded bg-red-100 px-2 py-1 text-[11px] text-red-700">トークン期限切れ</span>
                )}
                {googleState?.hasRefreshToken && (
                  <span className="rounded bg-blue-100 px-2 py-1 text-[11px] text-blue-700">
                    refresh token 保持
                  </span>
                )}
              </div>
              {googleStateError && (
                <div className="text-xs text-red-600">
                  Google状態取得エラー: {(googleStateError as Error).message}
                </div>
              )}
              <div className="text-xs text-zinc-600">
                最終同期:{" "}
                {googleState?.lastSyncedAt
                  ? new Date(googleState.lastSyncedAt).toLocaleString()
                  : "未取得"}
              </div>
              <div className="text-xs text-zinc-600">
                有効期限: {googleState?.expiresAt ? new Date(googleState.expiresAt).toLocaleString() : "不明"}
              </div>
              <div className="text-xs text-zinc-600">
                取得済み予定: {googleState?.externalEventsCount ?? 0} 件
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={async () => {
                    try {
                      await mutateExternal();
                      await mutateGoogleState();
                      setMessage("");
                    } catch (err) {
                      setMessage(`Google予定取得に失敗: ${(err as Error).message}`);
                    }
                  }}
                  disabled={!familyId || loadingExternal}
                  className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {loadingExternal ? "取得中..." : "外部イベント再取得"}
                </button>
                <a
                  className="text-xs text-blue-600 underline"
                  href={`/api/google/auth?familyId=${familyId}`}
                >
                  Google連携を開始/再認可する
                </a>
                {externalError && (
                  <div className="text-xs text-red-600">
                    外部イベント取得エラー: {(externalError as Error).message}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">タスクテンプレート管理</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 text-sm">
              <input
                className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                placeholder="テンプレート名"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
              />
              <input
                className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                placeholder="説明 (任意)"
                value={newTemplate.description}
                onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
              />
              <select
                className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                value={newTemplate.eventType}
                onChange={(e) => setNewTemplate({ ...newTemplate, eventType: e.target.value as EventType | "" })}
              >
                <option value="">イベントタイプ未指定</option>
                {Object.values(EventType).map((t) => (
                  <option key={t} value={t}>
                    {typeLabel[t as EventType]}
                  </option>
                ))}
              </select>
              <input
                className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                placeholder="タグ（カンマ区切り）例: 模試,準備"
                value={newTemplate.tags}
                onChange={(e) => setNewTemplate({ ...newTemplate, tags: e.target.value })}
              />
              <div className="rounded border border-zinc-200 p-2">
                <div className="text-xs font-semibold">タスク定義</div>
                <div className="space-y-2">
                  {newTemplate.tasks
                    .slice()
                    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                    .map((t, idx) => (
                    <div key={`${t.title}-${idx}`} className="flex items-center gap-2">
                      <input
                        className="flex-1 rounded border border-zinc-300 px-2 py-1 text-xs"
                        placeholder="タスク名"
                        value={t.title}
                        onChange={(e) => {
                          const next = [...newTemplate.tasks];
                          next[idx] = { ...next[idx], title: e.target.value };
                          setNewTemplate({ ...newTemplate, tasks: next });
                        }}
                      />
                      <input
                        type="number"
                        className="w-28 rounded border border-zinc-300 px-2 py-1 text-xs"
                        placeholder="何日前"
                        value={t.daysBeforeEvent ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          const next = [...newTemplate.tasks];
                          next[idx] = {
                            ...next[idx],
                            daysBeforeEvent: val === "" ? null : Number(val),
                          };
                          setNewTemplate({ ...newTemplate, tasks: next });
                        }}
                      />
                      <div className="flex items-center gap-1">
                        <button
                          className="rounded border border-zinc-300 px-2 py-1 text-[11px]"
                          onClick={() => {
                            const next = [...newTemplate.tasks];
                            if (idx > 0) {
                              [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                            }
                            setNewTemplate({
                              ...newTemplate,
                              tasks: next.map((task, i) => ({ ...task, position: i })),
                            });
                          }}
                          disabled={idx === 0}
                        >
                          ↑
                        </button>
                        <button
                          className="rounded border border-zinc-300 px-2 py-1 text-[11px]"
                          onClick={() => {
                            const next = [...newTemplate.tasks];
                            if (idx < next.length - 1) {
                              [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
                            }
                            setNewTemplate({
                              ...newTemplate,
                              tasks: next.map((task, i) => ({ ...task, position: i })),
                            });
                          }}
                          disabled={idx === newTemplate.tasks.length - 1}
                        >
                          ↓
                        </button>
                      </div>
                      <button
                        className="rounded border border-red-400 px-2 py-1 text-[11px] text-red-600"
                        onClick={() => {
                          const next = newTemplate.tasks.filter((_, i) => i !== idx);
                          setNewTemplate({
                            ...newTemplate,
                            tasks: next.map((task, i) => ({ ...task, position: i })),
                          });
                        }}
                      >
                        削除
                      </button>
                    </div>
                  ))}
                  <button
                    className="rounded border border-zinc-300 px-2 py-1 text-xs"
                    onClick={() =>
                      setNewTemplate({
                        ...newTemplate,
                        tasks: [
                          ...newTemplate.tasks,
                          { title: "", daysBeforeEvent: null, position: newTemplate.tasks.length },
                        ],
                      })
                    }
                  >
                    + タスク行を追加
                  </button>
                </div>
              </div>
              <button
                onClick={handleCreateTemplate}
                className="rounded bg-emerald-600 px-3 py-2 text-white"
              >
                {editingTemplateId ? "テンプレートを更新" : "テンプレートを作成"}
              </button>
              {editingTemplateId && (
                <button
                  className="rounded border border-zinc-300 px-3 py-2 text-sm"
                  onClick={() => {
                    setEditingTemplateId(null);
                    setNewTemplate({ name: "", description: "", eventType: "", tasks: [], tags: "" });
                  }}
                >
                  編集をキャンセル
                </button>
              )}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex flex-col gap-2 rounded border border-zinc-200 p-2">
                <input
                  className="rounded border border-zinc-300 px-2 py-1 text-sm"
                  placeholder="テンプレ検索（名前/説明/タグ）"
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                />
              </div>
              {filteredTemplates.map((t) => (
                    <div key={t.id} className="rounded border border-zinc-200 p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{t.name}</div>
                    <div className="flex gap-2">
                      <button
                        className="rounded border border-zinc-400 px-2 py-1 text-[11px]"
                        onClick={() => {
                        setEditingTemplateId(t.id);
                        setNewTemplate({
                          name: t.name,
                          description: t.description ?? "",
                          eventType: (t.eventType as EventType | "") ?? "",
                          tasks: t.tasks
                              .map((task, idx) => ({
                                title: task.title,
                                daysBeforeEvent: task.daysBeforeEvent ?? null,
                                position: task.position ?? idx,
                              }))
                              .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
                          tags: (t.tags ?? []).join(","),
                        });
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      編集
                    </button>
                      <button
                        className="rounded border border-zinc-400 px-2 py-1 text-[11px]"
                        onClick={() => {
                          setEditingTemplateId(null);
                          setNewTemplate({
                            name: `${t.name}のコピー`,
                            description: t.description ?? "",
                            eventType: (t.eventType as EventType | "") ?? "",
                            tasks: t.tasks
                              .map((task, idx) => ({
                                title: task.title,
                                daysBeforeEvent: task.daysBeforeEvent ?? null,
                                position: task.position ?? idx,
                              }))
                              .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
                            tags: (t.tags ?? []).join(","),
                          });
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        複製
                      </button>
                      <button
                        className="rounded border border-red-400 px-2 py-1 text-[11px] text-red-600"
                        onClick={() => handleDeleteTemplate(t.id)}
                      >
                        削除
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-zinc-600">
                    {t.eventType ? typeLabel[t.eventType] : "タイプ未指定"}
                  </div>
                  {t.description && <div className="text-xs text-zinc-600">{t.description}</div>}
                  <ul className="mt-1 list-disc pl-4 text-xs text-zinc-700">
                    {t.tasks
                      .slice()
                      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                      .map((task) => (
                      <li key={task.id}>
                        {task.title}
                        {task.daysBeforeEvent != null && ` / イベント${task.daysBeforeEvent}日前`}
                      </li>
                    ))}
                    {t.tasks.length === 0 && <li>タスクなし</li>}
                  </ul>
                  {t.tags && t.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 text-[11px] text-zinc-600">
                      {t.tags.map((tag) => (
                        <span key={tag} className="rounded bg-zinc-100 px-2 py-0.5">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {filteredTemplates.length === 0 && (
                <div className="text-xs text-zinc-500">テンプレートがありません</div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">イベント作成</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <input
                className="rounded border border-zinc-300 px-3 py-2 text-sm"
                placeholder="タイトル"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
              />
              {eventErrors.title && <span className="text-xs text-red-600">{eventErrors.title}</span>}
            </div>
            <div className="flex flex-col gap-1">
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
              {(eventErrors.startAt || eventErrors.endAt) && (
                <span className="text-xs text-red-600">
                  {eventErrors.startAt ?? eventErrors.endAt}
                </span>
              )}
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
              onChange={(e) => setNewEvent({ ...newEvent, importance: e.target.value as Importance })}
            >
              {Object.values(Importance).map((v) => (
                <option key={v} value={v}>
                  {importanceLabel[v as Importance]}
                </option>
              ))}
            </select>
            <select
              className="rounded border border-zinc-300 px-3 py-2 text-sm"
              value={newEvent.templateId}
              onChange={(e) => setNewEvent({ ...newEvent, templateId: e.target.value })}
            >
              <option value="">テンプレートなし</option>
              {(templates ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
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
          {newEvent.templateId && (
            <div className="mt-2 rounded border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
              <div className="font-semibold">選択中テンプレートのタスク</div>
              <ul className="mt-1 list-disc pl-5">
                {(templates ?? [])
                  .find((t) => t.id === newEvent.templateId)
                  ?.tasks.map((t) => (
                    <li key={t.id}>
                      {t.title}
                      {t.daysBeforeEvent != null && ` / イベント${t.daysBeforeEvent}日前`}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">カレンダー</h2>
            <div className="flex gap-2 text-sm">
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
                onChange={(e) => setFilterType(e.target.value as EventType | "all")}
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

          {viewMode === "week" ? (
            <WeekCalendar items={calendarItems} conflictIds={conflictIds} onSelect={handleSelectCalendar} />
          ) : (
            <MonthCalendar items={calendarItems} conflictIds={conflictIds} onSelect={handleSelectCalendar} />
          )}
          {selectedEvent && (
            <SelectedEventDetail
              selected={selectedEvent}
              members={members ?? []}
              conflicted={selectedEvent.kind === "app" ? conflictIds.has(selectedEvent.event.id) : false}
              onClose={() => setSelectedEvent(null)}
              onUpdate={handleUpdateEvent}
              onDelete={handleDeleteEvent}
            />
          )}
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">メンバー管理</h2>
          <MemberForm onAdd={handleAddMember} />
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {(members ?? []).map((m) => (
              <EditableMemberCard
                key={m.id}
                member={m}
                onSave={handleUpdateMember}
                onDelete={handleDeleteMember}
              />
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold">イベント & タスク</h2>
          </div>
          <div className="mt-3 space-y-3">
            {groupedEvents.map(({ label, events: dayEvents }) => (
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
                          {conflicted && (
                            <span className="text-xs font-semibold text-red-600">WARN conflict</span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-600">
                          {formatDateTime(ev.startAt)} - {formatDateTime(ev.endAt)}
                        </div>
                        <div className="text-xs text-zinc-700">
                          参加者: {ev.participants.map((p) => p.member?.name ?? p.memberId).join(", ")}
                        </div>
                        <TaskList
                          tasks={ev.tasks}
                          members={members ?? []}
                          onAdd={(task) => handleAddTask(ev.id, task)}
                          onUpdate={(task, updates) => handleUpdateTask(ev.id, task, updates)}
                          onDelete={(taskId) => handleDeleteTask(ev.id, taskId)}
                        />
                        <NotesSection eventId={ev.id} notes={ev.notes} onAdd={handleAddNote} />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {filteredEvents.length === 0 && (
              <div className="text-sm text-zinc-500">該当するイベントがありません</div>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">コンフリクト一覧（must同士）</h2>
          <div className="mt-2 space-y-2 text-sm">
            {conflictEvents.map((ev) => (
              <div key={ev.id} className="rounded border border-red-300 bg-red-50 p-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{ev.title}</div>
                  <span className="rounded bg-red-100 px-2 py-0.5 text-[11px] text-red-700">conflict</span>
                </div>
                <div className="text-xs text-zinc-700">
                  {formatDateTime(ev.startAt)} - {formatDateTime(ev.endAt)}
                </div>
                <div className="text-xs text-zinc-700">
                  参加者: {ev.participants.map((p) => p.member?.name ?? p.memberId).join(", ")}
                </div>
              </div>
            ))}
            {conflictEvents.length === 0 && (
              <div className="text-xs text-zinc-500">mustイベントの衝突はありません</div>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">子ども別ビュー（簡易）</h2>
          <div className="mt-2 space-y-2 text-sm">
            {(members ?? [])
              .filter((m) => m.role === "child")
              .map((child) => {
                const childEvents = filteredEvents.filter((ev) =>
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

function MemberForm({ onAdd }: { onAdd: (name: string, role: Role, grade?: string) => void }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("parent");
  const [grade, setGrade] = useState("");
  const [error, setError] = useState("");
  return (
    <div className="mt-2 flex flex-col gap-2 text-sm">
      <div className="flex flex-wrap gap-2">
        <input
          className="flex-1 rounded border border-zinc-300 px-3 py-2 text-sm"
          placeholder="名前"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select
          className="rounded border border-zinc-300 px-3 py-2 text-sm"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
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
        <button
          onClick={() => {
            if (!name.trim()) {
              setError("名前を入力してください");
              return;
            }
            onAdd(name, role, grade || undefined);
            setName("");
            setError("");
          }}
          className="rounded bg-emerald-600 px-3 py-2 text-white"
        >
          追加
        </button>
      </div>
      {error && <div className="text-xs text-red-600">{error}</div>}
    </div>
  );
}

function EditableMemberCard({
  member,
  onSave,
  onDelete,
}: {
  member: Member;
  onSave: (member: Member) => void;
  onDelete: (id: string) => void;
}) {
  const [draft, setDraft] = useState<Member>(member);
  const [error, setError] = useState("");
  useEffect(() => {
    setDraft(member);
    setError("");
  }, [member]); // eslint-disable-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  return (
    <div className="rounded border border-zinc-200 p-3 text-sm">
      <div className="flex flex-col gap-2">
        <input
          className="rounded border border-zinc-300 px-2 py-1"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
        <div className="flex gap-2">
          <select
            className="rounded border border-zinc-300 px-2 py-1"
            value={draft.role}
            onChange={(e) => setDraft({ ...draft, role: e.target.value as Role })}
          >
            <option value="parent">parent</option>
            <option value="child">child</option>
          </select>
          <input
            className="flex-1 rounded border border-zinc-300 px-2 py-1"
            placeholder="学年 (任意)"
            value={draft.grade ?? ""}
            onChange={(e) => setDraft({ ...draft, grade: e.target.value })}
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (!draft.name.trim()) {
                setError("名前を入力してください");
                return;
              }
              onSave(draft);
              setError("");
            }}
            className="rounded bg-blue-600 px-3 py-1 text-white"
          >
            保存
          </button>
          <button
            onClick={() => onDelete(member.id)}
            className="rounded border border-red-500 px-3 py-1 text-red-600"
          >
            削除
          </button>
        </div>
        {error && <div className="text-xs text-red-600">{error}</div>}
      </div>
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

function WeekCalendar({
  items,
  conflictIds,
  onSelect,
}: {
  items: CalendarItem[];
  conflictIds: Set<string>;
  onSelect?: (item: CalendarItem) => void;
}) {
  const startHour = 6;
  const endHour = 22;
  const start = startOfWeekMonday(new Date());
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const containerHeight = (endHour - startHour) * 60;

  return (
    <div className="mt-3">
      <div className="grid grid-cols-[80px_repeat(7,1fr)] gap-2 text-xs font-semibold text-zinc-700">
        <div />
        {days.map((d) => (
          <div key={d.toISOString()} className="text-center">
            {formatWeekday(d)} <span className="text-zinc-500">{formatMonthDay(d)}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-[80px_repeat(7,1fr)] gap-2">
        <div className="flex flex-col text-[10px] text-zinc-500">
          {Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i).map((h) => (
            <div key={h} className="h-[60px] border-t border-zinc-200">
              {h}:00
            </div>
          ))}
        </div>
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className="relative h-[960px] rounded border border-zinc-200 bg-zinc-50"
          >
            {items
              .filter((ev) => isSameDay(new Date(ev.startAt), day))
              .map((ev) => {
                const startDate = new Date(ev.startAt);
                const endDate = new Date(ev.endAt);
                const topMinutes = Math.max(
                  0,
                  (startDate.getHours() - startHour) * 60 + startDate.getMinutes(),
                );
                const duration = Math.max(
                  30,
                  (endDate.getTime() - startDate.getTime()) / 60000,
                );
                const top = (topMinutes / (endHour - startHour) / 60) * containerHeight;
                const height = (duration / (endHour - startHour) / 60) * containerHeight;
                const isConflict = ev.source === "app" && conflictIds.has(ev.id);
                return (
                  <div
                    key={ev.id}
                    className={`absolute left-1 right-1 overflow-hidden rounded border text-xs shadow-sm ${
                      ev.source === "google" ? "bg-blue-100 border-blue-200" : "bg-white border-zinc-200"
                    } ${isConflict ? "border-red-500" : ""}`}
                    style={{ top, height }}
                    onClick={() => onSelect?.(ev)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelect?.(ev);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between px-2 py-1">
                      <span className="font-semibold">{ev.title}</span>
                      <span className="text-[10px] text-zinc-500">
                        {ev.source === "google" ? "Google" : "App"}
                      </span>
                    </div>
                    <div className="px-2 pb-2 text-[11px] text-zinc-600">
                      {formatTime(startDate)} - {formatTime(endDate)}
                      {ev.participants && ev.participants.length > 0 && (
                        <div className="truncate text-[10px] text-zinc-500">
                          {ev.participants.join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthCalendar({
  items,
  conflictIds,
  onSelect,
}: {
  items: CalendarItem[];
  conflictIds: Set<string>;
  onSelect?: (item: CalendarItem) => void;
}) {
  const now = new Date();
  const start = startOfWeekMonday(new Date(now.getFullYear(), now.getMonth(), 1));
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));

  return (
    <div className="mt-3 grid grid-cols-7 gap-2 text-xs">
      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
        <div key={d} className="text-center font-semibold text-zinc-700">
          {d}
        </div>
      ))}
      {days.map((day) => {
        const dayEvents = items.filter((ev) => isSameDay(new Date(ev.startAt), day));
        return (
          <div
            key={day.toISOString()}
            className={`min-h-[120px] rounded border border-zinc-200 bg-white p-2 ${
              day.getMonth() === now.getMonth() ? "" : "bg-zinc-50 text-zinc-400"
            }`}
          >
            <div className="mb-1 text-[11px] font-semibold">{day.getDate()}</div>
            <div className="space-y-1">
              {dayEvents.map((ev) => {
                const isConflict = ev.source === "app" && conflictIds.has(ev.id);
                return (
                  <div
                    key={ev.id}
                    className={`rounded px-2 py-1 text-[10px] ${
                      ev.source === "google"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-emerald-100 text-emerald-800"
                    } ${isConflict ? "border border-red-500" : ""}`}
                    onClick={() => onSelect?.(ev)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelect?.(ev);
                      }
                    }}
                  >
                    <div className="font-semibold truncate">{ev.title}</div>
                    <div className="text-[10px]">
                      {formatTime(new Date(ev.startAt))} - {formatTime(new Date(ev.endAt))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function groupEventsByDay(events: Event[], mode: "week" | "month") {
  const now = new Date();
  const start = mode === "week" ? startOfWeekMonday(now) : startOfWeekMonday(new Date(now.getFullYear(), now.getMonth(), 1));
  const end = new Date(start);
  if (mode === "week") {
    end.setDate(start.getDate() + 7);
  } else {
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

function startOfWeekMonday(date: Date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Monday=0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(val: string) {
  return new Date(val).toLocaleString();
}

function formatWeekday(d: Date) {
  return ["月", "火", "水", "木", "金", "土", "日"][(d.getDay() + 6) % 7];
}

function formatMonthDay(d: Date) {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function SelectedEventDetail({
  selected,
  members,
  conflicted,
  onClose,
  onUpdate,
  onDelete,
}: {
  selected: { kind: "app"; event: Event } | { kind: "google"; event: ExternalEvent };
  members: Member[];
  conflicted: boolean;
  onClose: () => void;
  onUpdate: (eventId: string, payload: Omit<Event, "participants" | "tasks" | "notes"> & { participantIds: string[] }) => Promise<void>;
  onDelete: (eventId: string) => Promise<void>;
}) {
  const isApp = selected.kind === "app";
  const ev = selected.event as Event & ExternalEvent;
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: isApp ? (ev as Event).title : ev.title,
    startAt: ev.startAt.slice(0, 16),
    endAt: ev.endAt.slice(0, 16),
    type: isApp ? (ev as Event).type : EventType.exam,
    importance: isApp ? (ev as Event).importance : Importance.should,
    location: (ev as Event).location ?? "",
    note: (ev as Event).note ?? "",
    participantIds: isApp ? (ev as Event).participants.map((p) => p.memberId) : [],
  });
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    setEditing(false);
    setLocalError("");
    setForm({
      title: isApp ? (ev as Event).title : ev.title,
      startAt: ev.startAt.slice(0, 16),
      endAt: ev.endAt.slice(0, 16),
      type: isApp ? (ev as Event).type : EventType.exam,
      importance: isApp ? (ev as Event).importance : Importance.should,
      location: (ev as Event).location ?? "",
      note: (ev as Event).note ?? "",
      participantIds: isApp ? (ev as Event).participants.map((p) => p.memberId) : [],
    });
  }, [ev, isApp]);

  async function handleSave() {
    if (!isApp) return;
    if (!form.title.trim()) {
      setLocalError("タイトルを入力してください");
      return;
    }
    if (!form.startAt || !form.endAt) {
      setLocalError("開始と終了を入力してください");
      return;
    }
    const start = new Date(form.startAt);
    const end = new Date(form.endAt);
    if (end <= start) {
      setLocalError("終了は開始より後にしてください");
      return;
    }
    setLocalError("");
    await onUpdate((ev as Event).id, {
      id: (ev as Event).id,
      title: form.title.trim(),
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      type: form.type,
      importance: form.importance,
      location: form.location || null,
      note: form.note || null,
      participantIds: form.participantIds,
    });
    setEditing(false);
  }

  async function handleDelete() {
    if (!isApp) return;
    const ok = window.confirm("イベントを削除しますか？関連タスク/メモも削除されます。");
    if (!ok) return;
    await onDelete((ev as Event).id);
  }

  return (
    <div className="mt-3 rounded border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold">{ev.title}</h3>
          <span className="rounded bg-zinc-200 px-2 py-0.5 text-[11px] text-zinc-700">
            {isApp ? "Appイベント" : "Google予定"}
          </span>
          {conflicted && (
            <span className="rounded bg-red-100 px-2 py-0.5 text-[11px] text-red-700">conflict</span>
          )}
          {isApp && "type" in ev && (
            <span className="rounded bg-emerald-100 px-2 py-0.5 text-[11px] text-emerald-700">
              {typeLabel[ev.type as EventType]}
            </span>
          )}
        </div>
        <button onClick={onClose} className="text-sm text-blue-600 underline">
          閉じる
        </button>
      </div>
      <div className="mt-2 text-sm text-zinc-700">
        <div>
          {formatDateTime(ev.startAt)} - {formatDateTime(ev.endAt)}
        </div>
        {"location" in ev && ev.location && <div>場所: {ev.location}</div>}
        {"organizer" in ev && ev.organizer && <div>主催者: {ev.organizer}</div>}
        {isApp && !editing && (
          <>
            <div>重要度: {importanceLabel[(ev as Event).importance as Importance]}</div>
            <div>
              参加者:{" "}
              {(ev as Event).participants
                .map((p) => p.member?.name ?? members.find((m) => m.id === p.memberId)?.name ?? p.memberId)
                .join(", ")}
            </div>
            {(ev as Event).note && <div>メモ: {(ev as Event).note}</div>}
          </>
        )}
        {isApp && editing && (
          <div className="mt-2 space-y-2">
            <input
              className="w-full rounded border border-zinc-300 px-2 py-1 text-sm"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="datetime-local"
                className="flex-1 rounded border border-zinc-300 px-2 py-1 text-sm"
                value={form.startAt}
                onChange={(e) => setForm({ ...form, startAt: e.target.value })}
              />
              <input
                type="datetime-local"
                className="flex-1 rounded border border-zinc-300 px-2 py-1 text-sm"
                value={form.endAt}
                onChange={(e) => setForm({ ...form, endAt: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                className="flex-1 rounded border border-zinc-300 px-2 py-1 text-sm"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as EventType })}
              >
                {Object.values(EventType).map((t) => (
                  <option key={t} value={t}>
                    {typeLabel[t]}
                  </option>
                ))}
              </select>
              <select
                className="flex-1 rounded border border-zinc-300 px-2 py-1 text-sm"
                value={form.importance}
                onChange={(e) => setForm({ ...form, importance: e.target.value as Importance })}
              >
                {Object.values(Importance).map((v) => (
                  <option key={v} value={v}>
                    {importanceLabel[v]}
                  </option>
                ))}
              </select>
            </div>
            <input
              className="w-full rounded border border-zinc-300 px-2 py-1 text-sm"
              placeholder="場所"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
            <textarea
              className="w-full rounded border border-zinc-300 px-2 py-1 text-sm"
              placeholder="メモ"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
            <div className="space-y-1">
              <div className="text-xs text-zinc-600">参加者</div>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => {
                  const checked = form.participantIds.includes(m.id);
                  return (
                    <label key={m.id} className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const list = e.target.checked
                            ? [...form.participantIds, m.id]
                            : form.participantIds.filter((id) => id !== m.id);
                          setForm({ ...form, participantIds: list });
                        }}
                      />
                      {m.name}
                    </label>
                  );
                })}
              </div>
            </div>
            {localError && <div className="text-xs text-red-600">{localError}</div>}
            <div className="flex gap-2">
              <button
                className="rounded bg-blue-600 px-3 py-1 text-white"
                onClick={handleSave}
              >
                保存
              </button>
              <button
                className="rounded border border-zinc-300 px-3 py-1"
                onClick={() => {
                  setEditing(false);
                  setLocalError("");
                }}
              >
                キャンセル
              </button>
            </div>
          </div>
        )}
        {isApp && !editing && (
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <button
              className="rounded border border-zinc-300 px-3 py-1"
              onClick={() => setEditing(true)}
            >
              編集
            </button>
            <button
              className="rounded border border-red-400 px-3 py-1 text-red-600"
              onClick={handleDelete}
            >
              削除
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskList({
  tasks,
  members,
  onAdd,
  onUpdate,
  onDelete,
}: {
  tasks: Task[];
  members: Member[];
  onAdd: (task: { title: string; dueDate?: string; assigneeId?: string }) => void;
  onUpdate: (task: Task, updates: Partial<Task>) => void;
  onDelete: (taskId: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [taskError, setTaskError] = useState("");
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
        <input
          type="date"
          className="rounded border border-zinc-300 px-2 py-1 text-xs"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        <select
          className="rounded border border-zinc-300 px-2 py-1 text-xs"
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
        >
          <option value="">担当者なし</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <button
          onClick={() => {
            if (!title.trim()) {
              setTaskError("タスクタイトルを入力してください");
              return;
            }
            onAdd({
              title,
              dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
              assigneeId: assigneeId || undefined,
            });
            setTitle("");
            setDueDate("");
            setTaskError("");
          }}
          className="rounded bg-emerald-500 px-2 py-1 text-xs font-medium text-white"
        >
          追加
        </button>
      </div>
      {taskError && <div className="text-[11px] text-red-600">{taskError}</div>}
      <ul className="space-y-1 text-xs">
        {tasks.map((t) => (
          <li
            key={t.id}
            className="flex flex-col gap-2 rounded border border-zinc-200 p-2 md:flex-row md:items-center md:justify-between"
          >
            <div className="flex flex-col">
              <span className="font-medium">{t.title}</span>
              <span className="text-zinc-500">
                {t.status} {t.dueDate && ` / ${new Date(t.dueDate).toLocaleDateString()}`}
              </span>
              <span className="text-zinc-500">
                担当:{" "}
                {t.assigneeId ? members.find((m) => m.id === t.assigneeId)?.name ?? "未割当" : "未割当"}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1">
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
              <input
                type="date"
                className="rounded border border-zinc-300 px-2 py-1 text-xs"
                value={t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : ""}
                onChange={(e) =>
                  onUpdate(t, { dueDate: e.target.value ? new Date(e.target.value).toISOString() : null })
                }
              />
              <select
                className="rounded border border-zinc-300 px-2 py-1 text-xs"
                value={t.assigneeId ?? ""}
                onChange={(e) =>
                  onUpdate(t, { assigneeId: e.target.value ? e.target.value : null })
                }
              >
                <option value="">担当者なし</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
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
