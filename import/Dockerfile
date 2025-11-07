FROM node:24-slim AS builder
WORKDIR /srv/app
COPY package*.json ./
RUN npm clean-install --silent
COPY tsconfig.json .
COPY src ./src
# Allow explicit commands like `npm run index:containers` without double prefix.
# If you want shortcut usage (`docker compose run import index:containers`), you can
# uncomment the ENTRYPOINT below.
# ENTRYPOINT ["npm", "run"]
