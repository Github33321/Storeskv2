# ---- Build stage
FROM golang:1.23-alpine AS build
WORKDIR /app

# 1) Сначала кладём go.mod (и сразу весь код, чтобы tidy видел импорты)
COPY go.mod ./
COPY . .

# 2) Генерим go.sum и подтягиваем зависимости
RUN go mod tidy

# (не обязательно, но полезно) проверка целостности
# RUN go mod verify

# 3) Сборка бинарника API
RUN go build -o api ./cmd/api

# ---- Runtime stage
FROM alpine:3.19
WORKDIR /app
COPY --from=build /app/api /app/api
# Папка для загрузок
RUN mkdir -p /app/uploads
ENV APP_ADDR=:8082
EXPOSE 8082
CMD ["/app/api"]
