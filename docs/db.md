概念と流れ

1. Presence（オンライン状態）
   users に持たせる
   presence_status と last_seen_at を更新して「いる人」っぽさを出す

2. Doing（行動）
   ユーザーは1日に複数回 doing を切り替え可能
   doings は履歴として残す
   “現在のdoing” は同一 user_id + room_id + day で is_current=1 のものを1件にする運用（DBで完全強制しない、アプリ側で担保）

3. Doing Type（マスタ）
   doing_types で種類を管理（将来ユーザーが追加できる）
   scope=system（運営用） / scope=user（ユーザー作成）
   owner_user_id は user scope のときに使う

4. Topic（話題）
   topics を独立テーブルで持つ（機能分離
   1日に何度か変わるので starts_at / ends_at を持つ
   is_active で “いまの話題” を表現（roomごとに最大1件が理想。これもアプリ側運用）

5. Comments（コメント）
   通常コメントは comments に保存
   “話題に対するコメント” は topic_comments（中間）で紐付け
   （＝コメント自体は共通、紐付けだけがtopic用）

6. Topic Request（話題リクエスト）
   ユーザーが提案する話題（採用/不採用・採用されたtopicの紐付け）
