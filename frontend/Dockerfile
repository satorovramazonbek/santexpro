# ==============================================================================
# SantexPro Frontend Dockerfile (Production)
# Multi-stage build with Nginx Alpine
# ==============================================================================

# Build stage
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production static serving
FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -q -O - http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
