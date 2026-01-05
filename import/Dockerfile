FROM node:24-slim AS builder
WORKDIR /srv/app
COPY import/package*.json ./
RUN npm clean-install --silent
COPY import/tsconfig.json .
COPY import/src ./src
COPY shared ./shared
ENTRYPOINT ["npm", "run"]
