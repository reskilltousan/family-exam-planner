# Project Structure

## ルートディレクトリ構成
```
/
├── web/                  # Next.js app (App Router, TypeScript, Tailwind)
│   ├── src/app/          # layout.tsx, page.tsx, globals.css
│   ├── public/           # 静的アセット (svg など)
│   ├── next.config.ts    # Next.js 設定 (reactCompiler 有効)
│   ├── tsconfig.json     # TypeScript 設定 (strict, noEmit)
│   ├── eslint.config.mjs # ESLint 設定
│   ├── package.json      # スクリプトと依存
│   ├── package-lock.json # npm lockfile
│   ├── node_modules/     # 依存パッケージ
│   └── .next/            # ビルド出力/型生成
├── .sdd/                 # SDD関連（description.md, specs/, steering/）
└── README.md             # ルートの簡易リードミー
```

## コード構成パターン
- Next.js App Router を使用し、`src/app` 直下に `layout.tsx` と `page.tsx` を配置。
- グローバルスタイルは `globals.css` で Tailwind v4 のテーマ変数を定義。

## ファイル命名規則
- ページ/レイアウト: `page.tsx`, `layout.tsx`（Next.js 規約）
- グローバルスタイル: `globals.css`
- 設定ファイル: `*.config.mjs`, `next.config.ts`, `tsconfig.json`

## 主要な設計原則
- Next.js デフォルトの App Router 構成を採用し、TypeScript で strict に型管理。
- next/font を使ってフォントを最適化し、ライト/ダークテーマを CSS 変数で管理。
- React Compiler を有効化し、React 19 に最適化したビルドを前提とする。
