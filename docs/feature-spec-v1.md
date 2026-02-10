# zatsudan 機能仕様 v1

> 「放課後の友達の家」— 承認欲求を刺激せず、いるだけで心地よい空間

---

## 設計思想

- いいね・フォロワー数・ランキングなど **承認欲求を刺激する仕組みは一切入れない**
- YouTube 作業配信のように「みんなで同じ音楽を聴きながら、各々好きなことをしている」雰囲気
- 能動的に話しかけなくても **居るだけで交流している感覚** を生み出す
- インタラクションは軽く、義務感が生まれない設計にする

---

## 0. リアルタイム同期基盤（全機能の前提）

### 概要・ユーザー体験

すべてのリアルタイム機能（プレゼンス、BGM同期、テーマアナウンス、つつき通知など）の土台となるWebSocket基盤。ユーザーが意識することはないが、「人がいる感覚」を支えるインフラ。

### 技術スタック

| 要素 | 選定 | 理由 |
|------|------|------|
| WebSocket サーバー | **Laravel Reverb** | Laravel 公式。Pusher互換プロトコルで Echo とシームレス連携。PHP単体で動作しNode.js不要 |
| フロントエンド | **Laravel Echo** + **Pusher.js** | Reverb が Pusher プロトコル準拠のため、Echo の pusher ドライバをそのまま利用 |
| 状態管理 | **Presence Channel** | 「誰がいるか」をチャネルレベルで自動管理。join/leave イベントが自動発火 |

### セットアップ手順（実装時の参考）

```
# 1. Broadcasting インストール（Reverb が自動で入る）
docker compose exec app php artisan install:broadcasting

# 2. フロントエンド依存追加
docker compose exec node npm install --save-dev laravel-echo pusher-js

# 3. Reverb 用の環境変数を src/.env に追加
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=zatsudan
REVERB_APP_KEY=zatsudan-key
REVERB_APP_SECRET=zatsudan-secret
REVERB_HOST=reverb
REVERB_PORT=8085
REVERB_SCHEME=http

# 4. フロントから接続するための Vite 環境変数
VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
VITE_REVERB_HOST=localhost
VITE_REVERB_PORT=8085
VITE_REVERB_SCHEME=http
```

### Docker 構成への組み込み

現在の5コンテナに **`reverb` コンテナ** を追加する。

```yaml
# docker-compose.yml に追加
reverb:
  build:
    context: .
    dockerfile: docker/app/Dockerfile  # app と同じ PHP イメージを流用
  working_dir: /var/www/html
  command: php artisan reverb:start --host=0.0.0.0 --port=8085
  volumes:
    - ./src:/var/www/html
  ports:
    - "8085:8085"
  depends_on:
    - mysql
    - redis
  networks:
    - znet
```

### 主要チャネル設計

| チャネル | 種別 | 用途 |
|----------|------|------|
| `presence-plaza` | Presence | 広場に誰がいるか（join/leave 自動検知） |
| `plaza.radio` | Public | BGM の現在トラック・再生位置の同期 |
| `plaza.topic` | Public | テーマアナウンスのブロードキャスト |
| `plaza.doing` | Public | Doing 変更の即時反映 |
| `private-user.{id}` | Private | つつき通知など個人宛イベント |

### 実現可能性と制約

- Reverb は Laravel 11+ で公式サポート。Laravel 12 でも問題なし
- Reverb は PHP 単体で動作するため、Node.js ベースの Socket.io より構成がシンプル
- **制約**: Reverb はステートフルなプロセスのため、水平スケール時は Redis アダプタが必要（初期は単一インスタンスで十分）
- ローカル開発では nginx の WebSocket プロキシ設定が必要（`/app` パスを reverb に転送）

### 既存 DB 設計との関連

- `users.presence_status` / `users.last_seen_at` → Presence Channel の join/leave イベントで自動更新
- `users.current_room_id` → 将来的に複数ルーム対応時に利用

### 実装優先度: **最優先（P0）**

他のすべての機能がこの基盤に依存する。最初に着手すべき。

---

## 1. ラジオシステム（広場のBGM）

### 概要・ユーザー体験

広場にいると **常にBGMが流れている**。YouTube 作業配信のような雰囲気。全員が同じ曲を同じタイミングで聴いている。

- ページを開くと「ラジオ ON」ボタンが表示される（ブラウザのオートプレイ制約対応）
- ボタンを押すと、今広場で流れている曲の **途中から** 再生が始まる（途中参加）
- 画面の隅に小さく「♪ 曲名 — アーティスト名」が表示される
- 音量スライダーのみ。選曲機能は持たない（DJ はシステム）

