# Stage 1: build the frontend
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts && npm rebuild esbuild
COPY . .
RUN npm run build

# Stage 2: production runtime (Express API + built frontend)
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --omit=dev
COPY --from=build /app/dist ./dist
COPY server ./server
COPY tsconfig.json ./
EXPOSE 4000
CMD ["npx", "tsx", "server/index.ts"]
