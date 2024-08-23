FROM node:20-slim AS builder
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
RUN npm run check
RUN npm run build

FROM builder AS dev
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

FROM node:20-slim AS production
WORKDIR /srv/app
COPY --from=builder /srv/app/package.json .
COPY --from=builder /srv/app/node_modules ./node_modules
COPY --from=builder /srv/app/build ./build
COPY index.js .
EXPOSE 3000
CMD ["node", "."]
