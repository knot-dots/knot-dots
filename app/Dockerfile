FROM node:24-slim AS builder
WORKDIR /srv/app
COPY package*.json ./
RUN npm clean-install --silent
COPY .env .
COPY postcss.config.js .
COPY svelte.config.js .
COPY tsconfig.json .
COPY vite.config.ts .
COPY src ./src
COPY static ./static
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run check
RUN npm run build

FROM builder AS dev
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

FROM node:24-slim AS pre-production
WORKDIR /srv/app
COPY package*.json ./
RUN npm clean-install --production --silent

FROM gcr.io/distroless/nodejs24-debian12 AS production
WORKDIR /srv/app
COPY --from=pre-production /srv/app/node_modules ./node_modules
COPY --from=builder /srv/app/build ./build
EXPOSE 3000
CMD ["build"]
