#### rooms

ユーザーが集まる部屋（チャンネル・ワークスペース）

- `id` — 主キー
- `name` — 部屋名 (varchar 100)
- `slug` — URL識別子 (varchar 100, unique)
- `description` — 説明 (text, nullable)
- `is_active` — アクティブフラグ (boolean, default: true)
- `timestamps` — created_at / updated_at

#### users（拡張）

Laravelデフォルトのusersテーブルに以下のカラムを追加:

- `presence_status` — プレゼンス状態 (enum: online/away/offline/sleep, default: offline)
- `last_seen_at` — 最終アクセス日時 (datetime, nullable)
- `current_room_id` — 現在いる部屋 (FK to rooms, nullable, nullOnDelete)
- インデックス: `idx_users_presence` (presence_status, last_seen_at), `idx_users_current_room` (current_room_id)

#### doings

ユーザーごとの日毎アクティビティ履歴（is_currentフラグはアプリ側で管理）

- `id` — 主キー
- `user_id` — ユーザー (FK to users, cascadeOnDelete)
- `room_id` — 部屋 (FK to rooms, cascadeOnDelete)
- `doing_type_key` — アクティビティタイプキー (varchar 64) ※ config('doing_types') のキーに対応
- `day` — 日付 (date) ※ JSTで切って保存想定
- `started_at` — 開始日時 (datetime)
- `ended_at` — 終了日時 (datetime, nullable)
- `is_current` — 現在のアクティビティか (boolean, default: true)
- `timestamps` — created_at / updated_at
- インデックス: `idx_doings_room_day` (room_id, day), `idx_doings_user_room_day` (user_id, room_id, day), `idx_doings_current` (room_id, day, is_current)

#### comments

コメント本体（doing or topic に紐付く）

- `id` — 主キー
- `room_id` — 部屋 (FK to rooms, cascadeOnDelete)
- `user_id` — 投稿者 (FK to users, cascadeOnDelete)
- `day` — 日付 (date)
- `doing_id` — 紐付き doing (FK to doings, nullable, nullOnDelete)
- `reply_to_comment_id` — 返信先コメント (FK to comments, nullable, nullOnDelete)
- `content` — コメント本文 (text)
- `deleted_at` — 論理削除 (softDeletes)
- `timestamps` — created_at / updated_at
- インデックス: `idx_comments_room_day_created` (room_id, day, created_at), `idx_comments_user_created` (user_id, created_at), `idx_comments_doing` (doing_id), `idx_comments_reply` (reply_to_comment_id), `idx_comments_deleted` (deleted_at)

#### topics

時間帯付きのディスカッショントピック（starts_at / ends_at, is_active）

- `id` — 主キー
- `room_id` — 部屋 (FK to rooms, cascadeOnDelete)
- `title` — タイトル (varchar 255)
- `description` — 説明 (text, nullable)
- `starts_at` — 開始日時 (datetime)
- `ends_at` — 終了日時 (datetime, nullable)
- `is_active` — アクティブフラグ (boolean, default: true)
- `created_by_user_id` — 作成者 (FK to users, nullable, nullOnDelete)
- `timestamps` — created_at / updated_at
- インデックス: `idx_topics_room_active` (room_id, is_active, starts_at), `idx_topics_room_time` (room_id, starts_at, ends_at), `idx_topics_created_by` (created_by_user_id)

#### topic_comments

コメントとトピックの中間テーブル

- `id` — 主キー
- `topic_id` — トピック (FK to topics, cascadeOnDelete)
- `comment_id` — コメント (FK to comments, cascadeOnDelete)
- `created_at` — 作成日時 (timestamp)
- ユニーク制約: `uq_topic_comments_comment` (comment_id) ※ 1コメントは基本1topicにだけ紐付く想定
- インデックス: `idx_topic_comments_topic` (topic_id)

#### topic_requests

ユーザー提案のトピック（承認ワークフロー付き）

- `id` — 主キー
- `room_id` — 部屋 (FK to rooms, cascadeOnDelete)
- `requested_by_user_id` — 提案者 (FK to users, cascadeOnDelete)
- `title` — タイトル (varchar 255)
- `description` — 説明 (text, nullable)
- `status` — ステータス (enum: pending/approved/rejected/archived, default: pending)
- `adopted_topic_id` — 採用されたトピック (FK to topics, nullable, nullOnDelete)
- `timestamps` — created_at / updated_at
- インデックス: `idx_topic_requests_room_status` (room_id, status, created_at), `idx_topic_requests_user` (requested_by_user_id, created_at), `idx_topic_requests_adopted` (adopted_topic_id)
