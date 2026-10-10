# ---------- 1) Compilar la app ----------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---------- 2) Servir con nginx ----------
FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/40-config-runtime.sh /docker-entrypoint.d/40-config-runtime.sh
RUN chmod +x /docker-entrypoint.d/40-config-runtime.sh
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
