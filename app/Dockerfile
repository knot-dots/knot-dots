FROM node:24-slim AS builder
WORKDIR /srv/knot-dots
COPY package*.json ./
COPY app/package.json ./app/
RUN npm clean-install --silent --workspace app
COPY app/.env ./app
COPY app/postcss.config.js ./app
COPY app/svelte.config.js ./app
COPY app/tsconfig.json ./app
COPY app/vite.config.ts ./app
COPY app/src ./app/src
COPY app/static ./app/static
RUN npm run check --workspace app
RUN npm run build --workspace app

FROM builder AS dev
EXPOSE 5173
CMD ["npm", "run", "dev", "--workspace", "app", "--", "--host", "0.0.0.0"]

FROM node:24-slim AS pre-production
WORKDIR /srv/knot-dots
COPY package*.json ./
COPY app/package.json ./app/
RUN npm clean-install --production --silent --workspace app

FROM gcr.io/distroless/nodejs24-debian12 AS production
WORKDIR /srv/app
COPY --from=pre-production /srv/knot-dots/node_modules ./node_modules
COPY --from=builder /srv/knot-dots/app/build ./build
EXPOSE 3000
CMD ["build"]
