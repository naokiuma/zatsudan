# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 基本ルール

- ユーザーへの応答は常に日本語で行うこと

## プロジェクト概要

「zatsudan」は、ユーザー同士が今何をしているかを共有し、テーマに沿った雑談ができるコラボレーションプラットフォーム。

## 技術スタック

- **バックエンド**: Laravel 12 (PHP 8.2+) + Inertia.js
- **フロントエンド**: React 18 + Inertia.js アダプタ, Tailwind CSS 3, Headless UI
- **データベース**: MySQL 8.4, Redis (Docker経由)
- **ビルド**: Vite 7
- **認証**: Laravel Breeze + Sanctum

## 開発環境

全サービスはDocker Composeで動作。Laravelのソースは `src/` に配置。

### 起動方法
```bash
docker compose up -d --build
```

### 初回セットアップ
```bash
docker compose exec app php artisan key:generate
docker compose exec app php artisan migrate
docker compose exec node npm install
```

### アクセス先
- アプリ: http://localhost:8080/
- Vite HMR: http://localhost:5173/

### よく使うコマンド
```bash
# マイグレーション実行
docker compose exec app php artisan migrate

# 直前のマイグレーションをロールバック
docker compose exec app php artisan migrate:rollback

# マイグレーション状況確認
docker compose exec app php artisan migrate:status

# 新規マイグレーション作成
docker compose exec app php artisan make:migration create_<table>_table --create=<table>

# モデル作成
docker compose exec app php artisan make:model <ModelName>

# テスト実行
docker compose exec app php artisan test

# フロントエンド開発サーバー（nodeコンテナで自動起動されるが手動実行も可）
docker compose exec node npm run dev
```

## アーキテクチャ

### バックエンド (src/app/)

LaravelがInertia.js経由でSSRレイヤーとして機能。APIエンドポイントは分離せず、コントローラーから `Inertia::render()` でReactページコンポーネントにデータを渡す。

主要コントローラー:
- `TopController` — メインページ (`/`)、キャンバスページ (`/canvas`)、コメント保存
- `StaticController` — 静的ページ (about)
- `ProfileController` — ユーザープロフィールCRUD（認証必須）

主要モデル:
- `Theme` — 日毎のディスカッションテーマ
- `Comment` — テーマへのコメント
- `User` — 認証 + プレゼンス管理 (presence_status, last_seen_at)

### フロントエンド (src/resources/js/)

Reactページは `Pages/` に配置し、Inertia経由でレンダリング。`@` エイリアスで `resources/js/` を参照可能（jsconfig.json と vite.config.js で設定済み）。

- `Top.jsx` — メインページ: アクティビティ追跡、ディスカッション、日付ナビゲーション
- `Canvas.jsx` — 描画/キャンバスページ
- `Components/DoingSidebar.jsx` — アクティビティタイプのサイドバー

スタイリングはTailwindユーティリティクラスと、コンポーネントに対応するCSSファイル（`Top.css`, `DoingSidebar.css`）を併用。

### データベース設計

詳細は `docs/db.md` を参照。主要テーブル:
- `doing_types` — アクティビティタイプのマスタ（system / user スコープ）
- `doings` — ユーザーごとの日毎アクティビティ履歴（is_currentフラグはアプリ側で管理）
- `topics` — 時間帯付きのディスカッショントピック（starts_at / ends_at, is_active）
- `topic_comments` — コメントとトピックの中間テーブル
- `topic_requests` — ユーザー提案のトピック（承認ワークフロー付き）

### Dockerサービス構成

共有ブリッジネットワーク (`znet`) 上の5コンテナ:
- `app` — PHP 8.3 FPM (Laravel)
- `nginx` — リバースプロキシ (ポート 8080)
- `node` — Vite開発サーバー (ポート 5173)
- `mysql` — MySQL 8.4 (ポート 3306)
- `redis` — Redis Alpine (ポート 6379)

### 環境設定

環境変数は `src/.env` に配置（トップレベルのディレクトリではない）。DB接続、セッション、キャッシュ、キューはすべてデフォルトで `database` ドライバーを使用。