### 技術スタック

| 要素 | 選定 | 理由 |
|------|------|------|
| 音楽ソース | **Jamendo API** | 60万曲以上の CC ライセンス音源。REST API で MP3 ストリーミング URL を取得可能。非商用利用は無料。[Jamendo Developer](https://developer.jamendo.com/) |
| クライアント再生 | **Howler.js** | Web Audio API のラッパー。クロスブラウザ対応、音量制御、フェード、フォーマット自動選択。軽量（7KB gzip） |
| 同期 | **Laravel Reverb** (plaza.radio チャネル) | サーバーが「今の曲・再生開始時刻」をブロードキャスト。クライアントは差分計算して seek |

### 動作フロー

```
[サーバー側]
1. Artisan コマンド（スケジューラ or キュー）が Jamendo API からプレイリストを取得
2. 曲の再生順と開始時刻を DB or Redis に保持
3. 曲が切り替わるタイミングで plaza.radio チャネルに RadioTrackChanged イベントを発火
   → { track_id, title, artist, stream_url, started_at (Unix timestamp) }

[クライアント側]
1. ユーザーが「ラジオ ON」ボタンをクリック（AudioContext のアンロック）
2. Echo で plaza.radio をリッスン
3. 現在のトラック情報を HTTP API で取得（初回同期）
4. Howler.js で stream_url をロードし、(now - started_at) の位置に seek して再生
5. RadioTrackChanged を受信したら、次の曲にクロスフェード
```

### オートプレイ制約への対応

ブラウザ（Chrome, Safari, Firefox）はユーザーのジェスチャーなしに音声を自動再生できない。

- 広場に入った時点では **音声なし** の状態
- 画面上に「🔊 ラジオ ON」ボタンを常時表示
- クリック時に `AudioContext.resume()` + Howler の再生を開始
- ON/OFF 状態は `localStorage` に保存し、次回訪問時は自動で ON を試みる（ジェスチャー後なら可能）

### 実現可能性と制約

- **Jamendo API**: Client ID の取得が必要（無料登録）。レートリミットあり（非商用: 概ね十分な範囲）
- **YouTube API は不可**: 利用規約で「バックグラウンド再生」「音声のみの利用」が禁止されている
- **完全同期の精度**: ネットワーク遅延により 1-2 秒のズレは許容。厳密な同期は不要（「同じ曲を聴いている」感覚が重要）
- **曲の長さ管理**: Jamendo API のレスポンスに `duration` が含まれるため、サーバー側で次曲のスケジューリングが可能

### 既存 DB 設計との関連

- 新規テーブルが必要: `radio_playlists`（日ごとの曲リスト）、`radio_tracks`（曲メタデータのキャッシュ）
- または Redis のみで管理（再起動時に再取得する割り切り）

### 実装優先度: **高（P1）**

「人がいる感覚」を最も強く演出する機能。リアルタイム基盤の次に着手。

---

## 2. テーマアナウンス（ラジオの DJ 的な役割）

### 概要・ユーザー体験

定期的に **テーマ（話題）が広場にアナウンスされる**。学校の昼休みの校内放送のようなイメージ。

- 1〜2 時間ごとに新しいテーマが自動で切り替わる
- テーマ切り替え時に **チャイム音** が鳴り、画面中央に **テーマがオーバーレイ表示** される（3-5 秒でフェードアウト）
- テーマに対してコメントできる（右サイドパネル or 画面下部）
- ユーザーがテーマを提案できる（承認後に採用）

### 技術スタック

| 要素 | 選定 | 理由 |
|------|------|------|
| アナウンス通知 | **チャイム音（Howler.js）+ テキストオーバーレイ（CSS アニメーション）** | Web Speech API は音声が不自然になりがち。チャイム + 文字のほうが「放送感」が出る |
| テーマ配信 | **Laravel Reverb** (plaza.topic チャネル) | TopicChanged イベントをブロードキャスト |
| テーマスケジューリング | **Laravel スケジューラ** | `schedule:run` で定期的にテーマを切り替え。Artisan コマンドで実行 |
| コメントUI | 既存のコメントシステムを拡張 | `comments` + `topic_comments` テーブルを活用 |

### 動作フロー

```
[テーマ切り替え]
1. スケジューラが 1-2 時間ごとに実行
2. topic_requests (status=approved) からランダム or 順番に選出
   → approved がなければ、運営プリセットのテーマを使用
3. topics テーブルに INSERT (is_active=true, starts_at=now)
   → 前のテーマは is_active=false, ends_at=now に更新
4. plaza.topic チャネルに TopicChanged イベント発火
   → { topic_id, title, description }

[クライアント側]
1. TopicChanged イベント受信
2. チャイム音再生（Howler.js、ラジオ ON 時のみ）
3. 画面中央にテーマをオーバーレイ表示（フェードイン → 5秒 → フェードアウト）
4. サイドパネルに現在のテーマとコメント欄が表示される

[テーマ提案]
1. ユーザーがフォームからテーマを提案
2. topic_requests に INSERT (status=pending)
3. 運営が管理画面で承認 → status=approved に更新
   → 初期は自動承認でも可（悪用リスクが低いうちは）
```

### Web Speech API について（代替案として記録）

- ブラウザ内蔵の音声合成。追加ライブラリ不要、無料
- `speechSynthesis.speak(new SpeechSynthesisUtterance("今日のテーマは..."))`
- **懸念**: 合成音声が機械的すぎて「友達の家」の雰囲気を壊す可能性
- **結論**: v1 ではチャイム音 + テキスト表示を採用。将来的に音声を試す余地は残す

### 実現可能性と制約

- 既存 DB 設計がそのまま使えるため、バックエンド実装は軽い
- **制約**: チャイム音もオートプレイ制約の影響を受ける → ラジオ ON と連動（ラジオ ON ならチャイムも鳴る）
- テーマの「質」はユーザー提案に依存 → 初期は運営がプリセットを用意する必要がある

### 既存 DB 設計との関連

**そのまま活用できる既存テーブル:**

- `topics` — テーマの本体。`title`, `description`, `starts_at`, `ends_at`, `is_active` がすべて揃っている
- `topic_comments` — コメントとテーマの紐付け中間テーブル
- `topic_requests` — ユーザー提案。`status` (pending/approved/rejected/archived) と `adopted_topic_id` で承認ワークフローが完成済み
- `comments` — コメント本体。`room_id`, `user_id`, `day`, `content` + リプライ対応 (`reply_to_comment_id`)

**追加不要**: DB 設計変更なしで実現可能。

### 実装優先度: **高（P1）**

ラジオと合わせて「場の空気感」を作る重要機能。DB 設計が既に完成しているため、実装コストが比較的低い。

---

## 3. Doing 可視化

### 概要・ユーザー体験

広場にいる人たちが **今何をしているか** が一目でわかる。

- 画面上部またはサイドに **集計バー** を表示:「📚 勉強 3人 / 🎮 ゲーム 2人 / 💻 仕事 4人」
- 広場の点（アバター）のビジュアルに Doing が反映される（既存実装を拡張）
  - 勉強中: ゆっくり揺れる / ゲーム中: 激しく動く（既にCSSアニメーションで実装済み）
  - 色やエフェクトで Doing タイプを直感的に識別
- 集計は **リアルタイムに更新** される（誰かが Doing を変えた瞬間に反映）

### 技術スタック

| 要素 | 選定 | 理由 |
|------|------|------|
| 集計ロジック | **サーバーサイド集計** + キャッシュ | `doings` テーブルの `is_current=true` を GROUP BY で集計。Redis キャッシュで高速化 |
| リアルタイム更新 | **Laravel Reverb** (plaza.doing チャネル) | Doing 変更時に DoingChanged イベント → 集計を再計算してブロードキャスト |
| フロントエンド表示 | React コンポーネント | 現在の Top.jsx のモック集計を、リアルデータに置き換え |

### 動作フロー

```
[Doing 変更時]
1. ユーザーが Doing を切り替え（POST /api/doings）
2. doings テーブルに INSERT (is_current=true) + 前の doing を is_current=false に更新
3. Redis キャッシュの集計を更新
4. plaza.doing チャネルに DoingChanged イベント発火
   → { user_id, user_name, doing_type_key, doing_type_label, doing_type_emoji, summary }
   → summary: { "study": 3, "game": 2, "work": 4, ... }

[クライアント側]
1. 初回ロード時に HTTP API で現在の集計を取得
2. DoingChanged イベントで集計をリアルタイム更新
3. 広場のアバター表示も即時反映（既存の CSS アニメーション連携）
```

### 集計表示のデザイン方針

- **ミニマル**: 大きなグラフではなく、絵文字 + 数字のコンパクトな表示
- **場の雰囲気を伝える**: 「今、勉強してる人が多いな」「ゲームしてる人いるな」程度の把握
- ランキング化しない（承認欲求を刺激しない設計原則に従う）

### 実現可能性と制約

- 既存のモック実装（Top.jsx の DOINGS 配列、CSS アニメーション）をそのまま活かせる
- **制約**: ユーザー数が少ないうちは集計が寂しくなる → 初期はモック NPC を混ぜる案も検討

### 既存 DB 設計との関連

**そのまま活用できる既存テーブル:**

- `doing_types` — Doing の種類マスタ。`key`, `label`, `scope`, `is_active`, `sort_order` が揃っている
- `doings` — ユーザーごとの Doing 履歴。`user_id`, `doing_type_id`, `day`, `started_at`, `ended_at`, `is_current` で現在の状態を管理
- `users.presence_status` — オンラインユーザーの Doing のみを集計対象にする

**追加不要**: DB 設計変更なしで実現可能。

### 実装優先度: **中（P2）**

「誰が何をしているか」は空間の根幹。ただし、現在のモック実装がある程度の体験を提供しているため、リアルタイム基盤・ラジオの後でも可。

---

## 4. 軽いインタラクション

### 概要・ユーザー体験

「いいね」ではない、**日常的な声かけ**レベルの軽いインタラクション。放課後に友達の肩をポンと叩くような気軽さ。

#### 4-1. つつく（ノック）

- 広場のアバターをクリック → 「つつく」ボタンが表示される
- つつかれた相手の画面に **小さな通知** が出る（「なおさんがつついた」）
- 相手のアバターが一瞬ぴょこっと跳ねる
- **テキストなし・1アクション完結**。返事の義務がない設計

#### 4-2. 一言リアクション

- 相手のアバターをクリック → プリセットの一言を送れる
- プリセット例:「お茶どうぞ ☕」「それ何やってるの？」「おかえり〜」「がんばれ〜」
- **自由入力ではなく選択式** → 心理的ハードルを下げる + 荒らし防止
- 相手の画面では、アバターの上にフキダシとして 3 秒間表示されて消える

#### 4-3. 近くにいるだけで交流状態

- 広場でアバター同士が近い距離にいると、うっすらと **線が繋がる** ビジュアル
- 「一緒にいる」感覚を視覚的に演出
- クリックやアクション不要 — 自動的に発生する

### 技術スタック

| 要素 | 選定 | 理由 |
|------|------|------|
| つつき通知 | **Laravel Reverb** (private-user.{id} チャネル) | 個人宛のプライベートチャネルで通知 |
| 一言リアクション | **Laravel Reverb** (plaza.doing チャネルに相乗り or 専用チャネル) | 全員に見えるフキダシ表示のため Public でも可 |
| 近接判定 | **クライアントサイド計算** | アバター座標の距離を計算（Math.hypot）。既存の avatarStates を利用 |
| フキダシ / アニメーション | **CSS Animations + React state** | 軽量に実装可能 |

### 動作フロー

```
[つつく]
1. ユーザーが相手のアバターをクリック → 「つつく」ボタン → クリック
2. POST /api/poke { target_user_id }
3. サーバーがレート制限チェック（同じ相手に連続でつつけない: 30秒間隔）
4. private-user.{target_id} に Poked イベント発火
   → { from_user_id, from_user_name }
5. 相手のクライアントで通知表示 + アバターアニメーション

[一言リアクション]
1. ユーザーが相手のアバターをクリック → プリセット一覧から選択
2. POST /api/reaction { target_user_id, reaction_key }
3. plaza.reaction チャネルに ReactionSent イベント発火
   → { from_user_id, from_user_name, target_user_id, reaction_key, reaction_text }
4. 全員のクライアントで、対象アバターの上にフキダシ表示（3秒で消える）

[近接線]
→ サーバー通信不要。クライアントのみで処理
1. 600ms ごとに avatarStates の全ペアの距離を計算
2. 距離が閾値以下（例: 80px）のペア間に SVG の線を描画
3. 距離に応じて線の透明度を変化（近いほど濃い）
```

### 実現可能性と制約

- つつき・リアクションは技術的に単純（イベント発火 + フロントエンド表示）
- **制約**: レート制限が必要（スパム防止）。Redis でユーザーごとのクールダウンを管理
- **制約**: プリセットリアクションの内容は吟味が必要（コミュニティの雰囲気を決める）
- 近接線はクライアントのみで完結するため、サーバー負荷ゼロ

### 既存 DB 設計との関連

- つつき・リアクションは **DB 保存不要**（履歴を残す必要がない一過性のイベント）
- レート制限は Redis の SETEX で管理（`poke:{from}:{to}` → TTL 30秒）
- 将来的に履歴を残したい場合は新規テーブルが必要だが、v1 では不要

### 実装優先度: **中（P2）**

- 4-3（近接線）は **クライアントのみで即実装可能** → 先行して入れても良い
- 4-1（つつく）と 4-2（一言リアクション）はリアルタイム基盤が必要 → P0 の後

---

## 実装ロードマップ

| フェーズ | 機能 | 依存 | 目安 |
|----------|------|------|------|
| **Phase 0** | リアルタイム同期基盤（Reverb + Echo） | なし | 最初 |
| **Phase 1a** | ラジオシステム（Jamendo + Howler.js） | Phase 0 |Phase 0 の後 |
| **Phase 1b** | テーマアナウンス | Phase 0 | Phase 0 の後（1a と並行可） |
| **Phase 2a** | Doing 可視化（モック → リアルデータ化） | Phase 0 | Phase 1 の後 |
| **Phase 2b** | 軽いインタラクション | Phase 0 | Phase 1 の後（2a と並行可） |
| **Phase 2c** | 近接線（クライアントのみ） | なし | いつでも |

---

## 現在のプロジェクト状態との差分

### バックエンド（追加が必要なもの）

| 項目 | 状態 |
|------|------|
| Laravel Reverb | **未インストール** (`php artisan install:broadcasting` から開始) |
| Broadcasting 設定 | **未設定** (`config/broadcasting.php` にReverbドライバ追加が必要) |
| Event クラス | **未作成** (RadioTrackChanged, TopicChanged, DoingChanged, Poked, ReactionSent) |
| スケジューラ | **未設定** (テーマ切り替え、プレイリスト更新用) |
| Jamendo API 連携 | **未実装** (API クライアントの作成が必要) |

### フロントエンド（追加が必要なもの）

| 項目 | 状態 |
|------|------|
| Laravel Echo + pusher-js | **未インストール** (`npm install laravel-echo pusher-js`) |
| Howler.js | **未インストール** (`npm install howler`) |
| Echo ブートストラップ | **未設定** (`resources/js/bootstrap.js` に Echo インスタンス作成が必要) |
| モック → リアルデータ移行 | Top.jsx が完全にインメモリのモックデータで動作中。Inertia props + Echo イベントへの置き換えが必要 |

### Docker（変更が必要なもの）

| 項目 | 状態 |
|------|------|
| Reverb コンテナ | **追加が必要** (docker-compose.yml に reverb サービスを追加) |
| nginx WebSocket プロキシ | **追加が必要** (WebSocket 接続を reverb に転送する設定) |

### DB（変更が必要なもの）

| 項目 | 状態 |
|------|------|
| topics, topic_comments, topic_requests, doings, doing_types | **設計済み・マイグレーション済み** — そのまま活用可能 |
| ラジオ関連テーブル（任意） | **未設計** — Redis のみで管理する案もあり |

---

## 技術的な注意事項

### Jamendo API

- エンドポイント: `https://api.jamendo.com/v3.0/tracks/?client_id=YOUR_ID&format=json&limit=20&tags=chill+lofi`
- レスポンスに `audio` (MP3 URL), `duration`, `name`, `artist_name` が含まれる
- **非商用利用は無料**。商用利用は有料プラン
- CC ライセンスのため、クレジット表示が必要（曲名 + アーティスト名の表示で対応）

### ブラウザのオートプレイポリシー

- Chrome: Media Engagement Index (MEI) が高いサイトは自動再生可。それ以外はユーザージェスチャーが必要
- Safari: 常にユーザージェスチャーが必要
- Firefox: `media.autoplay.default` 設定に依存（デフォルトはブロック）
- **対策**: 必ず「ラジオ ON」ボタンを経由する設計にする。`AudioContext.resume()` を明示的に呼ぶ

### Laravel Reverb のパフォーマンス

- 同時接続数: 数千接続程度は単一インスタンスで対応可能（PHP の Event Loop ベース）
- zatsudan の初期ユーザー規模では十分
- 将来的にスケールが必要になったら Redis アダプタ + 複数インスタンスで対応
