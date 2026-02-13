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
