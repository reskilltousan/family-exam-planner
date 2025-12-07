# 技術設計書

## アーキテクチャ概要
- Next.js 16 (App Router, React 19, React Compiler) + TypeScript + Tailwind v4 をベースに、App Router 上の Route Handlers で API を提供する。
- フロントは Server Components/Client Components を併用し、データ取得は基本 API 経由（将来的に RSC 直 fetch も可）。
- データ永続化は Prisma を用いて Azure のリレーショナルDB（本番：PostgreSQL/SQL Database想定、ローカル：SQLite可）に接続。
- Google Calendar は OAuth2 で読み取り専用インポート。アクセストークン/リフレッシュトークンは安全なストア（DB/Key Vault前提）に保存し、取得イベントは外部イベントとして表示する。
- 認証は MVP では簡易（メール+パスワード or Auth.js）。家族単位のテナンシ分離を行う。

## 主要コンポーネント
### コンポーネント1: AppShell / Layout
- 責務: 共通レイアウト、ナビゲーション、テーマ、フォント適用。
- 入力: ページ children。
- 出力: 各ビューの描画。
- 依存関係: globals.css, next/font, nav要素。

### コンポーネント2: CalendarView
- 責務: 家族カレンダーの週/月表示、イベント/外部イベントの描画、フィルタ、コンフリクト表示。
- 入力: イベント一覧, 外部イベント一覧, フィルタ条件（子ども, 種別, 期間）。
- 出力: カレンダーUI, イベントカード, コンフリクト警告表示。
- 依存関係: ConflictDetector, Event API, ExternalEvent取得API。

### コンポーネント3: EventFormDrawer
- 責務: イベントの作成/編集フォーム（タイトル/日付/時間/種別/重要度/参加者/場所/メモ）。
- 入力: 編集対象イベント（任意）、メンバー一覧。
- 出力: API 呼び出し結果、作成・更新されたイベント。
- 依存関係: Event API, Member API。

### コンポーネント4: TaskListPanel
- 責務: イベントに紐づく準備タスクの一覧/追加/編集/削除、ステータス変更、担当者割り当て。
- 入力: イベントID、タスクリスト。
- 出力: タスク状態の更新結果。
- 依存関係: Task API, Member API。

### コンポーネント5: ChildWeeklyPanel
- 責務: 子ども別の「今週のイベント」「今週のタスク」をまとめて表示。
- 入力: 子どもID、週次範囲内のイベント/タスク。
- 出力: リスト表示、ステータス変更（タスク）。
- 依存関係: Event API, Task API, Member API。

### コンポーネント6: GoogleCalendarSyncService
- 責務: OAuth 認可フロー、トークン保存、Google 予定の読み取りと外部イベント化。
- 入力: OAuth コード/トークン、期間フィルタ。
- 出力: 外部イベント一覧、連携状態。
- 依存関係: Google Calendar API, TokenStore, ExternalEvent モデル。

### コンポーネント7: ConflictDetector
- 責務: must イベントの時間重複検知（子ども/保護者単位）。
- 入力: イベント一覧（期間フィルタ済み）。
- 出力: 重複イベントIDセット、警告フラグ。
- 依存関係: Eventモデル、CalendarView での描画。

## データモデル
（型は Prisma/TS 想定。実装時に schema.prisma へ反映）
- Family: id, name
- Member: id, familyId(FK), role('parent'|'child'|'admin?'), name, grade(optional)
- Event: id, familyId(FK), title, startAt, endAt, type('school'|'cram'|'lesson'|'exam'|'other'), importance('must'|'should'|'optional'), location?, note?, createdBy
- EventParticipant: eventId, memberId (複合PK) ※子ども/必要なら保護者
- Task: id, eventId(FK), title, dueDate, status('not_started'|'in_progress'|'done'), assigneeId(FK to Member)
- EventNote: id, eventId(FK), content, createdBy, createdAt
- ExternalEvent (Google): id, familyId(FK), source='google', externalId, title, startAt, endAt, location?, organizer?, lastSyncedAt
- OAuthToken: id, familyId(FK), provider='google', accessToken, refreshToken, expiresAt

## 処理フロー
1) イベントCRUD
- UIでEventFormを開く → API (POST/PUT /api/events) へ送信 → DB保存 → 再フェッチしてカレンダー表示を更新。
- 削除: DELETE /api/events/:id → 参加者・タスク・メモもリレーション削除。

2) タスク管理
- TaskListPanelから追加/更新/削除 → /api/events/:id/tasks → ステータスや担当者を更新 → イベント詳細/子ども別ビューを更新。

3) 子ども別「今週」ビュー
- 週範囲を計算 → /api/events?memberId=...&range=week と /api/tasks?memberId=...&range=week を取得 → ChildWeeklyPanel で表示・タスク更新。

4) Googleカレンダー読み取り
- OAuth連携開始 (/api/auth/google) → コールバックでトークン保存 → /api/google/events?range=... で外部イベント取得 → ExternalEvent としてDB保存 or キャッシュ → CalendarView で区別表示。

5) コンフリクト検知
- カレンダー描画前にイベントを期間で取得 → importance='must' を対象に時間重複を計算（子ども/保護者単位） → 衝突リストをCalendarViewに渡し警告表示。

## エラーハンドリング
- バリデーションエラー: 必須項目欠如/時間逆転 → 400 応答、フォームにフィードバック。
- 権限/テナンシ: familyId が一致しないアクセスを 403/404 で拒否。
- Google連携: トークン期限切れはリフレッシュ再試行、失敗時は再認可を促すメッセージを表示。API失敗時は外部イベントを非表示にし、ローカルイベントは表示継続。
- コンフリクト計算: 入力が欠けているイベントはスキップし、UIには「検知不可」扱いで表示。

## 既存コードとの統合
- 変更が必要なファイル：
  - web/src/app/page.tsx: テンプレートを置き換え、ダッシュボード（カレンダー+フィルタ+子ども別ビュー導線）に改修。
  - web/src/app/layout.tsx / globals.css: 共通UI/テーマ/レイアウトの拡張。
  - web/next.config.ts: 必要なら環境変数の公開設定。
- 新規作成ファイル：
  - web/src/app/api/events/route.ts: Event CRUD Route Handler。
  - web/src/app/api/events/[id]/tasks/route.ts: Task CRUD。
  - web/src/app/api/members/route.ts: メンバー取得/登録。
  - web/src/app/api/google/auth/route.ts & callback: OAuth 開始/受領。
  - web/src/app/api/google/events/route.ts: Google予定の読み取り→ExternalEvent保存。
  - web/src/lib/db.ts / prisma/schema.prisma: Prisma クライアントとスキーマ定義（Family/Member/Event/Task/EventNote/EventParticipant/ExternalEvent/OAuthToken）。
  - web/src/lib/conflict.ts: コンフリクト計算ロジック。
  - web/src/components/*: CalendarView, EventFormDrawer, TaskListPanel, ChildWeeklyPanel, GoogleSyncStatus など UI 実装用。

