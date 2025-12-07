# 実装タスクリスト

## セクション1：データモデル実装
- [ ] 1.1 Prisma スキーマを定義する
  - Family/Member/Event/EventParticipant/Task/EventNote/ExternalEvent/OAuthToken を schema.prisma に追加し、start/end の整合性など基本バリデーションをコメントで明示。
  - Prisma クライアント初期化 (lib/db.ts) を作成し、環境変数（本番: Azure DB, ローカル: SQLite も可）を想定した設定にする。
- [ ] 1.2 マイグレーション/シードの初期セットアップ
  - prisma migrate 用スクリプトを追加し、開発用シード（ダミーの family/member/event/task）を準備して初期表示ができる状態にする。

## セクション2：ビジネスロジック実装
- [ ] 2.1 イベント/タスク/メンバーの Route Handlers を実装する
  - /api/events (POST/GET), /api/events/[id] (PUT/DELETE), /api/events/[id]/tasks, /api/members の CRUD を design.md の処理フロー1-2に沿って実装。
  - familyId テナンシの検証と共通レスポンス構造を整える。
- [ ] 2.2 Google カレンダー読み取りと外部イベント保存
  - /api/google/auth (開始/コールバック) と /api/google/events を実装し、OAuth トークンを OAuthToken に保存、外部イベントを ExternalEvent に格納して返却（処理フロー4）。
  - トークン期限切れ時のリフレッシュと再認可要求のハンドリングを入れる。
- [ ] 2.3 コンフリクト検知ロジックを実装する
  - design.md の処理フロー5に基づき、must イベントの時間重複判定（子ども/保護者単位）を lib/conflict.ts として実装し、カレンダーAPI/クライアントで利用可能にする。

## セクション3：インターフェース実装
- [ ] 3.1 ダッシュボードUIを構築する
  - page.tsx を置き換え、CalendarView（週/月切替、フィルタ付き）、ChildWeeklyPanel、Google 連携ステータス導線を配置。
  - イベント/タスクの CRUD モーダル/ドロワーを組み込む。
- [ ] 3.2 入力バリデーションとフォーム実装
  - EventFormDrawer/TaskListPanel のクライアントバリデーション（必須・時間逆転チェック）と API エラーの表示を実装。
  - メンバー選択・担当者割当 UI を作成。
- [ ] 3.3 表示ロジックとフォーマット
  - Google外部イベントを区別表示（アイコン/スタイル）し、コンフリクト結果をカレンダー上で警告表示。
  - タスクステータス更新やメモ表示を ChildWeeklyPanel と詳細ビューで反映。

## セクション4：統合とテスト
- [ ] 4.1 データフロー統合
  - フロントから API 呼び出し → DB → 再フェッチまでの一連の流れを接続し、キャッシュ/再検証戦略（SWR/React Query など）を設定。
- [ ] 4.2 基本テストを追加
  - conflict 判定のユニットテスト、イベント/タスク API のハンドラ単体テストを追加（mock DB/Prisma を使用）。
- [ ] 4.3 受入基準の自己チェック
  - requirements.md の受入チェックリストに沿って、UI/APIで満たされているか確認し、残項目を列挙。
