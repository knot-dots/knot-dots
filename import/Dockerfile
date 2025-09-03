FROM node:22-slim AS builder
WORKDIR /srv/app
COPY package*.json ./
RUN npm clean-install --silent
COPY tsconfig.json .
COPY src ./src
ENTRYPOINT ["npm", "run"]
