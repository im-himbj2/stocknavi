# 빌드 단계
FROM node:18-alpine as build

WORKDIR /app

# 의존성 설치
COPY package*.json ./
RUN npm ci

# 애플리케이션 빌드
COPY . .
RUN npm run build

# 프로덕션 단계
FROM nginx:alpine

# 빌드된 파일 복사
COPY --from=build /app/dist /usr/share/nginx/html

# Nginx 설정 복사
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]




















