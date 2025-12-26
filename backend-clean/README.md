# Shop Backend (Go + Gin + Postgres)

## Запуск
1) Скопируйте `.env.example` -> `.env` (или используйте как есть).
2) `docker-compose up -d --build`
3) Проверка: `GET http://localhost:8082/api/health`

## Авторизация (админ)
POST /api/admin/auth/login с JSON:
{"email":"admin@example.com","password":"admin123"}

## CRUD
Админ:
- POST   /api/admin/categories {name, slug}
- DELETE /api/admin/categories/:id
- POST   /api/admin/products {title, slug, description, categoryIDs: [ids]}
- POST   /api/admin/products/:id/variants — JSON {color, memory, connectivity, price_cents, stock, image_urls: [urls...]}
  или multipart (images[])
- PATCH  /api/admin/variants/:id
- DELETE /api/admin/variants/:id
- DELETE /api/admin/products/:id

Публичные:
- GET /api/categories
- GET /api/products?q=&category=
- GET /api/products/:slug
- /media/* — отданные картинки