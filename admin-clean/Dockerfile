# --- build stage ---
FROM node:20 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Vite читает VITE_* из .env.production или окружения
RUN npm run build

# --- serve stage ---
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# SPA fallback, чтобы не было 404 при F5/роутинге
RUN sed -i 's#/usr/share/nginx/html;#/usr/share/nginx/html;\n    try_files $uri /index.html;#' /etc/nginx/conf.d/default.conf
EXPOSE 80
