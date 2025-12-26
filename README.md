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