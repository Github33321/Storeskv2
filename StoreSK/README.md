# StoreSK (Neon Orange Storefront)

Красивый фронт‑сайт интернет‑магазина, который **использует все публичные роуты** из вашего Go/Gin backend:

- `GET /api/health`
- `GET /api/categories`
- `GET /api/products?q=&category=&limit=&offset=`
- `GET /api/products/:slug`
- `GET /api/cart`
- `POST /api/cart/items`
- `PATCH /api/cart/items/:id`
- `DELETE /api/cart/items/:id`
- `POST /api/cart/clear`
- `POST /api/checkout`
- `/media/*` (картинки)

> Админка у вас уже есть (отдельный проект). Этот архив — именно **покупательская витрина**.

## Быстрый старт (локально)

1) Поднимите backend (по его README):

```bash
docker-compose up -d --build
```

По умолчанию он слушает `http://localhost:8082`.

2) Запустите фронт:

```bash
npm install
npm run dev
```

Откройте `http://localhost:5173`.

## Конфигурация

### Dev (рекомендуется)
Vite проксирует `/api` и `/media` на backend. Можно не трогать `.env`.
Если backend не на `8082`, задайте:

```bash
VITE_PROXY_TARGET=http://localhost:8082
```

### Build/Prod
Если фронт разворачивается на другом домене, укажите `VITE_API_BASE`:

```bash
VITE_API_BASE=https://your-backend-domain.com
npm run build
```

## Дизайн

Тёмная неоновая тема с оранжевым акцентом, glass‑панели, подсветки и микро‑анимации.
