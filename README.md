## .envについて
src/.envに各種情報を設定すること（topディレクトリのは不使用）

## 起動方法
```
docker compose up -d --build
```

起動確認
```
docker compose ps
```
すべてのサービスが running になっていればOKです。

## Laravel初期設定(初回のみ)

```
docker compose exec app php artisan key:generate
docker compose exec app php artisan migrate
```

## フロントエンドの準備(初回のみ)
```
docker compose exec node npm install
```

## 以下にアクセス
```
http://localhost:8080/
```


## マイグレーション追加時の手順
例：postsテーブルを作る場合
```
docker compose exec app php artisan make:migration create_posts_table --create=posts
```
マイグレーション実行（差分だけ反映）
```
docker compose exec app php artisan migrate
```
どこまで実行済みか確認したい場合
```
docker compose exec app php artisan migrate:status
```
直前のmigrationだけ戻す
```
docker compose exec app php artisan migrate:rollback
```

## モデルについて
モデルを作成する場合
```
docker compose exec app php artisan make:model モデル名
```
