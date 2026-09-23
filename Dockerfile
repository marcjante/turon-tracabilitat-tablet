FROM node:22-alpine AS build
WORKDIR /app

# La URL de l'API és pública i es fixa en temps de build (Vite l'incrusta
# en el bundle estàtic, no es pot canviar en temps d'execució).
ARG VITE_API_URL=https://api-production-4789d.up.railway.app
ENV VITE_API_URL=$VITE_API_URL

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
