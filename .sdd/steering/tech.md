# Technology Stack

## アーキテクチャ
- フロントエンドのみの Next.js 16 (App Router) 構成。`reactCompiler: true` を有効化。
- ディレクトリ: `web` 配下にアプリを集約し、`src/app` に `layout.tsx` と `page.tsx` が配置されています。

## 使用技術
### 言語とフレームワーク
- TypeScript（`strict`、`noEmit`）
- Next.js 16.0.7（React 19.2.0 / React DOM 19.2.0）
- Tailwind CSS v4（`@theme inline` を `globals.css` で使用）

### 依存関係
- next/font (Geist/Geist_Mono) によるフォント最適化
- next/image による画像最適化
- `babel-plugin-react-compiler` (1.0.0) を導入済み

## 開発環境
### 必要なツール
- Node.js（Next.js 16 がサポートするバージョン）
- npm（`package-lock.json` 管理）

### よく使うコマンド
- 起動：`cd web && npm run dev`
- ビルド：`cd web && npm run build`
- 本番起動：`cd web && npm run start`
- Lint：`cd web && npm run lint`
- テスト：現状スクリプトなし

## 環境変数
- 現時点で必須の環境変数は定義されていません。
